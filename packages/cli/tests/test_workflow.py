"""Tests for TaskFlow workflow commands.

Tests for workflow operations following TDD approach:
- start: Claim and start tasks
- progress: Update task progress
- complete: Mark tasks as completed
- review: Request task review
- approve: Approve reviewed tasks
- reject: Reject reviewed tasks
- delegate: Delegate tasks to other workers
"""

import os
from datetime import datetime

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

    # Add another worker for delegation tests
    other_worker = Worker(
        id="@otherworker",
        type="human",
        name="Other Worker",
        created_at=datetime.now(),
    )
    storage.add_worker(other_worker)

    # Add test project
    project = Project(slug="test-project", name="Test Project", description="For testing")
    storage.add_project(project)

    yield storage

    # Cleanup
    if "TASKFLOW_HOME" in os.environ:
        del os.environ["TASKFLOW_HOME"]


# T074: RED - Tests for start command
class TestTaskStart:
    """Test cases for 'taskflow start' command."""

    def test_start_task_success(self, temp_taskflow):
        """Test starting a pending task."""
        # Setup: Create a pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["start", "1"])

        # Assert
        assert result.exit_code == 0
        assert "started" in result.stdout.lower() or "in progress" in result.stdout.lower()

        # Verify task status changed
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.status == "in_progress"
        assert updated_task.assigned_to == "@testuser"

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "started" for log in logs)

    def test_start_task_not_found(self, temp_taskflow):
        """Test starting a non-existent task."""
        result = runner.invoke(app, ["start", "999"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_start_task_invalid_transition(self, temp_taskflow):
        """Test starting a task with invalid status transition."""
        # Setup: Create a completed task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="completed",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["start", "1"])

        # Assert
        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "transition" in result.stdout.lower()

    def test_start_task_assigns_current_user(self, temp_taskflow):
        """Test that starting an unassigned task assigns it to current user."""
        # Setup: Create an unassigned pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            assigned_to=None,
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["start", "1"])

        # Assert
        assert result.exit_code == 0
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.assigned_to == "@testuser"

    def test_start_task_keeps_existing_assignment(self, temp_taskflow):
        """Test that starting an already assigned task keeps assignment."""
        # Setup: Create a task assigned to another worker
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            assigned_to="@otherworker",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["start", "1"])

        # Assert
        assert result.exit_code == 0
        updated_task = temp_taskflow.get_task(1)
        # Should keep original assignment
        assert updated_task.assigned_to == "@otherworker"


# T075: RED - Tests for progress command
class TestTaskProgress:
    """Test cases for 'taskflow progress' command."""

    def test_progress_task_success(self, temp_taskflow):
        """Test updating task progress."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            progress_percent=0,
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["progress", "1", "--percent", "50"])

        # Assert
        assert result.exit_code == 0
        assert "50" in result.stdout or "progress" in result.stdout.lower()

        # Verify task progress updated
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.progress_percent == 50

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "progressed" for log in logs)

    def test_progress_task_with_note(self, temp_taskflow):
        """Test updating task progress with a note."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["progress", "1", "--percent", "75", "--note", "Almost done"])

        # Assert
        assert result.exit_code == 0

        # Verify audit log contains note
        logs = temp_taskflow.get_audit_logs(task_id=1)
        progress_log = next((log for log in logs if log.action == "progressed"), None)
        assert progress_log is not None
        assert progress_log.context.get("note") == "Almost done"

    def test_progress_task_not_in_progress(self, temp_taskflow):
        """Test updating progress on a task that's not in progress."""
        # Setup: Create a pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["progress", "1", "--percent", "50"])

        # Assert
        assert result.exit_code == 1
        assert "in progress" in result.stdout.lower() or "in_progress" in result.stdout.lower()

    def test_progress_task_invalid_percent(self, temp_taskflow):
        """Test updating progress with invalid percentage."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["progress", "1", "--percent", "150"])

        # Assert
        assert result.exit_code != 0


# T076: RED - Tests for complete command
class TestTaskComplete:
    """Test cases for 'taskflow complete' command."""

    def test_complete_task_success(self, temp_taskflow):
        """Test completing an in-progress task."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            progress_percent=50,
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["complete", "1"])

        # Assert
        assert result.exit_code == 0
        assert "completed" in result.stdout.lower()

        # Verify task status and progress
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.status == "completed"
        assert updated_task.progress_percent == 100

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "completed" for log in logs)

    def test_complete_task_invalid_status(self, temp_taskflow):
        """Test completing a task with invalid status."""
        # Setup: Create a pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["complete", "1"])

        # Assert
        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "transition" in result.stdout.lower()

    def test_complete_task_not_found(self, temp_taskflow):
        """Test completing a non-existent task."""
        result = runner.invoke(app, ["complete", "999"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()


# T077: RED - Tests for review command
class TestTaskReview:
    """Test cases for 'taskflow review' command."""

    def test_review_request_success(self, temp_taskflow):
        """Test requesting review for an in-progress task."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["review", "1"])

        # Assert
        assert result.exit_code == 0
        assert "review" in result.stdout.lower()

        # Verify task status
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.status == "review"

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "review_requested" for log in logs)

    def test_review_request_invalid_status(self, temp_taskflow):
        """Test requesting review for a task with invalid status."""
        # Setup: Create a pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["review", "1"])

        # Assert
        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "transition" in result.stdout.lower()


# T078: RED - Tests for approve command
class TestTaskApprove:
    """Test cases for 'taskflow approve' command."""

    def test_approve_task_success(self, temp_taskflow):
        """Test approving a task in review."""
        # Setup: Create a task in review
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="review",
            progress_percent=90,
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["approve", "1"])

        # Assert
        assert result.exit_code == 0
        assert "approved" in result.stdout.lower() or "completed" in result.stdout.lower()

        # Verify task status and progress
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.status == "completed"
        assert updated_task.progress_percent == 100

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        assert any(log.action == "approved" for log in logs)

    def test_approve_task_invalid_status(self, temp_taskflow):
        """Test approving a task not in review."""
        # Setup: Create an in-progress task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["approve", "1"])

        # Assert
        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "review" in result.stdout.lower()


# T079: RED - Tests for reject command
class TestTaskReject:
    """Test cases for 'taskflow reject' command."""

    def test_reject_task_success(self, temp_taskflow):
        """Test rejecting a task in review."""
        # Setup: Create a task in review
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="review",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["reject", "1", "--reason", "Needs improvement"])

        # Assert
        assert result.exit_code == 0
        assert "rejected" in result.stdout.lower()

        # Verify task status
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.status == "in_progress"

        # Verify audit log contains reason
        logs = temp_taskflow.get_audit_logs(task_id=1)
        reject_log = next((log for log in logs if log.action == "rejected"), None)
        assert reject_log is not None
        assert reject_log.context.get("reason") == "Needs improvement"

    def test_reject_task_invalid_status(self, temp_taskflow):
        """Test rejecting a task not in review."""
        # Setup: Create a pending task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["reject", "1", "--reason", "Test"])

        # Assert
        assert result.exit_code == 1
        assert "invalid" in result.stdout.lower() or "review" in result.stdout.lower()


# T080: RED - Tests for delegate command
class TestTaskDelegate:
    """Test cases for 'taskflow delegate' command."""

    def test_delegate_task_success(self, temp_taskflow):
        """Test delegating a task to another worker."""
        # Setup: Create a task assigned to current user
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="in_progress",
            assigned_to="@testuser",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["delegate", "1", "--to", "@otherworker"])

        # Assert
        assert result.exit_code == 0
        assert "delegated" in result.stdout.lower()

        # Verify task assignment
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.assigned_to == "@otherworker"

        # Verify audit log
        logs = temp_taskflow.get_audit_logs(task_id=1)
        delegate_log = next((log for log in logs if log.action == "delegated"), None)
        assert delegate_log is not None
        assert delegate_log.context.get("to") == "@otherworker"

    def test_delegate_task_worker_not_found(self, temp_taskflow):
        """Test delegating to a non-existent worker."""
        # Setup: Create a task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["delegate", "1", "--to", "@nonexistent"])

        # Assert
        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_delegate_task_not_found(self, temp_taskflow):
        """Test delegating a non-existent task."""
        result = runner.invoke(app, ["delegate", "999", "--to", "@otherworker"])

        assert result.exit_code == 1
        assert "not found" in result.stdout.lower()

    def test_delegate_to_agent(self, temp_taskflow):
        """Test delegating a task to an agent."""
        # Setup: Create a task
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            status="pending",
            created_by="@testuser",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        temp_taskflow.add_task(task)

        # Act
        result = runner.invoke(app, ["delegate", "1", "--to", "@testagent"])

        # Assert
        assert result.exit_code == 0
        updated_task = temp_taskflow.get_task(1)
        assert updated_task.assigned_to == "@testagent"
