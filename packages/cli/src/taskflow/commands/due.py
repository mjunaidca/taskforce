"""TaskFlow due date commands.

Commands for managing task due dates:
- upcoming: Show tasks with upcoming due dates
- overdue: Show overdue tasks
- due: Set or clear due dates on tasks
"""

from datetime import datetime, timedelta

import typer
from rich.console import Console
from rich.table import Table

from taskflow.audit import log_action
from taskflow.config import get_current_user
from taskflow.utils import get_storage

app = typer.Typer(help="Manage due dates")
console = Console()


def get_upcoming_range(days: int = 7) -> tuple[datetime, datetime]:
    """Get date range for upcoming tasks.

    Args:
        days: Number of days to look ahead

    Returns:
        Tuple of (start_date, end_date) for filtering
    """
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end = today + timedelta(days=days)
    return today, end


def days_until(due_date: datetime) -> int:
    """Calculate days until due date (negative if overdue).

    Args:
        due_date: The task's due date

    Returns:
        Number of days until due (negative if overdue)
    """
    today = datetime.now().date()
    return (due_date.date() - today).days


@app.command(name="upcoming")
def upcoming_tasks(
    days: int = typer.Option(7, "--days", help="Number of days to look ahead"),
) -> None:
    """Show tasks with upcoming due dates.

    Args:
        days: Number of days to look ahead (default: 7)
    """
    storage = get_storage()

    # Get date range
    today, end_date = get_upcoming_range(days)

    # Get all tasks
    all_tasks = storage.list_tasks()

    # Filter tasks with due dates in the upcoming range
    upcoming = [
        task
        for task in all_tasks
        if task.due_date is not None and today <= task.due_date <= end_date
    ]

    if not upcoming:
        console.print(f"[yellow]No upcoming tasks in the next {days} days[/yellow]")
        return

    # Sort by due date
    upcoming.sort(key=lambda t: t.due_date)  # type: ignore

    # Group by date
    tasks_by_date: dict[str, list] = {}
    for task in upcoming:
        date_key = task.due_date.strftime("%Y-%m-%d")  # type: ignore
        if date_key not in tasks_by_date:
            tasks_by_date[date_key] = []
        tasks_by_date[date_key].append(task)

    # Display grouped tasks
    console.print(f"\n[bold cyan]Upcoming Tasks (next {days} days)[/bold cyan]\n")

    for date_str in sorted(tasks_by_date.keys()):
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        days_away = days_until(date_obj)

        # Format date header with context
        if days_away == 0:
            header = f"[yellow bold]Today ({date_str})[/yellow bold]"
        elif days_away == 1:
            header = f"[white]Tomorrow ({date_str})[/white]"
        else:
            header = f"[white]In {days_away} days ({date_str})[/white]"

        console.print(f"\n{header}")
        console.print("─" * 80)

        # Create table for this date
        table = Table(show_header=True, header_style="bold cyan", box=None, padding=(0, 2))
        table.add_column("ID", style="green", width=6)
        table.add_column("Title", style="white")
        table.add_column("Status", style="blue", width=12)
        table.add_column("Priority", style="yellow", width=10)
        table.add_column("Assigned", style="magenta", width=15)

        for task in tasks_by_date[date_str]:
            # Format status with color
            status_colors = {
                "pending": "yellow",
                "in_progress": "blue",
                "review": "magenta",
                "completed": "green",
                "blocked": "red",
            }
            status_color = status_colors.get(task.status, "white")
            status_display = f"[{status_color}]{task.status}[/{status_color}]"

            assigned_display = task.assigned_to if task.assigned_to else "-"

            table.add_row(
                str(task.id),
                task.title,
                status_display,
                task.priority,
                assigned_display,
            )

        console.print(table)

    console.print()


@app.command(name="overdue")
def overdue_tasks() -> None:
    """Show overdue tasks."""
    storage = get_storage()

    # Get today
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get all tasks
    all_tasks = storage.list_tasks()

    # Filter overdue tasks
    overdue = [task for task in all_tasks if task.due_date is not None and task.due_date < today]

    if not overdue:
        console.print("[green]No overdue tasks - well done![/green]")
        return

    # Sort by most overdue first
    overdue.sort(key=lambda t: t.due_date)  # type: ignore

    # Display
    console.print(f"\n[bold red]Overdue Tasks ({len(overdue)})[/bold red]\n")

    # Create table
    table = Table(show_header=True, header_style="bold red")
    table.add_column("ID", style="green", width=6)
    table.add_column("Title", style="white")
    table.add_column("Days Overdue", style="red bold", width=14)
    table.add_column("Status", style="blue", width=12)
    table.add_column("Priority", style="yellow", width=10)
    table.add_column("Assigned", style="magenta", width=15)

    for task in overdue:
        days_overdue = abs(days_until(task.due_date))  # type: ignore
        days_text = f"{days_overdue} day{'s' if days_overdue != 1 else ''}"

        # Format status with color
        status_colors = {
            "pending": "yellow",
            "in_progress": "blue",
            "review": "magenta",
            "completed": "green",
            "blocked": "red",
        }
        status_color = status_colors.get(task.status, "white")
        status_display = f"[{status_color}]{task.status}[/{status_color}]"

        assigned_display = task.assigned_to if task.assigned_to else "-"

        table.add_row(
            str(task.id),
            task.title,
            days_text,
            status_display,
            task.priority,
            assigned_display,
        )

    console.print(table)
    console.print()


@app.command(name="due")
def set_due_date(
    task_id: int = typer.Argument(..., help="Task ID"),
    date: str | None = typer.Option(None, "--date", help="Due date (YYYY-MM-DD)"),
    clear: bool = typer.Option(False, "--clear", help="Clear the due date"),
) -> None:
    """Set or clear due date on a task.

    Args:
        task_id: ID of task to update
        date: Due date in YYYY-MM-DD format
        clear: If True, clear the due date
    """
    storage = get_storage()

    # Get current user for audit
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate options
    if clear and date:
        console.print("[red]Error: Cannot specify both --date and --clear[/red]")
        raise typer.Exit(1)

    if not clear and not date:
        console.print("[red]Error: Must specify either --date or --clear[/red]")
        raise typer.Exit(1)

    if clear:
        # Clear due date
        old_date = task.due_date.strftime("%Y-%m-%d") if task.due_date else None
        task.due_date = None

        # Save task
        task.updated_at = datetime.now()
        storage.update_task(task)

        # Create audit log
        log_action(
            storage,
            "due_date_cleared",
            actor,
            task_id=task.id,
            project_slug=task.project_slug,
            context={"old_date": old_date},
        )

        console.print(f"[green]✓[/green] Due date cleared for task [bold]#{task.id}[/bold]")
    else:
        # Parse and validate date
        try:
            new_due_date = datetime.strptime(date, "%Y-%m-%d")  # type: ignore
        except ValueError:
            console.print("[red]Error: Invalid date format. Use YYYY-MM-DD[/red]")
            raise typer.Exit(1)

        old_date = task.due_date.strftime("%Y-%m-%d") if task.due_date else None
        task.due_date = new_due_date

        # Save task
        task.updated_at = datetime.now()
        storage.update_task(task)

        # Create audit log
        log_action(
            storage,
            "due_date_set",
            actor,
            task_id=task.id,
            project_slug=task.project_slug,
            context={"old_date": old_date, "new_date": date},
        )

        console.print(f"[green]✓[/green] Due date set to [bold]{date}[/bold] for task #{task.id}")
