"""Tests for TaskFlow demo command.

Tests for the automated demonstration showcasing human-agent parity.
The demo should run in under 90 seconds and demonstrate identical workflows
for both human and agent workers.
"""

import os
import time

import pytest
from typer.testing import CliRunner

from taskflow.main import app
from taskflow.storage import Storage

runner = CliRunner()


@pytest.fixture
def temp_taskflow(tmp_path):
    """Create a temporary TaskFlow directory for testing."""
    taskflow_dir = tmp_path / ".taskflow"
    taskflow_dir.mkdir()
    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Do NOT initialize storage - the demo command should handle initialization

    yield tmp_path

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


class TestDemoCommand:
    """Test cases for 'taskflow demo' command."""

    def test_demo_runs_successfully(self, temp_taskflow):
        """Test that demo command runs without errors."""
        # Act
        result = runner.invoke(app, ["demo", "--fast"])

        # Assert
        assert result.exit_code == 0
        assert "TaskFlow Demo" in result.stdout
        assert "Human-Agent Parity" in result.stdout

    def test_demo_creates_workers(self, temp_taskflow):
        """Test that demo creates human and agent workers."""
        # Act
        runner.invoke(app, ["demo", "--fast", "--no-cleanup"])

        # Assert - Check storage was initialized
        storage = Storage(temp_taskflow / ".taskflow")
        workers = storage.list_workers()

        # Should have at least a human and an agent
        assert len(workers) >= 2

        # Check for human worker
        human_workers = [w for w in workers if w.type == "human"]
        assert len(human_workers) >= 1

        # Check for agent worker
        agent_workers = [w for w in workers if w.type == "agent"]
        assert len(agent_workers) >= 1

    def test_demo_creates_project(self, temp_taskflow):
        """Test that demo creates a project."""
        # Act
        runner.invoke(app, ["demo", "--fast", "--no-cleanup"])

        # Assert
        storage = Storage(temp_taskflow / ".taskflow")
        projects = storage.list_projects()

        # Should have demo project
        assert len(projects) >= 1
        project_slugs = [p.slug for p in projects]
        assert "demo" in project_slugs

    def test_demo_creates_tasks(self, temp_taskflow):
        """Test that demo creates tasks for both human and agent."""
        # Act
        runner.invoke(app, ["demo", "--fast", "--no-cleanup"])

        # Assert
        storage = Storage(temp_taskflow / ".taskflow")
        tasks = storage.list_tasks()

        # Should have at least 2 tasks (one for human, one for agent)
        assert len(tasks) >= 2

        # Check that tasks have been assigned
        assigned_tasks = [t for t in tasks if t.assigned_to is not None]
        assert len(assigned_tasks) >= 2

    def test_demo_shows_audit_trail(self, temp_taskflow):
        """Test that demo generates audit trail entries."""
        # Act
        result = runner.invoke(app, ["demo", "--fast", "--no-cleanup"])

        # Assert - Check output mentions audit
        assert "Audit" in result.stdout or "audit" in result.stdout.lower()

        # Check storage has audit entries
        storage = Storage(temp_taskflow / ".taskflow")
        audit_logs = storage.list_audit_logs()

        # Should have multiple audit entries for created, started, progressed, completed
        assert (
            len(audit_logs) >= 8
        )  # At least 4 actions per worker (create, start, progress, complete)

        # Check for different action types
        action_types = {log.action for log in audit_logs}
        assert "created" in action_types
        assert "started" in action_types
        assert "progressed" in action_types
        assert "completed" in action_types

    def test_demo_cleanup_removes_data(self, temp_taskflow):
        """Test that demo cleans up data by default."""
        # Act
        runner.invoke(app, ["demo", "--fast"])

        # Assert - Storage should not have demo data
        storage = Storage(temp_taskflow / ".taskflow")

        # Check if data was cleaned up
        # The .taskflow directory should still exist (for init)
        # but demo workers/tasks should be removed
        workers = storage.list_workers()
        tasks = storage.list_tasks()
        projects = storage.list_projects()

        # If cleanup worked, demo-specific data should be gone
        # Note: We can't be 100% certain without --no-cleanup, but we can check
        # that the data doesn't contain demo-specific names
        demo_workers = [w for w in workers if "demo" in w.id.lower() or "sarah" in w.id.lower()]
        assert len(demo_workers) == 0

    def test_demo_no_cleanup_flag(self, temp_taskflow):
        """Test that --no-cleanup flag preserves demo data."""
        # Act
        runner.invoke(app, ["demo", "--fast", "--no-cleanup"])

        # Assert
        storage = Storage(temp_taskflow / ".taskflow")
        workers = storage.list_workers()
        tasks = storage.list_tasks()
        projects = storage.list_projects()

        # Data should be preserved
        assert len(workers) >= 2
        assert len(tasks) >= 2
        assert len(projects) >= 1

    def test_demo_fast_flag(self, temp_taskflow):
        """Test that --fast flag speeds up execution."""
        # Act
        start_time = time.time()
        result = runner.invoke(app, ["demo", "--fast"])
        elapsed_time = time.time() - start_time

        # Assert
        assert result.exit_code == 0

        # Fast mode should complete very quickly (well under 90 seconds)
        # Let's say under 10 seconds for safety
        assert elapsed_time < 10, f"Demo took {elapsed_time:.2f}s, expected < 10s with --fast"

    def test_demo_completes_in_90_seconds(self, temp_taskflow):
        """Test that demo completes within CI time limit (90 seconds).

        This test runs the demo without --fast flag to ensure even
        the paced version stays within time limits.
        """
        # Act
        start_time = time.time()
        result = runner.invoke(app, ["demo"])
        elapsed_time = time.time() - start_time

        # Assert
        assert result.exit_code == 0
        assert elapsed_time < 90, f"Demo took {elapsed_time:.2f}s, must be < 90s for CI"

    def test_demo_shows_human_workflow(self, temp_taskflow):
        """Test that demo displays human workflow steps."""
        # Act
        result = runner.invoke(app, ["demo", "--fast"])

        # Assert
        output = result.stdout.lower()

        # Should show human worker name
        assert "sarah" in output or "human" in output

        # Should show workflow steps
        assert "starting" in output or "started" in output
        assert "progress" in output
        assert "complet" in output  # completing or completed

    def test_demo_shows_agent_workflow(self, temp_taskflow):
        """Test that demo displays agent workflow steps."""
        # Act
        result = runner.invoke(app, ["demo", "--fast"])

        # Assert
        output = result.stdout.lower()

        # Should show agent worker name
        assert "claude" in output or "agent" in output

        # Should show workflow steps
        assert "starting" in output or "started" in output
        assert "progress" in output
        assert "complet" in output  # completing or completed

    def test_demo_shows_parity_message(self, temp_taskflow):
        """Test that demo emphasizes human-agent parity."""
        # Act
        result = runner.invoke(app, ["demo", "--fast"])

        # Assert
        output = result.stdout.lower()

        # Should have messaging about parity or identical workflows
        assert "parity" in output or "identical" in output or "same" in output or "equal" in output
