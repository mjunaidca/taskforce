"""TaskFlow task commands.

Commands for managing tasks:
- add: Create a new task
- list: List tasks with filters
- show: Display task details
- edit: Update task properties
- delete: Remove a task
"""

from datetime import datetime

import typer
from pydantic import ValidationError
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from taskflow.audit import log_action
from taskflow.config import get_current_user, get_default_project
from taskflow.models import Task
from taskflow.storage import Storage
from taskflow.utils import get_storage

app = typer.Typer(help="Manage tasks")
console = Console()


def get_next_task_id(storage: Storage) -> int:
    """Generate next task ID.

    Args:
        storage: Storage instance

    Returns:
        Next available task ID
    """
    tasks = storage.list_tasks()
    if not tasks:
        return 1
    return max(task.id for task in tasks) + 1


def detect_circular_reference(storage: Storage, task_id: int, new_parent_id: int) -> bool:
    """Check if setting parent would create circular reference.

    Args:
        storage: Storage instance
        task_id: ID of task being modified
        new_parent_id: ID of proposed parent

    Returns:
        True if circular reference detected, False otherwise
    """
    # Task cannot be its own parent
    if task_id == new_parent_id:
        return True

    # Walk up parent chain to check for cycles
    current_id = new_parent_id
    visited = {task_id}

    while current_id is not None:
        if current_id in visited:
            return True

        visited.add(current_id)

        # Get parent of current task
        task = storage.get_task(current_id)
        if task is None:
            break

        current_id = task.parent_id

    return False


@app.command(name="add")
def add_task(
    title: str = typer.Argument(..., help="Task title"),
    description: str | None = typer.Option(None, "--description", "-d", help="Task description"),
    project: str | None = typer.Option(None, "--project", "-p", help="Project slug"),
    assign: str | None = typer.Option(
        None, "--assign", "-a", help="Assign to worker (e.g., @sarah)"
    ),
    priority: str = typer.Option(
        "medium", "--priority", help="Priority: low, medium, high, critical"
    ),
    tags: str | None = typer.Option(None, "--tags", help="Comma-separated tags"),
    parent: int | None = typer.Option(None, "--parent", help="Parent task ID for subtasks"),
    due: str | None = typer.Option(None, "--due", help="Due date (YYYY-MM-DD)"),
    created_by: str | None = typer.Option(
        None, "--created-by", help="Override creator (for agent use)"
    ),
) -> None:
    """Add a new task.

    Args:
        title: Task title
        description: Optional task description
        project: Project slug (defaults to current project)
        assign: Worker ID to assign task to
        priority: Task priority level
        tags: Comma-separated tags
        parent: Parent task ID for creating subtasks
        created_by: Override creator (useful for agents creating tasks)
    """
    storage = get_storage()

    # Determine creator
    if created_by is None:
        creator = get_current_user(storage)
        if creator is None:
            console.print(
                "[red]Error: No current user set. Run 'taskflow worker add' first.[/red]"
            )
            raise typer.Exit(1)
    else:
        creator = created_by

    # Validate creator exists
    if storage.get_worker(creator) is None:
        console.print(
            f"[red]Error: Creator '{creator}' not found. Add worker first with 'taskflow worker add'[/red]"
        )
        raise typer.Exit(1)

    # Determine project
    project_slug = project if project else get_default_project(storage)

    # Validate project exists
    if storage.get_project(project_slug) is None:
        console.print(f"[red]Error: Project '{project_slug}' not found[/red]")
        raise typer.Exit(1)

    # Validate assignee if provided
    if assign and storage.get_worker(assign) is None:
        console.print(f"[red]Error: Worker '{assign}' not found[/red]")
        raise typer.Exit(1)

    # Validate parent if provided
    if parent is not None:
        parent_task = storage.get_task(parent)
        if parent_task is None:
            console.print(f"[red]Error: Parent task #{parent} not found[/red]")
            raise typer.Exit(1)

    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    # Validate priority
    valid_priorities = ["low", "medium", "high", "critical"]
    if priority not in valid_priorities:
        console.print(
            f"[red]Error: Invalid priority '{priority}'. Must be one of: {', '.join(valid_priorities)}[/red]"
        )
        raise typer.Exit(1)

    # Parse due date
    due_date = None
    if due:
        try:
            due_date = datetime.strptime(due, "%Y-%m-%d")
        except ValueError:
            console.print("[red]Error: Invalid date format. Use YYYY-MM-DD[/red]")
            raise typer.Exit(1)

    # Generate task ID
    task_id = get_next_task_id(storage)

    # Create task
    try:
        task = Task(
            id=task_id,
            title=title,
            description=description,
            status="pending",
            priority=priority,  # type: ignore
            project_slug=project_slug,
            assigned_to=assign,
            parent_id=parent,
            tags=tag_list,
            due_date=due_date,
            created_by=creator,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
    except ValidationError as e:
        console.print("[red]Error: Invalid task data[/red]")
        for error in e.errors():
            field = error["loc"][0] if error["loc"] else "validation"
            msg = error["msg"]
            console.print(f"  - {field}: {msg}")
        raise typer.Exit(1)

    # Save task
    storage.add_task(task)

    # Create audit log
    log_action(
        storage,
        "created",
        creator,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"title": task.title, "priority": task.priority},
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] created successfully")
    console.print(f"  Title: {task.title}")
    console.print(f"  Project: [cyan]{task.project_slug}[/cyan]")
    console.print(f"  Priority: [yellow]{task.priority}[/yellow]")
    if task.assigned_to:
        console.print(f"  Assigned to: [blue]{task.assigned_to}[/blue]")


@app.command(name="subtask")
def add_subtask(
    parent_id: int = typer.Argument(..., help="Parent task ID"),
    title: str = typer.Argument(..., help="Subtask title"),
    description: str | None = typer.Option(None, "--description", "-d", help="Subtask description"),
    assign: str | None = typer.Option(
        None, "--assign", "-a", help="Assign to worker (e.g., @sarah)"
    ),
    priority: str = typer.Option(
        "medium", "--priority", help="Priority: low, medium, high, critical"
    ),
    tags: str | None = typer.Option(None, "--tags", help="Comma-separated tags"),
    created_by: str | None = typer.Option(
        None, "--created-by", help="Override creator (for agent use)"
    ),
) -> None:
    """Create a subtask under a parent task.

    Args:
        parent_id: ID of parent task
        title: Subtask title
        description: Optional subtask description
        assign: Worker ID to assign subtask to
        priority: Subtask priority level
        tags: Comma-separated tags
        created_by: Override creator (useful for agents creating subtasks)
    """
    storage = get_storage()

    # Validate parent task exists
    parent_task = storage.get_task(parent_id)
    if parent_task is None:
        console.print(f"[red]Error: Parent task #{parent_id} not found[/red]")
        raise typer.Exit(1)

    # Determine creator
    if created_by is None:
        creator = get_current_user(storage)
        if creator is None:
            console.print(
                "[red]Error: No current user set. Run 'taskflow worker add' first.[/red]"
            )
            raise typer.Exit(1)
    else:
        creator = created_by

    # Validate creator exists
    if storage.get_worker(creator) is None:
        console.print(
            f"[red]Error: Creator '{creator}' not found. Add worker first with 'taskflow worker add'[/red]"
        )
        raise typer.Exit(1)

    # Inherit project from parent
    project_slug = parent_task.project_slug

    # Validate assignee if provided
    if assign and storage.get_worker(assign) is None:
        console.print(f"[red]Error: Worker '{assign}' not found[/red]")
        raise typer.Exit(1)

    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    # Validate priority
    valid_priorities = ["low", "medium", "high", "critical"]
    if priority not in valid_priorities:
        console.print(
            f"[red]Error: Invalid priority '{priority}'. Must be one of: {', '.join(valid_priorities)}[/red]"
        )
        raise typer.Exit(1)

    # Generate task ID
    task_id = get_next_task_id(storage)

    # Create subtask
    try:
        task = Task(
            id=task_id,
            title=title,
            description=description,
            status="pending",
            priority=priority,  # type: ignore
            project_slug=project_slug,
            assigned_to=assign,
            parent_id=parent_id,
            tags=tag_list,
            created_by=creator,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
    except ValidationError as e:
        console.print("[red]Error: Invalid task data[/red]")
        for error in e.errors():
            field = error["loc"][0] if error["loc"] else "validation"
            msg = error["msg"]
            console.print(f"  - {field}: {msg}")
        raise typer.Exit(1)

    # Save task
    storage.add_task(task)

    # Create audit log
    log_action(
        storage,
        "subtask_created",
        creator,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"title": task.title, "priority": task.priority, "parent_id": parent_id},
    )

    # Show success message
    console.print(
        f"[green]✓[/green] Subtask [bold]#{task.id}[/bold] created successfully under parent #{parent_id}"
    )
    console.print(f"  Title: {task.title}")
    console.print(f"  Project: [cyan]{task.project_slug}[/cyan] (inherited from parent)")
    console.print(f"  Priority: [yellow]{task.priority}[/yellow]")
    if task.assigned_to:
        console.print(f"  Assigned to: [blue]{task.assigned_to}[/blue]")


@app.command(name="list")
def list_tasks(
    project: str | None = typer.Option(None, "--project", "-p", help="Filter by project"),
    status: str | None = typer.Option(None, "--status", "-s", help="Filter by status"),
    assigned: str | None = typer.Option(None, "--assigned", "-a", help="Filter by assignee"),
    parent: int | None = typer.Option(
        None, "--parent", help="Filter by parent task ID (show subtasks only)"
    ),
    search: str | None = typer.Option(None, "--search", help="Search in title and description"),
    priority: str | None = typer.Option(
        None, "--priority", help="Filter by priority (low, medium, high, critical)"
    ),
    tag: list[str] = typer.Option(
        None, "--tag", help="Filter by tag (can be used multiple times for OR logic)"
    ),
    created_by: str | None = typer.Option(None, "--created-by", help="Filter by creator"),
    due_before: str | None = typer.Option(
        None, "--due-before", help="Filter tasks due before date (YYYY-MM-DD)"
    ),
    due_after: str | None = typer.Option(
        None, "--due-after", help="Filter tasks due after date (YYYY-MM-DD)"
    ),
    no_assignee: bool = typer.Option(False, "--no-assignee", help="Show only unassigned tasks"),
    sort: str | None = typer.Option(
        None, "--sort", help="Sort by: created, updated, priority, due_date"
    ),
    reverse: bool = typer.Option(False, "--reverse", help="Reverse sort order"),
) -> None:
    """List tasks with optional filters.

    Args:
        project: Filter by project slug
        status: Filter by task status
        assigned: Filter by assignee
        parent: Filter by parent task ID (show subtasks only)
        search: Search keyword in title/description
        priority: Filter by priority level
        tag: Filter by tag (multiple tags use OR logic)
        created_by: Filter by creator
        due_before: Filter tasks due before date
        due_after: Filter tasks due after date
        no_assignee: Show only unassigned tasks
        sort: Sort field
        reverse: Reverse sort order
    """
    storage = get_storage()

    # Validate priority filter
    if priority:
        valid_priorities = ["low", "medium", "high", "critical"]
        if priority not in valid_priorities:
            console.print(
                f"[red]Error: Invalid priority '{priority}'. Must be one of: {', '.join(valid_priorities)}[/red]"
            )
            raise typer.Exit(1)

    # Validate sort field
    if sort:
        valid_sort_fields = ["created", "updated", "priority", "due_date"]
        if sort not in valid_sort_fields:
            console.print(
                f"[red]Error: Invalid sort field '{sort}'. Must be one of: {', '.join(valid_sort_fields)}[/red]"
            )
            raise typer.Exit(1)

    # Parse due date filters
    due_before_date = None
    if due_before:
        try:
            due_before_date = datetime.strptime(due_before, "%Y-%m-%d")
        except ValueError:
            console.print("[red]Error: Invalid date format for --due-before. Use YYYY-MM-DD[/red]")
            raise typer.Exit(1)

    due_after_date = None
    if due_after:
        try:
            due_after_date = datetime.strptime(due_after, "%Y-%m-%d")
        except ValueError:
            console.print("[red]Error: Invalid date format for --due-after. Use YYYY-MM-DD[/red]")
            raise typer.Exit(1)

    # Build storage-level filters
    filters = {}
    if project:
        filters["project_slug"] = project
    if status:
        filters["status"] = status
    if assigned:
        filters["assigned_to"] = assigned
    if parent is not None:
        filters["parent_id"] = parent

    # Get tasks
    tasks = storage.list_tasks(**filters)

    # Apply additional filters
    if priority:
        tasks = [task for task in tasks if task.priority == priority]

    if tag:
        # OR logic: task must have at least one of the specified tags
        tag_lower = [t.lower() for t in tag]
        tasks = [task for task in tasks if any(t.lower() in tag_lower for t in task.tags)]

    if created_by:
        tasks = [task for task in tasks if task.created_by == created_by]

    if due_before_date:
        tasks = [task for task in tasks if task.due_date and task.due_date < due_before_date]

    if due_after_date:
        tasks = [task for task in tasks if task.due_date and task.due_date > due_after_date]

    if no_assignee:
        tasks = [task for task in tasks if task.assigned_to is None]

    # Apply search filter
    if search:
        search_lower = search.lower()
        tasks = [
            task
            for task in tasks
            if (search_lower in task.title.lower())
            or (task.description and search_lower in task.description.lower())
            or any(search_lower in tag.lower() for tag in task.tags)
        ]

    # Apply sorting
    if sort:
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

        if sort == "priority":
            # For priority, lower number = higher priority (critical=0, high=1, etc.)
            # So by default (reverse=False), we want critical first (ascending order)
            tasks.sort(key=lambda t: priority_order.get(t.priority, 999), reverse=reverse)
        elif sort == "created":
            tasks.sort(key=lambda t: t.created_at, reverse=reverse)
        elif sort == "updated":
            tasks.sort(key=lambda t: t.updated_at, reverse=reverse)
        elif sort == "due_date":
            # Put tasks without due date at the end
            tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max, reverse=reverse)

    # Show results
    if not tasks:
        console.print("[yellow]No tasks found. Add tasks with 'taskflow add'[/yellow]")
        return

    # Build filter summary
    filter_parts = []
    if priority:
        filter_parts.append(f"priority: {priority}")
    if tag:
        filter_parts.append(f"tags: {', '.join(tag)}")
    if created_by:
        filter_parts.append(f"created_by: {created_by}")
    if due_before:
        filter_parts.append(f"due_before: {due_before}")
    if due_after:
        filter_parts.append(f"due_after: {due_after}")
    if no_assignee:
        filter_parts.append("unassigned only")
    if project:
        filter_parts.append(f"project: {project}")
    if status:
        filter_parts.append(f"status: {status}")
    if assigned:
        filter_parts.append(f"assigned: {assigned}")
    if search:
        filter_parts.append(f"search: {search}")

    # Create table title
    title = f"Tasks ({len(tasks)})"
    if filter_parts:
        title += f" - {' | '.join(filter_parts)}"

    # Check if any task has a due date
    has_due_dates = any(task.due_date is not None for task in tasks)

    # Create table
    table = Table(title=title, show_header=True, header_style="bold cyan")
    table.add_column("ID", style="green", width=6)
    table.add_column("Title", style="white", no_wrap=False)
    table.add_column("Status", style="blue", width=12)
    table.add_column("Priority", style="yellow", width=10)
    table.add_column("Assigned", style="magenta", width=15)
    table.add_column("Project", style="cyan", width=15)

    # Add due date column if any task has one
    if has_due_dates:
        table.add_column("Due", style="white", width=12)

    # Get today for due date calculations
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Add rows
    for task in tasks:
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

        # Format priority
        priority_display = task.priority

        # Format assigned
        assigned_display = task.assigned_to if task.assigned_to else "-"

        # Format title with due date icons
        title_display = f"TEST-{task.title}"  # TEMPORARY DEBUG
        if task.due_date:
            days_until_due = (task.due_date.date() - today.date()).days
            if days_until_due < 0:
                # Overdue - red circle (avoid emoji in tests, use [red] markup instead)
                title_display = f"[red]🔴[/red] {task.title}"
            elif days_until_due <= 2:
                # Due within 2 days - warning (avoid emoji in tests, use [yellow] markup instead)
                title_display = f"[yellow]⚠️[/yellow] {task.title}"

        # Add row directly without unpacking
        if has_due_dates:
            if task.due_date:
                due_display = task.due_date.strftime("%Y-%m-%d")
            else:
                due_display = "-"
            table.add_row(
                str(task.id),
                f"🔴 {task.title}"
                if task.due_date and (task.due_date.date() - today.date()).days < 0
                else (
                    f"⚠️ {task.title}"
                    if task.due_date and (task.due_date.date() - today.date()).days <= 2
                    else task.title
                ),
                status_display,
                priority_display,
                assigned_display,
                task.project_slug,
                due_display,
            )
        else:
            table.add_row(
                str(task.id),
                f"🔴 {task.title}"
                if task.due_date and (task.due_date.date() - today.date()).days < 0
                else (
                    f"⚠️ {task.title}"
                    if task.due_date and (task.due_date.date() - today.date()).days <= 2
                    else task.title
                ),
                status_display,
                priority_display,
                assigned_display,
                task.project_slug,
            )

    console.print(table)


@app.command(name="search")
def search_tasks(
    keyword: str = typer.Argument(..., help="Search keyword"),
    project: str | None = typer.Option(None, "--project", "-p", help="Filter by project"),
    status: str | None = typer.Option(None, "--status", "-s", help="Filter by status"),
) -> None:
    """Search tasks by keyword in title, description, and tags.

    Args:
        keyword: Search keyword (case-insensitive)
        project: Filter by project slug
        status: Filter by task status
    """
    storage = get_storage()

    # Build filters
    filters = {}
    if project:
        filters["project_slug"] = project
    if status:
        filters["status"] = status

    # Get tasks
    tasks = storage.list_tasks(**filters)

    # Apply search filter
    keyword_lower = keyword.lower()
    matched_tasks = [
        task
        for task in tasks
        if (keyword_lower in task.title.lower())
        or (task.description and keyword_lower in task.description.lower())
        or any(keyword_lower in tag.lower() for tag in task.tags)
    ]

    # Show results
    if not matched_tasks:
        console.print(f"[yellow]No tasks found matching '{keyword}'[/yellow]")
        return

    # Build filter summary
    filter_parts = [f"search: {keyword}"]
    if project:
        filter_parts.append(f"project: {project}")
    if status:
        filter_parts.append(f"status: {status}")

    # Create table
    title = f"Tasks ({len(matched_tasks)}) - {' | '.join(filter_parts)}"
    table = Table(title=title, show_header=True, header_style="bold cyan")
    table.add_column("ID", style="green", width=6)
    table.add_column("Title", style="white", no_wrap=False)
    table.add_column("Status", style="blue", width=12)
    table.add_column("Priority", style="yellow", width=10)
    table.add_column("Assigned", style="magenta", width=15)
    table.add_column("Project", style="cyan", width=15)

    # Add rows
    for task in matched_tasks:
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

        # Format priority
        priority_display = task.priority

        # Format assigned
        assigned_display = task.assigned_to if task.assigned_to else "-"

        # Highlight matches in title (simple bold highlighting)
        title_display = task.title
        # Simple highlighting: make keyword bold if found
        if keyword_lower in task.title.lower():
            # Find the actual case in the title
            import re

            pattern = re.compile(re.escape(keyword), re.IGNORECASE)
            title_display = pattern.sub(lambda m: f"[bold]{m.group()}[/bold]", task.title)

        table.add_row(
            str(task.id),
            title_display,
            status_display,
            priority_display,
            assigned_display,
            task.project_slug,
        )

    console.print(table)


def calculate_subtask_progress(storage: Storage, task_id: int) -> int:
    """Calculate aggregate progress from all subtasks.

    Args:
        storage: Storage instance
        task_id: Parent task ID

    Returns:
        Average progress percentage across all subtasks (0-100)
    """
    subtasks = storage.list_tasks(parent_id=task_id)
    if not subtasks:
        return 0

    total_progress = sum(task.progress_percent for task in subtasks)
    return total_progress // len(subtasks)


def render_task_tree(storage: Storage, task: Task, indent: int = 0, prefix: str = "") -> list[str]:
    """Recursively render task tree with status icons.

    Args:
        storage: Storage instance
        task: Task to render
        indent: Current indentation level
        prefix: Tree prefix characters

    Returns:
        List of formatted lines for tree display
    """
    lines = []

    # Status icons
    status_icons = {
        "completed": "✓",
        "pending": "○",
        "in_progress": "◐",
        "blocked": "⏸",
        "review": "👁",
    }
    icon = status_icons.get(task.status, "○")

    # Format task line
    indent_str = "  " * indent
    task_line = f"{indent_str}{prefix}{icon} #{task.id}: {task.title} ({task.status})"
    lines.append(task_line)

    # Get subtasks
    subtasks = storage.list_tasks(parent_id=task.id)

    # Render subtasks recursively
    for i, subtask in enumerate(subtasks):
        is_last = i == len(subtasks) - 1
        child_prefix = "└─ " if is_last else "├─ "
        child_lines = render_task_tree(storage, subtask, indent + 1, child_prefix)
        lines.extend(child_lines)

    return lines


@app.command(name="show")
def show_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    tree: bool = typer.Option(False, "--tree", help="Show hierarchical task tree"),
) -> None:
    """Show task details.

    Args:
        task_id: ID of task to display
        tree: Show hierarchical task tree with all subtasks
    """
    storage = get_storage()

    # Get task
    task = storage.get_task(task_id)
    if task is None:
        console.print(f"[red]Error: Task #{task_id} not found[/red]")
        raise typer.Exit(1)

    if tree:
        # Render tree view
        console.print(f"\n[bold cyan]Task Tree for #{task_id}[/bold cyan]\n")
        tree_lines = render_task_tree(storage, task)
        for line in tree_lines:
            console.print(line)
        console.print()
        return

    # Get subtasks
    subtasks = storage.list_tasks(parent_id=task.id)

    # Build display content
    content = []

    # Basic info
    content.append(f"[bold]Title:[/bold] {task.title}")
    content.append(f"[bold]ID:[/bold] #{task.id}")
    content.append(f"[bold]Status:[/bold] {task.status}")
    content.append(f"[bold]Priority:[/bold] {task.priority}")
    content.append(f"[bold]Project:[/bold] {task.project_slug}")

    # Optional fields
    if task.description:
        content.append(f"[bold]Description:[/bold] {task.description}")

    if task.assigned_to:
        content.append(f"[bold]Assigned to:[/bold] {task.assigned_to}")
    else:
        content.append("[bold]Assigned to:[/bold] [dim]Unassigned[/dim]")

    if task.parent_id:
        content.append(f"[bold]Parent Task:[/bold] #{task.parent_id}")

    if task.tags:
        tags_str = ", ".join(task.tags)
        content.append(f"[bold]Tags:[/bold] {tags_str}")

    content.append(f"[bold]Progress:[/bold] {task.progress_percent}%")
    content.append(f"[bold]Created by:[/bold] {task.created_by}")
    content.append(f"[bold]Created at:[/bold] {task.created_at.strftime('%Y-%m-%d %H:%M')}")
    content.append(f"[bold]Updated at:[/bold] {task.updated_at.strftime('%Y-%m-%d %H:%M')}")

    if task.due_date:
        content.append(f"[bold]Due date:[/bold] {task.due_date.strftime('%Y-%m-%d')}")

    # Subtasks
    if subtasks:
        content.append("")
        content.append(f"[bold]Subtasks ({len(subtasks)}):[/bold]")
        for subtask in subtasks:
            status_icon = "✓" if subtask.status == "completed" else "○"
            content.append(f"  {status_icon} #{subtask.id}: {subtask.title}")

    # Create panel
    panel = Panel(
        "\n".join(content),
        title=f"Task #{task.id}",
        border_style="cyan",
    )

    console.print(panel)


@app.command(name="edit")
def edit_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    title: str | None = typer.Option(None, "--title", help="Update title"),
    description: str | None = typer.Option(None, "--description", help="Update description"),
    status: str | None = typer.Option(None, "--status", help="Update status"),
    priority: str | None = typer.Option(None, "--priority", help="Update priority"),
    assign: str | None = typer.Option(None, "--assign", help="Update assignment"),
    parent: int | None = typer.Option(None, "--parent", help="Update parent task"),
) -> None:
    """Edit a task.

    Args:
        task_id: ID of task to edit
        title: New title
        description: New description
        status: New status
        priority: New priority
        assign: New assignee
        parent: New parent task ID
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

    # Track what changed
    changes = {}

    # Update fields
    if title is not None:
        task.title = title
        changes["title"] = title

    if description is not None:
        task.description = description
        changes["description"] = description

    if status is not None:
        # Validate status
        valid_statuses = ["pending", "in_progress", "review", "completed", "blocked"]
        if status not in valid_statuses:
            console.print(
                f"[red]Error: Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}[/red]"
            )
            raise typer.Exit(1)
        task.status = status  # type: ignore
        changes["status"] = status

    if priority is not None:
        # Validate priority
        valid_priorities = ["low", "medium", "high", "critical"]
        if priority not in valid_priorities:
            console.print(
                f"[red]Error: Invalid priority '{priority}'. Must be one of: {', '.join(valid_priorities)}[/red]"
            )
            raise typer.Exit(1)
        task.priority = priority  # type: ignore
        changes["priority"] = priority

    if assign is not None:
        # Validate assignee
        if storage.get_worker(assign) is None:
            console.print(f"[red]Error: Worker '{assign}' not found[/red]")
            raise typer.Exit(1)
        task.assigned_to = assign
        changes["assigned_to"] = assign

    if parent is not None:
        # Validate parent exists
        if storage.get_task(parent) is None:
            console.print(f"[red]Error: Parent task #{parent} not found[/red]")
            raise typer.Exit(1)

        # Check for circular reference
        if detect_circular_reference(storage, task_id, parent):
            console.print(
                "[red]Error: Circular reference detected. Task cannot be its own ancestor[/red]"
            )
            raise typer.Exit(1)

        task.parent_id = parent
        changes["parent_id"] = parent

    # Check if anything changed
    if not changes:
        console.print("[yellow]No changes specified[/yellow]")
        return

    # Update timestamp
    task.updated_at = datetime.now()

    # Save task
    storage.update_task(task)

    # Create audit log
    log_action(
        storage,
        "updated",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context=changes,
    )

    # Show success message
    console.print(f"[green]✓[/green] Task [bold]#{task.id}[/bold] updated successfully")
    for field, value in changes.items():
        console.print(f"  {field}: {value}")


@app.command(name="delete")
def delete_task(
    task_id: int = typer.Argument(..., help="Task ID"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
) -> None:
    """Delete a task.

    Args:
        task_id: ID of task to delete
        force: Skip confirmation prompt
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

    # Check for subtasks
    subtasks = storage.list_tasks(parent_id=task_id)

    # Prompt for confirmation if has subtasks and not forced
    if subtasks and not force:
        console.print(f"[yellow]Warning: Task #{task_id} has {len(subtasks)} subtask(s)[/yellow]")
        confirm = typer.confirm("Are you sure you want to delete this task?")
        if not confirm:
            console.print("[dim]Deletion cancelled[/dim]")
            raise typer.Exit(0)

    # Create audit log before deletion
    log_action(
        storage,
        "deleted",
        actor,
        task_id=task.id,
        project_slug=task.project_slug,
        context={"title": task.title},
    )

    # Delete task
    storage.delete_task(task_id)

    console.print(f"[green]✓[/green] Task [bold]#{task_id}[/bold] deleted successfully")
