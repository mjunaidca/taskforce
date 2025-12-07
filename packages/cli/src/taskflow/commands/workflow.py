"""TaskFlow workflow commands.

Commands for task workflow operations:
- start: Claim and start a task
- progress: Update task progress
- complete: Mark task as completed
- review: Request task review
- approve: Approve reviewed task
- reject: Reject reviewed task
- delegate: Delegate task to another worker
"""

from datetime import datetime

import typer
from rich.console import Console

from taskflow.audit import log_action
from taskflow.config import get_current_user
from taskflow.models import validate_status_transition
from taskflow.utils import get_storage

app = typer.Typer(help="Task workflow operations")
console = Console()


@app.command(name="start")
def start_task(
    task_id: int = typer.Argument(..., help="Task ID"),
) -> None:
    """Claim and start a task.

    Transitions task from pending to in_progress.
    Assigns task to current user if unassigned.

    Args:
        task_id: ID of task to start
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate status transition
    if not validate_status_transition(task.status, "in_progress"):
        console.print(
            f"[red]Error: Invalid status transition from '{task.status}' to 'in_progress'[/red]"
        )
        raise typer.Exit(1)

    # Update task
    task.status = "in_progress"
    task.updated_at = datetime.now()

    # Assign to current user if unassigned
    if task.assigned_to is None:
        task.assigned_to = actor

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "started",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"status": "in_progress"},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] started")
    console.print("  Status: [blue]in_progress[/blue]")
    if task.assigned_to:
        console.print(f"  Assigned to: [blue]{task.assigned_to}[/blue]")


@app.command(name="progress")
def progress_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    percent: int = typer.Option(..., "--percent", help="Progress percentage (0-100)"),
    note: str | None = typer.Option(None, "--note", help="Progress note"),
) -> None:
    """Update task progress.

    Only allowed when task status is in_progress.

    Args:
        task_id: ID of task to update
        percent: Progress percentage (0-100)
        note: Optional progress note
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate task is in progress
    if task.status != "in_progress":
        console.print(
            f"[red]Error: Task must be in_progress to update progress (current: {task.status})[/red]"
        )
        raise typer.Exit(1)

    # Validate percentage range
    if not 0 <= percent <= 100:
        console.print("[red]Error: Progress percentage must be between 0 and 100[/red]")
        raise typer.Exit(1)

    # Update task
    task.progress_percent = percent
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log with context
    context = {"progress_percent": percent}
    if note:
        context["note"] = note

    log_action(
        storage,
        "progressed",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context=context,
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] progress updated")
    console.print(f"  Progress: [blue]{percent}%[/blue]")
    if note:
        console.print(f"  Note: {note}")


@app.command(name="complete")
def complete_task(
    task_id: int = typer.Argument(..., help="Task ID"),
) -> None:
    """Mark task as completed.

    Transitions task to completed status and sets progress to 100%.

    Args:
        task_id: ID of task to complete
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate status transition
    if not validate_status_transition(task.status, "completed"):
        console.print(
            f"[red]Error: Invalid status transition from '{task.status}' to 'completed'[/red]"
        )
        raise typer.Exit(1)

    # Update task
    task.status = "completed"
    task.progress_percent = 100
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "completed",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"status": "completed"},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] completed")
    console.print("  Status: [green]completed[/green]")
    console.print("  Progress: [green]100%[/green]")


@app.command(name="review")
def review_task(
    task_id: int = typer.Argument(..., help="Task ID"),
) -> None:
    """Request task review.

    Transitions task from in_progress to review status.

    Args:
        task_id: ID of task to request review for
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate status transition
    if not validate_status_transition(task.status, "review"):
        console.print(
            f"[red]Error: Invalid status transition from '{task.status}' to 'review'[/red]"
        )
        raise typer.Exit(1)

    # Update task
    task.status = "review"
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "review_requested",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"status": "review"},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] submitted for review")
    console.print("  Status: [magenta]review[/magenta]")


@app.command(name="approve")
def approve_task(
    task_id: int = typer.Argument(..., help="Task ID"),
) -> None:
    """Approve reviewed task.

    Transitions task from review to completed status.

    Args:
        task_id: ID of task to approve
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate task is in review
    if task.status != "review":
        console.print(
            f"[red]Error: Task must be in review status to approve (current: {task.status})[/red]"
        )
        raise typer.Exit(1)

    # Update task
    task.status = "completed"
    task.progress_percent = 100
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "approved",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"status": "completed"},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] approved")
    console.print("  Status: [green]completed[/green]")


@app.command(name="reject")
def reject_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    reason: str = typer.Option(..., "--reason", help="Rejection reason"),
) -> None:
    """Reject reviewed task.

    Transitions task from review back to in_progress status.

    Args:
        task_id: ID of task to reject
        reason: Rejection reason
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate task is in review
    if task.status != "review":
        console.print(
            f"[red]Error: Task must be in review status to reject (current: {task.status})[/red]"
        )
        raise typer.Exit(1)

    # Update task
    task.status = "in_progress"
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "rejected",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"reason": reason, "status": "in_progress"},
    )

    # Show success message
    console.print(f"[yellow]⚠[/yellow] Task [bold]#{task.id}[/bold] rejected")
    console.print("  Status: [blue]in_progress[/blue]")
    console.print(f"  Reason: {reason}")


@app.command(name="delegate")
def delegate_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    to: str = typer.Option(..., "--to", help="Worker ID to delegate to (e.g., @worker)"),
) -> None:
    """Delegate task to another worker.

    Updates the assigned_to field to the specified worker.

    Args:
        task_id: ID of task to delegate
        to: Worker ID to delegate to
    """
    storage = get_storage()

    # Get current user
    actor = get_current_user(storage)
    if actor is None:
        console.print("[red]Error: No current user set[/red]")
        raise typer.Exit(1)

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    # Validate target worker exists
    target_worker = storage.get_worker(to)
    if target_worker is None:
        console.print(f"[red]Error: Worker '{to}' not found[/red]")
        raise typer.Exit(1)

    # Store old assignment for logging
    old_assignment = task.assigned_to

    # Update task
    task.assigned_to = to
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "delegated",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"from": old_assignment, "to": to},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] delegated")
    if old_assignment:
        console.print(f"  From: [dim]{old_assignment}[/dim]")
    console.print(f"  To: [blue]{to}[/blue]")
