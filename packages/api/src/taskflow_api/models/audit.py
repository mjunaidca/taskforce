"""AuditLog model - immutable record of all actions."""

from datetime import datetime
from typing import Any

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    """Immutable record of every state-changing action."""

    __tablename__ = "audit_log"

    id: int | None = Field(default=None, primary_key=True)

    entity_type: str = Field(
        index=True,
        description="Type of entity (task, project, worker)",
    )
    entity_id: int = Field(
        index=True,
        description="ID of the affected entity",
    )
    action: str = Field(
        description="Action performed (created, updated, started, completed, etc.)",
    )

    actor_id: int = Field(
        foreign_key="worker.id",
        index=True,
        description="Worker who performed the action",
    )
    actor_type: str = Field(
        description="Type of actor (human or agent)",
    )  # Values: "human" or "agent"

    details: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description="Additional context (before/after values, notes, etc.)",
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this action occurred",
    )
