"""TaskFlow worker commands.

Commands for managing workers (humans and agents):
- add: Register a new worker
- list: List all workers
"""

from datetime import datetime

import typer
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from taskflow.models import Worker
from taskflow.utils import get_storage

app = typer.Typer(help="Manage workers")
console = Console()


@app.command(name="add")
def add_worker(
    id: str = typer.Argument(..., help="Worker ID (e.g., @sarah, @claude-code)"),
    type: str = typer.Option(..., "--type", "-t", help="Worker type: human or agent"),
    name: str = typer.Option(..., "--name", "-n", help="Display name for the worker"),
    agent_type: str | None = typer.Option(
        None,
        "--agent-type",
        "-a",
        help="Agent type (claude, qwen, gemini, custom) - required for agents",
    ),
) -> None:
    """Add a new worker (human or agent).

    Args:
        id: Worker identifier (must start with @)
        type: Worker type (human or agent)
        name: Display name for the worker
        agent_type: Type of agent (required if type is agent)
    """
    storage = get_storage()

    # Check if worker already exists
    existing = storage.get_worker(id)
    if existing:
        console.print(f"[red]Error: Worker with ID '{id}' already exists[/red]")
        raise typer.Exit(1)

    # Create and validate worker
    try:
        worker = Worker(
            id=id,
            type=type,  # type: ignore
            name=name,
            agent_type=agent_type,  # type: ignore
            created_at=datetime.now(),
        )
    except ValidationError as e:
        console.print("[red]Error: Invalid worker data[/red]")
        for error in e.errors():
            # Handle both field errors and model validator errors
            if error["loc"]:
                field = error["loc"][0] if len(error["loc"]) > 0 else "validation"
            else:
                field = "validation"
            msg = error["msg"]
            console.print(f"  - {field}: {msg}")
        raise typer.Exit(1)

    # Add worker to storage
    storage.add_worker(worker)

    # Show success message
    worker_type_display = f"[blue]{type}[/blue]"
    if type == "agent" and agent_type:
        worker_type_display = f"[magenta]{type}[/magenta] ([dim]{agent_type}[/dim])"

    console.print(f"[green]✓[/green] Worker [bold]{id}[/bold] created successfully")
    console.print(f"  Name: {name}")
    console.print(f"  Type: {worker_type_display}")


@app.command(name="list")
def list_workers() -> None:
    """List all workers.

    Displays a table of all workers with ID, name, type, and agent type.
    Shows badges for human/agent types.
    """
    storage = get_storage()

    # Get all workers
    workers = storage.list_workers()

    if not workers:
        console.print("[yellow]No workers found. Add workers with 'taskflow worker add'[/yellow]")
        return

    # Create table
    table = Table(title="Workers", show_header=True, header_style="bold cyan")
    table.add_column("ID", style="green")
    table.add_column("Name", style="white")
    table.add_column("Type", style="blue")
    table.add_column("Agent Type", style="magenta")
    table.add_column("Created", style="dim")

    # Add rows
    for worker in workers:
        # Format type with badge
        if worker.type == "human":
            type_display = "[blue]HUMAN[/blue]"
        else:
            type_display = "[magenta]AGENT[/magenta]"

        # Format agent type
        agent_type_display = worker.agent_type if worker.agent_type else "-"

        # Format created date
        created_display = worker.created_at.strftime("%Y-%m-%d")

        table.add_row(
            worker.id,
            worker.name,
            type_display,
            agent_type_display,
            created_display,
        )

    console.print(table)
