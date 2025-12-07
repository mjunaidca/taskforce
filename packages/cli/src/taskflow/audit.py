"""TaskFlow audit infrastructure for tracking all actions.

Provides functions to:
- Detect actor type (human vs agent)
- Log actions with full context
- Maintain audit trail for accountability
"""

from datetime import datetime
from typing import Any, Literal

from taskflow.models import AuditLog
from taskflow.storage import Storage


def get_actor_type(actor_id: str, storage: Storage) -> Literal["human", "agent"]:
    """Determine if an actor is human or agent.

    Args:
        actor_id: Worker ID (e.g., @sarah, @claude-code)
        storage: Storage instance to look up worker

    Returns:
        "human" or "agent"
    """
    worker = storage.get_worker(actor_id)
    if worker is None:
        # Default to human if worker not found
        return "human"
    return worker.type


def log_action(
    storage: Storage,
    action: str,
    actor_id: str,
    task_id: int | None = None,
    project_slug: str | None = None,
    context: dict[str, Any] | None = None,
) -> AuditLog:
    """Log an action to the audit trail.

    Creates an audit log entry and persists it to storage.
    Automatically determines actor type and generates unique ID.

    Args:
        storage: Storage instance
        action: Action performed (e.g., "created", "started", "completed")
        actor_id: Worker ID who performed the action
        task_id: Optional task ID if action relates to a task
        project_slug: Optional project slug if action relates to a project
        context: Optional additional context (e.g., progress %, notes)

    Returns:
        Created AuditLog entry
    """
    # Determine actor type
    actor_type = get_actor_type(actor_id, storage)

    # Generate next ID
    existing_logs = storage.get_audit_logs()
    next_id = len(existing_logs) + 1

    # Create audit log entry
    log = AuditLog(
        id=next_id,
        task_id=task_id,
        project_slug=project_slug,
        actor_id=actor_id,
        actor_type=actor_type,
        action=action,
        context=context or {},
        timestamp=datetime.now(),
    )

    # Persist to storage
    storage.add_audit_log(log)

    return log
