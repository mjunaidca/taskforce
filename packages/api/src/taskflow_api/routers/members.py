"""Project member endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_session
from ..models.project import Project, ProjectMember
from ..models.worker import Worker
from ..schemas.project import MemberCreate, MemberRead, MemberSearchResult
from ..services.audit import log_action
from ..services.user_setup import ensure_user_setup

# Search router for global member search (at /api/members)
search_router = APIRouter(tags=["Members"])

# Project-specific router (at /api/projects/{project_id}/members)
project_router = APIRouter(tags=["Members"])

# Keep backward-compatible reference
router = project_router


@search_router.get("/search", response_model=MemberSearchResult)
async def search_members(
    q: Optional[str] = Query(None, description="Search query for name or handle"),
    project_id: Optional[int] = Query(None, description="Filter by project membership"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results to return"),
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> MemberSearchResult:
    """Search for members (workers) by name or handle.

    Used for @mention autocomplete in chat composer.
    Returns both human workers and AI agents.
    """
    await ensure_user_setup(session, user)

    # Build base query for workers
    if project_id:
        # Filter to project members
        stmt = (
            select(Worker)
            .join(ProjectMember, ProjectMember.worker_id == Worker.id)
            .where(ProjectMember.project_id == project_id)
        )
    else:
        # Get all workers (agents are global, humans tied to projects)
        stmt = select(Worker)

    # Apply search filter if provided
    if q:
        search_term = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                Worker.handle.ilike(search_term),
                Worker.name.ilike(search_term),
            )
        )

    # Order agents first (more likely to be mentioned), then by name
    stmt = stmt.order_by(Worker.type.desc(), Worker.name).limit(limit)

    result = await session.exec(stmt)
    workers = result.all()

    members = []
    for worker in workers:
        members.append({
            "id": worker.handle,  # Use handle as ID for @mention
            "name": worker.name,
            "handle": worker.handle,
            "type": worker.type,
            "description": f"{'AI Agent' if worker.type == 'agent' else 'Team Member'}",
        })

    return MemberSearchResult(members=members, total=len(members))


@project_router.get("", response_model=list[MemberRead])
async def list_members(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[MemberRead]:
    """List all members of a project (humans + agents)."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Check project exists
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user is member
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == worker_id,
    )
    result = await session.exec(stmt)
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    # Get all members with worker details
    stmt = select(ProjectMember, Worker).join(Worker).where(ProjectMember.project_id == project_id)
    result = await session.exec(stmt)

    members = []
    for membership, member_worker in result.all():
        members.append(
            MemberRead(
                id=membership.id,
                worker_id=member_worker.id,
                handle=member_worker.handle,
                name=member_worker.name,
                type=member_worker.type,
                role=membership.role,
                joined_at=membership.joined_at,
            )
        )

    return members


@project_router.post("", response_model=MemberRead, status_code=201)
async def add_member(
    project_id: int,
    data: MemberCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> MemberRead:
    """Add a member to a project.

    Provide either:
    - user_id: SSO user ID (creates worker if needed, links to project)
    - agent_id: Existing agent worker ID (links to project)
    """
    current_worker = await ensure_user_setup(session, user)
    current_worker_id = current_worker.id
    current_worker_type = current_worker.type

    # Validate input
    if not data.user_id and not data.agent_id:
        raise HTTPException(status_code=400, detail="Provide either user_id or agent_id")
    if data.user_id and data.agent_id:
        raise HTTPException(status_code=400, detail="Provide only one of user_id or agent_id")

    # Check project exists
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user is owner (only owners can add members)
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only project owner can add members")

    member_worker: Worker | None = None
    member_worker_id: int | None = None

    if data.agent_id:
        # Link existing agent
        member_worker = await session.get(Worker, data.agent_id)
        if not member_worker:
            raise HTTPException(status_code=404, detail="Agent not found")
        if member_worker.type != "agent":
            raise HTTPException(status_code=400, detail="Worker is not an agent")
        member_worker_id = member_worker.id

    elif data.user_id:
        # Get or create worker for SSO user
        stmt = select(Worker).where(Worker.user_id == data.user_id)
        result = await session.exec(stmt)
        member_worker = result.first()

        if member_worker:
            member_worker_id = member_worker.id
        else:
            # Create worker for new user
            # We don't have their email/name, so use user_id
            handle = f"@user-{data.user_id[:8].lower()}"

            # Handle collision
            base_handle = handle
            suffix = 1
            while True:
                check_stmt = select(Worker).where(Worker.handle == handle)
                check_result = await session.exec(check_stmt)
                if not check_result.first():
                    break
                handle = f"{base_handle}-{suffix}"
                suffix += 1

            member_worker = Worker(
                handle=handle,
                name=f"User {data.user_id[:8]}",
                type="human",
                user_id=data.user_id,
            )
            session.add(member_worker)
            await session.flush()  # Get ID without committing
            member_worker_id = member_worker.id

    # Check not already a member
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == member_worker_id,
    )
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(status_code=400, detail="Already a member of this project")

    # Add membership
    membership = ProjectMember(
        project_id=project_id,
        worker_id=member_worker_id,
        role="member",
    )
    session.add(membership)

    # Get member details for response before commit
    member_handle = member_worker.handle
    member_name = member_worker.name
    member_type = member_worker.type

    # Audit log (doesn't commit)
    await log_action(
        session,
        entity_type="project",
        entity_id=project_id,
        action="member_added",
        actor_id=current_worker_id,
        actor_type=current_worker_type,
        details={
            "worker_id": member_worker_id,
            "handle": member_handle,
            "type": member_type,
        },
    )

    # Single commit
    await session.commit()
    await session.refresh(membership)

    return MemberRead(
        id=membership.id,
        worker_id=member_worker_id,
        handle=member_handle,
        name=member_name,
        type=member_type,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@project_router.delete("/{member_id}")
async def remove_member(
    project_id: int,
    member_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Remove a member from a project."""
    current_worker = await ensure_user_setup(session, user)
    current_worker_id = current_worker.id
    current_worker_type = current_worker.type

    # Check project exists
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user is owner
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only project owner can remove members")

    # Get membership
    membership = await session.get(ProjectMember, member_id)
    if not membership or membership.project_id != project_id:
        raise HTTPException(status_code=404, detail="Member not found in this project")

    # Cannot remove owner
    if membership.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove project owner")

    # Get worker info for audit before deletion
    removed_worker_id = membership.worker_id
    member_worker = await session.get(Worker, removed_worker_id)
    member_handle = member_worker.handle if member_worker else None

    # Audit log before deletion
    await log_action(
        session,
        entity_type="project",
        entity_id=project_id,
        action="member_removed",
        actor_id=current_worker_id,
        actor_type=current_worker_type,
        details={
            "worker_id": removed_worker_id,
            "handle": member_handle,
        },
    )

    # Remove membership
    await session.delete(membership)
    await session.commit()

    return {"ok": True}
