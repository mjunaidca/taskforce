"""Task endpoints - CRUD and workflow actions."""

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_session
from ..models.project import Project, ProjectMember
from ..models.task import VALID_TRANSITIONS, Task, validate_status_transition
from ..models.worker import Worker
from ..schemas.task import (
    AssignUpdate,
    ProgressUpdate,
    RejectRequest,
    StatusUpdate,
    TaskCreate,
    TaskListItem,
    TaskRead,
    TaskUpdate,
)
from ..services.audit import log_action
from ..services.user_setup import ensure_user_setup

router = APIRouter(tags=["Tasks"])


async def check_project_membership(
    session: AsyncSession, project_id: int, worker_id: int
) -> ProjectMember:
    """Check if worker is a member of the project."""
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == worker_id,
    )
    result = await session.exec(stmt)
    membership = result.first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return membership


async def check_assignee_is_member(
    session: AsyncSession, project_id: int, assignee_id: int
) -> Worker:
    """Check if assignee is a member of the project."""
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == assignee_id,
    )
    result = await session.exec(stmt)
    if not result.first():
        raise HTTPException(
            status_code=400, detail=f"Worker {assignee_id} is not a member of this project"
        )

    worker = await session.get(Worker, assignee_id)
    if not worker:
        raise HTTPException(status_code=400, detail=f"Worker {assignee_id} not found")
    return worker


async def check_parent_same_project(session: AsyncSession, project_id: int, parent_task_id: int):
    """Check if parent task is in the same project."""
    parent = await session.get(Task, parent_task_id)
    if not parent:
        raise HTTPException(status_code=400, detail=f"Parent task {parent_task_id} not found")
    if parent.project_id != project_id:
        raise HTTPException(status_code=400, detail="Parent task must be in the same project")
    return parent


async def detect_cycle(session: AsyncSession, task_id: int, parent_task_id: int) -> bool:
    """Detect if setting parent would create a cycle."""
    if task_id == parent_task_id:
        return True

    # Walk up the parent chain
    current_id = parent_task_id
    visited = {task_id}

    while current_id:
        if current_id in visited:
            return True
        visited.add(current_id)

        parent = await session.get(Task, current_id)
        if not parent:
            break
        current_id = parent.parent_task_id

    return False


def calculate_next_due(pattern: str, from_time: datetime) -> datetime:
    """Calculate next due date based on recurrence pattern.

    Args:
        pattern: Recurrence pattern (e.g., '5m', 'daily', 'weekly')
        from_time: Base timestamp (original due_date or completion time)

    Returns:
        Next due datetime (naive UTC)

    Note: Calculations use timedelta for time-based patterns:
        - Monthly = 30 days (simplified, not calendar month)
        - Falls back to daily for unknown patterns
    """
    if pattern == "1m":
        return from_time + timedelta(minutes=1)
    elif pattern == "5m":
        return from_time + timedelta(minutes=5)
    elif pattern == "10m":
        return from_time + timedelta(minutes=10)
    elif pattern == "15m":
        return from_time + timedelta(minutes=15)
    elif pattern == "30m":
        return from_time + timedelta(minutes=30)
    elif pattern == "1h":
        return from_time + timedelta(hours=1)
    elif pattern == "daily":
        return from_time + timedelta(days=1)
    elif pattern == "weekly":
        return from_time + timedelta(weeks=1)
    elif pattern == "monthly":
        return from_time + timedelta(days=30)  # Simplified: 30 days, not calendar month
    else:
        # Fallback to daily for unknown patterns
        return from_time + timedelta(days=1)


async def get_spawn_count(session: AsyncSession, root_id: int) -> int:
    """Count tasks spawned from a recurring root task."""
    result = await session.exec(
        select(func.count(Task.id)).where(Task.recurring_root_id == root_id)
    )
    return result.one() or 0


async def clone_subtasks_recursive(
    session: AsyncSession,
    source_task: Task,
    new_parent: Task,
    creator_id: int,
    creator_type: str,
) -> int:
    """Recursively clone subtasks from source_task to new_parent.

    Returns:
        Number of subtasks cloned (including nested)
    """
    # Load subtasks for source task
    stmt = select(Task).where(Task.parent_task_id == source_task.id)
    result = await session.exec(stmt)
    source_subtasks = result.all()

    cloned_count = 0
    for subtask in source_subtasks:
        # Clone the subtask
        cloned = Task(
            title=subtask.title,
            description=subtask.description,
            project_id=new_parent.project_id,
            assignee_id=subtask.assignee_id,
            parent_task_id=new_parent.id,  # Link to new parent
            created_by_id=creator_id,
            priority=subtask.priority,
            tags=subtask.tags.copy() if subtask.tags else [],
            due_date=subtask.due_date,  # Keep same due date for subtasks
            # Subtasks don't inherit recurring settings
            is_recurring=False,
            recurrence_pattern=None,
            max_occurrences=None,
            recurring_root_id=None,
            recurrence_trigger="on_complete",
            clone_subtasks_on_recur=False,
            # Reset state
            status="pending",
            progress_percent=0,
            started_at=None,
            completed_at=None,
        )
        session.add(cloned)
        await session.flush()  # Get cloned.id
        cloned_count += 1

        # Audit log for cloned subtask
        await log_action(
            session,
            entity_type="task",
            entity_id=cloned.id,
            action="cloned_subtask",
            actor_id=creator_id,
            actor_type=creator_type,
            details={
                "title": cloned.title,
                "cloned_from": subtask.id,
                "parent_task_id": new_parent.id,
            },
        )

        # Recursively clone nested subtasks
        nested_count = await clone_subtasks_recursive(
            session, subtask, cloned, creator_id, creator_type
        )
        cloned_count += nested_count

    return cloned_count


async def create_next_occurrence(
    session: AsyncSession,
    completed_task: Task,
    creator_id: int,
    creator_type: str,
) -> Task | None:
    """Create next occurrence of a recurring task.

    Args:
        session: Database session (will NOT commit - caller owns transaction)
        completed_task: The task that was just completed
        creator_id: Worker ID triggering recurrence (human or agent)
        creator_type: "human" or "agent"

    Returns:
        Newly created task, or None if max_occurrences reached or already spawned

    Side Effects:
        - Adds new task to session (flush not commit)
        - Creates audit log entry
        - Optionally clones subtasks if clone_subtasks_on_recur is True
        - Sets has_spawned_next=True on completed_task
    """
    # Check if this task has already spawned (prevents duplicate on re-completion)
    if completed_task.has_spawned_next:
        return None

    # Determine the root task ID (NULL means this task IS the root)
    root_id = completed_task.recurring_root_id or completed_task.id

    # Check max_occurrences limit by counting existing spawns
    if completed_task.max_occurrences is not None:
        spawn_count = await get_spawn_count(session, root_id)
        if spawn_count >= completed_task.max_occurrences:
            # Limit reached, do not create new occurrence
            return None

    # Calculate next due date
    # Use original due_date as base (if exists), else use completion time
    base_time = completed_task.due_date or datetime.utcnow()
    next_due = calculate_next_due(completed_task.recurrence_pattern, base_time)

    # Create new task (inherit key attributes)
    new_task = Task(
        title=completed_task.title,
        description=completed_task.description,
        project_id=completed_task.project_id,
        assignee_id=completed_task.assignee_id,
        parent_task_id=completed_task.parent_task_id,  # Preserve hierarchy
        created_by_id=creator_id,
        priority=completed_task.priority,
        tags=completed_task.tags.copy() if completed_task.tags else [],
        due_date=next_due,
        # Recurring attributes - all point back to root
        is_recurring=True,
        recurrence_pattern=completed_task.recurrence_pattern,
        max_occurrences=completed_task.max_occurrences,
        recurring_root_id=root_id,  # Link to root task
        recurrence_trigger=completed_task.recurrence_trigger,
        clone_subtasks_on_recur=completed_task.clone_subtasks_on_recur,
        # Reset state
        status="pending",
        progress_percent=0,
        started_at=None,
        completed_at=None,
    )

    session.add(new_task)
    await session.flush()  # Get new_task.id

    # Clone subtasks if enabled
    cloned_subtasks_count = 0
    if completed_task.clone_subtasks_on_recur:
        cloned_subtasks_count = await clone_subtasks_recursive(
            session, completed_task, new_task, creator_id, creator_type
        )

    # Mark source task as having spawned (prevents duplicate on re-completion)
    completed_task.has_spawned_next = True
    session.add(completed_task)

    # Audit log for new task creation
    await log_action(
        session,
        entity_type="task",
        entity_id=new_task.id,
        action="recurring_spawn",
        actor_id=creator_id,
        actor_type=creator_type,
        details={
            "title": new_task.title,
            "recurring_from": completed_task.id,
            "recurring_root": root_id,
            "recurrence_pattern": completed_task.recurrence_pattern,
            "next_due": next_due.isoformat(),
            "cloned_subtasks": cloned_subtasks_count,
        },
    )

    return new_task


def task_to_read(
    task: Task,
    assignee: Worker | None = None,
    subtasks: list[Task] | None = None,
    spawn_count: int = 0,
) -> TaskRead:
    """Convert Task model to TaskRead schema.

    Args:
        task: Task model instance
        assignee: Optional Worker for assignee_handle
        subtasks: Optional list of subtasks
        spawn_count: Number of tasks spawned from this root (computed externally)
    """
    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        progress_percent=task.progress_percent,
        tags=task.tags,
        due_date=task.due_date,
        # Recurring fields
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        max_occurrences=task.max_occurrences,
        recurring_root_id=task.recurring_root_id,
        recurrence_trigger=task.recurrence_trigger,
        clone_subtasks_on_recur=task.clone_subtasks_on_recur,
        has_spawned_next=task.has_spawned_next,
        spawn_count=spawn_count,
        # Foreign key references
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        assignee_handle=assignee.handle if assignee else None,
        parent_task_id=task.parent_task_id,
        created_by_id=task.created_by_id,
        started_at=task.started_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        subtasks=[task_to_read(st) for st in (subtasks or [])],
    )


# User-scoped task endpoints (across all projects)


@router.get("/api/tasks/recent", response_model=list[TaskListItem])
async def list_recent_tasks(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=10, le=50),
) -> list[TaskListItem]:
    """List recent tasks across all projects the user is a member of.

    Returns tasks sorted by created_at descending (most recent first).
    Optimized single query for dashboard use.
    """
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Get all project IDs where user is a member
    membership_stmt = select(ProjectMember.project_id).where(ProjectMember.worker_id == worker_id)
    membership_result = await session.exec(membership_stmt)
    project_ids = list(membership_result.all())

    if not project_ids:
        return []

    # Fetch recent tasks from all user's projects in ONE query
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.subtasks),
        )
        .where(Task.project_id.in_(project_ids))
        .order_by(Task.created_at.desc())
        .limit(limit)
    )

    result = await session.exec(stmt)
    tasks = result.unique().all()

    return [
        TaskListItem(
            id=task.id,
            title=task.title,
            status=task.status,
            priority=task.priority,
            progress_percent=task.progress_percent,
            assignee_id=task.assignee_id,
            assignee_handle=task.assignee.handle if task.assignee else None,
            due_date=task.due_date,
            created_at=task.created_at,
            parent_task_id=task.parent_task_id,
            subtask_count=len(task.subtasks) if task.subtasks else 0,
            is_recurring=task.is_recurring,
        )
        for task in tasks
    ]


# Project-scoped task endpoints


@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskListItem])
async def list_tasks(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    # Existing filters
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] | None = None,
    assignee_id: int | None = None,
    priority: Literal["low", "medium", "high", "critical"] | None = None,
    # NEW: Search, filter, and sort parameters
    search: str | None = Query(None, max_length=200),
    tags: str | None = None,  # comma-separated, AND logic
    has_due_date: bool | None = None,
    sort_by: Literal["created_at", "due_date", "priority", "title"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    # Pagination
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[TaskListItem]:
    """List tasks in a project with search, filter, and sort capabilities."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Check project exists and user is member
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_membership(session, project_id, worker_id)

    # Build query with EAGER LOADING (N+1 fix)
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.subtasks),  # Load subtasks for count
        )
        .where(Task.project_id == project_id)
    )

    # Apply existing filters
    if status:
        stmt = stmt.where(Task.status == status)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if priority:
        stmt = stmt.where(Task.priority == priority)

    # Apply NEW filters
    if search:
        stmt = stmt.where(Task.title.ilike(f"%{search}%"))
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            stmt = stmt.where(Task.tags.contains([tag]))
    if has_due_date is not None:
        if has_due_date:
            stmt = stmt.where(Task.due_date.is_not(None))
        else:
            stmt = stmt.where(Task.due_date.is_(None))

    # Apply sorting
    if sort_by == "priority":
        priority_order = case(
            (Task.priority == "critical", 0),
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 3),
            else_=4,
        )
        if sort_order == "desc":
            stmt = stmt.order_by(priority_order.asc())  # Critical first for desc
        else:
            stmt = stmt.order_by(priority_order.desc())  # Low first for asc
    elif sort_by == "due_date":
        if sort_order == "asc":
            stmt = stmt.order_by(Task.due_date.asc().nullslast())
        else:
            stmt = stmt.order_by(Task.due_date.desc().nullsfirst())
    elif sort_by == "title":
        if sort_order == "desc":
            stmt = stmt.order_by(Task.title.desc())
        else:
            stmt = stmt.order_by(Task.title.asc())
    else:  # created_at (default)
        if sort_order == "desc":
            stmt = stmt.order_by(Task.created_at.desc())
        else:
            stmt = stmt.order_by(Task.created_at.asc())

    # Apply pagination
    stmt = stmt.offset(offset).limit(limit)

    # Execute query (single DB call, assignees preloaded via selectinload)
    result = await session.exec(stmt)
    tasks = result.unique().all()  # unique() needed for selectinload

    # Map to response (assignee already loaded - no N+1!)
    return [
        TaskListItem(
            id=task.id,
            title=task.title,
            status=task.status,
            priority=task.priority,
            progress_percent=task.progress_percent,
            assignee_id=task.assignee_id,
            assignee_handle=task.assignee.handle if task.assignee else None,
            due_date=task.due_date,
            created_at=task.created_at,
            parent_task_id=task.parent_task_id,
            subtask_count=len(task.subtasks) if task.subtasks else 0,
            is_recurring=task.is_recurring,
        )
        for task in tasks
    ]


@router.post("/api/projects/{project_id}/tasks", response_model=TaskRead, status_code=201)
async def create_task(
    project_id: int,
    data: TaskCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Create a new task in a project."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    # Check project exists and user is member
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_membership(session, project_id, worker_id)

    # Validate assignee if provided
    assignee = None
    assignee_handle = None
    if data.assignee_id:
        assignee = await check_assignee_is_member(session, project_id, data.assignee_id)
        assignee_handle = assignee.handle

    # Validate parent if provided
    if data.parent_task_id:
        await check_parent_same_project(session, project_id, data.parent_task_id)

    # Create task
    task = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        assignee_id=data.assignee_id,
        parent_task_id=data.parent_task_id,
        tags=data.tags,
        due_date=data.due_date,
        project_id=project_id,
        created_by_id=worker_id,
        # Recurring fields
        is_recurring=data.is_recurring,
        recurrence_pattern=data.recurrence_pattern,
        max_occurrences=data.max_occurrences,
    )
    session.add(task)
    await session.flush()  # Get task.id without committing

    # Audit log (doesn't commit)
    await log_action(
        session,
        entity_type="task",
        entity_id=task.id,
        action="created",
        actor_id=worker_id,
        actor_type=worker_type,
        details={
            "title": task.title,
            "priority": task.priority,
            "assignee_id": task.assignee_id,
            "is_recurring": task.is_recurring,
            "recurrence_pattern": task.recurrence_pattern,
        },
        client_id=user.client_id,
        client_name=user.client_name,
    )

    # Single commit
    await session.commit()
    await session.refresh(task)

    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        progress_percent=task.progress_percent,
        tags=task.tags,
        due_date=task.due_date,
        # Recurring fields
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        max_occurrences=task.max_occurrences,
        recurring_root_id=task.recurring_root_id,
        recurrence_trigger=task.recurrence_trigger,
        clone_subtasks_on_recur=task.clone_subtasks_on_recur,
        has_spawned_next=task.has_spawned_next,
        spawn_count=0,  # New task, no spawns yet
        # Foreign key references
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        assignee_handle=assignee_handle,
        parent_task_id=task.parent_task_id,
        created_by_id=task.created_by_id,
        started_at=task.started_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        subtasks=[],
    )


# Task-specific endpoints (not project-scoped)


@router.get("/api/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Get task details including subtasks."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check membership
    await check_project_membership(session, task.project_id, worker_id)

    # Get assignee
    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    # Get subtasks
    stmt = select(Task).where(Task.parent_task_id == task_id)
    result = await session.exec(stmt)
    subtasks = list(result.all())

    return task_to_read(task, assignee, subtasks)


@router.put("/api/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Update task details."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    # Track changes
    changes = {}
    if data.title is not None and data.title != task.title:
        changes["title"] = {"before": task.title, "after": data.title}
        task.title = data.title
    if data.description is not None and data.description != task.description:
        changes["description"] = {"before": task.description, "after": data.description}
        task.description = data.description
    if data.priority is not None and data.priority != task.priority:
        changes["priority"] = {"before": task.priority, "after": data.priority}
        task.priority = data.priority
    if data.tags is not None and data.tags != task.tags:
        changes["tags"] = {"before": task.tags, "after": data.tags}
        task.tags = data.tags
    if data.due_date is not None and data.due_date != task.due_date:
        changes["due_date"] = {
            "before": task.due_date.isoformat() if task.due_date else None,
            "after": data.due_date.isoformat() if data.due_date else None,
        }
        task.due_date = data.due_date

    # Recurring field updates
    if data.is_recurring is not None and data.is_recurring != task.is_recurring:
        changes["is_recurring"] = {"before": task.is_recurring, "after": data.is_recurring}
        task.is_recurring = data.is_recurring
    if data.recurrence_pattern is not None and data.recurrence_pattern != task.recurrence_pattern:
        changes["recurrence_pattern"] = {
            "before": task.recurrence_pattern,
            "after": data.recurrence_pattern,
        }
        task.recurrence_pattern = data.recurrence_pattern
    if data.max_occurrences is not None and data.max_occurrences != task.max_occurrences:
        changes["max_occurrences"] = {
            "before": task.max_occurrences,
            "after": data.max_occurrences,
        }
        task.max_occurrences = data.max_occurrences

    if changes:
        task.updated_at = datetime.utcnow()
        session.add(task)

        await log_action(
            session,
            entity_type="task",
            entity_id=task_id,
            action="updated",
            actor_id=worker_id,
            actor_type=worker_type,
            details=changes,
            client_id=user.client_id,
            client_name=user.client_name,
        )

        await session.commit()
        await session.refresh(task)

    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    return task_to_read(task, assignee)


@router.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Delete a task."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    # Extract values before deletion
    task_title = task.title
    task_status = task.status

    # Cascade delete subtasks recursively
    async def delete_subtasks(parent_id: int) -> int:
        """Recursively delete all subtasks and return count."""
        stmt = select(Task).where(Task.parent_task_id == parent_id)
        result = await session.exec(stmt)
        subtasks = result.all()
        count = 0
        for subtask in subtasks:
            count += await delete_subtasks(subtask.id)  # Recurse first
            await session.delete(subtask)
            count += 1
        return count

    subtask_count = await delete_subtasks(task_id)

    # Audit before deletion
    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="deleted",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"title": task_title, "status": task_status, "subtasks_deleted": subtask_count},
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.delete(task)
    await session.commit()

    return {"ok": True}


# Workflow action endpoints


@router.patch("/api/tasks/{task_id}/status", response_model=TaskRead)
async def update_status(
    task_id: int,
    data: StatusUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Change task status with transition validation."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    # Validate transition
    if not validate_status_transition(task.status, data.status):
        valid_next = VALID_TRANSITIONS.get(task.status, [])
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from '{task.status}' to '{data.status}'. "
            f"Valid transitions: {valid_next}",
        )

    old_status = task.status
    task.status = data.status
    task.updated_at = datetime.utcnow()

    # Set timestamps based on status
    if data.status == "in_progress" and not task.started_at:
        task.started_at = datetime.utcnow()
    elif data.status == "completed":
        task.completed_at = datetime.utcnow()
        task.progress_percent = 100

        # Handle recurring task creation
        if task.is_recurring and task.recurrence_pattern:
            await create_next_occurrence(session, task, worker_id, worker_type)

    session.add(task)

    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="status_changed",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"before": old_status, "after": data.status},
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.commit()
    await session.refresh(task)

    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    return task_to_read(task, assignee)


@router.patch("/api/tasks/{task_id}/progress", response_model=TaskRead)
async def update_progress(
    task_id: int,
    data: ProgressUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Update task progress percentage."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    if task.status != "in_progress":
        raise HTTPException(
            status_code=400, detail="Can only update progress for in_progress tasks"
        )

    old_progress = task.progress_percent
    task.progress_percent = data.percent
    task.updated_at = datetime.utcnow()

    session.add(task)

    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="progress_updated",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"before": old_progress, "after": data.percent, "note": data.note},
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.commit()
    await session.refresh(task)

    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    return task_to_read(task, assignee)


@router.patch("/api/tasks/{task_id}/assign", response_model=TaskRead)
async def assign_task(
    task_id: int,
    data: AssignUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Assign task to a project member."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    # Validate assignee
    assignee = await check_assignee_is_member(session, task.project_id, data.assignee_id)
    assignee_handle = assignee.handle

    old_assignee_id = task.assignee_id
    task.assignee_id = data.assignee_id
    task.updated_at = datetime.utcnow()

    session.add(task)

    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="assigned",
        actor_id=worker_id,
        actor_type=worker_type,
        details={
            "before": old_assignee_id,
            "after": data.assignee_id,
            "assignee_handle": assignee_handle,
        },
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.commit()
    await session.refresh(task)

    # Compute spawn_count for recurring tasks
    spawn_count = 0
    if task.is_recurring:
        root_id = task.recurring_root_id or task.id
        spawn_count = await get_spawn_count(session, root_id)

    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        progress_percent=task.progress_percent,
        tags=task.tags,
        due_date=task.due_date,
        # Recurring fields
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        max_occurrences=task.max_occurrences,
        recurring_root_id=task.recurring_root_id,
        recurrence_trigger=task.recurrence_trigger,
        clone_subtasks_on_recur=task.clone_subtasks_on_recur,
        has_spawned_next=task.has_spawned_next,
        spawn_count=spawn_count,
        # Foreign key references
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        assignee_handle=assignee_handle,
        parent_task_id=task.parent_task_id,
        created_by_id=task.created_by_id,
        started_at=task.started_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        subtasks=[],
    )


@router.post("/api/tasks/{task_id}/subtasks", response_model=TaskRead, status_code=201)
async def create_subtask(
    task_id: int,
    data: TaskCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Create a subtask under a parent task."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    parent = await session.get(Task, task_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent task not found")

    await check_project_membership(session, parent.project_id, worker_id)

    # Get parent's project_id before any modifications
    parent_project_id = parent.project_id

    # Validate assignee if provided
    assignee = None
    assignee_handle = None
    if data.assignee_id:
        assignee = await check_assignee_is_member(session, parent_project_id, data.assignee_id)
        assignee_handle = assignee.handle

    # Create subtask
    subtask = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        assignee_id=data.assignee_id,
        parent_task_id=task_id,
        tags=data.tags,
        due_date=data.due_date,
        project_id=parent_project_id,
        created_by_id=worker_id,
    )
    session.add(subtask)
    await session.flush()

    await log_action(
        session,
        entity_type="task",
        entity_id=subtask.id,
        action="created",
        actor_id=worker_id,
        actor_type=worker_type,
        details={
            "title": subtask.title,
            "parent_task_id": task_id,
            "is_subtask": True,
        },
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.commit()
    await session.refresh(subtask)

    return TaskRead(
        id=subtask.id,
        title=subtask.title,
        description=subtask.description,
        status=subtask.status,
        priority=subtask.priority,
        progress_percent=subtask.progress_percent,
        tags=subtask.tags,
        due_date=subtask.due_date,
        # Recurring fields
        is_recurring=subtask.is_recurring,
        recurrence_pattern=subtask.recurrence_pattern,
        max_occurrences=subtask.max_occurrences,
        recurring_root_id=subtask.recurring_root_id,
        recurrence_trigger=subtask.recurrence_trigger,
        clone_subtasks_on_recur=subtask.clone_subtasks_on_recur,
        has_spawned_next=subtask.has_spawned_next,
        spawn_count=0,  # New subtask, no spawns yet
        # Foreign key references
        project_id=subtask.project_id,
        assignee_id=subtask.assignee_id,
        assignee_handle=assignee_handle,
        parent_task_id=subtask.parent_task_id,
        created_by_id=subtask.created_by_id,
        started_at=subtask.started_at,
        completed_at=subtask.completed_at,
        created_at=subtask.created_at,
        updated_at=subtask.updated_at,
        subtasks=[],
    )


@router.post("/api/tasks/{task_id}/approve", response_model=TaskRead)
async def approve_task(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Approve a task in review status."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    if task.status != "review":
        raise HTTPException(status_code=400, detail="Can only approve tasks in 'review' status")

    task.status = "completed"
    task.progress_percent = 100
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)

    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="approved",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"from_status": "review", "to_status": "completed"},
        client_id=user.client_id,
        client_name=user.client_name,
    )

    # Handle recurring task - create next occurrence
    if task.is_recurring and task.recurrence_pattern:
        await create_next_occurrence(session, task, worker_id, worker_type)

    await session.commit()
    await session.refresh(task)

    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    # Compute spawn count for response
    root_id = task.recurring_root_id or task.id
    spawn_count = await get_spawn_count(session, root_id) if task.is_recurring else 0

    return task_to_read(task, assignee, spawn_count=spawn_count)


@router.post("/api/tasks/{task_id}/reject", response_model=TaskRead)
async def reject_task(
    task_id: int,
    data: RejectRequest,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    """Reject a task in review status, returning it to in_progress."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await check_project_membership(session, task.project_id, worker_id)

    if task.status != "review":
        raise HTTPException(status_code=400, detail="Can only reject tasks in 'review' status")

    task.status = "in_progress"
    task.updated_at = datetime.utcnow()

    session.add(task)

    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="rejected",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"reason": data.reason, "from_status": "review", "to_status": "in_progress"},
        client_id=user.client_id,
        client_name=user.client_name,
    )

    await session.commit()
    await session.refresh(task)

    assignee = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)

    return task_to_read(task, assignee)
