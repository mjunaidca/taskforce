"""Tests for TaskFlow audit infrastructure following TDD methodology.

Tests cover:
- Actor type detection (human vs agent)
- Audit log creation for various actions
- Context enrichment
"""

from datetime import datetime


class TestGetActorType:
    """Test actor type detection function."""

    def test_get_actor_type_for_human(self, initialized_taskflow_dir):
        """RED: Test detecting human actor type."""
        from taskflow.audit import get_actor_type
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        actor_type = get_actor_type("@sarah", storage)
        assert actor_type == "human"

    def test_get_actor_type_for_agent(self, initialized_taskflow_dir):
        """RED: Test detecting agent actor type."""
        from taskflow.audit import get_actor_type
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        worker = Worker(
            id="@claude-code",
            type="agent",
            name="Claude Code",
            agent_type="claude",
            created_at=datetime.now(),
        )
        storage.add_worker(worker)

        actor_type = get_actor_type("@claude-code", storage)
        assert actor_type == "agent"

    def test_get_actor_type_for_unknown_worker(self, initialized_taskflow_dir):
        """RED: Test handling unknown worker (default to human)."""
        from taskflow.audit import get_actor_type
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Unknown worker should default to human
        actor_type = get_actor_type("@unknown", storage)
        assert actor_type == "human"


class TestLogAction:
    """Test audit logging function."""

    def test_log_action_task_created(self, initialized_taskflow_dir):
        """RED: Test logging task creation action."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log action
        log = log_action(storage=storage, action="created", actor_id="@sarah", task_id=1)

        assert log.action == "created"
        assert log.actor_id == "@sarah"
        assert log.actor_type == "human"
        assert log.task_id == 1
        assert log.project_slug is None

    def test_log_action_project_created(self, initialized_taskflow_dir):
        """RED: Test logging project creation action."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register agent
        worker = Worker(
            id="@claude-code",
            type="agent",
            name="Claude Code",
            agent_type="claude",
            created_at=datetime.now(),
        )
        storage.add_worker(worker)

        # Log action
        log = log_action(
            storage=storage,
            action="project_created",
            actor_id="@claude-code",
            project_slug="taskflow",
        )

        assert log.action == "project_created"
        assert log.actor_id == "@claude-code"
        assert log.actor_type == "agent"
        assert log.project_slug == "taskflow"
        assert log.task_id is None

    def test_log_action_with_context(self, initialized_taskflow_dir):
        """RED: Test logging action with additional context."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log action with context
        context = {"progress_percent": 50, "note": "Halfway done"}
        log = log_action(
            storage=storage,
            action="progress_updated",
            actor_id="@sarah",
            task_id=1,
            context=context,
        )

        assert log.context["progress_percent"] == 50
        assert log.context["note"] == "Halfway done"

    def test_log_action_persisted(self, initialized_taskflow_dir):
        """RED: Test that logged action is persisted to storage."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log action
        log = log_action(storage=storage, action="completed", actor_id="@sarah", task_id=1)

        # Verify persistence
        logs = storage.get_audit_logs(task_id=1)
        assert len(logs) == 1
        assert logs[0].action == "completed"
        assert logs[0].actor_id == "@sarah"

    def test_log_action_auto_generates_id(self, initialized_taskflow_dir):
        """RED: Test that log action auto-generates unique IDs."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log multiple actions
        log1 = log_action(storage, "action1", "@sarah", task_id=1)
        log2 = log_action(storage, "action2", "@sarah", task_id=2)
        log3 = log_action(storage, "action3", "@sarah", task_id=3)

        # IDs should be unique and sequential
        assert log1.id != log2.id
        assert log2.id != log3.id
        assert log1.id < log2.id < log3.id

    def test_log_action_includes_timestamp(self, initialized_taskflow_dir):
        """RED: Test that log action includes timestamp."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log action
        before = datetime.now()
        log = log_action(storage, "test", "@sarah", task_id=1)
        after = datetime.now()

        # Timestamp should be between before and after
        assert before <= log.timestamp <= after

    def test_log_action_both_task_and_project(self, initialized_taskflow_dir):
        """RED: Test logging action with both task and project."""
        from taskflow.audit import log_action
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Register worker
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())
        storage.add_worker(worker)

        # Log action with both
        log = log_action(
            storage=storage,
            action="task_added_to_project",
            actor_id="@sarah",
            task_id=1,
            project_slug="taskflow",
        )

        assert log.task_id == 1
        assert log.project_slug == "taskflow"
