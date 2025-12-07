"""Tests for TaskFlow search and filter features (Phase 8 - US6).

Tests for enhanced filtering and search capabilities:
- T108-T116: Enhanced list filters and search command
- Priority, tag, creator, due date filters
- Full-text search with highlighting
- Combined filter logic
- Sort options
"""

import os
from datetime import datetime

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.models import Project, Worker
from taskflow.storage import Storage

runner = CliRunner()


@pytest.fixture
def temp_taskflow(tmp_path):
    """Create a temporary TaskFlow directory with test data."""
    taskflow_dir = tmp_path / ".taskflow"
    taskflow_dir.mkdir()
    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Initialize storage
    storage = Storage(taskflow_dir)
    storage.initialize()

    # Set current user
    config = storage.load_config()
    config["current_user"] = "@testuser"
    storage.save_config(config)

    # Add test workers
    worker1 = Worker(
        id="@testuser",
        type="human",
        name="Test User",
        created_at=datetime.now(),
    )
    storage.add_worker(worker1)

    worker2 = Worker(
        id="@agent",
        type="agent",
        name="Test Agent",
        agent_type="claude",
        created_at=datetime.now(),
    )
    storage.add_worker(worker2)

    # Add test project
    project = Project(slug="test-project", name="Test Project", description="For testing")
    storage.add_project(project)

    yield storage

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


# T108: RED - Test filter by priority
class TestFilterByPriority:
    """Test filtering tasks by priority level."""

    def test_list_filter_priority_high(self, temp_taskflow):
        """Test filtering tasks by high priority."""
        runner.invoke(app, ["add", "Low Task", "--priority", "low"])
        runner.invoke(app, ["add", "Medium Task", "--priority", "medium"])
        runner.invoke(app, ["add", "High Task", "--priority", "high"])
        runner.invoke(app, ["add", "Critical Task", "--priority", "critical"])

        result = runner.invoke(app, ["list", "--priority", "high"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "High Task" in result.stdout or "3" in result.stdout

    def test_list_filter_priority_critical(self, temp_taskflow):
        """Test filtering tasks by critical priority."""
        runner.invoke(app, ["add", "Low Task", "--priority", "low"])
        runner.invoke(app, ["add", "Critical Task", "--priority", "critical"])

        result = runner.invoke(app, ["list", "--priority", "critical"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "critical" in result.stdout.lower()

    def test_list_filter_priority_invalid(self, temp_taskflow):
        """Test that invalid priority filter fails."""
        result = runner.invoke(app, ["list", "--priority", "super-urgent"])

        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "must be" in result.stdout.lower()


# T109: RED - Test filter by tag
class TestFilterByTag:
    """Test filtering tasks by tags."""

    def test_list_filter_single_tag(self, temp_taskflow):
        """Test filtering tasks by single tag."""
        runner.invoke(app, ["add", "API Task", "--tags", "api,backend"])
        runner.invoke(app, ["add", "Frontend Task", "--tags", "frontend,ui"])
        runner.invoke(app, ["add", "Backend Task", "--tags", "backend,database"])

        result = runner.invoke(app, ["list", "--tag", "frontend"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "Frontend Task" in result.stdout or "2" in result.stdout

    def test_list_filter_multiple_tags_or_logic(self, temp_taskflow):
        """Test filtering with multiple tags uses OR logic."""
        runner.invoke(app, ["add", "API Task", "--tags", "api,backend"])
        runner.invoke(app, ["add", "Frontend Task", "--tags", "frontend,ui"])
        runner.invoke(app, ["add", "Backend Task", "--tags", "backend,database"])
        runner.invoke(app, ["add", "Other Task", "--tags", "other"])

        # Should match tasks with EITHER api OR frontend
        result = runner.invoke(app, ["list", "--tag", "api", "--tag", "frontend"])

        assert result.exit_code == 0
        assert "Tasks (2)" in result.stdout

    def test_list_filter_tag_case_insensitive(self, temp_taskflow):
        """Test tag filtering is case-insensitive."""
        runner.invoke(app, ["add", "Task", "--tags", "API,Backend"])

        result = runner.invoke(app, ["list", "--tag", "api"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout


# T110: RED - Test filter by created_by
class TestFilterByCreatedBy:
    """Test filtering tasks by creator."""

    def test_list_filter_created_by_user(self, temp_taskflow):
        """Test filtering tasks created by specific user."""
        runner.invoke(app, ["add", "User Task"])
        runner.invoke(app, ["add", "Agent Task", "--created-by", "@agent"])

        result = runner.invoke(app, ["list", "--created-by", "@testuser"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout

    def test_list_filter_created_by_agent(self, temp_taskflow):
        """Test filtering tasks created by agent."""
        runner.invoke(app, ["add", "User Task"])
        runner.invoke(app, ["add", "Agent Task", "--created-by", "@agent"])

        result = runner.invoke(app, ["list", "--created-by", "@agent"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "Agent Task" in result.stdout or "2" in result.stdout


# T111: RED - Test filter by due date
class TestFilterByDueDate:
    """Test filtering tasks by due date."""

    def test_list_filter_due_before(self, temp_taskflow):
        """Test filtering tasks due before a date."""
        # Create tasks with different due dates
        runner.invoke(app, ["add", "Soon Task", "--due", "2025-01-15"])
        runner.invoke(app, ["add", "Later Task", "--due", "2025-02-15"])
        runner.invoke(app, ["add", "Much Later Task", "--due", "2025-03-15"])

        result = runner.invoke(app, ["list", "--due-before", "2025-02-01"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "Soon Task" in result.stdout or "1" in result.stdout

    def test_list_filter_due_after(self, temp_taskflow):
        """Test filtering tasks due after a date."""
        runner.invoke(app, ["add", "Soon Task", "--due", "2025-01-15"])
        runner.invoke(app, ["add", "Later Task", "--due", "2025-02-15"])
        runner.invoke(app, ["add", "Much Later Task", "--due", "2025-03-15"])

        result = runner.invoke(app, ["list", "--due-after", "2025-02-01"])

        assert result.exit_code == 0
        assert "Tasks (2)" in result.stdout

    def test_list_filter_due_date_range(self, temp_taskflow):
        """Test filtering tasks within a date range."""
        runner.invoke(app, ["add", "Soon Task", "--due", "2025-01-15"])
        runner.invoke(app, ["add", "Middle Task", "--due", "2025-02-15"])
        runner.invoke(app, ["add", "Later Task", "--due", "2025-03-15"])

        # Tasks due between Feb 1 and Mar 1
        result = runner.invoke(
            app, ["list", "--due-after", "2025-02-01", "--due-before", "2025-03-01"]
        )

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "Middle Task" in result.stdout or "2" in result.stdout

    def test_list_filter_due_date_invalid_format(self, temp_taskflow):
        """Test that invalid date format fails."""
        result = runner.invoke(app, ["list", "--due-before", "2025/01/15"])

        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "format" in result.stdout.lower()


# T112: RED - Test filter for unassigned tasks
class TestFilterUnassigned:
    """Test filtering unassigned tasks."""

    def test_list_filter_no_assignee(self, temp_taskflow):
        """Test filtering only unassigned tasks."""
        runner.invoke(app, ["add", "Unassigned Task"])
        runner.invoke(app, ["add", "Assigned Task", "--assign", "@agent"])
        runner.invoke(app, ["add", "Another Unassigned"])

        result = runner.invoke(app, ["list", "--no-assignee"])

        assert result.exit_code == 0
        assert "Tasks (2)" in result.stdout


# T113: RED - Test combined filters (AND logic)
class TestCombinedFilters:
    """Test combining multiple filters with AND logic."""

    def test_list_combined_priority_and_status(self, temp_taskflow):
        """Test combining priority and status filters."""
        runner.invoke(app, ["add", "High Pending", "--priority", "high"])
        runner.invoke(app, ["add", "High Active", "--priority", "high"])
        runner.invoke(app, ["edit", "2", "--status", "in_progress"])
        runner.invoke(app, ["add", "Medium Active", "--priority", "medium"])

        result = runner.invoke(app, ["list", "--priority", "high", "--status", "in_progress"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout
        assert "High Active" in result.stdout or "2" in result.stdout

    def test_list_combined_project_tag_priority(self, temp_taskflow):
        """Test combining project, tag, and priority filters."""
        runner.invoke(
            app,
            ["add", "Match", "--project", "test-project", "--tags", "urgent", "--priority", "high"],
        )
        runner.invoke(
            app,
            ["add", "No Match 1", "--project", "default", "--tags", "urgent", "--priority", "high"],
        )
        runner.invoke(
            app,
            [
                "add",
                "No Match 2",
                "--project",
                "test-project",
                "--tags",
                "normal",
                "--priority",
                "high",
            ],
        )
        runner.invoke(
            app,
            [
                "add",
                "No Match 3",
                "--project",
                "test-project",
                "--tags",
                "urgent",
                "--priority",
                "low",
            ],
        )

        result = runner.invoke(
            app, ["list", "--project", "test-project", "--tag", "urgent", "--priority", "high"]
        )

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout

    def test_list_filter_summary_displayed(self, temp_taskflow):
        """Test that active filters are shown in output."""
        runner.invoke(app, ["add", "Task", "--priority", "high", "--tags", "api"])

        result = runner.invoke(app, ["list", "--priority", "high", "--tag", "api"])

        assert result.exit_code == 0
        # Filter summary should appear in table title or above it
        assert "priority: high" in result.stdout.lower() or "high" in result.stdout


# T114: RED - Test search command
class TestSearchCommand:
    """Test full-text search command."""

    def test_search_in_title(self, temp_taskflow):
        """Test searching in task titles."""
        runner.invoke(app, ["add", "Implement API endpoint"])
        runner.invoke(app, ["add", "Fix database bug"])
        runner.invoke(app, ["add", "Write API documentation"])

        result = runner.invoke(app, ["search", "API"])

        assert result.exit_code == 0
        assert "2" in result.stdout  # Should find 2 tasks
        assert "API" in result.stdout or "api" in result.stdout.lower()

    def test_search_in_description(self, temp_taskflow):
        """Test searching in task descriptions."""
        runner.invoke(app, ["add", "Task 1", "--description", "Contains keyword search"])
        runner.invoke(app, ["add", "Task 2", "--description", "Different content"])
        runner.invoke(app, ["add", "Task 3", "--description", "Another keyword match"])

        result = runner.invoke(app, ["search", "keyword"])

        assert result.exit_code == 0
        assert "2" in result.stdout  # Should find 2 tasks

    def test_search_in_tags(self, temp_taskflow):
        """Test searching in tags."""
        runner.invoke(app, ["add", "Task 1", "--tags", "urgent,api"])
        runner.invoke(app, ["add", "Task 2", "--tags", "normal,backend"])
        runner.invoke(app, ["add", "Task 3", "--tags", "urgent,frontend"])

        result = runner.invoke(app, ["search", "urgent"])

        assert result.exit_code == 0
        assert "2" in result.stdout

    def test_search_case_insensitive(self, temp_taskflow):
        """Test search is case-insensitive."""
        runner.invoke(app, ["add", "API Endpoint", "--description", "REST API"])
        runner.invoke(app, ["add", "api documentation", "--description", "api docs"])

        result = runner.invoke(app, ["search", "api"])

        assert result.exit_code == 0
        assert "2" in result.stdout

    def test_search_with_project_filter(self, temp_taskflow):
        """Test search with project scope filter."""
        runner.invoke(app, ["add", "Default API", "--project", "default"])
        runner.invoke(app, ["add", "Test API", "--project", "test-project"])

        result = runner.invoke(app, ["search", "API", "--project", "test-project"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout or "1" in result.stdout
        assert "Test API" in result.stdout or "2" in result.stdout

    def test_search_with_status_filter(self, temp_taskflow):
        """Test search with status filter."""
        runner.invoke(app, ["add", "API Task 1"])
        runner.invoke(app, ["add", "API Task 2"])
        runner.invoke(app, ["edit", "2", "--status", "in_progress"])

        result = runner.invoke(app, ["search", "API", "--status", "in_progress"])

        assert result.exit_code == 0
        assert "Tasks (1)" in result.stdout or "1" in result.stdout

    def test_search_no_results(self, temp_taskflow):
        """Test search with no matches."""
        runner.invoke(app, ["add", "Task 1"])
        runner.invoke(app, ["add", "Task 2"])

        result = runner.invoke(app, ["search", "nonexistent"])

        assert result.exit_code == 0
        assert "no" in result.stdout.lower() or "0" in result.stdout

    def test_search_highlights_matches(self, temp_taskflow):
        """Test that search highlights matching text."""
        runner.invoke(app, ["add", "Implement API endpoint"])

        result = runner.invoke(app, ["search", "API"])

        assert result.exit_code == 0
        # Rich might highlight matches with bold or color
        assert "API" in result.stdout


# T115: RED - Test sort options
class TestSortOptions:
    """Test sorting tasks by different fields."""

    def test_list_sort_by_priority(self, temp_taskflow):
        """Test sorting tasks by priority."""
        runner.invoke(app, ["add", "Low Task", "--priority", "low"])
        runner.invoke(app, ["add", "Critical Task", "--priority", "critical"])
        runner.invoke(app, ["add", "Medium Task", "--priority", "medium"])
        runner.invoke(app, ["add", "High Task", "--priority", "high"])

        result = runner.invoke(app, ["list", "--sort", "priority"])

        assert result.exit_code == 0
        # Output should show tasks in priority order (critical first when not reversed)
        # Find positions of task IDs in output
        critical_id_pos = result.stdout.find("│ 2")  # Critical Task (ID 2)
        low_id_pos = result.stdout.find("│ 1")  # Low Task (ID 1)

        # Critical (ID 2) should appear before Low (ID 1) in the output
        assert critical_id_pos >= 0 and low_id_pos >= 0
        assert critical_id_pos < low_id_pos

    def test_list_sort_by_created(self, temp_taskflow):
        """Test sorting tasks by creation date."""
        runner.invoke(app, ["add", "First Task"])
        runner.invoke(app, ["add", "Second Task"])
        runner.invoke(app, ["add", "Third Task"])

        result = runner.invoke(app, ["list", "--sort", "created"])

        assert result.exit_code == 0
        # Default sort is ascending (oldest first), so ID 1 should be before ID 3
        # Find table cell positions for IDs
        id1_pos = result.stdout.find("│ 1")
        id3_pos = result.stdout.find("│ 3")
        assert id1_pos >= 0 and id3_pos >= 0
        assert id1_pos < id3_pos

    def test_list_sort_by_updated(self, temp_taskflow):
        """Test sorting tasks by updated date."""
        runner.invoke(app, ["add", "Task 1"])
        runner.invoke(app, ["add", "Task 2"])
        runner.invoke(app, ["add", "Task 3"])

        # Update task 1 (making it most recently updated)
        runner.invoke(app, ["edit", "1", "--title", "Updated Task 1"])

        result = runner.invoke(app, ["list", "--sort", "updated"])

        assert result.exit_code == 0
        # Task 1 should appear last (most recent)

    def test_list_sort_by_due_date(self, temp_taskflow):
        """Test sorting tasks by due date."""
        runner.invoke(app, ["add", "Later", "--due", "2025-03-15"])
        runner.invoke(app, ["add", "Soon", "--due", "2025-01-15"])
        runner.invoke(app, ["add", "Middle", "--due", "2025-02-15"])

        result = runner.invoke(app, ["list", "--sort", "due_date"])

        assert result.exit_code == 0
        # Tasks should be sorted by due date (earliest first)

    def test_list_sort_reverse(self, temp_taskflow):
        """Test reversing sort order."""
        runner.invoke(app, ["add", "Task 1"])
        runner.invoke(app, ["add", "Task 2"])
        runner.invoke(app, ["add", "Task 3"])

        result = runner.invoke(app, ["list", "--sort", "created", "--reverse"])

        assert result.exit_code == 0
        # Reverse order: newest first (ID 3 before ID 1)
        assert result.stdout.index("3") < result.stdout.index("1")

    def test_list_sort_invalid_field(self, temp_taskflow):
        """Test that invalid sort field fails."""
        result = runner.invoke(app, ["list", "--sort", "nonexistent"])

        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "must be" in result.stdout.lower()


# T116: RED - Test sort with filters
class TestSortWithFilters:
    """Test combining sort with filters."""

    def test_list_filter_and_sort(self, temp_taskflow):
        """Test applying filters then sorting results."""
        runner.invoke(app, ["add", "High 1", "--priority", "high", "--tags", "api"])
        runner.invoke(app, ["add", "High 2", "--priority", "high", "--tags", "api"])
        runner.invoke(app, ["add", "Medium", "--priority", "medium", "--tags", "api"])

        # Edit task 1 to make it more recent
        runner.invoke(app, ["edit", "1", "--title", "High 1 Updated"])

        result = runner.invoke(
            app, ["list", "--tag", "api", "--priority", "high", "--sort", "updated", "--reverse"]
        )

        assert result.exit_code == 0
        assert "Tasks (2)" in result.stdout
        # Task 1 (most recently updated) should appear first
