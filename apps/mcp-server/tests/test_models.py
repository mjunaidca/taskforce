"""Tests for Pydantic input models.

Updated for 014-mcp-oauth-standardization:
- AuthenticatedInput removed (auth handled by middleware)
- Models no longer have user_id/access_token fields
"""

import pytest
from pydantic import ValidationError

from taskflow_mcp.models import (
    AddTaskInput,
    AssignInput,
    ListProjectsInput,
    ListTasksInput,
    ProgressInput,
    TaskIdInput,
    UpdateTaskInput,
)


class TestAddTaskInput:
    """Tests for AddTaskInput model."""

    def test_valid_input(self):
        """Test valid input with required fields."""
        data = AddTaskInput(
            project_id=1,
            title="Test Task",
        )
        assert data.project_id == 1
        assert data.title == "Test Task"
        assert data.description is None

    def test_with_description(self):
        """Test valid input with optional description."""
        data = AddTaskInput(
            project_id=1,
            title="Test Task",
            description="A description",
        )
        assert data.description == "A description"

    def test_empty_title_fails(self):
        """Test that empty title fails validation."""
        with pytest.raises(ValidationError):
            AddTaskInput(
                project_id=1,
                title="",
            )

    def test_title_too_long_fails(self):
        """Test that title over 200 chars fails validation."""
        with pytest.raises(ValidationError):
            AddTaskInput(
                project_id=1,
                title="x" * 201,
            )

    def test_recurring_task(self):
        """Test recurring task fields."""
        data = AddTaskInput(
            project_id=1,
            title="Daily Standup",
            is_recurring=True,
            recurrence_pattern="daily",
            max_occurrences=30,
        )
        assert data.is_recurring is True
        assert data.recurrence_pattern == "daily"
        assert data.max_occurrences == 30


class TestListTasksInput:
    """Tests for ListTasksInput model."""

    def test_default_status(self):
        """Test default status is 'all'."""
        data = ListTasksInput(project_id=1)
        assert data.status == "all"

    def test_valid_status_values(self):
        """Test all valid status values."""
        for status in ["all", "pending", "in_progress", "review", "completed", "blocked"]:
            data = ListTasksInput(project_id=1, status=status)
            assert data.status == status

    def test_invalid_status_fails(self):
        """Test invalid status fails validation."""
        with pytest.raises(ValidationError):
            ListTasksInput(project_id=1, status="invalid")

    def test_search_and_filter_params(self):
        """Test search, filter, and sort parameters."""
        data = ListTasksInput(
            project_id=1,
            search="meeting",
            tags="work,urgent",
            has_due_date=True,
            sort_by="priority",
            sort_order="desc",
        )
        assert data.search == "meeting"
        assert data.tags == "work,urgent"
        assert data.has_due_date is True
        assert data.sort_by == "priority"
        assert data.sort_order == "desc"


class TestProgressInput:
    """Tests for ProgressInput model."""

    def test_valid_progress(self):
        """Test valid progress percentage."""
        data = ProgressInput(
            task_id=42,
            progress_percent=50,
        )
        assert data.progress_percent == 50

    def test_progress_range(self):
        """Test progress range 0-100."""
        # Valid boundaries
        ProgressInput(task_id=42, progress_percent=0)
        ProgressInput(task_id=42, progress_percent=100)

        # Invalid boundaries
        with pytest.raises(ValidationError):
            ProgressInput(task_id=42, progress_percent=-1)

        with pytest.raises(ValidationError):
            ProgressInput(task_id=42, progress_percent=101)

    def test_with_note(self):
        """Test progress with note."""
        data = ProgressInput(
            task_id=42,
            progress_percent=75,
            note="Almost done with implementation",
        )
        assert data.note == "Almost done with implementation"


class TestTaskIdInput:
    """Tests for TaskIdInput model."""

    def test_valid_input(self):
        """Test valid task ID input."""
        data = TaskIdInput(task_id=42)
        assert data.task_id == 42


class TestUpdateTaskInput:
    """Tests for UpdateTaskInput model."""

    def test_partial_update(self):
        """Test partial update with only title."""
        data = UpdateTaskInput(
            task_id=42,
            title="New Title",
        )
        assert data.title == "New Title"
        assert data.description is None

    def test_all_fields(self):
        """Test update with all fields."""
        data = UpdateTaskInput(
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
            task_id=42,
            assignee_id=5,
        )
        assert data.assignee_id == 5


class TestListProjectsInput:
    """Tests for ListProjectsInput model."""

    def test_valid_input(self):
        """Test valid list projects input (no params needed)."""
        data = ListProjectsInput()
        # No fields to assert - it's an empty model now
        assert data is not None
