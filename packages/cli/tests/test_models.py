"""Tests for TaskFlow data models following TDD methodology.

Following Python 3.13+ typing syntax: list[], dict[], | for Union
"""

from datetime import datetime

import pytest
from pydantic import ValidationError


class TestProjectModel:
    """Test Project model validation and behavior."""

    def test_project_with_valid_slug(self):
        """RED: Test that Project accepts valid slug patterns."""
        from taskflow.models import Project

        project = Project(slug="my-project-123", name="My Project", description="A test project")
        assert project.slug == "my-project-123"
        assert project.name == "My Project"
        assert project.description == "A test project"

    def test_project_slug_pattern_validation(self):
        """RED: Test that Project enforces slug pattern (lowercase, numbers, hyphens)."""
        from taskflow.models import Project

        # Invalid: uppercase
        with pytest.raises(ValidationError):
            Project(slug="MyProject", name="Test")

        # Invalid: special characters
        with pytest.raises(ValidationError):
            Project(slug="my_project", name="Test")

        # Invalid: spaces
        with pytest.raises(ValidationError):
            Project(slug="my project", name="Test")

    def test_project_name_length_validation(self):
        """RED: Test that Project name must be 1-200 characters."""
        from taskflow.models import Project

        # Valid: minimum length
        project = Project(slug="p", name="P")
        assert project.name == "P"

        # Valid: maximum length
        long_name = "A" * 200
        project = Project(slug="long", name=long_name)
        assert len(project.name) == 200

        # Invalid: empty
        with pytest.raises(ValidationError):
            Project(slug="empty", name="")

        # Invalid: too long
        with pytest.raises(ValidationError):
            Project(slug="toolong", name="A" * 201)

    def test_project_description_optional(self):
        """RED: Test that Project description is optional."""
        from taskflow.models import Project

        # Without description
        project = Project(slug="test", name="Test")
        assert project.description is None

        # With description
        project = Project(slug="test", name="Test", description="Desc")
        assert project.description == "Desc"

    def test_project_model_serialization(self):
        """RED: Test that Project can be serialized to dict."""
        from taskflow.models import Project

        project = Project(slug="test-proj", name="Test Project", description="Test description")
        data = project.model_dump()
        assert data["slug"] == "test-proj"
        assert data["name"] == "Test Project"
        assert data["description"] == "Test description"


class TestWorkerModel:
    """Test Worker model validation and behavior."""

    def test_worker_human_creation(self):
        """RED: Test creating a human worker."""
        from taskflow.models import Worker

        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        assert worker.id == "@sarah"
        assert worker.type == "human"
        assert worker.name == "Sarah Johnson"
        assert worker.agent_type is None
        assert worker.capabilities == []

    def test_worker_agent_creation(self):
        """RED: Test creating an agent worker with required agent_type."""
        from taskflow.models import Worker

        worker = Worker(
            id="@claude-code",
            type="agent",
            name="Claude Code",
            agent_type="claude",
            capabilities=["coding", "architecture"],
            created_at=datetime.now(),
        )
        assert worker.id == "@claude-code"
        assert worker.type == "agent"
        assert worker.agent_type == "claude"
        assert worker.capabilities == ["coding", "architecture"]

    def test_worker_id_pattern_validation(self):
        """RED: Test that Worker ID must match @[a-z0-9_-]+ pattern."""
        from taskflow.models import Worker

        # Valid IDs
        valid_ids = ["@sarah", "@claude-code", "@qwen_2", "@agent-123"]
        for worker_id in valid_ids:
            worker = Worker(id=worker_id, type="human", name="Test", created_at=datetime.now())
            assert worker.id == worker_id

        # Invalid IDs
        invalid_ids = ["sarah", "@Sarah", "@my worker", "@agent!"]
        for worker_id in invalid_ids:
            with pytest.raises(ValidationError):
                Worker(id=worker_id, type="human", name="Test", created_at=datetime.now())

    def test_worker_agent_type_required_for_agents(self):
        """RED: Test that agent_type is required when type is 'agent'."""
        from taskflow.models import Worker

        # Should fail without agent_type
        with pytest.raises(ValidationError):
            Worker(id="@claude", type="agent", name="Claude", created_at=datetime.now())

    def test_worker_agent_type_options(self):
        """RED: Test valid agent_type options."""
        from taskflow.models import Worker

        valid_types = ["claude", "qwen", "gemini", "custom"]
        for agent_type in valid_types:
            worker = Worker(
                id=f"@{agent_type}",
                type="agent",
                name=f"{agent_type.title()} Agent",
                agent_type=agent_type,
                created_at=datetime.now(),
            )
            assert worker.agent_type == agent_type


class TestTaskModel:
    """Test Task model validation and behavior."""

    def test_task_creation_minimal(self):
        """RED: Test creating a task with minimal required fields."""
        from taskflow.models import Task

        now = datetime.now()
        task = Task(
            id=1,
            title="Implement feature X",
            project_slug="taskflow",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
        )
        assert task.id == 1
        assert task.title == "Implement feature X"
        assert task.status == "pending"
        assert task.priority == "medium"
        assert task.progress_percent == 0
        assert task.assigned_to is None
        assert task.parent_id is None

    def test_task_creation_full(self):
        """RED: Test creating a task with all fields."""
        from taskflow.models import Task

        now = datetime.now()
        task = Task(
            id=1,
            title="Implement feature X",
            description="Detailed description",
            status="in_progress",
            priority="high",
            progress_percent=50,
            project_slug="taskflow",
            assigned_to="@claude-code",
            parent_id=None,
            tags=["backend", "api"],
            due_date=now,
            recurrence="daily",
            created_by="@sarah",
            created_at=now,
            updated_at=now,
        )
        assert task.status == "in_progress"
        assert task.priority == "high"
        assert task.progress_percent == 50
        assert task.assigned_to == "@claude-code"
        assert task.tags == ["backend", "api"]

    def test_task_title_length_validation(self):
        """RED: Test that Task title must be 1-500 characters."""
        from taskflow.models import Task

        now = datetime.now()

        # Valid: minimum
        task = Task(
            id=1, title="T", project_slug="test", created_by="@user", created_at=now, updated_at=now
        )
        assert task.title == "T"

        # Valid: maximum
        long_title = "A" * 500
        task = Task(
            id=2,
            title=long_title,
            project_slug="test",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        assert len(task.title) == 500

        # Invalid: empty
        with pytest.raises(ValidationError):
            Task(
                id=3,
                title="",
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )

        # Invalid: too long
        with pytest.raises(ValidationError):
            Task(
                id=4,
                title="A" * 501,
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )

    def test_task_status_values(self):
        """RED: Test valid task status values."""
        from taskflow.models import Task

        now = datetime.now()
        valid_statuses = ["pending", "in_progress", "review", "completed", "blocked"]

        for status in valid_statuses:
            task = Task(
                id=1,
                title="Test",
                status=status,
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
            assert task.status == status

        # Invalid status
        with pytest.raises(ValidationError):
            Task(
                id=1,
                title="Test",
                status="invalid",
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )

    def test_task_priority_values(self):
        """RED: Test valid task priority values."""
        from taskflow.models import Task

        now = datetime.now()
        valid_priorities = ["low", "medium", "high", "critical"]

        for priority in valid_priorities:
            task = Task(
                id=1,
                title="Test",
                priority=priority,
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
            assert task.priority == priority

    def test_task_progress_percent_range(self):
        """RED: Test that progress_percent must be 0-100."""
        from taskflow.models import Task

        now = datetime.now()

        # Valid: 0
        task = Task(
            id=1,
            title="Test",
            progress_percent=0,
            project_slug="test",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        assert task.progress_percent == 0

        # Valid: 100
        task = Task(
            id=2,
            title="Test",
            progress_percent=100,
            project_slug="test",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        assert task.progress_percent == 100

        # Invalid: negative
        with pytest.raises(ValidationError):
            Task(
                id=3,
                title="Test",
                progress_percent=-1,
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )

        # Invalid: over 100
        with pytest.raises(ValidationError):
            Task(
                id=4,
                title="Test",
                progress_percent=101,
                project_slug="test",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )

    def test_task_parent_child_relationship(self):
        """RED: Test that tasks can have parent_id for subtasks."""
        from taskflow.models import Task

        now = datetime.now()

        # Parent task
        parent = Task(
            id=1,
            title="Parent task",
            project_slug="test",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        assert parent.parent_id is None

        # Child task
        child = Task(
            id=2,
            title="Child task",
            parent_id=1,
            project_slug="test",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        assert child.parent_id == 1


class TestAuditLogModel:
    """Test AuditLog model validation and behavior."""

    def test_audit_log_creation_task_action(self):
        """RED: Test creating audit log for task action."""
        from taskflow.models import AuditLog

        now = datetime.now()
        log = AuditLog(
            id=1, task_id=42, actor_id="@sarah", actor_type="human", action="created", timestamp=now
        )
        assert log.id == 1
        assert log.task_id == 42
        assert log.project_slug is None
        assert log.actor_id == "@sarah"
        assert log.actor_type == "human"
        assert log.action == "created"
        assert log.context == {}

    def test_audit_log_creation_project_action(self):
        """RED: Test creating audit log for project action."""
        from taskflow.models import AuditLog

        now = datetime.now()
        log = AuditLog(
            id=1,
            project_slug="taskflow",
            actor_id="@claude-code",
            actor_type="agent",
            action="project_created",
            context={"name": "TaskFlow Platform"},
            timestamp=now,
        )
        assert log.project_slug == "taskflow"
        assert log.task_id is None
        assert log.actor_type == "agent"
        assert log.context["name"] == "TaskFlow Platform"

    def test_audit_log_actor_types(self):
        """RED: Test valid actor types."""
        from taskflow.models import AuditLog

        now = datetime.now()

        # Human actor
        log = AuditLog(id=1, actor_id="@sarah", actor_type="human", action="test", timestamp=now)
        assert log.actor_type == "human"

        # Agent actor
        log = AuditLog(id=2, actor_id="@claude", actor_type="agent", action="test", timestamp=now)
        assert log.actor_type == "agent"

        # Invalid actor type
        with pytest.raises(ValidationError):
            AuditLog(id=3, actor_id="@bot", actor_type="bot", action="test", timestamp=now)


class TestStatusTransitions:
    """Test status transition validation."""

    def test_valid_transitions_defined(self):
        """RED: Test that VALID_TRANSITIONS dict exists."""
        from taskflow.models import VALID_TRANSITIONS

        assert isinstance(VALID_TRANSITIONS, dict)
        assert "pending" in VALID_TRANSITIONS
        assert "in_progress" in VALID_TRANSITIONS
        assert "review" in VALID_TRANSITIONS
        assert "completed" in VALID_TRANSITIONS
        assert "blocked" in VALID_TRANSITIONS

    def test_validate_status_transition_function(self):
        """RED: Test status transition validation function."""
        from taskflow.models import validate_status_transition

        # Valid transitions
        assert validate_status_transition("pending", "in_progress") is True
        assert validate_status_transition("in_progress", "review") is True
        assert validate_status_transition("review", "completed") is True
        assert validate_status_transition("in_progress", "blocked") is True

        # Invalid transitions
        assert validate_status_transition("pending", "completed") is False
        assert validate_status_transition("completed", "pending") is False

    def test_valid_transitions_structure(self):
        """RED: Test the structure of valid transitions."""
        from taskflow.models import VALID_TRANSITIONS

        # Pending can go to in_progress or blocked
        assert "in_progress" in VALID_TRANSITIONS["pending"]
        assert "blocked" in VALID_TRANSITIONS["pending"]

        # In_progress can go to review, completed, or blocked
        assert "review" in VALID_TRANSITIONS["in_progress"]
        assert "completed" in VALID_TRANSITIONS["in_progress"]
        assert "blocked" in VALID_TRANSITIONS["in_progress"]

        # Review can go to in_progress or completed
        assert "in_progress" in VALID_TRANSITIONS["review"]
        assert "completed" in VALID_TRANSITIONS["review"]

        # Blocked can go to pending or in_progress
        assert "pending" in VALID_TRANSITIONS["blocked"]
        assert "in_progress" in VALID_TRANSITIONS["blocked"]

        # Completed is terminal (can only go back to review for corrections)
        assert "review" in VALID_TRANSITIONS["completed"]
