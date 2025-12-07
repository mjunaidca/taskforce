"""Tests for task workflow - status transitions and complete lifecycle."""

import pytest
from httpx import AsyncClient

from .conftest import create_test_project, create_test_task


@pytest.mark.asyncio
async def test_status_transition_pending_to_in_progress(client: AsyncClient) -> None:
    """Test valid transition: pending -> in_progress."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    response = await client.patch(
        f"/api/tasks/{task['id']}/status",
        json={"status": "in_progress"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["started_at"] is not None


@pytest.mark.asyncio
async def test_status_transition_in_progress_to_review(client: AsyncClient) -> None:
    """Test valid transition: in_progress -> review."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    # pending -> in_progress
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})

    # in_progress -> review
    response = await client.patch(
        f"/api/tasks/{task['id']}/status",
        json={"status": "review"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "review"


@pytest.mark.asyncio
async def test_status_transition_review_to_completed(client: AsyncClient) -> None:
    """Test valid transition: review -> completed."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})

    response = await client.patch(
        f"/api/tasks/{task['id']}/status",
        json={"status": "completed"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None
    assert data["progress_percent"] == 100


@pytest.mark.asyncio
async def test_invalid_status_transition(client: AsyncClient) -> None:
    """Test invalid transition: pending -> completed (should fail)."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    response = await client.patch(
        f"/api/tasks/{task['id']}/status",
        json={"status": "completed"},
    )
    assert response.status_code == 400
    assert "invalid" in response.json()["error"].lower()


@pytest.mark.asyncio
async def test_invalid_transition_pending_to_review(client: AsyncClient) -> None:
    """Test invalid transition: pending -> review (should fail)."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    response = await client.patch(
        f"/api/tasks/{task['id']}/status",
        json={"status": "review"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_progress(client: AsyncClient) -> None:
    """Test updating task progress."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    # Must be in_progress to update progress
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})

    response = await client.patch(
        f"/api/tasks/{task['id']}/progress",
        json={"percent": 50, "note": "Halfway there"},
    )
    assert response.status_code == 200
    assert response.json()["progress_percent"] == 50


@pytest.mark.asyncio
async def test_update_progress_not_in_progress(client: AsyncClient) -> None:
    """Test updating progress fails if not in_progress."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    response = await client.patch(
        f"/api/tasks/{task['id']}/progress",
        json={"percent": 50},
    )
    assert response.status_code == 400
    assert "in_progress" in response.json()["error"].lower()


@pytest.mark.asyncio
async def test_approve_task(client: AsyncClient) -> None:
    """Test approving a task in review."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})

    response = await client.post(f"/api/tasks/{task['id']}/approve")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["progress_percent"] == 100


@pytest.mark.asyncio
async def test_approve_task_not_in_review(client: AsyncClient) -> None:
    """Test approving fails if not in review."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    response = await client.post(f"/api/tasks/{task['id']}/approve")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_reject_task(client: AsyncClient) -> None:
    """Test rejecting a task in review."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})

    response = await client.post(
        f"/api/tasks/{task['id']}/reject",
        json={"reason": "Needs more work"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_complete_task_lifecycle(client: AsyncClient) -> None:
    """Test complete task lifecycle: create -> start -> progress -> review -> approve."""
    project = await create_test_project(client)

    # Create
    task = await create_test_task(client, project["id"], "Lifecycle Task")
    assert task["status"] == "pending"

    # Start
    response = await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    assert response.json()["status"] == "in_progress"
    assert response.json()["started_at"] is not None

    # Progress updates
    await client.patch(f"/api/tasks/{task['id']}/progress", json={"percent": 25})
    await client.patch(f"/api/tasks/{task['id']}/progress", json={"percent": 50})
    await client.patch(f"/api/tasks/{task['id']}/progress", json={"percent": 75})

    response = await client.get(f"/api/tasks/{task['id']}")
    assert response.json()["progress_percent"] == 75

    # Submit for review
    response = await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})
    assert response.json()["status"] == "review"

    # Approve
    response = await client.post(f"/api/tasks/{task['id']}/approve")
    assert response.json()["status"] == "completed"
    assert response.json()["completed_at"] is not None
    assert response.json()["progress_percent"] == 100


@pytest.mark.asyncio
async def test_rejection_flow(client: AsyncClient) -> None:
    """Test rejection flow: create -> start -> review -> reject -> start -> review -> approve."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "Rejection Flow Task")

    # Start and submit for review
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})

    # Reject
    response = await client.post(
        f"/api/tasks/{task['id']}/reject",
        json={"reason": "Missing tests"},
    )
    assert response.json()["status"] == "in_progress"

    # Fix and resubmit
    await client.patch(f"/api/tasks/{task['id']}/progress", json={"percent": 90})
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "review"})

    # Approve
    response = await client.post(f"/api/tasks/{task['id']}/approve")
    assert response.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_blocked_status(client: AsyncClient) -> None:
    """Test blocking and unblocking a task."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"])

    # pending -> blocked
    response = await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "blocked"})
    assert response.json()["status"] == "blocked"

    # blocked -> pending
    response = await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "pending"})
    assert response.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_audit_trail_for_task(client: AsyncClient) -> None:
    """Test that task operations create audit entries."""
    project = await create_test_project(client)
    task = await create_test_task(client, project["id"], "Audit Test Task")

    # Perform some actions
    await client.patch(f"/api/tasks/{task['id']}/status", json={"status": "in_progress"})
    await client.patch(f"/api/tasks/{task['id']}/progress", json={"percent": 50})

    # Check audit trail
    response = await client.get(f"/api/tasks/{task['id']}/audit")
    assert response.status_code == 200
    data = response.json()

    # Should have: created + status_changed + progress_updated
    assert len(data) >= 3
    actions = [entry["action"] for entry in data]
    assert "created" in actions
    assert "status_changed" in actions
    assert "progress_updated" in actions
