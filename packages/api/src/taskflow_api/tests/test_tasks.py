"""Tests for task endpoints."""

import pytest
from httpx import AsyncClient

from .conftest import create_test_project, create_test_task


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient) -> None:
    """Test creating a new task."""
    project = await create_test_project(client)
    response = await client.post(
        f"/api/projects/{project['id']}/tasks",
        json={
            "title": "New Task",
            "description": "Task description",
            "priority": "high",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Task"
    assert data["description"] == "Task description"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert data["progress_percent"] == 0


@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient) -> None:
    """Test listing tasks in a project."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Task 1")
    await create_test_task(client, project["id"], "Task 2")

    response = await client.get(f"/api/projects/{project['id']}/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    titles = [t["title"] for t in data]
    assert "Task 1" in titles
    assert "Task 2" in titles


@pytest.mark.asyncio
async def test_list_tasks_filter_by_status(client: AsyncClient) -> None:
    """Test filtering tasks by status."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "In Progress Task")

    # Start the task
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})

    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"status": "in_progress"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "In Progress Task"


@pytest.mark.asyncio
async def test_get_task(client: AsyncClient) -> None:
    """Test getting a specific task."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "Get Test Task")

    response = await client.get(f"/api/tasks/{task['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Get Test Task"
    assert "subtasks" in data


@pytest.mark.asyncio
async def test_get_task_not_found(client: AsyncClient) -> None:
    """Test getting non-existent task returns 404."""
    response = await client.get("/api/tasks/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_task(client: AsyncClient) -> None:
    """Test updating a task."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "Update Test")

    response = await client.put(
        f"/api/tasks/{task['id']}",
        json={"title": "Updated Title", "priority": "critical"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["priority"] == "critical"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient) -> None:
    """Test deleting a task."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "Delete Test")

    response = await client.delete(f"/api/tasks/{task['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify deleted
    response = await client.get(f"/api/tasks/{task['id']}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_with_subtasks_fails(client: AsyncClient) -> None:
    """Test deleting task with subtasks fails."""
    project = await create_test_project(client)
    parent = await create_test_task(client, project["id"], "Parent Task")
    await client.post(
        f"/api/tasks/{parent['id']}/subtasks",
        json={"title": "Subtask"},
    )

    response = await client.delete(f"/api/tasks/{parent['id']}")
    assert response.status_code == 400
    assert "subtasks" in response.json()["error"].lower()


@pytest.mark.asyncio
async def test_create_subtask(client: AsyncClient) -> None:
    """Test creating a subtask."""
    project = await create_test_project(client)
    parent = await create_test_task(client, project["id"], "Parent Task")

    response = await client.post(
        f"/api/tasks/{parent['id']}/subtasks",
        json={"title": "Subtask 1"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Subtask 1"
    assert data["parent_task_id"] == parent["id"]

    # Verify parent shows subtask
    response = await client.get(f"/api/tasks/{parent['id']}")
    assert len(response.json()["subtasks"]) == 1
