"""Task API schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    title: str | None = None
    description: str | None = None
    priority: Literal["low", "medium", "high", "critical"] | None = None
    tags: list[str] | None = None
    due_date: datetime | None = None


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
