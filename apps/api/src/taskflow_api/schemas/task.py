"""Task API schemas."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def strip_timezone(dt: datetime | None) -> datetime | None:
    """Convert timezone-aware datetime to naive UTC datetime.

    Database stores naive datetimes, so we strip timezone info
    after converting to UTC.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        # Convert to UTC and strip timezone

        dt = dt.astimezone(UTC).replace(tzinfo=None)
    return dt


# Valid recurrence patterns
RECURRENCE_PATTERNS = Literal["1m", "5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"]

# Valid recurrence triggers
RECURRENCE_TRIGGERS = Literal["on_complete", "on_due_date", "both"]


class TaskCreate(BaseModel):
    """Schema for creating a task."""

    title: str = Field(max_length=500, description="Task title")
    description: str | None = None
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    assignee_id: int | None = Field(
        default=None,
        description="Worker ID to assign (must be project member)",
    )
    parent_task_id: int | None = Field(
        default=None,
        description="Parent task ID for subtasks (must be same project)",
    )
    tags: list[str] = Field(default_factory=list)
    due_date: datetime | None = None

    # Recurring task fields
    is_recurring: bool = False
    recurrence_pattern: RECURRENCE_PATTERNS | None = None
    max_occurrences: int | None = Field(
        default=None, gt=0, description="Maximum recurrences (null = unlimited)"
    )
    recurrence_trigger: RECURRENCE_TRIGGERS = "on_complete"
    clone_subtasks_on_recur: bool = False

    @field_validator("assignee_id", "parent_task_id", mode="after")
    @classmethod
    def zero_to_none(cls, v: int | None) -> int | None:
        """Convert 0 to None (0 is not a valid foreign key)."""
        if v == 0:
            return None
        return v

    @field_validator("due_date", mode="after")
    @classmethod
    def normalize_due_date(cls, v: datetime | None) -> datetime | None:
        """Strip timezone from due_date for database compatibility."""
        return strip_timezone(v)

    @model_validator(mode="after")
    def validate_recurring(self) -> "TaskCreate":
        """Validate recurring task constraints."""
        # If recurring is enabled, pattern is required
        if self.is_recurring and not self.recurrence_pattern:
            raise ValueError("recurrence_pattern required when is_recurring is True")

        # Auto-enable recurring if pattern is provided
        if not self.is_recurring and self.recurrence_pattern:
            self.is_recurring = True

        return self


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    title: str | None = None
    description: str | None = None
    priority: Literal["low", "medium", "high", "critical"] | None = None
    tags: list[str] | None = None
    due_date: datetime | None = None

    # Recurring task fields
    is_recurring: bool | None = None
    recurrence_pattern: RECURRENCE_PATTERNS | None = None
    max_occurrences: int | None = Field(default=None, gt=0)
    recurrence_trigger: RECURRENCE_TRIGGERS | None = None
    clone_subtasks_on_recur: bool | None = None

    @field_validator("due_date", mode="after")
    @classmethod
    def normalize_due_date(cls, v: datetime | None) -> datetime | None:
        """Strip timezone from due_date for database compatibility."""
        return strip_timezone(v)


class StatusUpdate(BaseModel):
    """Schema for changing task status."""

    status: Literal["pending", "in_progress", "review", "completed", "blocked"]


class ProgressUpdate(BaseModel):
    """Schema for updating task progress."""

    percent: int = Field(ge=0, le=100)
    note: str | None = None


class AssignUpdate(BaseModel):
    """Schema for assigning a task."""

    assignee_id: int = Field(description="Worker ID (must be project member)")


class RejectRequest(BaseModel):
    """Schema for rejecting a reviewed task."""

    reason: str = Field(max_length=500)


class TaskRead(BaseModel):
    """Schema for task response."""

    id: int
    title: str
    description: str | None
    status: Literal["pending", "in_progress", "review", "completed", "blocked"]
    priority: Literal["low", "medium", "high", "critical"]
    progress_percent: int
    tags: list[str]
    due_date: datetime | None

    # Recurring task fields
    is_recurring: bool
    recurrence_pattern: str | None
    max_occurrences: int | None
    recurring_root_id: int | None
    recurrence_trigger: str = "on_complete"
    clone_subtasks_on_recur: bool = False
    has_spawned_next: bool = False  # Whether this task already spawned its next occurrence
    spawn_count: int = 0  # Computed: number of tasks spawned from root

    project_id: int
    assignee_id: int | None
    assignee_handle: str | None = None
    parent_task_id: int | None
    created_by_id: int

    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    subtasks: list["TaskRead"] = []


class TaskListItem(BaseModel):
    """Schema for task in list response (no subtasks)."""

    id: int
    title: str
    status: Literal["pending", "in_progress", "review", "completed", "blocked"]
    priority: Literal["low", "medium", "high", "critical"]
    progress_percent: int
    assignee_id: int | None
    assignee_handle: str | None = None
    due_date: datetime | None
    created_at: datetime
    parent_task_id: int | None = None
    subtask_count: int = 0

    # Recurring indicator (minimal data for list badge)
    is_recurring: bool = False
