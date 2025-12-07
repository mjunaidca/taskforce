"""Tests for TaskFlow configuration management following TDD methodology.

Tests cover:
- Getting and setting config values
- Current user management
- Default project management
"""


class TestGetConfig:
    """Test getting configuration."""

    def test_get_config_returns_dict(self, initialized_taskflow_dir):
        """RED: Test that get_config returns a dictionary."""
        from taskflow.config import get_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        config = get_config(storage)

        assert isinstance(config, dict)
        assert "default_project" in config

    def test_get_config_has_defaults(self, initialized_taskflow_dir):
        """RED: Test that config has expected default values."""
        from taskflow.config import get_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        config = get_config(storage)

        assert config["default_project"] == "default"
        assert "current_user" in config
        assert "storage_mode" in config


class TestSetConfig:
    """Test setting configuration values."""

    def test_set_config_updates_value(self, initialized_taskflow_dir):
        """RED: Test that set_config updates a value."""
        from taskflow.config import get_config, set_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Set a value
        set_config(storage, "test_key", "test_value")

        # Verify it was set
        config = get_config(storage)
        assert config["test_key"] == "test_value"

    def test_set_config_persists(self, initialized_taskflow_dir):
        """RED: Test that set_config persists to storage."""
        from taskflow.config import get_config, set_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Set a value
        set_config(storage, "persistent_key", "persistent_value")

        # Create new storage instance to verify persistence
        storage2 = Storage(initialized_taskflow_dir)
        config = get_config(storage2)
        assert config["persistent_key"] == "persistent_value"

    def test_set_config_overwrites_existing(self, initialized_taskflow_dir):
        """RED: Test that set_config overwrites existing values."""
        from taskflow.config import get_config, set_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Set initial value
        set_config(storage, "key", "value1")

        # Overwrite
        set_config(storage, "key", "value2")

        # Verify overwrite
        config = get_config(storage)
        assert config["key"] == "value2"


class TestGetCurrentUser:
    """Test getting current user."""

    def test_get_current_user_none_by_default(self, initialized_taskflow_dir):
        """RED: Test that current_user is None by default."""
        from taskflow.config import get_current_user
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        user = get_current_user(storage)

        assert user is None

    def test_get_current_user_after_setting(self, initialized_taskflow_dir):
        """RED: Test getting current_user after it's set."""
        from taskflow.config import get_current_user, set_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Set current user
        set_config(storage, "current_user", "@sarah")

        # Get it
        user = get_current_user(storage)
        assert user == "@sarah"


class TestGetDefaultProject:
    """Test getting default project."""

    def test_get_default_project_returns_default(self, initialized_taskflow_dir):
        """RED: Test that get_default_project returns 'default' initially."""
        from taskflow.config import get_default_project
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)
        project = get_default_project(storage)

        assert project == "default"

    def test_get_default_project_after_changing(self, initialized_taskflow_dir):
        """RED: Test getting default_project after changing it."""
        from taskflow.config import get_default_project, set_config
        from taskflow.storage import Storage

        storage = Storage(initialized_taskflow_dir)

        # Change default project
        set_config(storage, "default_project", "taskflow")

        # Get it
        project = get_default_project(storage)
        assert project == "taskflow"
