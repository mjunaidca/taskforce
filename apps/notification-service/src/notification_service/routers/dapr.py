"""Dapr subscription handlers.

This is where Dapr pub/sub events are consumed.
Dapr calls these endpoints when events are published to subscribed topics.

Flow:
1. TaskFlow API publishes event to Dapr sidecar
2. Dapr routes to Kafka/Redis (based on component config)
3. Dapr calls this service's /dapr/subscribe to get subscriptions
4. Dapr delivers events to /dapr/events/{topic}
5. This service stores notification in its own DB
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from ..config import settings
from ..database import get_session
from ..models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dapr", tags=["Dapr Subscriptions"])


# Topics we subscribe to
SUBSCRIPTIONS = [
    {"pubsubname": settings.dapr_pubsub_name, "topic": "task-events", "route": "/dapr/events/task-events"},
    {"pubsubname": settings.dapr_pubsub_name, "topic": "reminders", "route": "/dapr/events/reminders"},
]


@router.get("/subscribe")
async def get_subscriptions() -> list[dict]:
    """Tell Dapr which topics we subscribe to.

    Dapr calls this endpoint on startup to discover subscriptions.
    This is the programmatic subscription method.
    """
    logger.info("[DAPR] Returning subscriptions: %s", [s["topic"] for s in SUBSCRIPTIONS])
    return SUBSCRIPTIONS


@router.post("/events/task-events")
async def handle_task_events(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Handle events from task-events topic.

    Events: task.created, task.updated, task.deleted, task.completed, task.spawned
    """
    try:
        raw_event = await request.json()
        logger.info("[DAPR] Raw event received: %s", raw_event)

        # Dapr CloudEvent wraps our payload in "data" field
        # Our payload has: {"event_type": ..., "data": ..., "timestamp": ...}
        event = raw_event.get("data", raw_event)  # Unwrap CloudEvent or use as-is
        logger.info("[DAPR] Received task-events: %s", event.get("event_type"))

        event_type = event.get("event_type", "")
        data = event.get("data", {})

        # Generate notification based on event type
        notification = await _create_notification_from_event(event_type, data)

        if notification:
            session.add(notification)
            await session.commit()
            await session.refresh(notification)  # Refresh to get ID without lazy load
            logger.info("[DAPR] Created notification %d for %s", notification.id, notification.user_id)

        return {"status": "SUCCESS"}

    except Exception as e:
        logger.exception("[DAPR] Error handling task-events: %s", e)
        # Return SUCCESS to prevent Dapr retries for bad events
        return {"status": "SUCCESS"}


@router.post("/events/reminders")
async def handle_reminders(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Handle events from reminders topic.

    Events: reminder.scheduled, reminder.sent
    These are triggered by Dapr Jobs at exact times.
    """
    try:
        event = await request.json()
        logger.info("[DAPR] Received reminder event: %s", event.get("event_type"))

        event_type = event.get("event_type", "")
        data = event.get("data", {})

        if event_type == "reminder.due":
            # This is the actual reminder notification to user
            hours_until = data.get("hours_until_due", 24)
            if hours_until == -1:
                time_text = "in seconds"  # Quick task reminder (30 sec before)
            elif hours_until == 0:
                time_text = "in a few minutes"
            elif hours_until == 1:
                time_text = "in 1 hour"
            else:
                time_text = f"in {hours_until} hours"

            notification = Notification(
                user_id=data.get("user_id", ""),
                user_type="human",
                type="task_reminder",
                title=f"Task due {time_text}",
                body=f'"{data.get("title", "Task")}" is approaching its deadline',
                task_id=data.get("task_id"),
                project_id=data.get("project_id"),
                actor_id="system",
                actor_name="TaskFlow",
            )
            session.add(notification)
            await session.commit()
            logger.info("[DAPR] Created reminder notification for user %s", notification.user_id)

        return {"status": "SUCCESS"}

    except Exception as e:
        logger.exception("[DAPR] Error handling reminder: %s", e)
        return {"status": "SUCCESS"}


async def _create_notification_from_event(event_type: str, data: dict) -> Notification | None:
    """Create notification from event data.

    Returns None if no notification should be created.
    """
    user_id = data.get("user_id")
    if not user_id:
        return None

    # task_title can be nested in "task" object or at top level (for task.assigned)
    task_title = data.get("task_title") or data.get("task", {}).get("title", "Task")
    task_id = data.get("task_id")
    project_id = data.get("task", {}).get("project_id") or data.get("project_id")
    actor_name = data.get("actor_name", "Someone")

    if event_type == "task.created":
        # Notify assignee when task is created and assigned to them
        assignee_id = data.get("task", {}).get("assignee_id")
        if assignee_id and assignee_id != data.get("actor_id"):
            return Notification(
                user_id=user_id,
                user_type="human",
                type="task_assigned",
                title="New task assigned to you",
                body=f'{actor_name} created "{task_title}"',
                task_id=task_id,
                project_id=project_id,
                actor_id=data.get("actor_id"),
                actor_name=actor_name,
            )

    elif event_type == "task.completed":
        # Notify creator when someone else completes their task
        creator_id = data.get("creator_id")
        if creator_id and creator_id != data.get("actor_id"):
            return Notification(
                user_id=creator_id,
                user_type="human",
                type="task_completed",
                title="Task completed",
                body=f'{actor_name} completed "{task_title}"',
                task_id=task_id,
                project_id=project_id,
                actor_id=data.get("actor_id"),
                actor_name=actor_name,
            )

    elif event_type == "task.spawned":
        # Notify assignee when recurring task spawns new occurrence
        return Notification(
            user_id=user_id,
            user_type="human",
            type="task_spawned",
            title="Recurring task created",
            body=f'New occurrence of "{task_title}" is ready',
            task_id=task_id,
            project_id=project_id,
            actor_id="system",
            actor_name="TaskFlow",
        )

    elif event_type == "task.assigned":
        # Direct assignment notification
        return Notification(
            user_id=user_id,
            user_type="human",
            type="task_assigned",
            title="Task assigned to you",
            body=f'{actor_name} assigned "{task_title}" to you',
            task_id=task_id,
            project_id=project_id,
            actor_id=data.get("actor_id"),
            actor_name=actor_name,
        )

    elif event_type == "task.deleted":
        # Notify assignee when their task is deleted by someone else
        return Notification(
            user_id=user_id,
            user_type="human",
            type="task_deleted",
            title="Task deleted",
            body=f'{actor_name} deleted "{task_title}"',
            task_id=task_id,
            project_id=project_id,
            actor_id=data.get("actor_id"),
            actor_name=actor_name,
        )

    elif event_type == "task.updated":
        # Notify assignee when task is updated (status change, priority, etc.)
        changes = data.get("changes", {})
        if changes:
            change_summary = ", ".join(f"{k}: {v}" for k, v in list(changes.items())[:2])
            return Notification(
                user_id=user_id,
                user_type="human",
                type="task_updated",
                title="Task updated",
                body=f'{actor_name} updated "{task_title}" ({change_summary})',
                task_id=task_id,
                project_id=project_id,
                actor_id=data.get("actor_id"),
                actor_name=actor_name,
            )

    return None
