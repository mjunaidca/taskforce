"""Task model with recursive parent-child support."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .project import Project
    from .worker import Worker


# Valid status transitions (from Phase 1)
VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["in_progress", "blocked"],
    "in_progress": ["review", "completed", "blocked"],
    "review": ["in_progress", "completed"],
    "completed": ["review"],  # Can reopen for corrections
    "blocked": ["pending", "in_progress"],
}


def validate_status_transition(current: str, next_status: str) -> bool:
    """Check if a status transition is valid."""
    if current not in VALID_TRANSITIONS:
        return False
    return next_status in VALID_TRANSITIONS[current]


class Task(SQLModel, table=True):
    """A unit of work with recursive subtask support."""

    __tablename__ = "task"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=500, description="Task title/summary")
    description: str | None = Field(default=None, description="Detailed description")

    status: str = Field(
        default="pending",
        description="Task status: pending, in_progress, review, completed, blocked",
    )
    priority: str = Field(
        default="medium",
        description="Task priority: low, medium, high, critical",
    )
    progress_percent: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Completion percentage (0-100)",
    )

    tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Task tags for categorization",
    )
    due_date: datetime | None = Field(default=None, description="Task deadline")

    # Foreign keys
    project_id: int = Field(foreign_key="project.id", index=True)
    assignee_id: int | None = Field(
        default=None,
        foreign_key="worker.id",
        description="Worker assigned to this task (nullable)",
    )
    parent_task_id: int | None = Field(
        default=None,
        foreign_key="task.id",
        description="Parent task ID for subtasks (must be same project)",
    )
    created_by_id: int = Field(
        foreign_key="worker.id",
        description="Worker who created this task",
    )

    # Timestamps
    started_at: datetime | None = Field(default=None, description="When work started")
    completed_at: datetime | None = Field(default=None, description="When task completed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: "Project" = Relationship(back_populates="tasks")
    assignee: "Worker" = Relationship(
        back_populates="assigned_tasks",
        sa_relationship_kwargs={"foreign_keys": "[Task.assignee_id]"},
    )
    created_by: "Worker" = Relationship(
        back_populates="created_tasks",
        sa_relationship_kwargs={"foreign_keys": "[Task.created_by_id]"},
    )

    # Self-referential for subtasks
    parent: "Task" = Relationship(
        back_populates="subtasks",
        sa_relationship_kwargs={"remote_side": "Task.id"},
    )
    subtasks: list["Task"] = Relationship(back_populates="parent")
