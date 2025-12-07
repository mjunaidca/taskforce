"""Tests for taskflow worker commands.

Test cases:
- taskflow worker add @sarah --type human --name "Sarah" creates human worker
- taskflow worker add @claude-code --type agent --name "Claude" --agent-type claude creates agent
- taskflow worker add fails if agent without agent-type
- taskflow worker add fails on duplicate ID
- taskflow worker list shows all workers
- taskflow worker list shows type (human/agent) badge
"""

import json
from pathlib import Path

from typer.testing import CliRunner

from taskflow.main import app


def test_worker_add_creates_human_worker(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker add creates a human worker."""
    # Run worker add command for human
    result = cli_runner.invoke(
        app, ["worker", "add", "@sarah", "--type", "human", "--name", "Sarah Smith"]
    )

    # Verify exit code
    assert result.exit_code == 0

    # Verify success message
    assert "@sarah" in result.stdout
    assert "created" in result.stdout.lower() or "added" in result.stdout.lower()

    # Verify worker was added to data.json
    data_file = initialized_taskflow_dir / "data.json"
    data = json.loads(data_file.read_text())

    # Should have 1 worker now
    assert len(data["workers"]) == 1

    worker = data["workers"][0]
    assert worker["id"] == "@sarah"
    assert worker["type"] == "human"
    assert worker["name"] == "Sarah Smith"
    assert worker["agent_type"] is None
    assert "created_at" in worker


def test_worker_add_creates_agent_worker(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker add creates an agent worker."""
    # Run worker add command for agent
    result = cli_runner.invoke(
        app,
        [
            "worker",
            "add",
            "@claude-code",
            "--type",
            "agent",
            "--name",
            "Claude",
            "--agent-type",
            "claude",
        ],
    )

    # Verify exit code
    assert result.exit_code == 0

    # Verify worker was added with agent_type
    data_file = initialized_taskflow_dir / "data.json"
    data = json.loads(data_file.read_text())

    worker = data["workers"][0]
    assert worker["id"] == "@claude-code"
    assert worker["type"] == "agent"
    assert worker["name"] == "Claude"
    assert worker["agent_type"] == "claude"


def test_worker_add_fails_without_agent_type_for_agent(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker add fails when agent type is missing for agent."""
    # Try to add agent without agent_type
    result = cli_runner.invoke(
        app,
        ["worker", "add", "@broken-agent", "--type", "agent", "--name", "Broken Agent"],
    )

    # Should fail validation
    assert result.exit_code != 0

    # Verify error message mentions agent_type
    assert "agent_type" in result.stdout.lower() or "agent type" in result.stdout.lower()


def test_worker_add_fails_on_duplicate_id(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker add fails when ID already exists."""
    # Add a worker first
    cli_runner.invoke(app, ["worker", "add", "@john", "--type", "human", "--name", "John Doe"])

    # Try to add another worker with the same ID
    result = cli_runner.invoke(
        app, ["worker", "add", "@john", "--type", "human", "--name", "John Smith"]
    )

    # Should fail
    assert result.exit_code != 0

    # Verify error message mentions duplicate
    assert "exists" in result.stdout.lower() or "duplicate" in result.stdout.lower()


def test_worker_list_shows_all_workers(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker list shows all workers."""
    # Add multiple workers
    cli_runner.invoke(app, ["worker", "add", "@sarah", "--type", "human", "--name", "Sarah"])
    cli_runner.invoke(
        app,
        [
            "worker",
            "add",
            "@claude",
            "--type",
            "agent",
            "--name",
            "Claude",
            "--agent-type",
            "claude",
        ],
    )

    # Run worker list command
    result = cli_runner.invoke(app, ["worker", "list"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify both workers are shown
    assert "@sarah" in result.stdout
    assert "Sarah" in result.stdout
    assert "@claude" in result.stdout
    assert "Claude" in result.stdout


def test_worker_list_shows_type_badges(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker list shows type badges (human/agent)."""
    # Add both human and agent
    cli_runner.invoke(app, ["worker", "add", "@sarah", "--type", "human", "--name", "Sarah"])
    cli_runner.invoke(
        app,
        [
            "worker",
            "add",
            "@claude",
            "--type",
            "agent",
            "--name",
            "Claude",
            "--agent-type",
            "claude",
        ],
    )

    # Run worker list
    result = cli_runner.invoke(app, ["worker", "list"])

    # Verify type information is shown
    output_lower = result.stdout.lower()
    assert "human" in output_lower or "agent" in output_lower


def test_worker_add_validates_id_format(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker add validates ID format (must start with @)."""
    # Try to add worker without @ prefix
    result = cli_runner.invoke(
        app, ["worker", "add", "invalid-id", "--type", "human", "--name", "Test"]
    )

    # Should fail validation
    assert result.exit_code != 0


def test_worker_list_shows_agent_type(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker list shows agent type for agents."""
    # Add agents with different agent types
    cli_runner.invoke(
        app,
        [
            "worker",
            "add",
            "@claude",
            "--type",
            "agent",
            "--name",
            "Claude",
            "--agent-type",
            "claude",
        ],
    )
    cli_runner.invoke(
        app,
        [
            "worker",
            "add",
            "@qwen",
            "--type",
            "agent",
            "--name",
            "Qwen",
            "--agent-type",
            "qwen",
        ],
    )

    # Run worker list
    result = cli_runner.invoke(app, ["worker", "list"])

    # Verify agent types are shown
    assert "claude" in result.stdout.lower()
    assert "qwen" in result.stdout.lower()


def test_worker_list_uses_table_format(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that worker list uses a table format (Rich table)."""
    # Add a worker
    cli_runner.invoke(app, ["worker", "add", "@test", "--type", "human", "--name", "Test User"])

    # Run worker list
    result = cli_runner.invoke(app, ["worker", "list"])

    # Verify it contains table-like structure (headers)
    output_lower = result.stdout.lower()
    assert "id" in output_lower or "name" in output_lower or "type" in output_lower
