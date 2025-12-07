"""Tests for TaskFlow status command.

Tests for the status command that displays a comprehensive summary:
- Current project and worker context
- Task counts by status
- Upcoming due dates
- Recent activity from audit logs
"""

import os
from datetime import datetime, timedelta

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.models import AuditLog, Task, Worker
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
    config["current_user"] = "@sarah"
    storage.save_config(config)

    # Add test workers
    worker1 = Worker(
        id="@sarah",
        type="human",
        name="Sarah",
        created_at=datetime.now(),
    )
    worker2 = Worker(
        id="@claude-code",
        type="agent",
        name="Claude Code",
        agent_type="claude",
        capabilities=["coding"],
        created_at=datetime.now(),
    )
    storage.add_worker(worker1)
    storage.add_worker(worker2)

    yield tmp_path, storage

    # Cleanup
    os.environ.pop("TASKFLOW_HOME", None)


class TestStatusCommand:
    """Tests for the status command."""

    def test_status_shows_project(self, temp_taskflow):
        """Test that status shows current project."""
        tmp_path, storage = temp_taskflow

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Project: default" in result.stdout

    def test_status_shows_worker(self, temp_taskflow):
        """Test that status shows current worker."""
        tmp_path, storage = temp_taskflow

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Worker: @sarah" in result.stdout

    def test_status_shows_task_counts(self, temp_taskflow):
        """Test that status shows task counts by status."""
        tmp_path, storage = temp_taskflow

        # Create tasks with different statuses
        now = datetime.now()
        tasks_data = [
            ("pending", 3),
            ("in_progress", 2),
            ("review", 1),
            ("completed", 15),
        ]

        task_id = 1
        for status, count in tasks_data:
            for i in range(count):
                task = Task(
                    id=task_id,
                    title=f"Task {task_id}",
                    status=status,
                    project_slug="default",
                    created_by="@sarah",
                    created_at=now,
                    updated_at=now,
                )
                storage.add_task(task)
                task_id += 1

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Pending:     3" in result.stdout
        assert "In Progress: 2" in result.stdout
        assert "Review:      1" in result.stdout
        assert "Completed:   15" in result.stdout

    def test_status_shows_upcoming(self, temp_taskflow):
        """Test that status shows upcoming due dates."""
        tmp_path, storage = temp_taskflow

        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        in_3_days = now + timedelta(days=3)

        # Create tasks with due dates
        task1 = Task(
            id=1,
            title="Fix login bug",
            status="pending",
            project_slug="default",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
            due_date=tomorrow,
        )
        task2 = Task(
            id=2,
            title="Update docs",
            status="pending",
            project_slug="default",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
            due_date=in_3_days,
        )
        storage.add_task(task1)
        storage.add_task(task2)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Upcoming Due Dates" in result.stdout
        assert "#1" in result.stdout
        assert "Fix login bug" in result.stdout
        assert "#2" in result.stdout
        assert "Update docs" in result.stdout

    def test_status_shows_recent_activity(self, temp_taskflow):
        """Test that status shows recent activity from audit logs."""
        tmp_path, storage = temp_taskflow

        now = datetime.now()
        two_hours_ago = now - timedelta(hours=2)
        three_hours_ago = now - timedelta(hours=3)

        # Create a task
        task1 = Task(
            id=1,
            title="Test task",
            status="completed",
            project_slug="default",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
        )
        storage.add_task(task1)

        # Create audit logs
        audit1 = AuditLog(
            id=1,
            task_id=1,
            project_slug="default",
            actor_id="@sarah",
            actor_type="human",
            action="completed",
            context={"status": "completed"},
            timestamp=two_hours_ago,
        )
        audit2 = AuditLog(
            id=2,
            task_id=1,
            project_slug="default",
            actor_id="@claude-code",
            actor_type="agent",
            action="started",
            context={"status": "in_progress"},
            timestamp=three_hours_ago,
        )
        storage.add_audit_log(audit1)
        storage.add_audit_log(audit2)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Recent Activity" in result.stdout
        assert "@sarah" in result.stdout
        assert "completed" in result.stdout
        assert "@claude-code" in result.stdout
        assert "started" in result.stdout

    def test_status_empty_state(self, temp_taskflow):
        """Test status with no tasks or activity."""
        tmp_path, storage = temp_taskflow

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        assert "Project: default" in result.stdout
        assert "Worker: @sarah" in result.stdout
        # Should show zeros for task counts
        assert "0" in result.stdout

    def test_status_uninitialized(self, tmp_path):
        """Test status command when TaskFlow is not initialized."""
        os.environ["TASKFLOW_HOME"] = str(tmp_path)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 1
        assert "not initialized" in result.stdout.lower()

        # Cleanup
        os.environ.pop("TASKFLOW_HOME", None)

    def test_status_no_upcoming_tasks(self, temp_taskflow):
        """Test status when there are no upcoming tasks."""
        tmp_path, storage = temp_taskflow

        # Create a task without due date
        now = datetime.now()
        task = Task(
            id=1,
            title="Test task",
            status="pending",
            project_slug="default",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
        )
        storage.add_task(task)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        # Should still show the section but with no entries
        assert "Upcoming Due Dates" in result.stdout

    def test_status_limits_upcoming_to_3(self, temp_taskflow):
        """Test that status only shows next 3 upcoming due dates."""
        tmp_path, storage = temp_taskflow

        now = datetime.now()
        # Create 5 tasks with different due dates
        for i in range(5):
            due = now + timedelta(days=i + 1)
            task = Task(
                id=i + 1,
                title=f"Task {i + 1}",
                status="pending",
                project_slug="default",
                created_by="@sarah",
                created_at=now,
                updated_at=now,
                due_date=due,
            )
            storage.add_task(task)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        # Should show only first 3 tasks
        assert "#1" in result.stdout
        assert "#2" in result.stdout
        assert "#3" in result.stdout
        # Should not show tasks 4 and 5 in the upcoming section
        lines = result.stdout.split("\n")
        upcoming_section_started = False
        recent_section_started = False
        upcoming_count = 0
        for line in lines:
            if "Upcoming Due Dates" in line:
                upcoming_section_started = True
            elif "Recent Activity" in line:
                recent_section_started = True
                upcoming_section_started = False
            elif upcoming_section_started and not recent_section_started and "#" in line:
                upcoming_count += 1
        assert upcoming_count <= 3

    def test_status_limits_recent_to_5(self, temp_taskflow):
        """Test that status only shows last 5 recent activities."""
        tmp_path, storage = temp_taskflow

        now = datetime.now()
        # Create 7 audit logs
        for i in range(7):
            timestamp = now - timedelta(hours=i)
            audit = AuditLog(
                id=i + 1,
                task_id=1,
                project_slug="default",
                actor_id="@sarah",
                actor_type="human",
                action=f"action_{i}",
                context={},
                timestamp=timestamp,
            )
            storage.add_audit_log(audit)

        result = runner.invoke(app, ["status"])
        assert result.exit_code == 0
        # Should show only 5 most recent activities
        lines = result.stdout.split("\n")
        recent_count = 0
        recent_section_started = False
        for line in lines:
            if "Recent Activity" in line:
                recent_section_started = True
            elif recent_section_started and "@sarah" in line:
                recent_count += 1
        assert recent_count <= 5
