"""TaskFlow status command.

Displays a comprehensive summary of the current TaskFlow state:
- Current project and worker context
- Task counts by status
- Upcoming due dates (next 3)
- Recent activity (last 5 audit entries)
"""

from datetime import datetime

import typer
from rich.console import Console
from rich.panel import Panel

from taskflow.utils import get_storage

console = Console()


def status() -> None:
    """Show TaskFlow status summary.

    Displays:
    - Current project and worker
    - Task counts by status
    - Upcoming due dates
    - Recent activity
    """
    # Get storage
    storage = get_storage()
    taskflow_dir = storage.taskflow_dir

    # Check if initialized
    if not taskflow_dir.exists():
        console.print(
            "[red]Error:[/red] TaskFlow not initialized. Run [cyan]taskflow init[/cyan] first.",
            style="bold",
        )
        raise typer.Exit(1)

    config = storage.load_config()

    # Get current context
    current_project = config.get("default_project", "default")
    current_user = config.get("current_user", "Not set")

    # Load data
    tasks = storage.list_tasks()
    audit_logs = storage.list_audit_logs()

    # Calculate task counts by status
    status_counts = {
        "pending": 0,
        "in_progress": 0,
        "review": 0,
        "completed": 0,
        "blocked": 0,
    }
    for task in tasks:
        status_counts[task.status] = status_counts.get(task.status, 0) + 1

    # Get upcoming tasks (next 3)
    now = datetime.now()
    upcoming_tasks = [
        t for t in tasks if t.due_date and t.due_date >= now and t.status != "completed"
    ]
    upcoming_tasks.sort(key=lambda t: t.due_date)
    upcoming_tasks = upcoming_tasks[:3]

    # Get recent activity (last 5)
    recent_logs = audit_logs[:5]

    # Build the status display
    lines = []
    lines.append("")
    lines.append(f"  Project: {current_project}")
    lines.append(f"  Worker: {current_user}")
    lines.append("")
    lines.append("  Tasks")
    lines.append("  " + "─" * 45)
    lines.append(f"  🟡 Pending:     {status_counts['pending']}")
    lines.append(f"  🔵 In Progress: {status_counts['in_progress']}")
    lines.append(f"  🟣 Review:      {status_counts['review']}")
    lines.append(f"  🟢 Completed:   {status_counts['completed']}")
    if status_counts["blocked"] > 0:
        lines.append(f"  🔴 Blocked:     {status_counts['blocked']}")
    lines.append("")

    # Upcoming Due Dates
    lines.append("  Upcoming Due Dates")
    lines.append("  " + "─" * 45)
    if upcoming_tasks:
        for task in upcoming_tasks:
            time_until = _format_time_until(task.due_date, now)
            lines.append(f'  • #{task.id} "{task.title}" - {time_until}')
    else:
        lines.append("  No upcoming due dates")
    lines.append("")

    # Recent Activity
    lines.append("  Recent Activity")
    lines.append("  " + "─" * 45)
    if recent_logs:
        for log in recent_logs:
            time_ago = _format_time_ago(log.timestamp, now)
            task_info = f"#{log.task_id}" if log.task_id else "system"
            lines.append(f"  • {log.actor_id} {log.action} {task_info} ({time_ago})")
    else:
        lines.append("  No recent activity")
    lines.append("")

    # Create panel
    content = "\n".join(lines)
    panel = Panel(
        content,
        title="TaskFlow Status",
        border_style="cyan",
        padding=(0, 1),
    )

    console.print(panel)


def _format_time_until(due_date: datetime, now: datetime) -> str:
    """Format time until due date in human-readable form.

    Args:
        due_date: Due date to compare
        now: Current datetime

    Returns:
        Human-readable string like "tomorrow", "in 3 days"
    """
    delta = due_date - now
    days = delta.days

    if days == 0:
        return "today"
    elif days == 1:
        return "tomorrow"
    elif days < 7:
        return f"in {days} days"
    elif days < 14:
        return "next week"
    elif days < 30:
        weeks = days // 7
        return f"in {weeks} weeks"
    else:
        months = days // 30
        return f"in {months} months"


def _format_time_ago(timestamp: datetime, now: datetime) -> str:
    """Format time ago in human-readable form.

    Args:
        timestamp: Past timestamp
        now: Current datetime

    Returns:
        Human-readable string like "2 hours ago", "3 days ago"
    """
    delta = now - timestamp
    seconds = delta.total_seconds()

    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        weeks = int(seconds / 604800)
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"
