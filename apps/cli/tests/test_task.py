"""Tests for TaskFlow task commands.

Tests for task CRUD operations following TDD approach:
- add: Create new tasks with various options
- list: List tasks with filters and search
- show: Display task details
- edit: Update task properties
- delete: Remove tasks
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


# T056: RED - Tests for add command
class TestTaskAdd:
    """Test cases for 'taskflow add' command."""

    def test_add_task_with_default_project(self, temp_taskflow):
        """Test creating task with default project."""
        result = runner.invoke(app, ["add", "My First Task"])

        assert result.exit_code == 0
        assert "created successfully" in result.stdout.lower()

        # Verify task was created
        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].title == "My First Task"
        assert tasks[0].project_slug == "default"
        assert tasks[0].status == "pending"
        assert tasks[0].priority == "medium"
        assert tasks[0].created_by == "@testuser"

    def test_add_task_with_specific_project(self, temp_taskflow):
        """Test creating task in specific project."""
        result = runner.invoke(app, ["add", "Project Task", "--project", "test-project"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].title == "Project Task"
        assert tasks[0].project_slug == "test-project"

    def test_add_task_with_assignment(self, temp_taskflow):
        """Test creating task with worker assignment."""
        result = runner.invoke(app, ["add", "Assigned Task", "--assign", "@testagent"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].assigned_to == "@testagent"

    def test_add_task_with_priority(self, temp_taskflow):
        """Test creating task with specific priority."""
        result = runner.invoke(app, ["add", "High Priority", "--priority", "high"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].priority == "high"

    def test_add_task_with_description(self, temp_taskflow):
        """Test creating task with description."""
        result = runner.invoke(
            app, ["add", "Documented Task", "--description", "This is a detailed description"]
        )

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].description == "This is a detailed description"

    def test_add_task_with_tags(self, temp_taskflow):
        """Test creating task with tags."""
        result = runner.invoke(app, ["add", "Tagged Task", "--tags", "api,backend,urgent"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].tags == ["api", "backend", "urgent"]

    def test_add_task_requires_current_user(self, temp_taskflow):
        """Test that add requires current_user to be set."""
        # Clear current user
        config = temp_taskflow.load_config()
        config["current_user"] = None
        temp_taskflow.save_config(config)

        result = runner.invoke(app, ["add", "Task"])

        assert result.exit_code == 1
        assert (
            "current user" in result.stdout.lower() or "set current user" in result.stdout.lower()
        )

    def test_add_task_with_created_by_override(self, temp_taskflow):
        """Test creating task with created_by override (for agents)."""
        result = runner.invoke(app, ["add", "Agent Task", "--created-by", "@testagent"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 1
        assert tasks[0].created_by == "@testagent"

    def test_add_task_creates_audit_log(self, temp_taskflow):
        """Test that creating task creates audit log entry."""
        result = runner.invoke(app, ["add", "Audited Task"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        task = tasks[0]

        # Check audit logs
        audit_logs = temp_taskflow.get_audit_logs(task_id=task.id)
        assert len(audit_logs) == 1
        assert audit_logs[0].action == "created"
        assert audit_logs[0].actor_id == "@testuser"
        assert audit_logs[0].task_id == task.id


# T058-T059: RED - Tests for validation
class TestTaskAddValidation:
    """Test validation for task add command."""

    def test_add_task_with_nonexistent_assignee(self, temp_taskflow):
        """Test that assigning to nonexistent worker fails."""
        result = runner.invoke(app, ["add", "Task", "--assign", "@nobody"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower() or "does not exist" in result.stdout.lower()

    def test_add_task_with_nonexistent_parent(self, temp_taskflow):
        """Test that parent task must exist."""
        result = runner.invoke(app, ["add", "Subtask", "--parent", "999"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower() or "does not exist" in result.stdout.lower()

    def test_add_task_with_nonexistent_project(self, temp_taskflow):
        """Test that project must exist."""
        result = runner.invoke(app, ["add", "Task", "--project", "nonexistent"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower() or "does not exist" in result.stdout.lower()

    def test_add_task_with_invalid_priority(self, temp_taskflow):
        """Test that priority must be valid."""
        result = runner.invoke(app, ["add", "Task", "--priority", "super-urgent"])

        assert result.exit_code == 1


# T060-T061: RED - Tests for circular reference detection
class TestTaskCircularReferences:
    """Test circular reference prevention."""

    def test_task_cannot_be_its_own_parent(self, temp_taskflow):
        """Test that task cannot have itself as parent."""
        # Create parent task first
        result1 = runner.invoke(app, ["add", "Parent Task"])
        assert result1.exit_code == 0

        # Get task ID (should be 1)
        tasks = temp_taskflow.list_tasks()
        task_id = tasks[0].id

        # Try to edit to make it its own parent
        result2 = runner.invoke(app, ["edit", str(task_id), "--parent", str(task_id)])

        assert result2.exit_code == 1
        assert (
            "circular" in result2.stdout.lower()
            or "cannot be its own parent" in result2.stdout.lower()
        )

    def test_task_cannot_create_circular_chain(self, temp_taskflow):
        """Test that circular parent chains are prevented."""
        # Create chain: A -> B -> C
        result1 = runner.invoke(app, ["add", "Task A"])
        assert result1.exit_code == 0

        result2 = runner.invoke(app, ["add", "Task B", "--parent", "1"])
        assert result2.exit_code == 0

        result3 = runner.invoke(app, ["add", "Task C", "--parent", "2"])
        assert result3.exit_code == 0

        # Try to make A a child of C (would create A -> B -> C -> A)
        result4 = runner.invoke(app, ["edit", "1", "--parent", "3"])

        assert result4.exit_code == 1
        assert "circular" in result4.stdout.lower()


# T062-T063: RED - Tests for list command
class TestTaskList:
    """Test cases for 'taskflow list' command."""

    def test_list_shows_all_tasks(self, temp_taskflow):
        """Test listing all tasks."""
        # Create multiple tasks
        runner.invoke(app, ["add", "Task 1"])
        runner.invoke(app, ["add", "Task 2"])
        runner.invoke(app, ["add", "Task 3"])

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Check for task IDs (more reliable than titles which may be truncated)
        assert "1" in result.stdout
        assert "2" in result.stdout
        assert "3" in result.stdout
        assert "Tasks (3)" in result.stdout

    def test_list_empty_shows_message(self, temp_taskflow):
        """Test listing when no tasks exist."""
        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        assert "no tasks" in result.stdout.lower()

    def test_list_filter_by_project(self, temp_taskflow):
        """Test filtering tasks by project."""
        runner.invoke(app, ["add", "Default Task"])
        runner.invoke(app, ["add", "Project Task", "--project", "test-project"])

        result = runner.invoke(app, ["list", "--project", "test-project"])

        assert result.exit_code == 0
        # Should only show task #2 (the project task)
        assert "2" in result.stdout
        assert "test-project" in result.stdout
        assert "Tasks (1)" in result.stdout

    def test_list_filter_by_status(self, temp_taskflow):
        """Test filtering tasks by status."""
        runner.invoke(app, ["add", "Pending Task"])
        runner.invoke(app, ["add", "Active Task"])

        # Update second task to in_progress
        runner.invoke(app, ["edit", "2", "--status", "in_progress"])

        result = runner.invoke(app, ["list", "--status", "in_progress"])

        assert result.exit_code == 0
        # Should only show task #2
        assert "2" in result.stdout
        assert "in_progress" in result.stdout
        assert "Tasks (1)" in result.stdout

    def test_list_filter_by_assigned(self, temp_taskflow):
        """Test filtering tasks by assignee."""
        runner.invoke(app, ["add", "My Task"])
        runner.invoke(app, ["add", "Agent Task", "--assign", "@testagent"])

        result = runner.invoke(app, ["list", "--assigned", "@testagent"])

        assert result.exit_code == 0
        # Should only show task #2
        assert "2" in result.stdout
        assert "@testagent" in result.stdout
        assert "Tasks (1)" in result.stdout

    def test_list_shows_table_format(self, temp_taskflow):
        """Test that list shows Rich table format."""
        runner.invoke(app, ["add", "Task 1"])

        result = runner.invoke(app, ["list"])

        assert result.exit_code == 0
        # Check for table headers
        assert "ID" in result.stdout or "Title" in result.stdout
        assert "Status" in result.stdout or "Priority" in result.stdout


# T064-T065: RED - Tests for search functionality
class TestTaskSearch:
    """Test search functionality in list command."""

    def test_search_by_title_case_insensitive(self, temp_taskflow):
        """Test searching tasks by title (case-insensitive)."""
        runner.invoke(app, ["add", "Implement API Endpoint"])
        runner.invoke(app, ["add", "Fix Database Bug"])
        runner.invoke(app, ["add", "Write API Documentation"])

        result = runner.invoke(app, ["list", "--search", "api"])

        assert result.exit_code == 0
        # Should find tasks #1 and #3 (both contain "API")
        assert "Tasks (2)" in result.stdout
        # Check for "API" in output (case-insensitive search)
        assert "API" in result.stdout or "api" in result.stdout.lower()

    def test_search_by_description(self, temp_taskflow):
        """Test searching tasks by description."""
        runner.invoke(app, ["add", "Task 1", "--description", "Contains keyword search"])
        runner.invoke(app, ["add", "Task 2", "--description", "Different content"])

        result = runner.invoke(app, ["list", "--search", "keyword"])

        assert result.exit_code == 0
        # Should find only task #1
        assert "Tasks (1)" in result.stdout
        assert "1" in result.stdout


# T066-T067: RED - Tests for show command
class TestTaskShow:
    """Test cases for 'taskflow show' command."""

    def test_show_displays_task_details(self, temp_taskflow):
        """Test showing task details."""
        runner.invoke(
            app,
            [
                "add",
                "Detailed Task",
                "--description",
                "Full description here",
                "--priority",
                "high",
                "--assign",
                "@testagent",
            ],
        )

        result = runner.invoke(app, ["show", "1"])

        assert result.exit_code == 0
        assert "Detailed Task" in result.stdout
        assert "Full description here" in result.stdout
        assert "high" in result.stdout.lower()
        assert "@testagent" in result.stdout

    def test_show_displays_rich_panel(self, temp_taskflow):
        """Test that show uses Rich panel for display."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["show", "1"])

        assert result.exit_code == 0
        # Panel should show key fields
        assert "ID" in result.stdout or "Title" in result.stdout
        assert "Status" in result.stdout or "Priority" in result.stdout

    def test_show_task_not_found(self, temp_taskflow):
        """Test showing nonexistent task."""
        result = runner.invoke(app, ["show", "999"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_show_includes_subtasks(self, temp_taskflow):
        """Test that show displays subtasks if any."""
        runner.invoke(app, ["add", "Parent Task"])
        runner.invoke(app, ["add", "Subtask 1", "--parent", "1"])
        runner.invoke(app, ["add", "Subtask 2", "--parent", "1"])

        result = runner.invoke(app, ["show", "1"])

        assert result.exit_code == 0
        assert "Subtask 1" in result.stdout or "subtask" in result.stdout.lower()


# T068-T069: RED - Tests for edit command
class TestTaskEdit:
    """Test cases for 'taskflow edit' command."""

    def test_edit_task_title(self, temp_taskflow):
        """Test updating task title."""
        runner.invoke(app, ["add", "Old Title"])

        result = runner.invoke(app, ["edit", "1", "--title", "New Title"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].title == "New Title"

    def test_edit_task_status(self, temp_taskflow):
        """Test updating task status."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["edit", "1", "--status", "in_progress"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].status == "in_progress"

    def test_edit_task_assignment(self, temp_taskflow):
        """Test updating task assignment."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["edit", "1", "--assign", "@testagent"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].assigned_to == "@testagent"

    def test_edit_task_priority(self, temp_taskflow):
        """Test updating task priority."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["edit", "1", "--priority", "critical"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].priority == "critical"

    def test_edit_task_description(self, temp_taskflow):
        """Test updating task description."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["edit", "1", "--description", "Updated description"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].description == "Updated description"

    def test_edit_multiple_fields(self, temp_taskflow):
        """Test updating multiple fields at once."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(
            app,
            [
                "edit",
                "1",
                "--title",
                "Updated Task",
                "--status",
                "in_progress",
                "--priority",
                "high",
            ],
        )

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert tasks[0].title == "Updated Task"
        assert tasks[0].status == "in_progress"
        assert tasks[0].priority == "high"

    def test_edit_creates_audit_log(self, temp_taskflow):
        """Test that editing creates audit log entry."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["edit", "1", "--status", "in_progress"])

        assert result.exit_code == 0

        # Check audit logs (should have created + edited)
        audit_logs = temp_taskflow.get_audit_logs(task_id=1)
        assert len(audit_logs) >= 2
        assert any(log.action == "edited" or log.action == "updated" for log in audit_logs)

    def test_edit_task_not_found(self, temp_taskflow):
        """Test editing nonexistent task."""
        result = runner.invoke(app, ["edit", "999", "--title", "New"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()


# T070-T071: RED - Tests for delete command
class TestTaskDelete:
    """Test cases for 'taskflow delete' command."""

    def test_delete_task(self, temp_taskflow):
        """Test deleting a task."""
        runner.invoke(app, ["add", "Task to Delete"])

        result = runner.invoke(app, ["delete", "1", "--force"])

        assert result.exit_code == 0

        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 0

    def test_delete_task_with_subtasks_prompts(self, temp_taskflow):
        """Test deleting task with subtasks requires confirmation."""
        runner.invoke(app, ["add", "Parent"])
        runner.invoke(app, ["add", "Child", "--parent", "1"])

        # Without --force, should prompt or fail
        result = runner.invoke(app, ["delete", "1"], input="n\n")

        # Task should still exist (user declined or was prompted)
        tasks = temp_taskflow.list_tasks()
        assert len(tasks) == 2 or "confirm" in result.stdout.lower()

    def test_delete_task_with_force(self, temp_taskflow):
        """Test deleting task with --force skips confirmation."""
        runner.invoke(app, ["add", "Parent"])
        runner.invoke(app, ["add", "Child", "--parent", "1"])

        result = runner.invoke(app, ["delete", "1", "--force"])

        assert result.exit_code == 0

    def test_delete_task_not_found(self, temp_taskflow):
        """Test deleting nonexistent task."""
        result = runner.invoke(app, ["delete", "999", "--force"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_delete_creates_audit_log(self, temp_taskflow):
        """Test that deleting creates audit log entry."""
        runner.invoke(app, ["add", "Task"])

        result = runner.invoke(app, ["delete", "1", "--force"])

        assert result.exit_code == 0

        # Check audit logs
        audit_logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "deleted" for log in audit_logs)
