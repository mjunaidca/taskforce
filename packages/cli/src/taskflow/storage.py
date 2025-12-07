"""TaskFlow storage layer for JSON-based persistence.

Provides CRUD operations for all entities with file-based storage.
Includes file locking for concurrent access safety.
"""

import fcntl
import json
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from taskflow.models import AuditLog, Project, Task, Worker


class Storage:
    """Storage layer for TaskFlow data using JSON files.

    Manages persistence for projects, workers, tasks, and audit logs.
    Uses file locking to prevent concurrent write conflicts.
    """

    def __init__(self, taskflow_dir: Path):
        """Initialize storage with TaskFlow directory.

        Args:
            taskflow_dir: Path to .taskflow directory
        """
        self.taskflow_dir = taskflow_dir
        self.data_file = taskflow_dir / "data.json"
        self.config_file = taskflow_dir / "config.json"

    @contextmanager
    def _file_lock(self, file_path: Path):
        """Context manager for file locking.

        Args:
            file_path: Path to file to lock

        Yields:
            Open file handle with exclusive lock
        """
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.touch(exist_ok=True)
        with open(file_path, "r+") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                yield f
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def initialize(self) -> None:
        """Initialize TaskFlow directory with default files.

        Creates data.json with default project and empty collections.
        Creates config.json with default settings.
        Safe to call multiple times (idempotent).
        """
        # Ensure the taskflow directory exists
        self.taskflow_dir.mkdir(parents=True, exist_ok=True)

        # Create data.json if it doesn't exist
        if not self.data_file.exists():
            default_data = {
                "projects": [
                    {
                        "slug": "default",
                        "name": "Default Project",
                        "description": "Default project created on init",
                    }
                ],
                "workers": [],
                "tasks": [],
                "audit_logs": [],
            }
            self.data_file.write_text(json.dumps(default_data, indent=2))

        # Create config.json if it doesn't exist
        if not self.config_file.exists():
            default_config = {
                "default_project": "default",
                "current_user": None,
                "storage_mode": "json",
            }
            self.config_file.write_text(json.dumps(default_config, indent=2))

    def load_data(self) -> dict[str, Any]:
        """Load all data from JSON file.

        Returns:
            Dictionary with projects, workers, tasks, audit_logs
        """
        if not self.data_file.exists():
            return {
                "projects": [],
                "workers": [],
                "tasks": [],
                "audit_logs": [],
            }

        with self._file_lock(self.data_file) as f:
            f.seek(0)
            content = f.read()
            if not content:
                return {
                    "projects": [],
                    "workers": [],
                    "tasks": [],
                    "audit_logs": [],
                }
            return json.loads(content)

    def save_data(self, data: dict[str, Any]) -> None:
        """Save all data to JSON file.

        Args:
            data: Dictionary with projects, workers, tasks, audit_logs
        """
        with self._file_lock(self.data_file) as f:
            f.seek(0)
            f.truncate()
            f.write(json.dumps(data, indent=2, default=str))

    def load_config(self) -> dict[str, Any]:
        """Load configuration from JSON file.

        Returns:
            Configuration dictionary
        """
        if not self.config_file.exists():
            return {
                "default_project": "default",
                "current_user": None,
                "storage_mode": "json",
            }

        with self._file_lock(self.config_file) as f:
            f.seek(0)
            content = f.read()
            if not content:
                return {
                    "default_project": "default",
                    "current_user": None,
                    "storage_mode": "json",
                }
            return json.loads(content)

    def save_config(self, config: dict[str, Any]) -> None:
        """Save configuration to JSON file.

        Args:
            config: Configuration dictionary
        """
        with self._file_lock(self.config_file) as f:
            f.seek(0)
            f.truncate()
            f.write(json.dumps(config, indent=2))

    # Project CRUD operations

    def add_project(self, project: Project) -> Project:
        """Add a new project.

        Args:
            project: Project to add

        Returns:
            The added project
        """
        data = self.load_data()
        data["projects"].append(project.model_dump())
        self.save_data(data)
        return project

    def get_project(self, slug: str) -> Project | None:
        """Get a project by slug.

        Args:
            slug: Project slug

        Returns:
            Project if found, None otherwise
        """
        data = self.load_data()
        for proj_data in data["projects"]:
            if proj_data["slug"] == slug:
                return Project(**proj_data)
        return None

    def list_projects(self) -> list[Project]:
        """List all projects.

        Returns:
            List of all projects
        """
        data = self.load_data()
        return [Project(**proj_data) for proj_data in data["projects"]]

    # Worker CRUD operations

    def add_worker(self, worker: Worker) -> Worker:
        """Add a new worker.

        Args:
            worker: Worker to add

        Returns:
            The added worker
        """
        data = self.load_data()
        worker_dict = worker.model_dump()
        # Convert datetime to string for JSON serialization
        if isinstance(worker_dict.get("created_at"), datetime):
            worker_dict["created_at"] = worker_dict["created_at"].isoformat()
        data["workers"].append(worker_dict)
        self.save_data(data)
        return worker

    def get_worker(self, id: str) -> Worker | None:
        """Get a worker by ID.

        Args:
            id: Worker ID

        Returns:
            Worker if found, None otherwise
        """
        data = self.load_data()
        for worker_data in data["workers"]:
            if worker_data["id"] == id:
                # Parse datetime string back to datetime
                if isinstance(worker_data.get("created_at"), str):
                    worker_data["created_at"] = datetime.fromisoformat(worker_data["created_at"])
                return Worker(**worker_data)
        return None

    def list_workers(self) -> list[Worker]:
        """List all workers.

        Returns:
            List of all workers
        """
        data = self.load_data()
        workers = []
        for worker_data in data["workers"]:
            # Parse datetime string back to datetime
            if isinstance(worker_data.get("created_at"), str):
                worker_data["created_at"] = datetime.fromisoformat(worker_data["created_at"])
            workers.append(Worker(**worker_data))
        return workers

    # Task CRUD operations

    def add_task(self, task: Task) -> Task:
        """Add a new task.

        Args:
            task: Task to add

        Returns:
            The added task
        """
        data = self.load_data()
        task_dict = task.model_dump()
        # Convert datetime to string for JSON serialization
        for field in ["created_at", "updated_at", "due_date"]:
            if isinstance(task_dict.get(field), datetime):
                task_dict[field] = task_dict[field].isoformat()
        data["tasks"].append(task_dict)
        self.save_data(data)
        return task

    def get_task(self, id: int) -> Task | None:
        """Get a task by ID.

        Args:
            id: Task ID

        Returns:
            Task if found, None otherwise
        """
        data = self.load_data()
        for task_data in data["tasks"]:
            if task_data["id"] == id:
                return self._deserialize_task(task_data)
        return None

    def update_task(self, task: Task) -> Task:
        """Update an existing task.

        Args:
            task: Task with updated data

        Returns:
            The updated task
        """
        data = self.load_data()
        for i, task_data in enumerate(data["tasks"]):
            if task_data["id"] == task.id:
                task_dict = task.model_dump()
                # Convert datetime to string for JSON serialization
                for field in ["created_at", "updated_at", "due_date"]:
                    if isinstance(task_dict.get(field), datetime):
                        task_dict[field] = task_dict[field].isoformat()
                data["tasks"][i] = task_dict
                self.save_data(data)
                return task
        raise ValueError(f"Task with id {task.id} not found")

    def delete_task(self, id: int) -> bool:
        """Delete a task by ID.

        Args:
            id: Task ID

        Returns:
            True if deleted, False if not found
        """
        data = self.load_data()
        original_len = len(data["tasks"])
        data["tasks"] = [t for t in data["tasks"] if t["id"] != id]

        if len(data["tasks"]) < original_len:
            self.save_data(data)
            return True
        return False

    def list_tasks(self, **filters) -> list[Task]:
        """List tasks with optional filtering.

        Args:
            **filters: Optional filters (project_slug, assigned_to, status, parent_id)

        Returns:
            List of tasks matching filters
        """
        data = self.load_data()
        tasks = []

        for task_data in data["tasks"]:
            # Apply filters
            if filters:
                match = True
                for key, value in filters.items():
                    if task_data.get(key) != value:
                        match = False
                        break
                if not match:
                    continue

            tasks.append(self._deserialize_task(task_data))

        return tasks

    def _deserialize_task(self, task_data: dict[str, Any]) -> Task:
        """Helper to deserialize task data from JSON.

        Args:
            task_data: Task dictionary from JSON

        Returns:
            Task instance
        """
        # Parse datetime strings back to datetime objects
        for field in ["created_at", "updated_at", "due_date"]:
            if isinstance(task_data.get(field), str):
                task_data[field] = datetime.fromisoformat(task_data[field])
        return Task(**task_data)

    # AuditLog CRUD operations

    def add_audit_log(self, log: AuditLog) -> AuditLog:
        """Add an audit log entry.

        Args:
            log: AuditLog to add

        Returns:
            The added audit log
        """
        data = self.load_data()
        log_dict = log.model_dump()
        # Convert datetime to string for JSON serialization
        if isinstance(log_dict.get("timestamp"), datetime):
            log_dict["timestamp"] = log_dict["timestamp"].isoformat()
        data["audit_logs"].append(log_dict)
        self.save_data(data)
        return log

    def get_audit_logs(
        self, task_id: int | None = None, project_slug: str | None = None
    ) -> list[AuditLog]:
        """Get audit logs with optional filtering.

        Args:
            task_id: Filter by task ID
            project_slug: Filter by project slug

        Returns:
            List of audit logs matching filters
        """
        data = self.load_data()
        logs = []

        for log_data in data["audit_logs"]:
            # Apply filters
            if task_id is not None and log_data.get("task_id") != task_id:
                continue
            if project_slug is not None and log_data.get("project_slug") != project_slug:
                continue

            # Parse datetime string back to datetime
            if isinstance(log_data.get("timestamp"), str):
                log_data["timestamp"] = datetime.fromisoformat(log_data["timestamp"])

            logs.append(AuditLog(**log_data))

        return logs

    def list_audit_logs(
        self,
        task_id: int | None = None,
        actor_id: str | None = None,
        action: str | None = None,
    ) -> list[AuditLog]:
        """List audit logs with optional filtering.

        Args:
            task_id: Filter by task ID
            actor_id: Filter by actor ID
            action: Filter by action type

        Returns:
            List of audit logs matching filters, sorted by timestamp descending
        """
        data = self.load_data()
        logs = []

        for log_data in data["audit_logs"]:
            # Apply filters
            if task_id is not None and log_data.get("task_id") != task_id:
                continue
            if actor_id is not None and log_data.get("actor_id") != actor_id:
                continue
            if action is not None and log_data.get("action") != action:
                continue

            # Parse datetime string back to datetime
            if isinstance(log_data.get("timestamp"), str):
                log_data["timestamp"] = datetime.fromisoformat(log_data["timestamp"])

            logs.append(AuditLog(**log_data))

        # Sort by timestamp descending (most recent first)
        logs.sort(key=lambda x: x.timestamp, reverse=True)

        return logs

    def get_audit_log(self, id: int) -> AuditLog | None:
        """Get a specific audit log by ID.

        Args:
            id: Audit log ID

        Returns:
            AuditLog if found, None otherwise
        """
        data = self.load_data()
        for log_data in data["audit_logs"]:
            if log_data["id"] == id:
                # Parse datetime string back to datetime
                if isinstance(log_data.get("timestamp"), str):
                    log_data["timestamp"] = datetime.fromisoformat(log_data["timestamp"])
                return AuditLog(**log_data)
        return None

    def delete_audit_log(self, id: int) -> bool:
        """Delete an audit log by ID.

        Args:
            id: Audit log ID

        Returns:
            True if deleted, False if not found
        """
        data = self.load_data()
        original_len = len(data["audit_logs"])
        data["audit_logs"] = [log for log in data["audit_logs"] if log["id"] != id]

        if len(data["audit_logs"]) < original_len:
            self.save_data(data)
            return True
        return False

    def delete_worker(self, id: str) -> bool:
        """Delete a worker by ID.

        Args:
            id: Worker ID

        Returns:
            True if deleted, False if not found
        """
        data = self.load_data()
        original_len = len(data["workers"])
        data["workers"] = [w for w in data["workers"] if w["id"] != id]

        if len(data["workers"]) < original_len:
            self.save_data(data)
            return True
        return False

    def delete_project(self, slug: str) -> bool:
        """Delete a project by slug.

        Args:
            slug: Project slug

        Returns:
            True if deleted, False if not found
        """
        data = self.load_data()
        original_len = len(data["projects"])
        data["projects"] = [p for p in data["projects"] if p["slug"] != slug]

        if len(data["projects"]) < original_len:
            self.save_data(data)
            return True
        return False

    def _get_next_task_id(self) -> int:
        """Get the next available task ID.

        Returns:
            Next task ID (max existing ID + 1, or 1 if no tasks)
        """
        data = self.load_data()
        if not data["tasks"]:
            return 1
        max_id = max(task["id"] for task in data["tasks"])
        return max_id + 1
