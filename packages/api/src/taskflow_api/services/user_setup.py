"""User setup service - handles first login initialization."""

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser
from ..models.project import Project, ProjectMember
from ..models.worker import Worker


async def get_or_create_worker(session: AsyncSession, user: CurrentUser) -> Worker:
    """Get or create a Worker record for an SSO user.

    On first API call, creates a worker record from SSO profile.
    Subsequent calls return the existing worker.
    """
    # Check if worker exists for this user
    stmt = select(Worker).where(Worker.user_id == user.id)
    result = await session.exec(stmt)
    worker = result.first()

    if worker:
        return worker

    # Create worker from SSO profile
    # Derive handle from email
    email = user.email or ""
    local_part = email.split("@")[0] if email else user.id[:8]
    handle = f"@{local_part.lower().replace('.', '-').replace('_', '-')}"

    # Handle collision by appending suffix
    base_handle = handle
    suffix = 1
    while True:
        stmt = select(Worker).where(Worker.handle == handle)
        result = await session.exec(stmt)
        if not result.first():
            break
        handle = f"{base_handle}-{suffix}"
        suffix += 1

    worker = Worker(
        handle=handle,
        name=user.name or email or user.id,
        type="human",
        user_id=user.id,
    )
    session.add(worker)
    await session.commit()
    await session.refresh(worker)
    return worker


async def ensure_default_project(
    session: AsyncSession, user: CurrentUser, worker_id: int
) -> Project:
    """Ensure user has a Default project.

    Creates one if it doesn't exist.

    Args:
        session: Database session
        user: Current user from auth
        worker_id: Worker ID (passed as int to avoid detached object issues)
    """
    # Check if default project exists
    stmt = select(Project).where(Project.owner_id == user.id, Project.is_default.is_(True))
    result = await session.exec(stmt)
    project = result.first()

    if project:
        return project

    # Create default project
    slug = f"default-{user.id[:8].lower()}"

    # Handle slug collision
    base_slug = slug
    suffix = 1
    while True:
        stmt = select(Project).where(Project.slug == slug)
        result = await session.exec(stmt)
        if not result.first():
            break
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    project = Project(
        slug=slug,
        name="Default",
        description="Your personal task workspace",
        owner_id=user.id,
        is_default=True,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    # Add user as owner
    membership = ProjectMember(
        project_id=project.id,
        worker_id=worker_id,
        role="owner",
    )
    session.add(membership)
    await session.commit()

    return project


async def ensure_user_setup(session: AsyncSession, user: CurrentUser) -> Worker:
    """Ensure user is fully set up on first API call.

    Creates:
    1. Worker record from SSO profile
    2. Default project
    3. User as owner of default project

    Returns the user's Worker record.
    """
    worker = await get_or_create_worker(session, user)
    # Store worker.id before any further commits to avoid detached object issues
    worker_id = worker.id
    await ensure_default_project(session, user, worker_id)
    # Refresh worker before returning to ensure it's attached to session
    await session.refresh(worker)
    return worker
