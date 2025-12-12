"""Worker endpoints - org members with project assignments (least privilege model).

Philosophy: Org membership ≠ Project access
- SSO is source of truth for "who's in the org"
- TaskFlow is source of truth for "who can access what project"
- This endpoint merges both views for the workers page
"""

import logging
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user, get_tenant_id
from ..config import settings
from ..database import get_session
from ..models.project import Project, ProjectMember
from ..models.worker import Worker
from ..services.user_setup import ensure_user_setup

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Workers"])


class ProjectInfo(BaseModel):
    """Project summary for worker display."""
    id: int
    name: str
    role: str


class OrgMemberWithProjects(BaseModel):
    """Organization member with their project assignments."""
    user_id: str
    email: str
    name: str
    image: str | None
    org_role: str  # owner/admin/member in org
    projects: list[ProjectInfo]
    has_project_access: bool


class WorkerListResponse(BaseModel):
    """Combined view of org members and agents."""
    org_members: list[OrgMemberWithProjects]
    agents: list[dict]
    total_members: int
    total_agents: int
    unassigned_count: int


@router.get("", response_model=WorkerListResponse)
async def list_workers(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> WorkerListResponse:
    """List all org members with their project assignments.

    Fetches org members from SSO and merges with project assignments.
    Shows who has access to which projects (least privilege view).

    Returns:
    - org_members: All org members with their project assignments
    - agents: All registered AI agents
    - unassigned_count: Members with no project access yet
    """
    await ensure_user_setup(session, user)
    tenant_id = get_tenant_id(user, request)

    logger.info("[WORKERS] Fetching org members for tenant: %s", tenant_id)

    # Get Authorization header to forward to SSO
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Step 1: Fetch org members from SSO
    sso_url = f"{settings.sso_url}/api/organizations/{tenant_id}/members"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                sso_url,
                headers={
                    "Authorization": auth_header,
                    "Cookie": request.headers.get("Cookie", ""),
                },
            )

            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="SSO authentication failed")
            if response.status_code == 403:
                raise HTTPException(
                    status_code=403, detail="Not a member of this organization"
                )
            if response.status_code != 200:
                logger.error("[WORKERS] SSO returned %d: %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to fetch org members from SSO: {response.status_code}",
                )

            sso_data = response.json()

    except httpx.RequestError as e:
        logger.error("[WORKERS] SSO request failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to SSO: {e}",
        )

    org_members_raw = sso_data.get("members", [])
    logger.info("[WORKERS] Found %d org members from SSO", len(org_members_raw))

    # Step 2: Get all projects for this tenant
    stmt = select(Project).where(Project.tenant_id == tenant_id)
    result = await session.exec(stmt)
    projects = {p.id: p for p in result.all()}

    # Step 3: Get all project memberships for this tenant's projects
    # Map: user_id -> list of (project_id, role)
    user_project_map: dict[str, list[tuple[int, str]]] = {}

    for project_id in projects:
        stmt = select(ProjectMember, Worker).join(Worker).where(
            ProjectMember.project_id == project_id
        )
        result = await session.exec(stmt)
        for membership, worker in result.all():
            if worker.user_id:
                if worker.user_id not in user_project_map:
                    user_project_map[worker.user_id] = []
                user_project_map[worker.user_id].append((project_id, membership.role))

    # Step 4: Build response - merge SSO members with project assignments
    org_members_with_projects: list[OrgMemberWithProjects] = []
    unassigned_count = 0

    for member in org_members_raw:
        user_id = member.get("userId", "")
        user_projects = user_project_map.get(user_id, [])

        project_infos = [
            ProjectInfo(
                id=pid,
                name=projects[pid].name,
                role=role,
            )
            for pid, role in user_projects
            if pid in projects
        ]

        has_access = len(project_infos) > 0
        if not has_access:
            unassigned_count += 1

        org_members_with_projects.append(
            OrgMemberWithProjects(
                user_id=user_id,
                email=member.get("email", ""),
                name=member.get("name") or member.get("email", "").split("@")[0],
                image=member.get("image"),
                org_role=member.get("role", "member"),
                projects=project_infos,
                has_project_access=has_access,
            )
        )

    # Step 5: Get all agents (agents are global, not tied to users)
    stmt = select(Worker).where(Worker.type == "agent")
    result = await session.exec(stmt)
    agents = [
        {
            "id": w.id,
            "handle": w.handle,
            "name": w.name,
            "type": w.type,
            "description": w.description,
        }
        for w in result.all()
    ]

    logger.info(
        "[WORKERS] Response: %d org members (%d unassigned), %d agents",
        len(org_members_with_projects),
        unassigned_count,
        len(agents),
    )

    return WorkerListResponse(
        org_members=org_members_with_projects,
        agents=agents,
        total_members=len(org_members_with_projects),
        total_agents=len(agents),
        unassigned_count=unassigned_count,
    )
