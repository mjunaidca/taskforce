"""Tests for Pydantic input models."""

import pytest
from pydantic import ValidationError

from taskflow_mcp.models import (
    AddTaskInput,
    AssignInput,
    AuthenticatedInput,
    ListProjectsInput,
    ListTasksInput,
    ProgressInput,
    TaskIdInput,
    UpdateTaskInput,
)


class TestAuthenticatedInput:
    """Tests for base AuthenticatedInput model."""

    def test_required_user_id(self):
        """Test that user_id is required."""
        with pytest.raises(ValidationError):
            AuthenticatedInput()

    def test_optional_access_token(self):
        """Test that access_token is optional."""
        data = AuthenticatedInput(user_id="user123")
        assert data.user_id == "user123"
        assert data.access_token is None

    def test_with_access_token(self):
        """Test model with access_token provided."""
        data = AuthenticatedInput(user_id="user123", access_token="jwt-token")
        assert data.access_token == "jwt-token"


class TestAddTaskInput:
    """Tests for AddTaskInput model."""

    def test_valid_input(self):
        """Test valid input with required fields."""
        data = AddTaskInput(
            user_id="user123",
            project_id=1,
            title="Test Task",
        )
        assert data.user_id == "user123"
        assert data.project_id == 1
        assert data.title == "Test Task"
        assert data.description is None
        assert data.access_token is None

    def test_with_description(self):
        """Test valid input with optional description."""
        data = AddTaskInput(
            user_id="user123",
            project_id=1,
            title="Test Task",
            description="A description",
        )
        assert data.description == "A description"

    def test_with_access_token(self):
        """Test input with access_token for production mode."""
        data = AddTaskInput(
            user_id="user123",
            project_id=1,
            title="Test Task",
            access_token="jwt-token",
        )
        assert data.access_token == "jwt-token"

    def test_empty_title_fails(self):
        """Test that empty title fails validation."""
        with pytest.raises(ValidationError):
            AddTaskInput(
                user_id="user123",
                project_id=1,
                title="",
            )

    def test_title_too_long_fails(self):
        """Test that title over 200 chars fails validation."""
        with pytest.raises(ValidationError):
            AddTaskInput(
                user_id="user123",
                project_id=1,
                title="x" * 201,
            )


class TestListTasksInput:
    """Tests for ListTasksInput model."""

    def test_default_status(self):
        """Test default status is 'all'."""
        data = ListTasksInput(user_id="user123", project_id=1)
        assert data.status == "all"

    def test_valid_status_values(self):
        """Test all valid status values."""
        for status in ["all", "pending", "in_progress", "review", "completed", "blocked"]:
            data = ListTasksInput(user_id="user123", project_id=1, status=status)
            assert data.status == status

    def test_invalid_status_fails(self):
        """Test invalid status fails validation."""
        with pytest.raises(ValidationError):
            ListTasksInput(user_id="user123", project_id=1, status="invalid")


class TestProgressInput:
    """Tests for ProgressInput model."""

    def test_valid_progress(self):
        """Test valid progress percentage."""
        data = ProgressInput(
            user_id="user123",
            task_id=42,
            progress_percent=50,
        )
        assert data.progress_percent == 50

    def test_progress_range(self):
        """Test progress range 0-100."""
        # Valid boundaries
        ProgressInput(user_id="user123", task_id=42, progress_percent=0)
        ProgressInput(user_id="user123", task_id=42, progress_percent=100)

        # Invalid boundaries
        with pytest.raises(ValidationError):
            ProgressInput(user_id="user123", task_id=42, progress_percent=-1)

        with pytest.raises(ValidationError):
            ProgressInput(user_id="user123", task_id=42, progress_percent=101)


class TestTaskIdInput:
    """Tests for TaskIdInput model."""

    def test_valid_input(self):
        """Test valid task ID input."""
        data = TaskIdInput(user_id="user123", task_id=42)
        assert data.user_id == "user123"
        assert data.task_id == 42


class TestUpdateTaskInput:
    """Tests for UpdateTaskInput model."""

    def test_partial_update(self):
        """Test partial update with only title."""
        data = UpdateTaskInput(
            user_id="user123",
            task_id=42,
            title="New Title",
        )
        assert data.title == "New Title"
        assert data.description is None

    def test_all_fields(self):
        """Test update with all fields."""
        data = UpdateTaskInput(
            user_id="user123",
            task_id=42,
            title="New Title",
            description="New Description",
        )
        assert data.title == "New Title"
        assert data.description == "New Description"


class TestAssignInput:
    """Tests for AssignInput model."""

    def test_valid_input(self):
        """Test valid assign input."""
        data = AssignInput(
            user_id="user123",
            task_id=42,
            assignee_id=5,
        )
        assert data.assignee_id == 5


class TestListProjectsInput:
    """Tests for ListProjectsInput model."""

    def test_valid_input(self):
        """Test valid list projects input."""
        data = ListProjectsInput(user_id="user123")
        assert data.user_id == "user123"

    def test_with_access_token(self):
        """Test with access_token."""
        data = ListProjectsInput(user_id="user123", access_token="jwt-token")
        assert data.access_token == "jwt-token"
