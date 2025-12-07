"""TaskFlow init command.

Initializes TaskFlow in a directory by creating .taskflow directory
with config.json and data.json files.
"""

import os
from datetime import datetime
from pathlib import Path

import typer
from rich.console import Console

from taskflow.models import Worker
from taskflow.storage import Storage

console = Console()


def init(
    path: Path = typer.Option(
        None,
        "--path",
        "-p",
        help="Path to initialize TaskFlow in (defaults to current directory)",
    ),
    user: str = typer.Option(
        None,
        "--user",
        "-u",
        help="Create default user (e.g., @junaid)",
    ),
) -> None:
    """Initialize TaskFlow in the current directory.

    Creates a .taskflow directory with:
    - config.json: Configuration settings
    - data.json: Default project and empty collections
    - Default user (optional, or @default-user if not specified)
    """
    # Determine the path to initialize
    if path is None:
        # Use TASKFLOW_HOME if set, otherwise current directory
        home = os.environ.get("TASKFLOW_HOME", str(Path.cwd()))
        path = Path(home)

    # Create .taskflow directory
    taskflow_dir = path / ".taskflow"
    taskflow_dir.mkdir(parents=True, exist_ok=True)

    # Initialize storage (creates config.json and data.json if they don't exist)
    storage = Storage(taskflow_dir)
    storage.initialize()

    # Ensure default project exists
    from taskflow.models import Project

    if storage.get_project("default") is None:
        default_project = Project(
            slug="default",
            name="Default Project",
            description="Default project created on init",
        )
        storage.add_project(default_project)

    # Create default user
    user_id = user if user else "@default-user"
    if not user_id.startswith("@"):
        user_id = f"@{user_id}"

    # Check if user already exists
    existing_user = storage.get_worker(user_id)
    if existing_user is None:
        default_worker = Worker(
            id=user_id,
            type="human",
            name=user_id.lstrip("@").replace("-", " ").title(),
            created_at=datetime.now(),
        )
        storage.add_worker(default_worker)

    # Always set current user in config
    from taskflow.config import set_config

    set_config(storage, "current_user", user_id)

    # Show success message
    console.print(f"[green]✓[/green] TaskFlow initialized in [bold]{path}[/bold]")
    console.print(f"  Config: {taskflow_dir / 'config.json'}")
    console.print(f"  Data: {taskflow_dir / 'data.json'}")
    console.print(f"  Default user: [cyan]{user_id}[/cyan]")
    console.print()
    console.print("[dim]Quick start:[/dim]")
    console.print('  taskflow add "My first task"')
    console.print("  taskflow list")
