"""TaskFlow project commands.

Commands for managing projects:
- add: Create a new project
- list: List all projects
"""

import typer
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from taskflow.config import get_default_project
from taskflow.models import Project
from taskflow.utils import get_storage

app = typer.Typer(help="Manage projects")
console = Console()


@app.command(name="add")
def add_project(
    slug: str = typer.Argument(..., help="Project slug (lowercase, numbers, hyphens)"),
    name: str = typer.Argument(..., help="Project name"),
    description: str | None = typer.Option(None, "--description", "-d", help="Project description"),
) -> None:
    """Add a new project.

    Args:
        slug: Unique project identifier (lowercase, numbers, hyphens only)
        name: Human-readable project name
        description: Optional project description
    """
    storage = get_storage()

    # Check if project already exists
    existing = storage.get_project(slug)
    if existing:
        console.print(f"[red]Error: Project with slug '{slug}' already exists[/red]")
        raise typer.Exit(1)

    # Create and validate project
    try:
        project = Project(slug=slug, name=name, description=description)
    except ValidationError as e:
        console.print("[red]Error: Invalid project data[/red]")
        for error in e.errors():
            # Handle both field errors and model validator errors
            if error["loc"]:
                field = error["loc"][0] if len(error["loc"]) > 0 else "validation"
            else:
                field = "validation"
            msg = error["msg"]
            console.print(f"  - {field}: {msg}")
        raise typer.Exit(1)

    # Add project to storage
    storage.add_project(project)

    # Show success message
    console.print(f"[green]✓[/green] Project [bold]{slug}[/bold] created successfully")
    console.print(f"  Name: {name}")
    if description:
        console.print(f"  Description: {description}")


@app.command(name="list")
def list_projects() -> None:
    """List all projects.

    Displays a table of all projects with slug, name, and description.
    Highlights the default project.
    """
    storage = get_storage()

    # Get all projects
    projects = storage.list_projects()

    if not projects:
        console.print("[yellow]No projects found. Run 'taskflow init' first.[/yellow]")
        return

    # Get default project slug
    default_slug = get_default_project(storage)

    # Create table
    table = Table(title="Projects", show_header=True, header_style="bold cyan")
    table.add_column("Slug", style="green")
    table.add_column("Name", style="white")
    table.add_column("Description", style="dim")
    table.add_column("Default", justify="center")

    # Add rows
    for project in projects:
        is_default = "✓" if project.slug == default_slug else ""
        table.add_row(
            project.slug,
            project.name,
            project.description or "-",
            is_default,
        )

    console.print(table)
