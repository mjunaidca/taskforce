"""Tests for taskflow project commands.

Test cases:
- taskflow project add <slug> <name> creates project
- taskflow project add with --description works
- taskflow project add fails on duplicate slug
- taskflow project list shows all projects
- taskflow project list shows default project
"""

import json
from pathlib import Path

from typer.testing import CliRunner

from taskflow.main import app


def test_project_add_creates_project(cli_runner: CliRunner, initialized_taskflow_dir: Path) -> None:
    """Test that project add creates a new project."""
    # Run project add command
    result = cli_runner.invoke(app, ["project", "add", "web-app", "Web Application"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify success message
    assert "web-app" in result.stdout
    assert "created" in result.stdout.lower() or "added" in result.stdout.lower()

    # Verify project was added to data.json
    data_file = initialized_taskflow_dir / "data.json"
    data = json.loads(data_file.read_text())

    # Should have 2 projects now (default + web-app)
    assert len(data["projects"]) == 2

    # Find the new project
    web_app = next((p for p in data["projects"] if p["slug"] == "web-app"), None)
    assert web_app is not None
    assert web_app["name"] == "Web Application"
    assert web_app["description"] is None


def test_project_add_with_description(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project add works with description."""
    # Run project add command with description
    result = cli_runner.invoke(
        app,
        [
            "project",
            "add",
            "api-service",
            "API Service",
            "--description",
            "REST API backend",
        ],
    )

    # Verify exit code
    assert result.exit_code == 0

    # Verify project was added with description
    data_file = initialized_taskflow_dir / "data.json"
    data = json.loads(data_file.read_text())

    api_service = next((p for p in data["projects"] if p["slug"] == "api-service"), None)
    assert api_service is not None
    assert api_service["name"] == "API Service"
    assert api_service["description"] == "REST API backend"


def test_project_add_fails_on_duplicate_slug(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project add fails when slug already exists."""
    # Try to add a project with the default slug
    result = cli_runner.invoke(app, ["project", "add", "default", "Another Default Project"])

    # Verify it fails
    assert result.exit_code != 0

    # Verify error message mentions duplicate
    assert "exists" in result.stdout.lower() or "duplicate" in result.stdout.lower()


def test_project_list_shows_all_projects(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project list shows all projects."""
    # Add a couple of projects first
    cli_runner.invoke(app, ["project", "add", "project1", "Project One"])
    cli_runner.invoke(app, ["project", "add", "project2", "Project Two"])

    # Run project list command
    result = cli_runner.invoke(app, ["project", "list"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify all projects are shown (default + 2 new ones)
    assert "default" in result.stdout
    assert "Default Project" in result.stdout
    assert "project1" in result.stdout
    assert "Project One" in result.stdout
    assert "project2" in result.stdout
    assert "Project Two" in result.stdout


def test_project_list_shows_default_project(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project list highlights the default project."""
    # Run project list command
    result = cli_runner.invoke(app, ["project", "list"])

    # Verify exit code
    assert result.exit_code == 0

    # Verify default project is shown
    assert "default" in result.stdout
    assert "Default Project" in result.stdout


def test_project_add_validates_slug_format(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project add validates slug format (lowercase, numbers, hyphens only)."""
    # Try to add a project with invalid slug (uppercase)
    result = cli_runner.invoke(app, ["project", "add", "Invalid-Slug", "Test Project"])

    # Should fail validation
    assert result.exit_code != 0


def test_project_list_shows_table_format(
    cli_runner: CliRunner, initialized_taskflow_dir: Path
) -> None:
    """Test that project list uses a table format (Rich table)."""
    # Add a project
    cli_runner.invoke(
        app,
        [
            "project",
            "add",
            "test-proj",
            "Test Project",
            "--description",
            "A test project",
        ],
    )

    # Run project list
    result = cli_runner.invoke(app, ["project", "list"])

    # Verify it contains table-like structure (headers)
    # Rich tables typically have these headers
    output_lower = result.stdout.lower()
    assert "slug" in output_lower or "name" in output_lower or "description" in output_lower
