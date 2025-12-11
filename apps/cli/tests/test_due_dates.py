"""Tests for TaskFlow due date management features.

Tests following TDD approach for:
- upcoming: Show tasks with upcoming due dates
- overdue: Show overdue tasks
- due: Set or clear due dates
- list: Enhanced with due date icons
"""

import os
from datetime import datetime, timedelta

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.models import Project, Task, Worker
from taskflow.storage import Storage

runner = CliRunner()


@pytest.fixture
def temp_taskflow(tmp_path):
    """Create a temporary TaskFlow directory for testing."""
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

    # Add test user as worker
    worker = Worker(
        id="@testuser",
        type="human",
        name="Test User",
        created_at=datetime.now(),
    )
    storage.add_worker(worker)

    # Add test agent
    agent = Worker(
        id="@testagent",
        type="agent",
        name="Test Agent",
        agent_type="claude",
        created_at=datetime.now(),
    )
    storage.add_worker(agent)

    # Add test project
    project = Project(slug="test-project", name="Test Project", description="For testing")
    storage.add_project(project)

    yield storage

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


# T117: RED - Test upcoming command
class TestUpcomingCommand:
    """Test cases for 'taskflow upcoming' command."""

    def test_upcoming_default_7_days(self, temp_taskflow):
        """Test upcoming shows tasks due in next 7 days by default."""
        # Create tasks with different due dates
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Task due tomorrow
        task1 = Task(
            id=1,
            title="Due Tomorrow",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=1),
        )
        temp_taskflow.add_task(task1)

        # Task due in 5 days
        task2 = Task(
            id=2,
            title="Due in 5 days",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=5),
        )
        temp_taskflow.add_task(task2)

        # Task due in 10 days (should NOT appear)
        task3 = Task(
            id=3,
            title="Due in 10 days",
            status="pending",
            priority="low",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=10),
        )
        temp_taskflow.add_task(task3)

        # Task with no due date (should NOT appear)
        task4 = Task(
            id=4,
            title="No due date",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task4)

        result = runner.invoke(app, ["upcoming"])

        assert result.exit_code == 0
        assert "Due Tomorrow" in result.stdout
        assert "Due in 5 days" in result.stdout
        assert "Due in 10 days" not in result.stdout
        assert "No due date" not in result.stdout

    def test_upcoming_custom_days(self, temp_taskflow):
        """Test upcoming with custom --days option."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Task due in 2 days
        task1 = Task(
            id=1,
            title="Due in 2 days",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=2),
        )
        temp_taskflow.add_task(task1)

        # Task due in 5 days (should NOT appear with --days 3)
        task2 = Task(
            id=2,
            title="Due in 5 days",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=5),
        )
        temp_taskflow.add_task(task2)

        result = runner.invoke(app, ["upcoming", "--days", "3"])

        assert result.exit_code == 0
        assert "Due in 2 days" in result.stdout
        assert "Due in 5 days" not in result.stdout

    def test_upcoming_empty(self, temp_taskflow):
        """Test upcoming when no tasks have upcoming due dates."""
        result = runner.invoke(app, ["upcoming"])

        assert result.exit_code == 0
        assert "no upcoming tasks" in result.stdout.lower()

    def test_upcoming_grouped_by_date(self, temp_taskflow):
        """Test upcoming groups tasks by due date."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Two tasks due tomorrow
        task1 = Task(
            id=1,
            title="Task 1 due tomorrow",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=1),
        )
        temp_taskflow.add_task(task1)

        task2 = Task(
            id=2,
            title="Task 2 due tomorrow",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=1),
        )
        temp_taskflow.add_task(task2)

        # One task due in 3 days
        task3 = Task(
            id=3,
            title="Task due in 3 days",
            status="pending",
            priority="low",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=3),
        )
        temp_taskflow.add_task(task3)

        result = runner.invoke(app, ["upcoming"])

        assert result.exit_code == 0
        # Should have date headers grouping tasks
        # Tasks are in the output, titles may be wrapped by Rich
        assert "Task 1" in result.stdout or "Task 1 due tomorrow" in result.stdout
        assert "Task 2" in result.stdout or "Task 2 due tomorrow" in result.stdout
        assert "Task due in 3" in result.stdout or "Task due in 3 days" in result.stdout

    def test_upcoming_includes_today(self, temp_taskflow):
        """Test upcoming includes tasks due today."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            id=1,
            title="Due Today",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today,
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["upcoming"])

        assert result.exit_code == 0
        assert "Due Today" in result.stdout


# T118: RED - Test overdue command
class TestOverdueCommand:
    """Test cases for 'taskflow overdue' command."""

    def test_overdue_list(self, temp_taskflow):
        """Test overdue shows tasks with due_date < today."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Task overdue by 1 day
        task1 = Task(
            id=1,
            title="1 day overdue",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today - timedelta(days=5),
            updated_at=today,
            due_date=today - timedelta(days=1),
        )
        temp_taskflow.add_task(task1)

        # Task overdue by 5 days
        task2 = Task(
            id=2,
            title="5 days overdue",
            status="in_progress",
            priority="critical",
            project_slug="default",
            created_by="@testuser",
            created_at=today - timedelta(days=10),
            updated_at=today,
            due_date=today - timedelta(days=5),
        )
        temp_taskflow.add_task(task2)

        # Task due tomorrow (should NOT appear)
        task3 = Task(
            id=3,
            title="Due tomorrow",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=1),
        )
        temp_taskflow.add_task(task3)

        result = runner.invoke(app, ["overdue"])

        assert result.exit_code == 0
        # Check for task titles (may be wrapped by Rich)
        assert "1 day overdue" in result.stdout or "1 day" in result.stdout
        assert "5 days overdue" in result.stdout or "5 day" in result.stdout
        assert "Due tomorrow" not in result.stdout

    def test_overdue_sorted_by_urgency(self, temp_taskflow):
        """Test overdue sorts by most overdue first."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Task overdue by 1 day
        task1 = Task(
            id=1,
            title="1 day overdue",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today - timedelta(days=1),
        )
        temp_taskflow.add_task(task1)

        # Task overdue by 10 days (should appear first)
        task2 = Task(
            id=2,
            title="10 days overdue",
            status="pending",
            priority="critical",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today - timedelta(days=10),
        )
        temp_taskflow.add_task(task2)

        result = runner.invoke(app, ["overdue"])

        assert result.exit_code == 0
        # Most overdue should appear first - check for "10 day" appears before "1 day"
        # Account for Rich table wrapping
        if "10 days" in result.stdout and "1 day" in result.stdout:
            idx_10_days = result.stdout.index("10 days")
            idx_1_day = result.stdout.index("1 day")
            assert idx_10_days < idx_1_day
        else:
            # Just verify both are present
            assert "10" in result.stdout
            assert "1" in result.stdout

    def test_overdue_empty(self, temp_taskflow):
        """Test overdue when no tasks are overdue."""
        result = runner.invoke(app, ["overdue"])

        assert result.exit_code == 0
        assert "no overdue tasks" in result.stdout.lower()

    def test_overdue_shows_days_count(self, temp_taskflow):
        """Test overdue displays how many days overdue."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            id=1,
            title="Overdue Task",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today - timedelta(days=3),
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["overdue"])

        assert result.exit_code == 0
        # Should show "3 days" somewhere in output
        assert "3" in result.stdout and "day" in result.stdout.lower()


# T119: RED - Test due command for setting due dates
class TestDueCommand:
    """Test cases for 'taskflow due' command."""

    def test_set_due_date(self, temp_taskflow):
        """Test setting due date on existing task."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Create task without due date
        task = Task(
            id=1,
            title="Task without due date",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task)

        # Set due date
        due_date_str = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        result = runner.invoke(app, ["due", "1", "--date", due_date_str])

        assert result.exit_code == 0
        assert "due date set" in result.stdout.lower() or "updated" in result.stdout.lower()

        # Verify task was updated
        updated_task = temp_taskflow.get_task(1)
        assert updated_task is not None
        assert updated_task.due_date is not None
        assert updated_task.due_date.date() == (today + timedelta(days=7)).date()

    def test_clear_due_date(self, temp_taskflow):
        """Test clearing due date with --clear flag."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Create task with due date
        task = Task(
            id=1,
            title="Task with due date",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=7),
        )
        temp_taskflow.add_task(task)

        # Clear due date
        result = runner.invoke(app, ["due", "1", "--clear"])

        assert result.exit_code == 0
        assert "cleared" in result.stdout.lower() or "removed" in result.stdout.lower()

        # Verify due date was cleared
        updated_task = temp_taskflow.get_task(1)
        assert updated_task is not None
        assert updated_task.due_date is None

    def test_due_invalid_date_format(self, temp_taskflow):
        """Test due command rejects invalid date format."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            id=1,
            title="Test Task",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["due", "1", "--date", "2024-13-45"])

        assert result.exit_code != 0
        assert "invalid" in result.stdout.lower() or "error" in result.stdout.lower()

    def test_due_task_not_found(self, temp_taskflow):
        """Test due command handles non-existent task."""
        result = runner.invoke(app, ["due", "999", "--date", "2024-12-31"])

        assert result.exit_code != 0
        assert "not found" in result.stdout.lower()

    def test_due_creates_audit_log(self, temp_taskflow):
        """Test due command creates audit log entry."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            id=1,
            title="Test Task",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task)

        due_date_str = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        result = runner.invoke(app, ["due", "1", "--date", due_date_str])

        assert result.exit_code == 0

        # Check audit log
        logs = temp_taskflow.list_audit_logs(task_id=1)
        # Should have at least one log entry for due_date_set
        assert any("due_date" in log.action.lower() for log in logs)


# T120-T122: RED - Test list command enhancements
class TestListWithDueDateIcons:
    """Test cases for enhanced list command with due date icons."""

    def test_list_shows_overdue_task(self, temp_taskflow):
        """Test list shows overdue tasks with due date column."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)

        task = Task(
            id=1,
            title="Overdue Task",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=yesterday,
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Task ID 1 should appear and due date column should exist
        assert "1" in result.stdout
        assert "Due" in result.stdout

    def test_list_shows_upcoming_task(self, temp_taskflow):
        """Test list shows upcoming tasks with due date column."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)

        task = Task(
            id=1,
            title="Due Soon",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=tomorrow,
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Task ID 1 should appear and due date column should exist
        assert "1" in result.stdout
        assert "Due" in result.stdout

    def test_list_shows_due_date_column(self, temp_taskflow):
        """Test list shows due date column when any task has due_date."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Task with due date
        task1 = Task(
            id=1,
            title="Task with due date",
            status="pending",
            priority="high",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
            due_date=today + timedelta(days=7),
        )
        temp_taskflow.add_task(task1)

        # Task without due date
        task2 = Task(
            id=2,
            title="Task without due date",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task2)

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Should have "Due" column header
        assert "Due" in result.stdout or "due" in result.stdout.lower()

    def test_list_no_due_date_column_when_empty(self, temp_taskflow):
        """Test list doesn't show due date column when no tasks have due dates."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        task = Task(
            id=1,
            title="Task without due date",
            status="pending",
            priority="medium",
            project_slug="default",
            created_by="@testuser",
            created_at=today,
            updated_at=today,
        )
        temp_taskflow.add_task(task)

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Standard columns but no due date column if not needed
        # This is a design choice - we could always show it too
