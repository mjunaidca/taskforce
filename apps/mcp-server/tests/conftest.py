"""Test fixtures for TaskFlow MCP Server."""

import pytest


@pytest.fixture
def mock_task():
    """Sample task response from API."""
    return {
        "id": 42,
        "title": "Test Task",
        "description": "A test task",
        "status": "pending",
        "priority": "medium",
        "progress_percent": 0,
        "assignee_id": None,
        "assignee_handle": None,
        "project_id": 1,
        "created_at": "2025-12-07T00:00:00Z",
        "updated_at": "2025-12-07T00:00:00Z",
    }


@pytest.fixture
def mock_project():
    """Sample project response from API."""
    return {
        "id": 1,
        "name": "Test Project",
        "slug": "test-project",
        "description": "A test project",
        "task_count": 5,
        "member_count": 2,
        "created_at": "2025-12-07T00:00:00Z",
        "updated_at": "2025-12-07T00:00:00Z",
    }
