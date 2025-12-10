"""Pydantic models for MCP tool input validation.

Each MCP tool has a corresponding input model that validates
parameters before making REST API calls.

Authentication:
- In dev mode (TASKFLOW_DEV_MODE=true), only user_id is needed
- In production, access_token (JWT) should be provided by Chat Server
"""

from typing import Literal

from pydantic import BaseModel, Field


# =============================================================================
# Base Model with Auth
# =============================================================================


class AuthenticatedInput(BaseModel):
    """Base model with authentication fields."""

    user_id: str = Field(..., description="User ID performing the action")
    access_token: str | None = Field(
        None,
        description="JWT access token (required in production, optional in dev mode)",
    )


# =============================================================================
# Task Tool Input Models
# =============================================================================


class AddTaskInput(AuthenticatedInput):
    """Input for taskflow_add_task tool."""

    project_id: int = Field(..., description="Project ID to add task to")
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: str | None = Field(None, max_length=2000, description="Task description")


class ListTasksInput(AuthenticatedInput):
    """Input for taskflow_list_tasks tool."""

    project_id: int = Field(..., description="Project ID to list tasks from")
    status: Literal["all", "pending", "in_progress", "review", "completed", "blocked"] | None = (
        Field("all", description="Filter by status")
    )
    # Search, filter, and sort parameters (optional, backward compatible)
    search: str | None = Field(None, max_length=200, description="Search tasks by title (case-insensitive)")
    tags: str | None = Field(None, description="Comma-separated tags to filter by (AND logic)")
    has_due_date: bool | None = Field(None, description="Filter by due date existence (true/false)")
    sort_by: Literal["created_at", "due_date", "priority", "title"] | None = Field(
        None, description="Sort field (default: created_at)"
    )
    sort_order: Literal["asc", "desc"] | None = Field(None, description="Sort order (default: desc)")


class TaskIdInput(AuthenticatedInput):
    """Input for tools that operate on a single task by ID.

    Used by: taskflow_complete_task, taskflow_delete_task,
             taskflow_start_task, taskflow_request_review
    """

    task_id: int = Field(..., description="Task ID to operate on")


class UpdateTaskInput(AuthenticatedInput):
    """Input for taskflow_update_task tool."""

    task_id: int = Field(..., description="Task ID to update")
    title: str | None = Field(None, min_length=1, max_length=200, description="New task title")
    description: str | None = Field(None, max_length=2000, description="New task description")


class ProgressInput(AuthenticatedInput):
    """Input for taskflow_update_progress tool."""

    task_id: int = Field(..., description="Task ID to update progress for")
    progress_percent: int = Field(..., ge=0, le=100, description="Progress percentage (0-100)")
    note: str | None = Field(None, max_length=500, description="Progress note")


class AssignInput(AuthenticatedInput):
    """Input for taskflow_assign_task tool."""

    task_id: int = Field(..., description="Task ID to assign")
    assignee_id: int = Field(..., description="Worker ID to assign task to")


# =============================================================================
# Project Tool Input Models
# =============================================================================


class ListProjectsInput(AuthenticatedInput):
    """Input for taskflow_list_projects tool."""

    pass  # Only needs user_id and access_token from base class
