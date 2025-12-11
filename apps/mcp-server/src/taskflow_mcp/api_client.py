"""Async HTTP client for TaskFlow REST API.

This client makes requests to the TaskFlow REST API on behalf of users.

Authentication modes:
1. Dev mode (TASKFLOW_DEV_MODE=true):
   - API must also be in dev mode
   - Passes X-User-ID header for user context

2. Production mode:
   - Requires access_token (JWT) from Chat Server
   - Passes Authorization: Bearer <token> header

3. Service token mode (TASKFLOW_SERVICE_TOKEN set):
   - Uses service token for all requests
   - For internal service-to-service calls
"""

import json
from typing import Any

import httpx

from .config import get_config


class APIError(Exception):
    """Error from TaskFlow REST API."""

    def __init__(self, status_code: int, message: str, detail: str | None = None):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        super().__init__(f"API Error {status_code}: {message}")


class TaskFlowAPIClient:
    """Async client for TaskFlow REST API."""

    def __init__(self):
        config = get_config()
        self.base_url = config.api_url.rstrip("/")
        self.timeout = config.api_timeout
        self.dev_mode = config.dev_mode
        self.service_token = config.service_token
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create httpx client with connection pooling."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _get_headers(self, user_id: str, access_token: str | None = None) -> dict[str, str]:
        """Get headers for API request.

        Args:
            user_id: User ID performing the action
            access_token: JWT from Chat Server (required in production)

        Returns:
            Headers dict with appropriate auth mechanism
        """
        headers: dict[str, str] = {}

        # Service token takes precedence (internal service calls)
        if self.service_token:
            headers["Authorization"] = f"Bearer {self.service_token}"
        # Production mode: require JWT
        elif access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        # Dev mode: use X-User-ID header (API must also be in dev mode)
        elif self.dev_mode:
            headers["X-User-ID"] = user_id
            headers["X-Service"] = "taskflow-mcp"
        else:
            # No auth available - request will fail with 401
            pass

        return headers

    async def _handle_response(self, response: httpx.Response) -> dict[str, Any]:
        """Handle API response, raising APIError on failure."""
        if response.status_code >= 400:
            try:
                error_data = response.json()
                detail = error_data.get("detail", str(error_data))
            except json.JSONDecodeError:
                detail = response.text

            raise APIError(
                status_code=response.status_code,
                message="Request failed",
                detail=detail,
            )

        if response.status_code == 204:
            return {"ok": True}

        return response.json()

    # =========================================================================
    # Project Methods
    # =========================================================================

    async def list_projects(
        self, user_id: str, access_token: str | None = None
    ) -> list[dict[str, Any]]:
        """List projects the user belongs to.

        Args:
            user_id: User ID to list projects for
            access_token: JWT from Chat Server (required in production)

        Returns:
            List of project objects with id, name, slug
        """
        client = await self._get_client()
        response = await client.get(
            "/api/projects",
            headers=self._get_headers(user_id, access_token),
        )
        return await self._handle_response(response)

    # =========================================================================
    # Task CRUD Methods
    # =========================================================================

    async def list_tasks(
        self,
        user_id: str,
        project_id: int,
        status: str | None = None,
        search: str | None = None,
        tags: str | None = None,
        has_due_date: bool | None = None,
        sort_by: str | None = None,
        sort_order: str | None = None,
        access_token: str | None = None,
    ) -> list[dict[str, Any]]:
        """List tasks in a project with search, filter, and sort capabilities.

        Args:
            user_id: User ID performing the action
            project_id: Project ID to list tasks from
            status: Optional status filter
            search: Search tasks by title (case-insensitive ILIKE)
            tags: Comma-separated tags to filter by (AND logic)
            has_due_date: Filter by due date existence
            sort_by: Sort field (created_at, due_date, priority, title)
            sort_order: Sort order (asc, desc)
            access_token: JWT from Chat Server (required in production)

        Returns:
            List of task objects
        """
        client = await self._get_client()
        params = {}
        if status and status != "all":
            params["status"] = status
        if search:
            params["search"] = search
        if tags:
            params["tags"] = tags
        if has_due_date is not None:
            params["has_due_date"] = str(has_due_date).lower()
        if sort_by:
            params["sort_by"] = sort_by
        if sort_order:
            params["sort_order"] = sort_order

        response = await client.get(
            f"/api/projects/{project_id}/tasks",
            headers=self._get_headers(user_id, access_token),
            params=params,
        )
        return await self._handle_response(response)

    async def create_task(
        self,
        user_id: str,
        project_id: int,
        title: str,
        description: str | None = None,
        is_recurring: bool = False,
        recurrence_pattern: str | None = None,
        max_occurrences: int | None = None,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """Create a new task.

        Args:
            user_id: User ID performing the action
            project_id: Project ID to create task in
            title: Task title
            description: Optional task description
            is_recurring: Whether task repeats when completed
            recurrence_pattern: Recurrence pattern (1m, 5m, etc.)
            max_occurrences: Max recurrences (null=unlimited)
            access_token: JWT from Chat Server (required in production)

        Returns:
            Created task object
        """
        client = await self._get_client()
        data: dict[str, Any] = {"title": title}
        if description:
            data["description"] = description
        if is_recurring:
            data["is_recurring"] = True
            if recurrence_pattern:
                data["recurrence_pattern"] = recurrence_pattern
            if max_occurrences:
                data["max_occurrences"] = max_occurrences

        response = await client.post(
            f"/api/projects/{project_id}/tasks",
            headers=self._get_headers(user_id, access_token),
            json=data,
        )
        return await self._handle_response(response)

    async def get_task(
        self, user_id: str, task_id: int, access_token: str | None = None
    ) -> dict[str, Any]:
        """Get task details.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to retrieve
            access_token: JWT from Chat Server (required in production)

        Returns:
            Task object with full details
        """
        client = await self._get_client()
        response = await client.get(
            f"/api/tasks/{task_id}",
            headers=self._get_headers(user_id, access_token),
        )
        return await self._handle_response(response)

    async def update_task(
        self,
        user_id: str,
        task_id: int,
        title: str | None = None,
        description: str | None = None,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """Update task title or description.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to update
            title: New title (optional)
            description: New description (optional)
            access_token: JWT from Chat Server (required in production)

        Returns:
            Updated task object
        """
        client = await self._get_client()
        data = {}
        if title is not None:
            data["title"] = title
        if description is not None:
            data["description"] = description

        response = await client.put(
            f"/api/tasks/{task_id}",
            headers=self._get_headers(user_id, access_token),
            json=data,
        )
        return await self._handle_response(response)

    async def delete_task(
        self, user_id: str, task_id: int, access_token: str | None = None
    ) -> dict[str, Any]:
        """Delete a task.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to delete
            access_token: JWT from Chat Server (required in production)

        Returns:
            Confirmation object
        """
        client = await self._get_client()
        response = await client.delete(
            f"/api/tasks/{task_id}",
            headers=self._get_headers(user_id, access_token),
        )
        return await self._handle_response(response)

    # =========================================================================
    # Workflow Methods
    # =========================================================================

    async def update_status(
        self,
        user_id: str,
        task_id: int,
        status: str,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """Update task status.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to update
            status: New status
            access_token: JWT from Chat Server (required in production)

        Returns:
            Updated task object
        """
        client = await self._get_client()
        response = await client.patch(
            f"/api/tasks/{task_id}/status",
            headers=self._get_headers(user_id, access_token),
            json={"status": status},
        )
        return await self._handle_response(response)

    async def update_progress(
        self,
        user_id: str,
        task_id: int,
        percent: int,
        note: str | None = None,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """Update task progress.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to update
            percent: Progress percentage (0-100)
            note: Optional progress note
            access_token: JWT from Chat Server (required in production)

        Returns:
            Updated task object
        """
        client = await self._get_client()
        data = {"percent": percent}
        if note:
            data["note"] = note

        response = await client.patch(
            f"/api/tasks/{task_id}/progress",
            headers=self._get_headers(user_id, access_token),
            json=data,
        )
        return await self._handle_response(response)

    async def assign_task(
        self,
        user_id: str,
        task_id: int,
        assignee_id: int,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """Assign task to a worker.

        Args:
            user_id: User ID performing the action
            task_id: Task ID to assign
            assignee_id: Worker ID to assign to
            access_token: JWT from Chat Server (required in production)

        Returns:
            Updated task object
        """
        client = await self._get_client()
        response = await client.patch(
            f"/api/tasks/{task_id}/assign",
            headers=self._get_headers(user_id, access_token),
            json={"assignee_id": assignee_id},
        )
        return await self._handle_response(response)


# Singleton client instance
_client: TaskFlowAPIClient | None = None


def get_api_client() -> TaskFlowAPIClient:
    """Get singleton API client instance."""
    global _client
    if _client is None:
        _client = TaskFlowAPIClient()
    return _client
