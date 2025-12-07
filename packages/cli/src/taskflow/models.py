"""TaskFlow data models using Pydantic with Python 3.13+ typing.

Following Python 3.13+ typing syntax:
- Use list[] instead of List[]
- Use dict[] instead of Dict[]
- Use | instead of Union and Optional
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class Project(BaseModel):
    """Project model representing a task project/workspace.

    A project groups related tasks and provides organizational structure.
    """

    slug: str = Field(
        ...,
        pattern=r"^[a-z0-9-]+$",
        description="Unique project identifier (lowercase, numbers, hyphens)",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Human-readable project name")
    description: str | None = Field(default=None, description="Optional project description")


class Worker(BaseModel):
    """Worker model representing a human or AI agent.

    Workers can be assigned tasks. Agents have additional metadata like
    capabilities and agent type.
    """

    id: str = Field(
        ...,
        pattern=r"^@[a-z0-9_-]+$",
        description="Worker identifier starting with @ (e.g., @sarah, @claude-code)",
    )
    type: Literal["human", "agent"] = Field(..., description="Worker type: human or agent")
    name: str = Field(..., min_length=1, max_length=200, description="Display name for the worker")
    agent_type: Literal["claude", "qwen", "gemini", "custom"] | None = Field(
        default=None, description="Type of agent (required if type is 'agent')"
    )
    capabilities: list[str] = Field(
        default_factory=list,
        description="List of agent capabilities (e.g., ['coding', 'research'])",
    )
    created_at: datetime = Field(..., description="When this worker was registered")

    @model_validator(mode="after")
    def validate_agent_type(self) -> "Worker":
        """Ensure agent_type is provided when type is 'agent'."""
        if self.type == "agent" and self.agent_type is None:
            raise ValueError("agent_type is required when type is 'agent'")
        return self


class Task(BaseModel):
    """Task model representing a unit of work.

    Tasks can be assigned to humans or agents, have status tracking,
    and support hierarchical relationships (parent-child subtasks).
    """

    id: int = Field(..., description="Unique task identifier")
    title: str = Field(..., min_length=1, max_length=500, description="Task title/summary")
    description: str | None = Field(default=None, description="Detailed task description")
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] = Field(
        default="pending", description="Current task status"
    )
    priority: Literal["low", "medium", "high", "critical"] = Field(
        default="medium", description="Task priority level"
    )
    progress_percent: int = Field(
        default=0, ge=0, le=100, description="Completion percentage (0-100)"
    )
    project_slug: str = Field(..., description="Project this task belongs to")
    assigned_to: str | None = Field(default=None, description="Worker ID assigned to this task")
    parent_id: int | None = Field(
        default=None, description="Parent task ID for subtasks (enables recursion)"
    )
    tags: list[str] = Field(default_factory=list, description="Task tags for categorization")
    due_date: datetime | None = Field(default=None, description="Task deadline")
    recurrence: str | None = Field(
        default=None, description="Recurrence pattern (e.g., 'daily', 'weekly')"
    )
    created_by: str = Field(..., description="Worker ID who created this task")
    created_at: datetime = Field(..., description="When this task was created")
    updated_at: datetime = Field(..., description="When this task was last updated")


class AuditLog(BaseModel):
    """Audit log model for tracking all actions.

    Every state change in TaskFlow creates an audit log entry.
    This ensures full accountability for both human and agent actions.
    """

    id: int = Field(..., description="Unique audit log entry ID")
    task_id: int | None = Field(
        default=None, description="Task ID if this action relates to a task"
    )
    project_slug: str | None = Field(
        default=None, description="Project slug if this action relates to a project"
    )
    actor_id: str = Field(..., description="Worker ID who performed the action")
    actor_type: Literal["human", "agent"] = Field(
        ..., description="Type of actor who performed the action"
    )
    action: str = Field(
        ..., description="Action performed (e.g., 'created', 'started', 'completed')"
    )
    context: dict[str, Any] = Field(
        default_factory=dict, description="Additional context about the action"
    )
    timestamp: datetime = Field(..., description="When this action occurred")


# Status transition validation
VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["in_progress", "blocked"],
    "in_progress": ["review", "completed", "blocked"],
    "review": ["in_progress", "completed"],
    "completed": ["review"],  # Can reopen for corrections
    "blocked": ["pending", "in_progress"],
}


def validate_status_transition(current: str, next: str) -> bool:
    """Validate if a status transition is allowed.

    Args:
        current: Current task status
        next: Desired next status

    Returns:
        True if transition is valid, False otherwise
    """
    if current not in VALID_TRANSITIONS:
        return False
    return next in VALID_TRANSITIONS[current]
