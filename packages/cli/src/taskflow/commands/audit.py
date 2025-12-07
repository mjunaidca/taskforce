"""TaskFlow audit viewing commands.

Commands for viewing audit logs and accountability tracking:
- audit list: List audit log entries with filtering
- audit show: Show detailed audit entry
- audit task: Show audit trail for specific task
- audit actor: Show audit trail for specific actor
"""

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from taskflow.utils import get_storage

app = typer.Typer(help="Audit log viewing commands")
console = Console()


@app.command(name="list")
def list_audit_logs(
    task: int | None = typer.Option(None, "--task", help="Filter by task ID"),
    actor: str | None = typer.Option(None, "--actor", help="Filter by actor ID"),
    action: str | None = typer.Option(None, "--action", help="Filter by action type"),
    limit: int = typer.Option(20, "--limit", help="Limit number of entries (default: 20)"),
) -> None:
    """List audit log entries with optional filtering.

    Examples:
        taskflow audit list
        taskflow audit list --task 1
        taskflow audit list --actor @claude-code
        taskflow audit list --action created --limit 10
    """
    storage = get_storage()

    # Get filtered audit logs
    logs = storage.list_audit_logs(task_id=task, actor_id=actor, action=action)

    # Apply limit
    logs = logs[:limit]

    if not logs:
        console.print("[yellow]No audit logs found matching filters.[/yellow]")
        return

    # Create table
    table = Table(title=f"Audit Log ({len(logs)} entries)")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Task", style="magenta")
    table.add_column("Actor", style="green")
    table.add_column("Action", style="yellow")
    table.add_column("Timestamp", style="blue")

    for log in logs:
        task_str = f"#{log.task_id}" if log.task_id else "-"
        timestamp_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")

        table.add_row(
            str(log.id),
            task_str,
            log.actor_id,
            log.action,
            timestamp_str,
        )

    console.print(table)


@app.command(name="show")
def show_audit_log(
    id: int = typer.Argument(..., help="Audit log ID to show"),
) -> None:
    """Show detailed audit log entry.

    Examples:
        taskflow audit show 5
    """
    storage = get_storage()

    log = storage.get_audit_log(id)

    if log is None:
        console.print(f"[red]Error: Audit log #{id} not found.[/red]")
        raise typer.Exit(1)

    # Format details
    task_str = f"#{log.task_id}" if log.task_id else "-"
    project_str = log.project_slug if log.project_slug else "-"
    timestamp_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")

    # Build panel content
    content = f"""[bold]ID:[/bold] {log.id}
[bold]Task:[/bold] {task_str}
[bold]Project:[/bold] {project_str}
[bold]Actor:[/bold] {log.actor_id} ({log.actor_type})
[bold]Action:[/bold] {log.action}
[bold]Timestamp:[/bold] {timestamp_str}
"""

    # Add context if present
    if log.context:
        content += "\n[bold]Context:[/bold]\n"
        for key, value in log.context.items():
            content += f"  {key}: {value}\n"

    panel = Panel(content, title=f"Audit Entry #{log.id}", border_style="cyan")
    console.print(panel)


@app.command(name="task")
def show_task_audit(
    task_id: int = typer.Argument(..., help="Task ID to show audit trail for"),
) -> None:
    """Show audit trail for a specific task.

    This is a shortcut for 'audit list --task <id>'.
    Shows all actions performed on the task in chronological order.

    Examples:
        taskflow audit task 1
    """
    storage = get_storage()

    # Get audit logs for this task
    logs = storage.list_audit_logs(task_id=task_id)

    if not logs:
        console.print(f"[yellow]No audit logs found for task #{task_id}.[/yellow]")
        return

    # Create table
    table = Table(title=f"Audit Trail for Task #{task_id} ({len(logs)} entries)")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Actor", style="green")
    table.add_column("Action", style="yellow")
    table.add_column("Timestamp", style="blue")
    table.add_column("Details", style="white")

    for log in logs:
        timestamp_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")

        # Extract key details from context
        details = []
        if "progress_percent" in log.context:
            details.append(f"Progress: {log.context['progress_percent']}%")
        if "title" in log.context:
            details.append(f"Title: {log.context['title']}")
        details_str = ", ".join(details) if details else "-"

        table.add_row(
            str(log.id),
            log.actor_id,
            log.action,
            timestamp_str,
            details_str,
        )

    console.print(table)


@app.command(name="actor")
def show_actor_audit(
    actor_id: str = typer.Argument(..., help="Actor ID to show audit trail for"),
) -> None:
    """Show audit trail for a specific actor.

    This is a shortcut for 'audit list --actor <id>'.
    Shows all actions performed by the worker (human or agent).
    Useful for accountability and review.

    Examples:
        taskflow audit actor @claude-code
        taskflow audit actor @sarah
    """
    storage = get_storage()

    # Get audit logs for this actor
    logs = storage.list_audit_logs(actor_id=actor_id)

    if not logs:
        console.print(f"[yellow]No audit logs found for actor {actor_id}.[/yellow]")
        return

    # Create table
    table = Table(title=f"Audit Trail for {actor_id} ({len(logs)} entries)")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Task", style="magenta")
    table.add_column("Action", style="yellow")
    table.add_column("Timestamp", style="blue")
    table.add_column("Details", style="white")

    for log in logs:
        task_str = f"#{log.task_id}" if log.task_id else "-"
        timestamp_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")

        # Extract key details from context
        details = []
        if "progress_percent" in log.context:
            details.append(f"Progress: {log.context['progress_percent']}%")
        if "title" in log.context:
            details.append(f"Title: {log.context['title']}")
        if "project_name" in log.context:
            details.append(f"Project: {log.context['project_name']}")
        details_str = ", ".join(details) if details else "-"

        table.add_row(
            str(log.id),
            task_str,
            log.action,
            timestamp_str,
            details_str,
        )

    console.print(table)
