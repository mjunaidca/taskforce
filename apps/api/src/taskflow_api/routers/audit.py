"""Audit trail endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_session
from ..models.audit import AuditLog
from ..models.project import Project, ProjectMember
from ..models.task import Task
from ..models.worker import Worker
from ..schemas.audit import AuditRead
from ..services.user_setup import ensure_user_setup

router = APIRouter(tags=["Audit"])


@router.get("/tasks/{task_id}/audit", response_model=list[AuditRead])
async def get_task_audit(
    task_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[AuditRead]:
    """Get audit trail for a specific task."""
    worker = await ensure_user_setup(session, user)

    # Check task exists
    task = await session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check membership
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == task.project_id,
        ProjectMember.worker_id == worker.id,
    )
    result = await session.exec(stmt)
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    # Get audit entries
    stmt = (
        select(AuditLog)
        .where(AuditLog.entity_type == "task", AuditLog.entity_id == task_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.exec(stmt)
    entries = result.all()

    # Build response with actor handles
    audit_list = []
    for entry in entries:
        actor = await session.get(Worker, entry.actor_id)
        audit_list.append(
            AuditRead(
                id=entry.id,
                entity_type=entry.entity_type,
                entity_id=entry.entity_id,
                action=entry.action,
                actor_id=entry.actor_id,
                actor_handle=actor.handle if actor else None,
                actor_type=entry.actor_type,
                details=entry.details,
                created_at=entry.created_at,
            )
        )

    return audit_list


@router.get("/projects/{project_id}/audit", response_model=list[AuditRead])
async def get_project_audit(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[AuditRead]:
    """Get audit trail for a project (includes project and all task events)."""
    worker = await ensure_user_setup(session, user)

    # Check project exists
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check membership
    stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.worker_id == worker.id,
    )
    result = await session.exec(stmt)
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member of this project")

    # Get task IDs in project
    task_stmt = select(Task.id).where(Task.project_id == project_id)
    task_result = await session.exec(task_stmt)
    task_ids = list(task_result.all())

    # Get audit entries for project and its tasks
    from sqlalchemy import or_

    conditions = [(AuditLog.entity_type == "project") & (AuditLog.entity_id == project_id)]
    if task_ids:
        conditions.append((AuditLog.entity_type == "task") & (AuditLog.entity_id.in_(task_ids)))

    stmt = (
        select(AuditLog)
        .where(or_(*conditions))
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.exec(stmt)
    entries = result.all()

    # Build response with actor handles
    audit_list = []
    for entry in entries:
        actor = await session.get(Worker, entry.actor_id)
        audit_list.append(
            AuditRead(
                id=entry.id,
                entity_type=entry.entity_type,
                entity_id=entry.entity_id,
                action=entry.action,
                actor_id=entry.actor_id,
                actor_handle=actor.handle if actor else None,
                actor_type=entry.actor_type,
                details=entry.details,
                created_at=entry.created_at,
            )
        )

    return audit_list
