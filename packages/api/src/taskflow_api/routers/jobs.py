"""Dapr Job callback handlers.

NO POLLING - Dapr Jobs fire at exact scheduled times:
1. spawn jobs: Fire at task.due_date for on_due_date recurring tasks
2. reminder jobs: Fire at task.due_date - 24h

Dapr calls POST /api/jobs/trigger when a scheduled job fires.
We publish events to Dapr pub/sub → Notification Service consumes them.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..database import get_session
from ..models.task import Task
from ..models.worker import Worker
from ..services.audit import log_action
from ..services.events import TOPIC_REMINDERS, publish_event, publish_task_spawned
from ..services.jobs import schedule_recurring_spawn, schedule_reminder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["Jobs (Dapr Callbacks)"])


def calculate_next_due(pattern: str, from_time: datetime) -> datetime:
    """Calculate next due date based on recurrence pattern."""
    patterns = {
        "1m": timedelta(minutes=1),
        "5m": timedelta(minutes=5),
        "10m": timedelta(minutes=10),
        "15m": timedelta(minutes=15),
        "30m": timedelta(minutes=30),
        "1h": timedelta(hours=1),
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": timedelta(days=30),
    }
    return from_time + patterns.get(pattern, timedelta(days=1))


@router.post("/trigger")
async def handle_job_trigger(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Handle Dapr job trigger callback.

    Dapr calls this endpoint when a scheduled job fires.
    Job types:
    - spawn: Create next recurring task occurrence
    - reminder: Publish reminder event to Notification Service
    """
    try:
        body = await request.json()
        job_data = body.get("data", body)  # Handle both wrapped and raw payloads

        task_id = job_data.get("task_id")
        job_type = job_data.get("type")

        logger.info("[DAPR-JOB] Received trigger: type=%s, task_id=%s", job_type, task_id)

        if job_type == "spawn":
            return await handle_spawn(session, task_id)
        elif job_type == "reminder":
            return await handle_reminder(session, job_data)
        else:
            logger.warning("[DAPR-JOB] Unknown job type: %s", job_type)
            return {"status": "unknown_type"}

    except Exception as e:
        logger.exception("[DAPR-JOB] Error handling trigger: %s", e)
        return {"status": "error", "message": str(e)}


async def handle_reminder(session: AsyncSession, job_data: dict) -> dict:
    """Handle reminder job - publish to reminders topic.

    The Notification Service subscribes to this topic and creates
    the actual notification in its own database.

    NO notification stored here - that's the Notification Service's job.
    """
    task_id = job_data.get("task_id")
    user_id = job_data.get("user_id")
    title = job_data.get("title")
    project_id = job_data.get("project_id")
    due_at = job_data.get("due_at")
    hours_until_due = job_data.get("hours_until_due", 24)

    if not user_id:
        logger.warning("[DAPR-JOB] Reminder: no user_id for task %s", task_id)
        return {"status": "no_user"}

    # Verify task still exists and isn't completed
    task = await session.get(Task, task_id)
    if not task:
        logger.info("[DAPR-JOB] Reminder: task %s not found (deleted?)", task_id)
        return {"status": "task_not_found"}

    if task.status in ("completed", "cancelled"):
        logger.info("[DAPR-JOB] Reminder: task %s already %s", task_id, task.status)
        return {"status": "task_already_done"}

    # Publish to reminders topic → Notification Service creates notification
    await publish_event(
        topic=TOPIC_REMINDERS,
        event_type="reminder.due",
        data={
            "task_id": task_id,
            "user_id": user_id,
            "title": title,
            "project_id": project_id,
            "due_at": due_at,
            "hours_until_due": hours_until_due,
        },
        dapr_http_endpoint=settings.dapr_http_endpoint,
        pubsub_name=settings.dapr_pubsub_name,
    )

    # Mark task as reminded (prevent re-triggering if job somehow fires again)
    task.reminder_sent = True
    session.add(task)
    await session.commit()

    logger.info("[DAPR-JOB] Published reminder for task %d to user %s", task_id, user_id)
    return {"status": "reminder_sent"}


async def handle_spawn(session: AsyncSession, task_id: int) -> dict:
    """Handle recurring spawn job trigger - create next task occurrence.

    This is triggered by Dapr at the exact due_date of a task with
    recurrence_trigger='on_due_date' or 'both'.

    Publishes task.spawned event → Notification Service creates notification.
    """
    task = await session.get(Task, task_id)
    if not task:
        logger.warning("[DAPR-JOB] Spawn: task %d not found", task_id)
        return {"status": "task_not_found"}

    # Skip if already spawned (idempotency)
    if task.has_spawned_next:
        logger.info("[DAPR-JOB] Spawn: task %d already spawned", task_id)
        return {"status": "already_spawned"}

    # Check max_occurrences
    root_id = task.recurring_root_id or task.id
    if task.max_occurrences is not None:
        result = await session.exec(
            select(func.count(Task.id)).where(
                (Task.id == root_id) | (Task.recurring_root_id == root_id)
            )
        )
        spawn_count = result.one() or 0
        if spawn_count >= task.max_occurrences:
            logger.info("[DAPR-JOB] Spawn: task %d reached max_occurrences", task_id)
            task.has_spawned_next = True
            session.add(task)
            await session.commit()
            return {"status": "max_occurrences_reached"}

    # Calculate next due date
    next_due = calculate_next_due(task.recurrence_pattern, task.due_date)

    # Create new task
    new_task = Task(
        title=task.title,
        description=task.description,
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        parent_task_id=task.parent_task_id,
        created_by_id=task.created_by_id,
        priority=task.priority,
        tags=task.tags.copy() if task.tags else [],
        due_date=next_due,
        is_recurring=True,
        recurrence_pattern=task.recurrence_pattern,
        max_occurrences=task.max_occurrences,
        recurring_root_id=root_id,
        recurrence_trigger=task.recurrence_trigger,
        clone_subtasks_on_recur=task.clone_subtasks_on_recur,
        status="pending",
        progress_percent=0,
    )
    session.add(new_task)
    await session.flush()

    # Mark original as spawned
    task.has_spawned_next = True
    session.add(task)

    # Audit
    await log_action(
        session,
        entity_type="task",
        entity_id=new_task.id,
        action="spawned_recurring",
        actor_id=task.created_by_id,
        actor_type="system",
        details={
            "spawned_from": task.id,
            "recurring_root": root_id,
            "trigger": "dapr_job",
            "recurrence_pattern": task.recurrence_pattern,
            "next_due": next_due.isoformat(),
        },
    )

    await session.commit()

    # Get assignee info for event
    assignee_user_id = None
    if new_task.assignee_id:
        assignee = await session.get(Worker, new_task.assignee_id)
        if assignee:
            assignee_user_id = assignee.user_id or f"@{assignee.name}"

    # Publish task.spawned event → Notification Service creates notification
    await publish_task_spawned(
        task_id=new_task.id,
        spawned_from=task.id,
        recurring_root=root_id,
        user_id=assignee_user_id or "",
        task_title=new_task.title,
        project_id=new_task.project_id,
        dapr_http_endpoint=settings.dapr_http_endpoint,
        pubsub_name=settings.dapr_pubsub_name,
    )

    # Schedule next spawn job for the new task
    if new_task.recurrence_trigger in ("on_due_date", "both"):
        await schedule_recurring_spawn(
            task_id=new_task.id,
            due_date=next_due,
            dapr_http_endpoint=settings.dapr_http_endpoint,
        )

    # Schedule reminder for new task if it has assignee
    if new_task.assignee_id and assignee_user_id:
        await schedule_reminder(
            task_id=new_task.id,
            due_date=next_due,
            user_id=assignee_user_id,
            title=new_task.title,
            project_id=new_task.project_id,
            dapr_http_endpoint=settings.dapr_http_endpoint,
        )

    logger.info("[DAPR-JOB] Spawned task %d from %d", new_task.id, task_id)
    return {"status": "spawned", "new_task_id": new_task.id}
