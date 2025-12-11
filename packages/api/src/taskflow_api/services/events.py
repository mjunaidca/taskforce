"""Event publishing via Dapr pub/sub.

Phase V requires Full Dapr integration including:
- Pub/Sub for task-events, reminders, task-updates topics
- Every task operation (create, update, delete, complete) publishes to Kafka via Dapr

Architecture:
- Backend publishes to Dapr sidecar HTTP API
- Dapr routes to Kafka (configured via pubsub component YAML)
- Consumer services (Notification Service) subscribe
"""

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any, Literal

import httpx

if TYPE_CHECKING:
    from ..models.task import Task

logger = logging.getLogger(__name__)

# Topic names as specified in hackathon requirements
TOPIC_TASK_EVENTS = "task-events"  # All task CRUD operations
TOPIC_REMINDERS = "reminders"  # Scheduled reminder triggers
TOPIC_TASK_UPDATES = "task-updates"  # Real-time client sync


async def publish_event(
    topic: str,
    event_type: str,
    data: dict[str, Any],
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish event to Dapr pub/sub.

    Dapr abstracts Kafka - app code doesn't need kafka-python library.
    Just HTTP POST to sidecar, Dapr handles Kafka connection.

    Args:
        topic: Kafka topic name (task-events, reminders, task-updates)
        event_type: Event type (created, updated, deleted, completed, etc.)
        data: Event payload
        dapr_http_endpoint: Dapr sidecar HTTP endpoint
        pubsub_name: Dapr pub/sub component name (defined in YAML)

    Returns:
        True if published successfully, False otherwise
    """
    url = f"{dapr_http_endpoint}/v1.0/publish/{pubsub_name}/{topic}"

    payload = {
        "event_type": event_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(
                "[DAPR-PUBSUB] Published %s to %s: task_id=%s",
                event_type,
                topic,
                data.get("task_id"),
            )
            return True
    except Exception as e:
        # Log but don't crash - pub/sub is for downstream services
        logger.warning("[DAPR-PUBSUB] Failed to publish %s to %s: %s", event_type, topic, e)
        return False


def _task_to_dict(task: "Task") -> dict[str, Any]:
    """Convert Task model to serializable dict."""
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "progress_percent": task.progress_percent,
        "tags": task.tags,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "project_id": task.project_id,
        "assignee_id": task.assignee_id,
        "parent_task_id": task.parent_task_id,
        "is_recurring": task.is_recurring,
        "recurrence_pattern": task.recurrence_pattern,
    }


# Convenience functions for specific event types


async def publish_task_created(
    task_id: int,
    task: "Task",
    actor_id: str,
    actor_name: str,
    user_id: str | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish task created event.

    Args:
        task_id: ID of created task
        task: Task model instance
        actor_id: Who created the task
        actor_name: Display name of creator
        user_id: User to notify (assignee if different from creator)
    """
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.created",
        data={
            "task_id": task_id,
            "user_id": user_id,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "task": _task_to_dict(task),
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_updated(
    task_id: int,
    changes: dict[str, Any],
    actor_id: str,
    actor_name: str,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish task updated event."""
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.updated",
        data={
            "task_id": task_id,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "changes": changes,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_deleted(
    task_id: int,
    title: str,
    actor_id: str,
    actor_name: str,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish task deleted event."""
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.deleted",
        data={
            "task_id": task_id,
            "title": title,
            "actor_id": actor_id,
            "actor_name": actor_name,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_completed(
    task_id: int,
    task: "Task",
    actor_id: str,
    actor_name: str,
    creator_id: str | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish task completed event.

    Args:
        task_id: ID of completed task
        task: Task model instance
        actor_id: Who completed the task
        actor_name: Display name of completer
        creator_id: Task creator to notify (if different from completer)
    """
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.completed",
        data={
            "task_id": task_id,
            "user_id": creator_id,  # Notify creator
            "actor_id": actor_id,
            "actor_name": actor_name,
            "task": _task_to_dict(task),
            "is_recurring": task.is_recurring,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_spawned(
    task_id: int,
    spawned_from: int,
    recurring_root: int,
    user_id: str,
    task_title: str = "",
    project_id: int | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish recurring task spawned event."""
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.spawned",
        data={
            "task_id": task_id,
            "spawned_from": spawned_from,
            "recurring_root": recurring_root,
            "user_id": user_id,
            "task_title": task_title,
            "project_id": project_id,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_assigned(
    task_id: int,
    task_title: str,
    assignee_user_id: str,
    actor_id: str,
    actor_name: str,
    project_id: int | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish task assigned event."""
    return await publish_event(
        topic=TOPIC_TASK_EVENTS,
        event_type="task.assigned",
        data={
            "task_id": task_id,
            "task_title": task_title,
            "user_id": assignee_user_id,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "project_id": project_id,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_reminder_due(
    task_id: int,
    user_id: str,
    title: str,
    due_at: str,
    hours_until_due: int,
    project_id: int | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish reminder due event to reminders topic.

    Called by Dapr Job handler when reminder fires.
    Notification Service consumes this and creates the notification.
    """
    return await publish_event(
        topic=TOPIC_REMINDERS,
        event_type="reminder.due",
        data={
            "task_id": task_id,
            "user_id": user_id,
            "title": title,
            "due_at": due_at,
            "hours_until_due": hours_until_due,
            "project_id": project_id,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )


async def publish_task_update_for_sync(
    task_id: int,
    user_id: str,
    action: Literal["created", "updated", "deleted", "completed"],
    task_data: dict[str, Any] | None = None,
    dapr_http_endpoint: str = "http://localhost:3500",
    pubsub_name: str = "taskflow-pubsub",
) -> bool:
    """Publish to task-updates topic for real-time client sync.

    WebSocket Service consumes this and broadcasts to connected clients.
    """
    return await publish_event(
        topic=TOPIC_TASK_UPDATES,
        event_type=f"sync.{action}",
        data={
            "task_id": task_id,
            "user_id": user_id,
            "action": action,
            "task": task_data,
        },
        dapr_http_endpoint=dapr_http_endpoint,
        pubsub_name=pubsub_name,
    )
