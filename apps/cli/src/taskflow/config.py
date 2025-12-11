"""TaskFlow configuration management.

Provides functions to:
- Get and set configuration values
- Manage current user
- Manage default project
"""

from typing import Any

from taskflow.storage import Storage


def get_config(storage: Storage) -> dict[str, Any]:
    """Get the full configuration dictionary.

    Args:
        storage: Storage instance

    Returns:
        Configuration dictionary
    """
    return storage.load_config()


def set_config(storage: Storage, key: str, value: Any) -> None:
    """Set a configuration value.

    Args:
        storage: Storage instance
        key: Configuration key
        value: Configuration value
    """
    config = storage.load_config()
    config[key] = value
    storage.save_config(config)


def get_current_user(storage: Storage) -> str | None:
    """Get the current user ID.

    Args:
        storage: Storage instance

    Returns:
        Current user ID or None if not set
    """
    config = get_config(storage)
    return config.get("current_user")


def get_default_project(storage: Storage) -> str:
    """Get the default project slug.

    Args:
        storage: Storage instance

    Returns:
        Default project slug (defaults to "default")
    """
    config = get_config(storage)
    return config.get("default_project", "default")
