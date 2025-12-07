"""Audit logging service."""

from typing import Any

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models.audit import AuditLog


async def log_action(
    session: AsyncSession,
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_id: int,
    actor_type: str = "human",
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Create an immutable audit log entry.

    Note: This does NOT commit - caller must commit the transaction.
    This allows the audit log to be part of the same transaction as the action.

    Args:
        session: Database session
        entity_type: Type of entity (task, project, worker)
        entity_id: ID of the affected entity
        action: Action performed (created, updated, started, etc.)
        actor_id: Worker ID who performed the action
        actor_type: Type of actor ("human" or "agent")
        details: Additional context (before/after values, notes)

    Returns:
        Created AuditLog entry (not yet committed)
    """
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details or {},
    )
    session.add(log)
    return log


async def get_entity_audit(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    """Get audit trail for a specific entity."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.exec(stmt)
    return list(result.all())
