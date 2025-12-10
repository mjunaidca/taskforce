"""Task management MCP tools.

Implements 10 tools for task operations:
- taskflow_add_task: Create new task
- taskflow_list_tasks: List project tasks
- taskflow_show_task_form: Show interactive task creation form
- taskflow_complete_task: Mark task complete
- taskflow_delete_task: Remove task
- taskflow_update_task: Modify task
- taskflow_start_task: Claim and start task
- taskflow_update_progress: Report progress
- taskflow_request_review: Submit for review
- taskflow_assign_task: Assign to worker
"""

import json

from mcp.server.fastmcp.server import Context

from ..api_client import APIError, get_api_client
from ..app import mcp
from ..models import (
    AddTaskInput,
    AssignInput,
    ListTasksInput,
    ProgressInput,
    TaskIdInput,
    UpdateTaskInput,
)


def _format_error(e: APIError, task_id: int | None = None) -> str:
    """Format API error as JSON response."""
    result = {
        "error": True,
        "message": e.detail or e.message,
        "status_code": e.status_code,
    }
    if task_id:
        result["task_id"] = task_id
    return json.dumps(result, indent=2)


def _format_task_result(task: dict, status: str) -> str:
    """Format task operation result as JSON."""
    return json.dumps(
        {
            "task_id": task.get("id"),
            "status": status,
            "title": task.get("title"),
        },
        indent=2,
    )


# =============================================================================
# CRUD Operations
# =============================================================================


@mcp.tool(
    name="taskflow_add_task",
    annotations={
        "title": "Add Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def taskflow_add_task(params: AddTaskInput, ctx: Context) -> str:
    """Create a new task in a project.

    Args:
        params: AddTaskInput with user_id, project_id, title, and optional description

    Returns:
        JSON with task_id, status="created", and title

    Example:
        Input: {"user_id": "user123", "project_id": 1, "title": "Implement feature"}
        Output: {"task_id": 42, "status": "created", "title": "Implement feature"}
    """
    try:
        client = get_api_client()
        result = await client.create_task(
            user_id=params.user_id,
            project_id=params.project_id,
            title=params.title,
            description=params.description,
            access_token=params.access_token,
        )
        return _format_task_result(result, "created")
    except APIError as e:
        return _format_error(e)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e)})


@mcp.tool(
    name="taskflow_list_tasks",
    annotations={
        "title": "List Tasks",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_list_tasks(params: ListTasksInput, ctx: Context) -> str:
    """List tasks in a project with search, filter, and sort capabilities.

    Args:
        params: ListTasksInput with user_id, project_id, and optional filters:
            - status: Filter by status (pending, in_progress, review, completed, blocked)
            - search: Search by title (case-insensitive)
            - tags: Comma-separated tags (AND logic, e.g., "work,urgent")
            - has_due_date: Filter by due date existence (true/false)
            - sort_by: Sort field (created_at, due_date, priority, title)
            - sort_order: Sort order (asc, desc)

    Returns:
        JSON array of tasks with id, title, status, priority, assignee_handle, due_date

    Example:
        Input: {"user_id": "user123", "project_id": 1, "search": "meeting", "sort_by": "priority"}
        Output: [{"id": 1, "title": "Team Meeting", "status": "pending", ...}, ...]
    """
    try:
        client = get_api_client()
        tasks = await client.list_tasks(
            user_id=params.user_id,
            project_id=params.project_id,
            status=params.status,
            search=params.search,
            tags=params.tags,
            has_due_date=params.has_due_date,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
            access_token=params.access_token,
        )
        # Return simplified task list
        result = [
            {
                "id": t.get("id"),
                "title": t.get("title"),
                "status": t.get("status"),
                "priority": t.get("priority"),
                "progress_percent": t.get("progress_percent"),
                "assignee_handle": t.get("assignee_handle"),
                "due_date": t.get("due_date"),
                "tags": t.get("tags"),
            }
            for t in tasks
        ]
        return json.dumps(result, indent=2)
    except APIError as e:
        return _format_error(e)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e)})


@mcp.tool(
    name="taskflow_show_task_form",
    annotations={
        "title": "Show Task Creation Form",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_show_task_form(params: TaskIdInput, ctx: Context) -> str:
    """Show interactive task creation form widget.

    Triggers the form widget UI for creating a new task with all fields.
    This is used when the user wants to create a task but hasn't provided all details.

    Args:
        params: TaskIdInput with user_id and access_token (task_id is ignored)

    Returns:
        JSON with action="show_form" signal

    Example:
        Input: {"user_id": "user123", "access_token": "token"}
        Output: {"action": "show_form", "form_type": "task_creation"}
    """
    return json.dumps(
        {
            "action": "show_form",
            "form_type": "task_creation",
            "user_id": params.user_id,
        },
        indent=2,
    )


@mcp.tool(
    name="taskflow_update_task",
    annotations={
        "title": "Update Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_update_task(params: UpdateTaskInput, ctx: Context) -> str:
    """Update task title or description.

    Args:
        params: UpdateTaskInput with user_id, task_id, and optional title/description

    Returns:
        JSON with task_id, status="updated", and title

    Example:
        Input: {"user_id": "user123", "task_id": 42, "title": "Updated title"}
        Output: {"task_id": 42, "status": "updated", "title": "Updated title"}
    """
    try:
        client = get_api_client()
        result = await client.update_task(
            user_id=params.user_id,
            task_id=params.task_id,
            title=params.title,
            description=params.description,
            access_token=params.access_token,
        )
        return _format_task_result(result, "updated")
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


@mcp.tool(
    name="taskflow_delete_task",
    annotations={
        "title": "Delete Task",
        "readOnlyHint": False,
        "destructiveHint": True,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_delete_task(params: TaskIdInput, ctx: Context) -> str:
    """Delete a task.

    Args:
        params: TaskIdInput with user_id and task_id

    Returns:
        JSON with task_id, status="deleted"

    Example:
        Input: {"user_id": "user123", "task_id": 42}
        Output: {"task_id": 42, "status": "deleted", "title": null}
    """
    try:
        client = get_api_client()
        await client.delete_task(
            user_id=params.user_id,
            task_id=params.task_id,
            access_token=params.access_token,
        )
        return json.dumps(
            {
                "task_id": params.task_id,
                "status": "deleted",
                "title": None,
            },
            indent=2,
        )
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


# =============================================================================
# Workflow Operations
# =============================================================================


@mcp.tool(
    name="taskflow_start_task",
    annotations={
        "title": "Start Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def taskflow_start_task(params: TaskIdInput, ctx: Context) -> str:
    """Claim and start working on a task.

    Changes task status to "in_progress" and sets started_at timestamp.

    Args:
        params: TaskIdInput with user_id and task_id

    Returns:
        JSON with task_id, status="in_progress", and title

    Example:
        Input: {"user_id": "user123", "task_id": 42}
        Output: {"task_id": 42, "status": "in_progress", "title": "Task title"}
    """
    try:
        client = get_api_client()
        result = await client.update_status(
            user_id=params.user_id,
            task_id=params.task_id,
            status="in_progress",
            access_token=params.access_token,
        )
        return _format_task_result(result, "in_progress")
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


@mcp.tool(
    name="taskflow_complete_task",
    annotations={
        "title": "Complete Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def taskflow_complete_task(params: TaskIdInput, ctx: Context) -> str:
    """Mark a task as complete.

    Changes task status to "completed" and sets progress to 100%.

    Args:
        params: TaskIdInput with user_id and task_id

    Returns:
        JSON with task_id, status="completed", and title

    Example:
        Input: {"user_id": "user123", "task_id": 42}
        Output: {"task_id": 42, "status": "completed", "title": "Task title"}
    """
    try:
        client = get_api_client()
        result = await client.update_status(
            user_id=params.user_id,
            task_id=params.task_id,
            status="completed",
            access_token=params.access_token,
        )
        return _format_task_result(result, "completed")
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


@mcp.tool(
    name="taskflow_request_review",
    annotations={
        "title": "Request Review",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def taskflow_request_review(params: TaskIdInput, ctx: Context) -> str:
    """Submit a task for review.

    Changes task status to "review" for human approval.

    Args:
        params: TaskIdInput with user_id and task_id

    Returns:
        JSON with task_id, status="review", and title

    Example:
        Input: {"user_id": "user123", "task_id": 42}
        Output: {"task_id": 42, "status": "review", "title": "Task title"}
    """
    try:
        client = get_api_client()
        result = await client.update_status(
            user_id=params.user_id,
            task_id=params.task_id,
            status="review",
            access_token=params.access_token,
        )
        return _format_task_result(result, "review")
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


@mcp.tool(
    name="taskflow_update_progress",
    annotations={
        "title": "Update Progress",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_update_progress(params: ProgressInput, ctx: Context) -> str:
    """Report progress on a task.

    Updates progress_percent and optionally adds a progress note.
    Task must be in "in_progress" status.

    Args:
        params: ProgressInput with user_id, task_id, progress_percent (0-100), and optional note

    Returns:
        JSON with task_id, status (current status), and title

    Example:
        Input: {"user_id": "user123", "task_id": 42, "progress_percent": 75, "note": "Almost done"}
        Output: {"task_id": 42, "status": "in_progress", "title": "Task title"}
    """
    try:
        client = get_api_client()
        result = await client.update_progress(
            user_id=params.user_id,
            task_id=params.task_id,
            percent=params.progress_percent,
            note=params.note,
            access_token=params.access_token,
        )
        return _format_task_result(result, result.get("status", "in_progress"))
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})


@mcp.tool(
    name="taskflow_assign_task",
    annotations={
        "title": "Assign Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def taskflow_assign_task(params: AssignInput, ctx: Context) -> str:
    """Assign a task to a worker.

    Args:
        params: AssignInput with user_id, task_id, and assignee_id

    Returns:
        JSON with task_id, status="assigned", and title

    Example:
        Input: {"user_id": "user123", "task_id": 42, "assignee_id": 5}
        Output: {"task_id": 42, "status": "assigned", "title": "Task title"}
    """
    try:
        client = get_api_client()
        result = await client.assign_task(
            user_id=params.user_id,
            task_id=params.task_id,
            assignee_id=params.assignee_id,
            access_token=params.access_token,
        )
        return _format_task_result(result, "assigned")
    except APIError as e:
        return _format_error(e, params.task_id)
    except Exception as e:
        return json.dumps({"error": True, "message": str(e), "task_id": params.task_id})
