"""TaskFlow demo command - automated demonstration of human-agent parity.

Runs a 90-second automated demo showcasing identical workflows for
human and agent workers.
"""

import time
from datetime import datetime

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from taskflow.audit import log_action
from taskflow.models import Project, Task, Worker
from taskflow.storage import Storage
from taskflow.utils import get_storage

app = typer.Typer(help="Demo command")
console = Console()


def sleep_if_not_fast(seconds: float, fast: bool) -> None:
    """Sleep for demonstration pacing, skip if fast mode."""
    if not fast:
        time.sleep(seconds)


def demo(
    fast: bool = typer.Option(False, "--fast", help="Skip delays for faster execution"),
    no_cleanup: bool = typer.Option(False, "--no-cleanup", help="Keep demo data after completion"),
) -> None:
    """Run automated demo showcasing human-agent parity.

    This command demonstrates TaskFlow's core innovation: humans and AI agents
    can perform identical workflows with full audit trail accountability.

    Duration: ~90 seconds (configurable with --fast)

    Args:
        fast: Skip delays between steps
        no_cleanup: Preserve demo data (workers, tasks, audit logs)
    """
    try:
        storage = get_storage()
    except Exception:
        # If no storage exists, we'll initialize it

        from taskflow.config import get_taskflow_dir

        taskflow_dir = get_taskflow_dir()
        storage = Storage(taskflow_dir)
        storage.initialize()

    # Store demo worker IDs for cleanup
    demo_worker_ids = []
    demo_task_ids = []
    demo_project_slug = "demo"

    # Header
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]TaskFlow Demo - Human-Agent Parity[/bold cyan]",
            border_style="cyan",
        )
    )
    console.print()
    sleep_if_not_fast(1, fast)

    # Step 1: Initialization
    console.print("[bold]Step 1: Initialization[/bold]")
    sleep_if_not_fast(0.5, fast)

    console.print("  [green]✓[/green] Initializing TaskFlow...")
    sleep_if_not_fast(0.3, fast)

    # Create human worker
    sarah = Worker(
        id="@sarah",
        type="human",
        name="Sarah Chen",
        created_at=datetime.now(),
    )
    storage.add_worker(sarah)
    demo_worker_ids.append("@sarah")
    console.print("  [green]✓[/green] Creating worker @sarah (human)")
    sleep_if_not_fast(0.5, fast)

    # Create agent worker
    claude = Worker(
        id="@claude-code",
        type="agent",
        name="Claude Code",
        agent_type="claude",
        capabilities=["coding", "architecture", "debugging"],
        created_at=datetime.now(),
    )
    storage.add_worker(claude)
    demo_worker_ids.append("@claude-code")
    console.print("  [green]✓[/green] Creating worker @claude-code (agent)")
    sleep_if_not_fast(0.5, fast)

    # Create demo project
    demo_project = Project(
        slug="demo",
        name="Demo Project",
        description="Demonstration of human-agent parity",
    )
    storage.add_project(demo_project)
    console.print('  [green]✓[/green] Creating project "demo"')

    # Ensure default project exists for post-demo use
    if storage.get_project("default") is None:
        default_project = Project(
            slug="default",
            name="Default Project",
            description="Default project created on init",
        )
        storage.add_project(default_project)

    # Set @sarah as current user so demo data is usable
    from taskflow.config import set_config

    set_config(storage, "current_user", "@sarah")

    console.print()
    sleep_if_not_fast(1, fast)

    # Step 2: Task Creation
    console.print("[bold]Step 2: Task Creation[/bold]")
    sleep_if_not_fast(0.5, fast)

    # Create task for human
    task1 = Task(
        id=storage._get_next_task_id(),
        title="Review PR #42",
        description="Review pull request for authentication module",
        project_slug="demo",
        status="pending",
        priority="high",
        assigned_to="@sarah",
        created_by="@sarah",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    storage.add_task(task1)
    demo_task_ids.append(task1.id)
    log_action(storage, "created", "@sarah", task_id=task1.id, project_slug="demo")
    console.print(f'  [green]✓[/green] @sarah creates task #{task1.id} "Review PR #42"')
    sleep_if_not_fast(0.5, fast)

    # Create task for agent
    task2 = Task(
        id=storage._get_next_task_id(),
        title="Write unit tests",
        description="Add comprehensive unit tests for task workflow",
        project_slug="demo",
        status="pending",
        priority="high",
        assigned_to="@claude-code",
        created_by="@claude-code",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    storage.add_task(task2)
    demo_task_ids.append(task2.id)
    log_action(storage, "created", "@claude-code", task_id=task2.id, project_slug="demo")
    console.print(f'  [green]✓[/green] @claude-code creates task #{task2.id} "Write unit tests"')
    console.print()
    sleep_if_not_fast(1, fast)

    # Step 3: Human Workflow
    console.print("[bold]Step 3: Human Workflow (@sarah)[/bold]")
    sleep_if_not_fast(0.5, fast)

    # Start task
    task1.status = "in_progress"
    task1.updated_at = datetime.now()
    storage.update_task(task1)
    log_action(
        storage,
        "started",
        "@sarah",
        task_id=task1.id,
        project_slug="demo",
        context={"status": "in_progress"},
    )
    console.print(f"  [green]✓[/green] Starting task #{task1.id}")
    sleep_if_not_fast(1, fast)

    # Update progress
    task1.progress_percent = 50
    task1.updated_at = datetime.now()
    storage.update_task(task1)
    log_action(
        storage,
        "progressed",
        "@sarah",
        task_id=task1.id,
        project_slug="demo",
        context={"progress_percent": 50, "note": "Reviewing authentication logic"},
    )
    console.print("  [green]✓[/green] Updating progress to 50%")
    sleep_if_not_fast(1, fast)

    # Complete task
    task1.status = "completed"
    task1.progress_percent = 100
    task1.updated_at = datetime.now()
    storage.update_task(task1)
    log_action(
        storage,
        "completed",
        "@sarah",
        task_id=task1.id,
        project_slug="demo",
        context={"status": "completed"},
    )
    console.print(f"  [green]✓[/green] Completing task #{task1.id}")
    console.print()
    sleep_if_not_fast(1, fast)

    # Step 4: Agent Workflow
    console.print("[bold]Step 4: Agent Workflow (@claude-code)[/bold]")
    sleep_if_not_fast(0.5, fast)

    # Start task
    task2.status = "in_progress"
    task2.updated_at = datetime.now()
    storage.update_task(task2)
    log_action(
        storage,
        "started",
        "@claude-code",
        task_id=task2.id,
        project_slug="demo",
        context={"status": "in_progress"},
    )
    console.print(f"  [green]✓[/green] Starting task #{task2.id}")
    sleep_if_not_fast(1, fast)

    # Update progress
    task2.progress_percent = 75
    task2.updated_at = datetime.now()
    storage.update_task(task2)
    log_action(
        storage,
        "progressed",
        "@claude-code",
        task_id=task2.id,
        project_slug="demo",
        context={"progress_percent": 75, "note": "Writing workflow tests"},
    )
    console.print("  [green]✓[/green] Updating progress to 75%")
    sleep_if_not_fast(1, fast)

    # Complete task
    task2.status = "completed"
    task2.progress_percent = 100
    task2.updated_at = datetime.now()
    storage.update_task(task2)
    log_action(
        storage,
        "completed",
        "@claude-code",
        task_id=task2.id,
        project_slug="demo",
        context={"status": "completed"},
    )
    console.print(f"  [green]✓[/green] Completing task #{task2.id}")
    console.print()
    sleep_if_not_fast(1, fast)

    # Step 5: Audit Trail
    console.print("[bold]Step 5: Audit Trail[/bold]")
    sleep_if_not_fast(0.5, fast)

    # Get all audit logs
    all_logs = storage.list_audit_logs()

    # Filter to demo logs (by task IDs)
    demo_logs = [log for log in all_logs if log.task_id in demo_task_ids]

    # Create audit table
    table = Table(
        title="Human-Agent Parity Audit Trail", show_header=True, header_style="bold cyan"
    )
    table.add_column("ID", style="dim", width=4)
    table.add_column("Actor", width=20)
    table.add_column("Action", width=15)
    table.add_column("Task", width=10)
    table.add_column("Details", width=30)

    for log in demo_logs:
        actor_style = "blue" if log.actor_type == "human" else "magenta"
        actor_label = f"{log.actor_id} ({log.actor_type})"

        details = []
        if "status" in log.context:
            details.append(f"status: {log.context['status']}")
        if "progress_percent" in log.context:
            details.append(f"{log.context['progress_percent']}%")
        if "note" in log.context:
            details.append(log.context["note"])

        table.add_row(
            str(log.id),
            f"[{actor_style}]{actor_label}[/{actor_style}]",
            log.action,
            f"#{log.task_id}" if log.task_id else "",
            ", ".join(details) if details else "",
        )

    console.print(table)
    console.print()
    sleep_if_not_fast(2, fast)

    # Final message
    console.print(
        Panel.fit(
            "[bold green]✓ Demo complete! Human and agent workflows are identical.[/bold green]\n\n"
            "[dim]Both @sarah (human) and @claude-code (agent) performed the same workflow:\n"
            "  1. Create task\n"
            "  2. Start work\n"
            "  3. Update progress\n"
            "  4. Complete task\n\n"
            "All actions audited with full accountability.[/dim]",
            title="Human-Agent Parity Demonstrated",
            border_style="green",
        )
    )
    console.print()

    # Cleanup if requested
    if not no_cleanup:
        console.print("[dim]Cleaning up demo data...[/dim]")

        # Remove demo tasks
        for task_id in demo_task_ids:
            storage.delete_task(task_id)

        # Remove demo workers
        for worker_id in demo_worker_ids:
            storage.delete_worker(worker_id)

        # Remove demo project
        storage.delete_project(demo_project_slug)

        # Remove demo audit logs
        for log in demo_logs:
            storage.delete_audit_log(log.id)

        console.print("[dim]✓ Demo data cleaned up[/dim]")
        console.print()


if __name__ == "__main__":
    app()
