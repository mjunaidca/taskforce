"""Dapr Jobs API for programmatic scheduling.

NO POLLING - schedule jobs at exact times:
1. on_due_date spawn: Schedule at task.due_date
2. reminders: Schedule at task.due_date - 24h

Dapr calls back to our /api/jobs/trigger endpoint when job fires.
"""

import logging
from datetime import datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def schedule_job(
    job_name: str,
    due_time: datetime,
    data: dict[str, Any],
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Schedule a one-time Dapr job at a specific time.

    Args:
        job_name: Unique job identifier (e.g., "spawn-task-123")
        due_time: When to trigger the job (RFC3339 format)
        data: Payload to include in the job trigger
        dapr_http_endpoint: Dapr sidecar HTTP endpoint

    Returns:
        True if scheduled successfully, False otherwise
    """
    url = f"{dapr_http_endpoint}/v1.0-alpha1/jobs/{job_name}"

    # Format as RFC3339 (ISO8601 with timezone)
    due_time_str = due_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "dueTime": due_time_str,
        "data": data,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 204:
                logger.info("[DAPR-JOB] Scheduled job '%s' for %s", job_name, due_time_str)
                return True
            else:
                logger.warning(
                    "[DAPR-JOB] Failed to schedule '%s': %s %s",
                    job_name,
                    response.status_code,
                    response.text,
                )
                return False
    except Exception as e:
        logger.warning("[DAPR-JOB] Failed to schedule '%s': %s", job_name, e)
        return False


async def delete_job(
    job_name: str,
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Delete a scheduled Dapr job.

    Args:
        job_name: Job identifier to delete
        dapr_http_endpoint: Dapr sidecar HTTP endpoint

    Returns:
        True if deleted successfully, False otherwise
    """
    url = f"{dapr_http_endpoint}/v1.0-alpha1/jobs/{job_name}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.delete(url)
            if response.status_code in (204, 500):  # 500 = job not found, which is fine
                logger.info("[DAPR-JOB] Deleted job '%s'", job_name)
                return True
            else:
                logger.warning(
                    "[DAPR-JOB] Failed to delete '%s': %s",
                    job_name,
                    response.status_code,
                )
                return False
    except Exception as e:
        logger.warning("[DAPR-JOB] Failed to delete '%s': %s", job_name, e)
        return False


async def schedule_recurring_spawn(
    task_id: int,
    due_date: datetime,
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Schedule recurring task spawn at due_date for on_due_date trigger.

    This is the ONLY Dapr job we use - because spawning MUST happen
    at a specific time even if no user is online.

    Args:
        task_id: Recurring task to spawn from
        due_date: When to spawn the next occurrence
        dapr_http_endpoint: Dapr sidecar endpoint

    Returns:
        True if scheduled successfully
    """
    # Don't schedule if due_date is in the past
    if due_date <= datetime.utcnow():
        logger.info("[DAPR-JOB] Due date already passed for task %d", task_id)
        return False

    return await schedule_job(
        job_name=f"spawn-task-{task_id}",
        due_time=due_date,
        data={"task_id": task_id, "type": "spawn"},
        dapr_http_endpoint=dapr_http_endpoint,
    )


async def cancel_recurring_spawn(
    task_id: int,
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Cancel a scheduled recurring spawn (e.g., when task is deleted).

    Args:
        task_id: Task whose spawn to cancel
        dapr_http_endpoint: Dapr sidecar endpoint

    Returns:
        True if cancelled successfully
    """
    return await delete_job(
        job_name=f"spawn-task-{task_id}",
        dapr_http_endpoint=dapr_http_endpoint,
    )


# ============================================
# REMINDER SCHEDULING (PROGRAMMATIC)
# ============================================

REMINDER_HOURS_BEFORE = 24
REMINDER_HOURS_SHORT = 1  # For tasks less than 24h away
REMINDER_MINUTES_MEDIUM = 5  # For tasks 5-60 min away
REMINDER_SECONDS_SHORT = 30  # For tasks 1-5 min away (quick tasks)


async def schedule_reminder(
    task_id: int,
    due_date: datetime,
    user_id: str,
    title: str,
    project_id: int | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Schedule a reminder notification for a task.

    Scheduling logic:
    - If due date > 24 hours away: remind 24 hours before
    - If due date 1-24 hours away: remind 1 hour before
    - If due date 5-60 minutes away: remind 5 minutes before
    - If due date 1-5 minutes away: remind 30 seconds before
    - If due date < 1 minute away: no reminder (too late)

    Args:
        task_id: Task to remind about
        due_date: Task due date
        user_id: User to notify
        title: Task title for notification
        project_id: Optional project ID
        dapr_http_endpoint: Dapr sidecar endpoint

    Returns:
        True if scheduled successfully
    """
    from datetime import timedelta

    now = datetime.utcnow()
    time_until_due = due_date - now

    # Calculate appropriate reminder time based on how far away due date is
    if time_until_due > timedelta(hours=REMINDER_HOURS_BEFORE):
        # More than 24h away - remind 24h before
        remind_at = due_date - timedelta(hours=REMINDER_HOURS_BEFORE)
        hours_until = REMINDER_HOURS_BEFORE
    elif time_until_due > timedelta(hours=REMINDER_HOURS_SHORT):
        # 1-24h away - remind 1h before
        remind_at = due_date - timedelta(hours=REMINDER_HOURS_SHORT)
        hours_until = REMINDER_HOURS_SHORT
    elif time_until_due > timedelta(minutes=REMINDER_MINUTES_MEDIUM):
        # 5-60 minutes away - remind 5 minutes before
        remind_at = due_date - timedelta(minutes=REMINDER_MINUTES_MEDIUM)
        hours_until = 0  # Will show as "in a few minutes" in notification
    elif time_until_due > timedelta(minutes=1):
        # 1-5 minutes away - remind 30 seconds before (for quick tasks)
        remind_at = due_date - timedelta(seconds=REMINDER_SECONDS_SHORT)
        hours_until = -1  # Special flag for "in seconds" display
    else:
        # Less than 1 minute away - too late for reminder
        logger.info("[DAPR-JOB] Due date too soon for reminder on task %d", task_id)
        return False

    # Final check: reminder time must be in the future
    if remind_at <= now:
        logger.info("[DAPR-JOB] Reminder time already passed for task %d", task_id)
        return False

    return await schedule_job(
        job_name=f"reminder-task-{task_id}",
        due_time=remind_at,
        data={
            "task_id": task_id,
            "type": "reminder",
            "user_id": user_id,
            "title": title,
            "project_id": project_id,
            "due_at": due_date.isoformat(),
            "hours_until_due": hours_until,
        },
        dapr_http_endpoint=dapr_http_endpoint,
    )


async def cancel_reminder(
    task_id: int,
    dapr_http_endpoint: str = "http://localhost:3500",
) -> bool:
    """Cancel a scheduled reminder (e.g., when task deleted or completed).

    Args:
        task_id: Task whose reminder to cancel
        dapr_http_endpoint: Dapr sidecar endpoint

    Returns:
        True if cancelled successfully
    """
    return await delete_job(
        job_name=f"reminder-task-{task_id}",
        dapr_http_endpoint=dapr_http_endpoint,
    )
