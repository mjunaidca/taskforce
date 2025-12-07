"""TaskFlow init command.

Initializes TaskFlow in a directory by creating .taskflow directory
with config.json and data.json files.
"""

import os
from pathlib import Path

import typer
from rich.console import Console

from taskflow.storage import Storage

console = Console()


def init(
    path: Path = typer.Option(
        None,
        "--path",
        "-p",
        help="Path to initialize TaskFlow in (defaults to current directory)",
    ),
) -> None:
    """Initialize TaskFlow in the current directory.

    Creates a .taskflow directory with:
    - config.json: Configuration settings
    - data.json: Default project and empty collections
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

    # Show success message
    console.print(f"[green]✓[/green] TaskFlow initialized successfully in [bold]{path}[/bold]")
    console.print(f"  Configuration: {taskflow_dir / 'config.json'}")
    console.print(f"  Data: {taskflow_dir / 'data.json'}")
