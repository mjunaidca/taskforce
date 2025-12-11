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
    "pending": ["in_progress", "blocked", "completed"],  # Allow direct completion
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

    # Recurring task fields
    is_recurring: bool = Field(
        default=False,
        description="Whether this task repeats when completed",
    )
    recurrence_pattern: str | None = Field(
        default=None,
        description="Interval: 1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly",
    )
    max_occurrences: int | None = Field(
        default=None,
        description="Maximum number of times to recur (null = unlimited)",
    )
    recurring_root_id: int | None = Field(
        default=None,
        foreign_key="task.id",
        index=True,
        description="Root task ID for recurring chain (NULL = this is the root)",
    )
    recurrence_trigger: str = Field(
        default="on_complete",
        description="When to spawn next: 'on_complete', 'on_due_date', 'both'",
    )
    clone_subtasks_on_recur: bool = Field(
        default=False,
        description="Whether to clone subtasks when spawning next occurrence",
    )
    has_spawned_next: bool = Field(
        default=False,
        description="Whether this task has already spawned its next occurrence",
    )
    reminder_sent: bool = Field(
        default=False,
        description="Whether a reminder notification has been sent for this task's due date",
    )

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

    # Self-referential for subtasks (foreign_keys needed for recurring_root_id)
    parent: "Task" = Relationship(
        back_populates="subtasks",
        sa_relationship_kwargs={
            "remote_side": "Task.id",
            "foreign_keys": "[Task.parent_task_id]",
        },
    )
    subtasks: list["Task"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"foreign_keys": "[Task.parent_task_id]"},
    )
