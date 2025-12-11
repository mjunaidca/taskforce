"""Tests for taskflow init command.

Test cases:
- taskflow init creates .taskflow directory
- taskflow init creates config.json with defaults
- taskflow init creates data.json with default project
- taskflow init is idempotent (doesn't fail on re-run)
- taskflow init shows success message
"""

import json
from pathlib import Path

from typer.testing import CliRunner

from taskflow.main import app


def test_init_creates_taskflow_directory(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that init creates .taskflow directory."""
    # Set TASKFLOW_HOME to tmp_path
    import os

    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Run init command
    result = cli_runner.invoke(app, ["init"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify .taskflow directory was created
    taskflow_dir = tmp_path / ".taskflow"
    assert taskflow_dir.exists()
    assert taskflow_dir.is_dir()

    # Clean up
    os.environ.pop("TASKFLOW_HOME", None)


def test_init_creates_config_json(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that init creates config.json with defaults."""
    import os

    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Run init command
    result = cli_runner.invoke(app, ["init"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify config.json exists and has correct defaults
    config_file = tmp_path / ".taskflow" / "config.json"
    assert config_file.exists()

    config = json.loads(config_file.read_text())
    assert config["default_project"] == "default"
    assert config["current_user"] == "@default-user"  # Default user now created
    assert config["storage_mode"] == "json"

    # Clean up
    os.environ.pop("TASKFLOW_HOME", None)


def test_init_creates_data_json_with_default_project(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that init creates data.json with default project."""
    import os

    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Run init command
    result = cli_runner.invoke(app, ["init"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify data.json exists
    data_file = tmp_path / ".taskflow" / "data.json"
    assert data_file.exists()

    # Verify default project exists
    data = json.loads(data_file.read_text())
    assert len(data["projects"]) == 1
    assert data["projects"][0]["slug"] == "default"
    assert data["projects"][0]["name"] == "Default Project"
    assert data["projects"][0]["description"] == "Default project created on init"

    # Verify default user was created
    assert len(data["workers"]) == 1
    assert data["workers"][0]["id"] == "@default-user"
    assert data["workers"][0]["type"] == "human"

    # Verify empty collections
    assert data["tasks"] == []
    assert data["audit_logs"] == []

    # Clean up
    os.environ.pop("TASKFLOW_HOME", None)


def test_init_is_idempotent(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that running init multiple times doesn't fail."""
    import os

    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Run init first time
    result1 = cli_runner.invoke(app, ["init"])
    assert result1.exit_code == 0

    # Run init second time
    result2 = cli_runner.invoke(app, ["init"])
    assert result2.exit_code == 0

    # Verify files still exist
    taskflow_dir = tmp_path / ".taskflow"
    assert taskflow_dir.exists()
    assert (taskflow_dir / "config.json").exists()
    assert (taskflow_dir / "data.json").exists()

    # Clean up
    os.environ.pop("TASKFLOW_HOME", None)


def test_init_shows_success_message(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that init shows success message."""
    import os

    os.environ["TASKFLOW_HOME"] = str(tmp_path)

    # Run init command
    result = cli_runner.invoke(app, ["init"])

    # Verify success message is shown
    assert result.exit_code == 0
    assert (
        "TaskFlow initialized successfully" in result.stdout
        or "initialized" in result.stdout.lower()
    )

    # Clean up
    os.environ.pop("TASKFLOW_HOME", None)


def test_init_with_custom_path(cli_runner: CliRunner, tmp_path: Path) -> None:
    """Test that init works with custom path."""
    custom_path = tmp_path / "custom_location"
    custom_path.mkdir()

    # Run init with custom path
    result = cli_runner.invoke(app, ["init", "--path", str(custom_path)])

    # Verify exit code
    assert result.exit_code == 0

    # Verify .taskflow directory was created in custom location
    taskflow_dir = custom_path / ".taskflow"
    assert taskflow_dir.exists()
    assert (taskflow_dir / "config.json").exists()
    assert (taskflow_dir / "data.json").exists()
