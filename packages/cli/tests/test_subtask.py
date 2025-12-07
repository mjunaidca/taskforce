"""Tests for TaskFlow subtask features.

Tests for subtask functionality following TDD approach:
- subtask: Create subtask under parent
- show --tree: Display hierarchical task tree
- Progress rollup from subtasks to parent
- List subtasks with --parent filter
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


# T090: RED - Tests for subtask command
class TestSubtaskCreate:
    """Test cases for 'taskflow subtask' command."""

    def test_subtask_create_success(self, temp_taskflow):
        """Test creating subtask under parent task."""
        # Create parent task first
        result1 = runner.invoke(app, ["add", "Parent Task"])
        assert result1.exit_code == 0

        # Create subtask
        result2 = runner.invoke(app, ["subtask", "1", "Child Task"])

        assert result2.exit_code == 0
        assert "created" in result2.stdout.lower()
        assert "subtask" in result2.stdout.lower() or "child" in result2.stdout.lower()

        # Verify parent_id is set
        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 2
        subtask = next(t for t in tasks if t.id == 2)
        assert subtask.parent_id == 1
        assert subtask.title == "Child Task"

    def test_subtask_parent_not_found(self, temp_taskflow):
        """Test that parent task must exist."""
        result = runner.invoke(app, ["subtask", "999", "Child Task"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_subtask_inherits_project(self, temp_taskflow):
        """Test that subtask inherits project_slug from parent."""
        # Create parent in specific project
        result1 = runner.invoke(app, ["add", "Parent Task", "--project", "test-project"])
        assert result1.exit_code == 0

        # Create subtask (should inherit test-project)
        result2 = runner.invoke(app, ["subtask", "1", "Child Task"])
        assert result2.exit_code == 0

        # Verify project inheritance
        tasks = temp_taskflow.list_tasks()
        subtask = next(t for t in tasks if t.id == 2)
        assert subtask.project_slug == "test-project"

    def test_subtask_creates_audit_log(self, temp_taskflow):
        """Test that creating subtask creates audit log entry."""
        # Create parent
        result1 = runner.invoke(app, ["add", "Parent Task"])
        assert result1.exit_code == 0

        # Create subtask
        result2 = runner.invoke(app, ["subtask", "1", "Child Task"])
        assert result2.exit_code == 0

        # Check audit logs for subtask creation
        audit_logs = temp_taskflow.get_audit_logs(task_id=2)
        assert len(audit_logs) >= 1
        # Should have either "created" or "subtask_created" action
        assert any(log.action in ["created", "subtask_created"] for log in audit_logs)

    def test_subtask_with_assignment(self, temp_taskflow):
        """Test creating subtask with worker assignment."""
        # Create parent
        result1 = runner.invoke(app, ["add", "Parent Task"])
        assert result1.exit_code == 0

        # Create subtask with assignment
        result2 = runner.invoke(app, ["subtask", "1", "Assigned Child", "--assign", "@testagent"])
        assert result2.exit_code == 0

        # Verify assignment
        tasks = temp_taskflow.list_tasks()
        subtask = next(t for t in tasks if t.id == 2)
        assert subtask.assigned_to == "@testagent"

    def test_subtask_with_priority(self, temp_taskflow):
        """Test creating subtask with specific priority."""
        # Create parent
        result1 = runner.invoke(app, ["add", "Parent Task"])
        assert result1.exit_code == 0

        # Create subtask with high priority
        result2 = runner.invoke(app, ["subtask", "1", "Critical Child", "--priority", "high"])
        assert result2.exit_code == 0

        # Verify priority
        tasks = temp_taskflow.list_tasks()
        subtask = next(t for t in tasks if t.id == 2)
        assert subtask.priority == "high"


# T091-T092: RED - Tests for show --tree
class TestShowTaskTree:
    """Test cases for 'taskflow show --tree' command."""

    def test_show_task_tree_single_level(self, temp_taskflow):
        """Test showing task with single level of subtasks."""
        # Create parent and two subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child 1"])
        runner.invoke(app, ["subtask", "1", "Child 2"])

        result = runner.invoke(app, ["show", "1", "--tree"])

        assert result.exit_code == 0
        assert "Parent Task" in result.stdout
        assert "Child 1" in result.stdout
        assert "Child 2" in result.stdout
        # Check for tree structure indicators (indentation or tree symbols)
        assert "└" in result.stdout or "├" in result.stdout or "  " in result.stdout

    def test_show_task_tree_nested(self, temp_taskflow):
        """Test showing task with nested subtasks (multi-level)."""
        # Create hierarchy: Parent -> Child -> Grandchild
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child Task"])
        runner.invoke(app, ["subtask", "2", "Grandchild Task"])

        result = runner.invoke(app, ["show", "1", "--tree"])

        assert result.exit_code == 0
        assert "Parent Task" in result.stdout
        assert "Child Task" in result.stdout
        assert "Grandchild Task" in result.stdout

    def test_show_task_tree_with_status_icons(self, temp_taskflow):
        """Test that tree view shows status icons."""
        # Create parent and subtasks with different statuses
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Pending Child"])
        runner.invoke(app, ["subtask", "1", "Completed Child"])

        # Complete one subtask
        runner.invoke(app, ["edit", "3", "--status", "completed"])

        result = runner.invoke(app, ["show", "1", "--tree"])

        assert result.exit_code == 0
        # Should show status icons: ✓ completed, ○ pending, ◐ in_progress, ⏸ blocked, 👁 review
        assert "✓" in result.stdout or "○" in result.stdout

    def test_show_task_without_tree_flag(self, temp_taskflow):
        """Test that show without --tree still works (existing behavior)."""
        # Create parent and subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child Task"])

        result = runner.invoke(app, ["show", "1"])

        assert result.exit_code == 0
        assert "Parent Task" in result.stdout
        # Should still show subtasks but maybe simpler format
        assert "Child Task" in result.stdout or "subtask" in result.stdout.lower()


# T093-T094: RED - Tests for progress rollup
class TestSubtaskProgressRollup:
    """Test progress rollup from subtasks to parent."""

    def test_subtask_progress_rollup_average(self, temp_taskflow):
        """Test that parent progress is calculated as average of subtask progress."""
        from taskflow.commands.task import calculate_subtask_progress

        # Create parent and subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child 1"])
        runner.invoke(app, ["subtask", "1", "Child 2"])
        runner.invoke(app, ["subtask", "1", "Child 3"])

        # Set progress on subtasks: 0%, 50%, 100%
        runner.invoke(app, ["edit", "2", "--status", "pending"])  # 0%
        runner.invoke(app, ["start", "3"])
        runner.invoke(app, ["progress", "3", "--percent", "50"])  # 50%
        runner.invoke(app, ["start", "4"])
        runner.invoke(app, ["complete", "4"])  # 100%

        # Verify subtasks have correct progress
        tasks = temp_taskflow.list_tasks()
        child1 = next(t for t in tasks if t.id == 2)
        child2 = next(t for t in tasks if t.id == 3)
        child3 = next(t for t in tasks if t.id == 4)
        assert child1.progress_percent == 0
        assert child2.progress_percent == 50
        assert child3.progress_percent == 100

        # Calculate parent progress using helper
        parent_progress = calculate_subtask_progress(temp_taskflow, 1)
        # Should be average: (0 + 50 + 100) / 3 = 50
        assert parent_progress == 50

    def test_all_subtasks_complete_marks_parent_complete(self, temp_taskflow):
        """Test: when all subtasks complete, parent shows 100% via calculate_subtask_progress."""
        from taskflow.commands.task import calculate_subtask_progress

        # Create parent and subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child 1"])
        runner.invoke(app, ["subtask", "1", "Child 2"])

        # Complete all subtasks
        runner.invoke(app, ["start", "2"])
        runner.invoke(app, ["complete", "2"])
        runner.invoke(app, ["start", "3"])
        runner.invoke(app, ["complete", "3"])

        # Calculate parent progress using helper
        parent_progress = calculate_subtask_progress(temp_taskflow, 1)
        # Both subtasks are at 100%, so parent should show 100%
        assert parent_progress == 100

    def test_calculate_subtask_progress_helper(self, temp_taskflow):
        """Test calculate_subtask_progress helper function."""
        from taskflow.commands.task import calculate_subtask_progress

        # Create parent and subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child 1"])
        runner.invoke(app, ["subtask", "1", "Child 2"])

        # Set different progress levels
        runner.invoke(app, ["start", "2"])
        runner.invoke(app, ["progress", "2", "--percent", "30"])
        runner.invoke(app, ["start", "3"])
        runner.invoke(app, ["progress", "3", "--percent", "70"])

        # Calculate progress
        progress = calculate_subtask_progress(temp_taskflow, 1)

        # Should be average: (30 + 70) / 2 = 50
        assert progress == 50


# T095-T096: RED - Tests for list --parent filter
class TestListSubtasks:
    """Test listing subtasks with --parent filter."""

    def test_list_subtasks_only(self, temp_taskflow):
        """Test listing only subtasks of a parent."""
        # Create parent and subtasks
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child 1"])
        runner.invoke(app, ["subtask", "1", "Child 2"])
        runner.invoke(app, ["add", "Unrelated Task"])

        result = runner.invoke(app, ["list", "--parent", "1"])

        assert result.exit_code == 0
        # Should show only 2 subtasks
        assert "Tasks (2)" in result.stdout
        # Check for task IDs in the output (titles may be truncated in table)
        assert " 2 " in result.stdout or "\u2502 2" in result.stdout
        assert " 3 " in result.stdout or "\u2502 3" in result.stdout

    def test_list_subtasks_empty(self, temp_taskflow):
        """Test listing subtasks when parent has none."""
        # Create parent without subtasks
        runner.invoke(app, ["add", "Parent Task"])

        result = runner.invoke(app, ["list", "--parent", "1"])

        assert result.exit_code == 0
        # Should show no tasks
        assert "Tasks (0)" in result.stdout or "no tasks" in result.stdout.lower()

    def test_list_subtasks_parent_not_found(self, temp_taskflow):
        """Test listing subtasks with nonexistent parent."""
        result = runner.invoke(app, ["list", "--parent", "999"])

        assert result.exit_code == 0
        # Should show no tasks (parent doesn't exist)
        assert "Tasks (0)" in result.stdout or "no tasks" in result.stdout.lower()


# T097-T098: RED - Tests for circular reference prevention (already exists in test_task.py)
class TestSubtaskCircularPrevention:
    """Test circular reference prevention for subtasks."""

    def test_subtask_circular_prevention_already_tested(self, temp_taskflow):
        """Verify circular reference prevention works for subtasks."""
        # This test verifies that circular reference prevention
        # (already tested in test_task.py) also works for subtasks

        # Create parent and child
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["subtask", "1", "Child Task"])

        # Create grandchild
        runner.invoke(app, ["subtask", "2", "Grandchild Task"])

        # Try to make parent (task 1) a child of its grandchild (task 3)
        # This would create: 1 -> 2 -> 3 -> 1 (circular)
        result = runner.invoke(app, ["edit", "1", "--parent", "3"])

        assert result.exit_code == 1
        assert "circular" in result.stdout.lower()
