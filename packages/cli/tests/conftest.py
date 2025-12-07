"""Pytest configuration and fixtures for TaskFlow CLI tests."""

import os
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from typer.testing import CliRunner


@pytest.fixture
def cli_runner() -> CliRunner:
    """Provide a Typer CLI test runner."""
    return CliRunner()


@pytest.fixture
def temp_taskflow_dir() -> Generator[Path]:
    """Create a temporary .taskflow directory for testing.

    This fixture creates a temporary directory that simulates the .taskflow
    directory structure used by the CLI. It cleans up after the test.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        taskflow_dir = Path(tmpdir) / ".taskflow"
        taskflow_dir.mkdir()

        # Store original environment
        original_home = os.environ.get("TASKFLOW_HOME")
        os.environ["TASKFLOW_HOME"] = tmpdir

        yield taskflow_dir

        # Restore original environment
        if original_home is not None:
            os.environ["TASKFLOW_HOME"] = original_home
        else:
            os.environ.pop("TASKFLOW_HOME", None)


@pytest.fixture
def initialized_taskflow_dir(temp_taskflow_dir: Path) -> Path:
    """Provide an initialized .taskflow directory with default config and data.

    This fixture builds on temp_taskflow_dir and adds the initial config.json
    and data.json files that would be created by `taskflow init`.
    """
    import json

    # Create config.json
    config = {
        "default_project": "default",
        "current_user": None,
        "storage_mode": "json",
    }
    config_file = temp_taskflow_dir / "config.json"
    config_file.write_text(json.dumps(config, indent=2))

    # Create data.json with default project
    data = {
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
    data_file = temp_taskflow_dir / "data.json"
    data_file.write_text(json.dumps(data, indent=2))

    return temp_taskflow_dir
