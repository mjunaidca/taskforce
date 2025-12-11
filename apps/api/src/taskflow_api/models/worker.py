"""Worker model - humans and AI agents."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .project import ProjectMember
    from .task import Task


class Worker(SQLModel, table=True):
    """A human or AI agent that can be assigned tasks."""

    __tablename__ = "worker"

    id: int | None = Field(default=None, primary_key=True)
    handle: str = Field(
        unique=True,
        index=True,
        max_length=50,
        regex=r"^@[a-z0-9_-]+$",
        description="Unique handle starting with @ (e.g., @sarah, @claude-code)",
    )
    name: str = Field(max_length=200, description="Display name")
    type: str = Field(description="Worker type")  # Values: "human" or "agent"

    # Human-specific (links to SSO user)
    user_id: str | None = Field(
        default=None,
        index=True,
        description="SSO user ID for human workers",
    )

    # Agent-specific
    agent_type: str | None = Field(
        default=None,
        description="Agent type (claude, qwen, gemini, custom - required for agents)",
    )
    capabilities: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Agent capabilities list",
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this worker was registered",
    )

    # Relationships
    memberships: list["ProjectMember"] = Relationship(back_populates="worker")
    assigned_tasks: list["Task"] = Relationship(
        back_populates="assignee",
        sa_relationship_kwargs={"foreign_keys": "[Task.assignee_id]"},
    )
    created_tasks: list["Task"] = Relationship(
        back_populates="created_by",
        sa_relationship_kwargs={"foreign_keys": "[Task.created_by_id]"},
    )
