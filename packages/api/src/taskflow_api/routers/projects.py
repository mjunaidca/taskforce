"""Project endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user, get_tenant_id
from ..database import get_session
from ..models.project import Project, ProjectMember
from ..models.task import Task
from ..schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from ..services.audit import log_action
from ..services.user_setup import ensure_user_setup

router = APIRouter(tags=["Projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ProjectRead]:
    """List projects where user is a member, scoped by tenant."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Get project IDs where user is a member AND project is in tenant
    member_stmt = (
        select(ProjectMember.project_id)
        .join(Project, ProjectMember.project_id == Project.id)
        .where(
            ProjectMember.worker_id == worker_id,
            Project.tenant_id == tenant_id,
        )
    )
    member_result = await session.exec(member_stmt)
    project_ids = list(member_result.all())

    if not project_ids:
        return []

    # Get projects with counts
    stmt = select(Project).where(Project.id.in_(project_ids)).offset(offset).limit(limit)
    result = await session.exec(stmt)
    projects = list(result.all())

    # Build response with counts
    response = []
    for project in projects:
        # Count members
        member_count_stmt = select(func.count(ProjectMember.id)).where(
            ProjectMember.project_id == project.id
        )
        member_count = (await session.exec(member_count_stmt)).one()

        # Count tasks
        task_count_stmt = select(func.count(Task.id)).where(Task.project_id == project.id)
        task_count = (await session.exec(task_count_stmt)).one()

        response.append(
            ProjectRead(
                id=project.id,
                slug=project.slug,
                name=project.name,
                description=project.description,
                owner_id=project.owner_id,
                is_default=project.is_default,
                tenant_id=project.tenant_id,
                member_count=member_count,
                task_count=task_count,
                created_at=project.created_at,
                updated_at=project.updated_at,
            )
        )

    return response


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    """Create a new project in current tenant."""
    worker = await ensure_user_setup(session, user)
    # Extract primitive values before any commits
    worker_id = worker.id
    worker_type = worker.type

    # Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Check slug uniqueness WITHIN TENANT (not global)
    stmt = select(Project).where(
        Project.tenant_id == tenant_id,
        Project.slug == data.slug,
    )
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=400,
            detail=f"Project slug '{data.slug}' already exists in your organization",
        )

    # Create project with tenant
    project = Project(
        tenant_id=tenant_id,
        slug=data.slug,
        name=data.name,
        description=data.description,
        owner_id=user.id,
        is_default=False,
    )
    session.add(project)
    await session.flush()  # Get project.id without committing
    project_id = project.id

    # Add creator as owner
    membership = ProjectMember(
        project_id=project_id,
        worker_id=worker_id,
        role="owner",
    )
    session.add(membership)

    # Audit log (doesn't commit)
    await log_action(
        session,
        entity_type="project",
        entity_id=project_id,
        action="created",
        actor_id=worker_id,
        actor_type=worker_type,
        details={"slug": data.slug, "name": data.name, "tenant_id": tenant_id},
    )

    # Single commit for all changes
    await session.commit()
    await session.refresh(project)

    return ProjectRead(
        id=project.id,
        slug=project.slug,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        is_default=project.is_default,
        tenant_id=project.tenant_id,
        member_count=1,
        task_count=0,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    """Get project details (tenant-scoped, returns 404 for cross-tenant)."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        # Returns 404 for both "doesn't exist" and "wrong tenant"
        raise HTTPException(status_code=404, detail="Project not found")

    # Check membership (within tenant)
    membership_stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == worker_id,
    )
    membership_result = await session.exec(membership_stmt)
    if not membership_result.first():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    # Count members and tasks
    member_count_stmt = select(func.count(ProjectMember.id)).where(
        ProjectMember.project_id == project_id
    )
    member_count = (await session.exec(member_count_stmt)).one()

    task_count_stmt = select(func.count(Task.id)).where(Task.project_id == project_id)
    task_count = (await session.exec(task_count_stmt)).one()

    return ProjectRead(
        id=project.id,
        slug=project.slug,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        is_default=project.is_default,
        tenant_id=project.tenant_id,
        member_count=member_count,
        task_count=task_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    """Update project (owner only, tenant-scoped)."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    # Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check ownership
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only project owner can update")

    # Track changes for audit
    changes = {}
    if data.name is not None and data.name != project.name:
        changes["name"] = {"before": project.name, "after": data.name}
        project.name = data.name
    if data.description is not None and data.description != project.description:
        changes["description"] = {"before": project.description, "after": data.description}
        project.description = data.description

    if changes:
        project.updated_at = datetime.utcnow()
        session.add(project)

        # Audit log
        await log_action(
            session,
            entity_type="project",
            entity_id=project_id,
            action="updated",
            actor_id=worker_id,
            actor_type=worker_type,
            details={**changes, "tenant_id": tenant_id},
        )

        await session.commit()
        await session.refresh(project)

    # Get counts for response
    member_count_stmt = select(func.count(ProjectMember.id)).where(
        ProjectMember.project_id == project_id
    )
    member_count = (await session.exec(member_count_stmt)).one()

    task_count_stmt = select(func.count(Task.id)).where(Task.project_id == project_id)
    task_count = (await session.exec(task_count_stmt)).one()

    return ProjectRead(
        id=project.id,
        slug=project.slug,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        is_default=project.is_default,
        tenant_id=project.tenant_id,
        member_count=member_count,
        task_count=task_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    request: Request,
    force: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Delete project (owner only, tenant-scoped)."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id
    worker_type = worker.type

    # Get tenant context
    tenant_id = get_tenant_id(user, request)

    # Fetch project with tenant check
    stmt = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == tenant_id,
    )
    result = await session.exec(stmt)
    project = result.first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Extract values before any modifications
    project_slug = project.slug

    # Check ownership
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only project owner can delete")

    # Cannot delete default project
    if project.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default project")

    # Check for tasks
    task_count_stmt = select(func.count(Task.id)).where(Task.project_id == project_id)
    task_count = (await session.exec(task_count_stmt)).one()

    if task_count > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Project has {task_count} tasks. Delete tasks first or use force=true",
        )

    # Delete members first
    member_stmt = select(ProjectMember).where(ProjectMember.project_id == project_id)
    members = (await session.exec(member_stmt)).all()
    for member in members:
        await session.delete(member)

    # Delete tasks if force
    if force and task_count > 0:
        task_stmt = select(Task).where(Task.project_id == project_id)
        tasks = (await session.exec(task_stmt)).all()
        for task in tasks:
            await session.delete(task)

    # Audit log before deletion
    await log_action(
        session,
        entity_type="project",
        entity_id=project_id,
        action="deleted",
        actor_id=worker_id,
        actor_type=worker_type,
        details={
            "slug": project_slug,
            "force": force,
            "task_count": task_count,
            "tenant_id": tenant_id,
        },
    )

    await session.delete(project)
    await session.commit()

    return {"ok": True, "deleted_tasks": task_count if force else 0}
