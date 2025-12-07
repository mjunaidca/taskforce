"""Tests for TaskFlow storage layer following TDD methodology.

Tests cover:
- Initialization and file operations
- CRUD operations for all entities
- Data persistence and loading
- Filtering and querying
"""

import json
from datetime import datetime


class TestStorageInitialization:
    """Test Storage initialization and file operations."""

    def test_storage_creation(self, temp_taskflow_dir):
        """RED: Test Storage instance creation."""
        from taskflow.storage import Storage

        storage = Storage(temp_taskflow_dir)
        assert storage.taskflow_dir == temp_taskflow_dir
        assert storage.data_file == temp_taskflow_dir / "data.json"
        assert storage.config_file == temp_taskflow_dir / "config.json"

    def test_storage_initialize_creates_files(self, temp_taskflow_dir):
        """RED: Test that initialize() creates required files."""
        from taskflow.storage import Storage

        storage = Storage(temp_taskflow_dir)
        storage.initialize()

        # Check files exist
        assert storage.data_file.exists()
        assert storage.config_file.exists()

        # Check config has defaults
        config = json.loads(storage.config_file.read_text())
        assert "default_project" in config
        assert config["default_project"] == "default"

        # Check data has default project
        data = json.loads(storage.data_file.read_text())
        assert "projects" in data
        assert len(data["projects"]) == 1
        assert data["projects"][0]["slug"] == "default"

    def test_storage_initialize_idempotent(self, temp_taskflow_dir):
        """RED: Test that initialize() can be called multiple times safely."""
        from taskflow.storage import Storage

        storage = Storage(temp_taskflow_dir)
        storage.initialize()
        storage.initialize()  # Should not error

        # Should still have only one default project
        data = json.loads(storage.data_file.read_text())
        assert len(data["projects"]) == 1


class TestStorageDataOperations:
    """Test basic data loading and saving."""

    def test_load_data(self, initialized_taskflow_dir):
        """RED: Test loading data from JSON file."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        data = storage.load_data()

        assert "projects" in data
        assert "workers" in data
        assert "tasks" in data
        assert "audit_logs" in data

    def test_save_data(self, initialized_taskflow_dir):
        """RED: Test saving data to JSON file."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        data = storage.load_data()
        data["test_key"] = "test_value"

        storage.save_data(data)

        # Reload and verify
        reloaded = storage.load_data()
        assert reloaded["test_key"] == "test_value"

    def test_load_config(self, initialized_taskflow_dir):
        """RED: Test loading config from JSON file."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        config = storage.load_config()

        assert "default_project" in config
        assert config["default_project"] == "default"

    def test_save_config(self, initialized_taskflow_dir):
        """RED: Test saving config to JSON file."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        config = storage.load_config()
        config["test_setting"] = "test_value"

        storage.save_config(config)

        # Reload and verify
        reloaded = storage.load_config()
        assert reloaded["test_setting"] == "test_value"


class TestProjectCRUD:
    """Test CRUD operations for Project entities."""

    def test_add_project(self, initialized_taskflow_dir):
        """RED: Test adding a new project."""
        from taskflow.models import Project
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        project = Project(
            slug="taskflow", name="TaskFlow Platform", description="Human-Agent Task Management"
        )

        result = storage.add_project(project)
        assert result.slug == "taskflow"
        assert result.name == "TaskFlow Platform"

        # Verify persistence
        data = storage.load_data()
        projects = [p for p in data["projects"] if p["slug"] == "taskflow"]
        assert len(projects) == 1

    def test_get_project(self, initialized_taskflow_dir):
        """RED: Test retrieving a project by slug."""
        from taskflow.models import Project
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        project = Project(slug="test", name="Test Project")
        storage.add_project(project)

        retrieved = storage.get_project("test")
        assert retrieved is not None
        assert retrieved.slug == "test"
        assert retrieved.name == "Test Project"

    def test_get_project_not_found(self, initialized_taskflow_dir):
        """RED: Test getting non-existent project returns None."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        result = storage.get_project("nonexistent")
        assert result is None

    def test_list_projects(self, initialized_taskflow_dir):
        """RED: Test listing all projects."""
        from taskflow.models import Project
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        storage.add_project(Project(slug="proj1", name="Project 1"))
        storage.add_project(Project(slug="proj2", name="Project 2"))

        projects = storage.list_projects()
        assert len(projects) >= 2  # At least our 2 (plus default)
        slugs = [p.slug for p in projects]
        assert "proj1" in slugs
        assert "proj2" in slugs


class TestWorkerCRUD:
    """Test CRUD operations for Worker entities."""

    def test_add_worker(self, initialized_taskflow_dir):
        """RED: Test adding a new worker."""
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        worker = Worker(id="@sarah", type="human", name="Sarah Johnson", created_at=datetime.now())

        result = storage.add_worker(worker)
        assert result.id == "@sarah"
        assert result.type == "human"

        # Verify persistence
        data = storage.load_data()
        workers = [w for w in data["workers"] if w["id"] == "@sarah"]
        assert len(workers) == 1

    def test_add_agent_worker(self, initialized_taskflow_dir):
        """RED: Test adding an agent worker."""
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        worker = Worker(
            id="@claude-code",
            type="agent",
            name="Claude Code",
            agent_type="claude",
            capabilities=["coding", "architecture"],
            created_at=datetime.now(),
        )

        result = storage.add_worker(worker)
        assert result.agent_type == "claude"
        assert result.capabilities == ["coding", "architecture"]

    def test_get_worker(self, initialized_taskflow_dir):
        """RED: Test retrieving a worker by ID."""
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        worker = Worker(id="@test", type="human", name="Test User", created_at=datetime.now())
        storage.add_worker(worker)

        retrieved = storage.get_worker("@test")
        assert retrieved is not None
        assert retrieved.id == "@test"
        assert retrieved.name == "Test User"

    def test_get_worker_not_found(self, initialized_taskflow_dir):
        """RED: Test getting non-existent worker returns None."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        result = storage.get_worker("@nonexistent")
        assert result is None

    def test_list_workers(self, initialized_taskflow_dir):
        """RED: Test listing all workers."""
        from taskflow.models import Worker
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        storage.add_worker(
            Worker(id="@user1", type="human", name="User 1", created_at=datetime.now())
        )
        storage.add_worker(
            Worker(
                id="@agent1",
                type="agent",
                name="Agent 1",
                agent_type="claude",
                created_at=datetime.now(),
            )
        )

        workers = storage.list_workers()
        assert len(workers) == 2
        ids = [w.id for w in workers]
        assert "@user1" in ids
        assert "@agent1" in ids


class TestTaskCRUD:
    """Test CRUD operations for Task entities."""

    def test_add_task(self, initialized_taskflow_dir):
        """RED: Test adding a new task."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()
        task = Task(
            id=1,
            title="Implement feature X",
            project_slug="default",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )

        result = storage.add_task(task)
        assert result.id == 1
        assert result.title == "Implement feature X"

    def test_get_task(self, initialized_taskflow_dir):
        """RED: Test retrieving a task by ID."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()
        task = Task(
            id=1,
            title="Test Task",
            project_slug="default",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        storage.add_task(task)

        retrieved = storage.get_task(1)
        assert retrieved is not None
        assert retrieved.id == 1
        assert retrieved.title == "Test Task"

    def test_get_task_not_found(self, initialized_taskflow_dir):
        """RED: Test getting non-existent task returns None."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        result = storage.get_task(999)
        assert result is None

    def test_update_task(self, initialized_taskflow_dir):
        """RED: Test updating an existing task."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()
        task = Task(
            id=1,
            title="Original",
            project_slug="default",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        storage.add_task(task)

        # Update task
        task.title = "Updated"
        task.status = "in_progress"
        result = storage.update_task(task)

        assert result.title == "Updated"
        assert result.status == "in_progress"

        # Verify persistence
        retrieved = storage.get_task(1)
        assert retrieved.title == "Updated"
        assert retrieved.status == "in_progress"

    def test_delete_task(self, initialized_taskflow_dir):
        """RED: Test deleting a task."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()
        task = Task(
            id=1,
            title="To Delete",
            project_slug="default",
            created_by="@user",
            created_at=now,
            updated_at=now,
        )
        storage.add_task(task)

        # Delete
        result = storage.delete_task(1)
        assert result is True

        # Verify deleted
        retrieved = storage.get_task(1)
        assert retrieved is None

    def test_delete_task_not_found(self, initialized_taskflow_dir):
        """RED: Test deleting non-existent task returns False."""
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        result = storage.delete_task(999)
        assert result is False

    def test_list_tasks_no_filter(self, initialized_taskflow_dir):
        """RED: Test listing all tasks."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        for i in range(1, 4):
            storage.add_task(
                Task(
                    id=i,
                    title=f"Task {i}",
                    project_slug="default",
                    created_by="@user",
                    created_at=now,
                    updated_at=now,
                )
            )

        tasks = storage.list_tasks()
        assert len(tasks) == 3

    def test_list_tasks_filter_by_project(self, initialized_taskflow_dir):
        """RED: Test filtering tasks by project."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        storage.add_task(
            Task(
                id=1,
                title="Task 1",
                project_slug="proj1",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )
        storage.add_task(
            Task(
                id=2,
                title="Task 2",
                project_slug="proj2",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )

        tasks = storage.list_tasks(project_slug="proj1")
        assert len(tasks) == 1
        assert tasks[0].project_slug == "proj1"

    def test_list_tasks_filter_by_assigned_to(self, initialized_taskflow_dir):
        """RED: Test filtering tasks by assignee."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        storage.add_task(
            Task(
                id=1,
                title="Task 1",
                project_slug="default",
                assigned_to="@sarah",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )
        storage.add_task(
            Task(
                id=2,
                title="Task 2",
                project_slug="default",
                assigned_to="@claude",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )

        tasks = storage.list_tasks(assigned_to="@sarah")
        assert len(tasks) == 1
        assert tasks[0].assigned_to == "@sarah"

    def test_list_tasks_filter_by_status(self, initialized_taskflow_dir):
        """RED: Test filtering tasks by status."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        storage.add_task(
            Task(
                id=1,
                title="Task 1",
                status="pending",
                project_slug="default",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )
        storage.add_task(
            Task(
                id=2,
                title="Task 2",
                status="in_progress",
                project_slug="default",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )

        tasks = storage.list_tasks(status="in_progress")
        assert len(tasks) == 1
        assert tasks[0].status == "in_progress"

    def test_list_tasks_filter_by_parent_id(self, initialized_taskflow_dir):
        """RED: Test filtering tasks by parent (for subtasks)."""
        from taskflow.models import Task
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        # Parent task
        storage.add_task(
            Task(
                id=1,
                title="Parent",
                project_slug="default",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )

        # Child tasks
        storage.add_task(
            Task(
                id=2,
                title="Child 1",
                parent_id=1,
                project_slug="default",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )
        storage.add_task(
            Task(
                id=3,
                title="Child 2",
                parent_id=1,
                project_slug="default",
                created_by="@user",
                created_at=now,
                updated_at=now,
            )
        )

        subtasks = storage.list_tasks(parent_id=1)
        assert len(subtasks) == 2
        assert all(t.parent_id == 1 for t in subtasks)


class TestAuditLogCRUD:
    """Test CRUD operations for AuditLog entities."""

    def test_add_audit_log(self, initialized_taskflow_dir):
        """RED: Test adding an audit log entry."""
        from taskflow.models import AuditLog
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        log = AuditLog(
            id=1,
            task_id=1,
            actor_id="@sarah",
            actor_type="human",
            action="created",
            timestamp=datetime.now(),
        )

        result = storage.add_audit_log(log)
        assert result.id == 1
        assert result.action == "created"

    def test_get_audit_logs_all(self, initialized_taskflow_dir):
        """RED: Test getting all audit logs."""
        from taskflow.models import AuditLog
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        for i in range(1, 4):
            storage.add_audit_log(
                AuditLog(
                    id=i, actor_id="@user", actor_type="human", action=f"action{i}", timestamp=now
                )
            )

        logs = storage.get_audit_logs()
        assert len(logs) == 3

    def test_get_audit_logs_by_task_id(self, initialized_taskflow_dir):
        """RED: Test filtering audit logs by task ID."""
        from taskflow.models import AuditLog
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        storage.add_audit_log(
            AuditLog(
                id=1,
                task_id=1,
                actor_id="@user",
                actor_type="human",
                action="created",
                timestamp=now,
            )
        )
        storage.add_audit_log(
            AuditLog(
                id=2,
                task_id=2,
                actor_id="@user",
                actor_type="human",
                action="created",
                timestamp=now,
            )
        )

        logs = storage.get_audit_logs(task_id=1)
        assert len(logs) == 1
        assert logs[0].task_id == 1

    def test_get_audit_logs_by_project_slug(self, initialized_taskflow_dir):
        """RED: Test filtering audit logs by project slug."""
        from taskflow.models import AuditLog
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        now = datetime.now()

        storage.add_audit_log(
            AuditLog(
                id=1,
                project_slug="proj1",
                actor_id="@user",
                actor_type="human",
                action="created",
                timestamp=now,
            )
        )
        storage.add_audit_log(
            AuditLog(
                id=2,
                project_slug="proj2",
                actor_id="@user",
                actor_type="human",
                action="created",
                timestamp=now,
            )
        )

        logs = storage.get_audit_logs(project_slug="proj1")
        assert len(logs) == 1
        assert logs[0].project_slug == "proj1"
