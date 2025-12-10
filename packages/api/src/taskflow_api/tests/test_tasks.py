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


# ============================================================================
# Search, Filter, and Sort Tests (Feature 012)
# ============================================================================


@pytest.mark.asyncio
async def test_list_tasks_search_by_title(client: AsyncClient) -> None:
    """Test searching tasks by title with ILIKE (case-insensitive)."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Weekly Meeting Notes")
    await create_test_task(client, project["id"], "Project Setup")
    await create_test_task(client, project["id"], "Team meeting agenda")

    # Search for "meeting" (case-insensitive)
    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"search": "meeting"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    titles = [t["title"] for t in data]
    assert "Weekly Meeting Notes" in titles
    assert "Team meeting agenda" in titles
    assert "Project Setup" not in titles


@pytest.mark.asyncio
async def test_list_tasks_search_empty_results(client: AsyncClient) -> None:
    """Test search with no matching results returns empty array."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Some Task")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"search": "nonexistent"}
    )
    assert response.status_code == 200
    assert response.json() == []


# Note: Tags filter tests require PostgreSQL JSONB support (not available in SQLite)
# These tests are skipped when running with SQLite in-memory database


@pytest.mark.skip(reason="Requires PostgreSQL JSONB (not SQLite)")
@pytest.mark.asyncio
async def test_list_tasks_filter_by_tags_single(client: AsyncClient) -> None:
    """Test filtering tasks by a single tag. Requires PostgreSQL."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Work Task", tags=["work", "urgent"])
    await create_test_task(client, project["id"], "Personal Task", tags=["personal"])
    await create_test_task(client, project["id"], "No Tags Task")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"tags": "work"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Work Task"


@pytest.mark.skip(reason="Requires PostgreSQL JSONB (not SQLite)")
@pytest.mark.asyncio
async def test_list_tasks_filter_by_tags_and_logic(client: AsyncClient) -> None:
    """Test filtering by multiple tags uses AND logic. Requires PostgreSQL."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Urgent Work", tags=["work", "urgent"])
    await create_test_task(client, project["id"], "Normal Work", tags=["work"])
    await create_test_task(client, project["id"], "Urgent Personal", tags=["personal", "urgent"])

    # Filter by work AND urgent - only "Urgent Work" has both
    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"tags": "work,urgent"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Urgent Work"


@pytest.mark.asyncio
async def test_list_tasks_filter_has_due_date_true(client: AsyncClient) -> None:
    """Test filtering tasks that have a due date."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "With Due Date", due_date="2025-12-31")
    await create_test_task(client, project["id"], "Without Due Date")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"has_due_date": "true"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "With Due Date"


@pytest.mark.asyncio
async def test_list_tasks_filter_has_due_date_false(client: AsyncClient) -> None:
    """Test filtering tasks that do not have a due date."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "With Due Date", due_date="2025-12-31")
    await create_test_task(client, project["id"], "Without Due Date")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"has_due_date": "false"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Without Due Date"


@pytest.mark.asyncio
async def test_list_tasks_sort_by_title_asc(client: AsyncClient) -> None:
    """Test sorting tasks by title ascending."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Zebra Task")
    await create_test_task(client, project["id"], "Alpha Task")
    await create_test_task(client, project["id"], "Middle Task")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "title", "sort_order": "asc"},
    )
    assert response.status_code == 200
    data = response.json()
    titles = [t["title"] for t in data]
    assert titles == ["Alpha Task", "Middle Task", "Zebra Task"]


@pytest.mark.asyncio
async def test_list_tasks_sort_by_title_desc(client: AsyncClient) -> None:
    """Test sorting tasks by title descending."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Zebra Task")
    await create_test_task(client, project["id"], "Alpha Task")
    await create_test_task(client, project["id"], "Middle Task")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "title", "sort_order": "desc"},
    )
    assert response.status_code == 200
    data = response.json()
    titles = [t["title"] for t in data]
    assert titles == ["Zebra Task", "Middle Task", "Alpha Task"]


@pytest.mark.asyncio
async def test_list_tasks_sort_by_priority_desc(client: AsyncClient) -> None:
    """Test sorting by priority descending (critical first)."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Low Task", priority="low")
    await create_test_task(client, project["id"], "Critical Task", priority="critical")
    await create_test_task(client, project["id"], "Medium Task", priority="medium")
    await create_test_task(client, project["id"], "High Task", priority="high")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "priority", "sort_order": "desc"},
    )
    assert response.status_code == 200
    data = response.json()
    priorities = [t["priority"] for t in data]
    # Custom order: critical > high > medium > low
    assert priorities == ["critical", "high", "medium", "low"]


@pytest.mark.asyncio
async def test_list_tasks_sort_by_priority_asc(client: AsyncClient) -> None:
    """Test sorting by priority ascending (low first)."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Low Task", priority="low")
    await create_test_task(client, project["id"], "Critical Task", priority="critical")
    await create_test_task(client, project["id"], "Medium Task", priority="medium")
    await create_test_task(client, project["id"], "High Task", priority="high")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "priority", "sort_order": "asc"},
    )
    assert response.status_code == 200
    data = response.json()
    priorities = [t["priority"] for t in data]
    # Custom order reversed: low > medium > high > critical
    assert priorities == ["low", "medium", "high", "critical"]


@pytest.mark.asyncio
async def test_list_tasks_sort_by_due_date_asc_nulls_last(client: AsyncClient) -> None:
    """Test sorting by due date ascending with nulls last."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "No Due Date")
    await create_test_task(client, project["id"], "Far Due Date", due_date="2025-12-31")
    await create_test_task(client, project["id"], "Near Due Date", due_date="2025-01-15")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "due_date", "sort_order": "asc"},
    )
    assert response.status_code == 200
    data = response.json()
    titles = [t["title"] for t in data]
    # Ascending: nearest date first, null dates last
    assert titles == ["Near Due Date", "Far Due Date", "No Due Date"]


@pytest.mark.asyncio
async def test_list_tasks_sort_by_due_date_desc_nulls_first(client: AsyncClient) -> None:
    """Test sorting by due date descending with nulls first."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "No Due Date")
    await create_test_task(client, project["id"], "Far Due Date", due_date="2025-12-31")
    await create_test_task(client, project["id"], "Near Due Date", due_date="2025-01-15")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"sort_by": "due_date", "sort_order": "desc"},
    )
    assert response.status_code == 200
    data = response.json()
    titles = [t["title"] for t in data]
    # Descending: null dates first, then furthest date
    assert titles == ["No Due Date", "Far Due Date", "Near Due Date"]


@pytest.mark.asyncio
async def test_list_tasks_combined_search_and_sort(client: AsyncClient) -> None:
    """Test combining search with sorting."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Report Draft", priority="low")
    await create_test_task(client, project["id"], "Report Final", priority="high")
    await create_test_task(client, project["id"], "Meeting Notes", priority="medium")

    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={"search": "report", "sort_by": "priority", "sort_order": "desc"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Only "Report" tasks, sorted by priority (high first)
    assert data[0]["title"] == "Report Final"
    assert data[1]["title"] == "Report Draft"


@pytest.mark.skip(reason="Requires PostgreSQL JSONB (not SQLite)")
@pytest.mark.asyncio
async def test_list_tasks_combined_filters_and_sort(client: AsyncClient) -> None:
    """Test combining multiple filters with sorting. Requires PostgreSQL."""
    project = await create_test_project(client)
    await create_test_task(
        client, project["id"], "Urgent Work Report",
        tags=["work"], due_date="2025-12-31", priority="high"
    )
    await create_test_task(
        client, project["id"], "Work Task No Date",
        tags=["work"], priority="low"
    )
    await create_test_task(
        client, project["id"], "Personal Task",
        tags=["personal"], due_date="2025-06-15", priority="medium"
    )

    # Filter: work tag + has due date, sort by title
    response = await client.get(
        f"/api/projects/{project['id']}/tasks",
        params={
            "tags": "work",
            "has_due_date": "true",
            "sort_by": "title",
            "sort_order": "asc",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Urgent Work Report"


@pytest.mark.asyncio
async def test_list_tasks_default_sort_unchanged(client: AsyncClient) -> None:
    """Test that default sort (created_at desc) is preserved for backward compatibility."""
    project = await create_test_project(client)
    # Create tasks in order - newest should appear first with default sort
    task1 = await create_test_task(client, project["id"], "First Task")
    task2 = await create_test_task(client, project["id"], "Second Task")
    task3 = await create_test_task(client, project["id"], "Third Task")

    # No sort params - should use default (created_at desc)
    response = await client.get(f"/api/projects/{project['id']}/tasks")
    assert response.status_code == 200
    data = response.json()
    # Most recently created first (desc order)
    assert data[0]["id"] == task3["id"]
    assert data[1]["id"] == task2["id"]
    assert data[2]["id"] == task1["id"]


@pytest.mark.asyncio
async def test_list_tasks_search_max_length(client: AsyncClient) -> None:
    """Test that search query respects max length validation."""
    project = await create_test_project(client)
    await create_test_task(client, project["id"], "Test Task")

    # Search with query exceeding 200 chars should fail validation
    long_query = "a" * 201
    response = await client.get(
        f"/api/projects/{project['id']}/tasks", params={"search": long_query}
    )
    assert response.status_code == 422  # Validation error
