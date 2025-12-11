"""Tests for TaskFlow audit viewing commands.

Tests for audit log viewing operations following TDD approach:
- audit list: List audit log entries with optional filtering
- audit show: Show detailed audit entry
- audit task: Show audit trail for specific task (shortcut)
- audit actor: Show audit trail for specific actor (shortcut)
"""

import os
from datetime import datetime

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.models import AuditLog, Project, Task, Worker
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

    # Add test workers
    worker = Worker(
        id="@testuser",
        type="human",
        name="Test User",
        created_at=datetime.now(),
    )
    storage.add_worker(worker)

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

    # Add test tasks
    task1 = Task(
        id=1,
        title="Task 1",
        project_slug="default",
        status="completed",
        created_by="@testuser",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    storage.add_task(task1)

    task2 = Task(
        id=2,
        title="Task 2",
        project_slug="default",
        status="in_progress",
        created_by="@testagent",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    storage.add_task(task2)

    # Add sample audit logs
    logs = [
        AuditLog(
            id=1,
            task_id=None,
            project_slug="default",
            actor_id="@testuser",
            actor_type="human",
            action="project_created",
            context={"project_name": "Default Project"},
            timestamp=datetime(2024, 12, 7, 13, 0, 0),
        ),
        AuditLog(
            id=2,
            task_id=1,
            project_slug="default",
            actor_id="@testuser",
            actor_type="human",
            action="created",
            context={"title": "Task 1"},
            timestamp=datetime(2024, 12, 7, 14, 0, 0),
        ),
        AuditLog(
            id=3,
            task_id=1,
            project_slug="default",
            actor_id="@testuser",
            actor_type="human",
            action="started",
            context={},
            timestamp=datetime(2024, 12, 7, 14, 30, 0),
        ),
        AuditLog(
            id=4,
            task_id=1,
            project_slug="default",
            actor_id="@testuser",
            actor_type="human",
            action="progressed",
            context={"progress_percent": 50},
            timestamp=datetime(2024, 12, 7, 15, 0, 0),
        ),
        AuditLog(
            id=5,
            task_id=1,
            project_slug="default",
            actor_id="@testagent",
            actor_type="agent",
            action="completed",
            context={"progress_percent": 100, "title": "Task 1"},
            timestamp=datetime(2024, 12, 7, 15, 30, 0),
        ),
        AuditLog(
            id=6,
            task_id=2,
            project_slug="default",
            actor_id="@testagent",
            actor_type="agent",
            action="created",
            context={"title": "Task 2"},
            timestamp=datetime(2024, 12, 7, 16, 0, 0),
        ),
        AuditLog(
            id=7,
            task_id=2,
            project_slug="default",
            actor_id="@testagent",
            actor_type="agent",
            action="started",
            context={},
            timestamp=datetime(2024, 12, 7, 16, 30, 0),
        ),
    ]

    for log in logs:
        storage.add_audit_log(log)

    yield storage

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


# T099: Tests for audit list command
class TestAuditList:
    """Test cases for 'taskflow audit list' command."""

    def test_audit_list_all(self, temp_taskflow):
        """Test listing all audit logs with default limit."""
        result = runner.invoke(app, ["audit", "list"])

        assert result.exit_code == 0
        # Should show table with audit entries
        assert "Audit Log" in result.stdout
        assert "@testuser" in result.stdout
        assert "@testagent" in result.stdout
        assert "project_created" in result.stdout
        assert "created" in result.stdout
        assert "started" in result.stdout
        assert "completed" in result.stdout

    def test_audit_list_filter_by_task(self, temp_taskflow):
        """Test filtering audit logs by task ID."""
        result = runner.invoke(app, ["audit", "list", "--task", "1"])

        assert result.exit_code == 0
        # Should only show logs for task 1
        assert "#1" in result.stdout or "Task 1" in result.stdout
        # Should not show logs for task 2
        assert "#2" not in result.stdout.replace("#1", "")  # Avoid false positive

    def test_audit_list_filter_by_actor(self, temp_taskflow):
        """Test filtering audit logs by actor ID."""
        result = runner.invoke(app, ["audit", "list", "--actor", "@testagent"])

        assert result.exit_code == 0
        # Should only show logs for @testagent
        assert "@testagent" in result.stdout
        # Count occurrences to ensure filtering worked
        assert result.stdout.count("@testuser") == 0 or result.stdout.count("@testuser") < 2

    def test_audit_list_filter_by_action(self, temp_taskflow):
        """Test filtering audit logs by action type."""
        result = runner.invoke(app, ["audit", "list", "--action", "created"])

        assert result.exit_code == 0
        # Should only show 'created' actions
        assert "created" in result.stdout
        # Should show multiple created entries
        assert result.stdout.count("created") >= 2

    def test_audit_list_limit(self, temp_taskflow):
        """Test limiting number of audit log entries."""
        result = runner.invoke(app, ["audit", "list", "--limit", "3"])

        assert result.exit_code == 0
        # Should show limited entries
        assert "Audit Log" in result.stdout
        # Should mention the limit in output
        assert "3" in result.stdout

    def test_audit_list_combined_filters(self, temp_taskflow):
        """Test combining multiple filters."""
        result = runner.invoke(
            app, ["audit", "list", "--task", "1", "--action", "started", "--limit", "5"]
        )

        assert result.exit_code == 0
        # Should show filtered results
        assert "started" in result.stdout

    def test_audit_empty_list(self, temp_taskflow):
        """Test listing audit logs when no matches found."""
        result = runner.invoke(app, ["audit", "list", "--task", "999"])

        assert result.exit_code == 0
        # Should handle empty results gracefully
        assert "No audit logs found" in result.stdout or "0 entries" in result.stdout


# T100-T102: Tests for audit show command
class TestAuditShow:
    """Test cases for 'taskflow audit show' command."""

    def test_audit_show_success(self, temp_taskflow):
        """Test showing detailed audit entry."""
        result = runner.invoke(app, ["audit", "show", "5"])

        assert result.exit_code == 0
        # Should show detailed panel
        assert "Audit Entry #5" in result.stdout or "ID: 5" in result.stdout
        assert "@testagent" in result.stdout
        assert "completed" in result.stdout
        # Should show context details
        assert "progress_percent" in result.stdout or "100" in result.stdout

    def test_audit_show_with_context(self, temp_taskflow):
        """Test showing audit entry with complex context."""
        result = runner.invoke(app, ["audit", "show", "2"])

        assert result.exit_code == 0
        # Should show context details
        assert "Task 1" in result.stdout or "title" in result.stdout

    def test_audit_show_not_found(self, temp_taskflow):
        """Test showing non-existent audit entry."""
        result = runner.invoke(app, ["audit", "show", "999"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower() or "does not exist" in result.stdout.lower()


# T103-T105: Tests for audit task shortcut command
class TestAuditTask:
    """Test cases for 'taskflow audit task' command."""

    def test_audit_task_shortcut(self, temp_taskflow):
        """Test audit task shortcut shows full task history."""
        result = runner.invoke(app, ["audit", "task", "1"])

        assert result.exit_code == 0
        # Should show all actions for task 1
        assert "created" in result.stdout
        assert "started" in result.stdout
        assert "progressed" in result.stdout
        assert "completed" in result.stdout
        # Should show chronological order
        assert "#1" in result.stdout or "Task 1" in result.stdout

    def test_audit_task_shows_all_actions(self, temp_taskflow):
        """Test that task audit shows all action types."""
        result = runner.invoke(app, ["audit", "task", "1"])

        assert result.exit_code == 0
        # Should show multiple action types for task 1
        action_count = (
            result.stdout.count("created")
            + result.stdout.count("started")
            + result.stdout.count("progressed")
            + result.stdout.count("completed")
        )
        assert action_count >= 4

    def test_audit_task_not_found(self, temp_taskflow):
        """Test audit task for non-existent task."""
        result = runner.invoke(app, ["audit", "task", "999"])

        assert result.exit_code == 0
        # Should handle gracefully
        assert "No audit logs found" in result.stdout or "0 entries" in result.stdout


# T106-T107: Tests for audit actor shortcut command
class TestAuditActor:
    """Test cases for 'taskflow audit actor' command."""

    def test_audit_actor_shortcut(self, temp_taskflow):
        """Test audit actor shortcut shows all actor actions."""
        result = runner.invoke(app, ["audit", "actor", "@testagent"])

        assert result.exit_code == 0
        # Should show all actions by @testagent
        assert "@testagent" in result.stdout
        # Should show multiple entries (3 entries in title)
        assert "3 entries" in result.stdout
        # Should show different actions
        assert "created" in result.stdout
        assert "started" in result.stdout or "completed" in result.stdout

    def test_audit_actor_accountability(self, temp_taskflow):
        """Test actor audit for accountability review."""
        result = runner.invoke(app, ["audit", "actor", "@testuser"])

        assert result.exit_code == 0
        # Should show @testuser actions
        assert "@testuser" in result.stdout
        # Should show various actions
        assert "created" in result.stdout or "started" in result.stdout

    def test_audit_actor_not_found(self, temp_taskflow):
        """Test audit actor for non-existent actor."""
        result = runner.invoke(app, ["audit", "actor", "@nonexistent"])

        assert result.exit_code == 0
        # Should handle gracefully
        assert "No audit logs found" in result.stdout or "0 entries" in result.stdout
