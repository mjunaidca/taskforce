"""Agent worker endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_session
from ..models.project import ProjectMember
from ..models.worker import Worker
from ..schemas.worker import AgentCreate, AgentUpdate, WorkerRead
from ..services.audit import log_action
from ..services.user_setup import ensure_user_setup

router = APIRouter(tags=["Agents"])


@router.get("", response_model=list[WorkerRead])
async def list_agents(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[WorkerRead]:
    """List all global agents."""
    # Ensure user is set up
    await ensure_user_setup(session, user)

    stmt = (
        select(Worker)
        .where(Worker.type == "agent")
        .order_by(Worker.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.exec(stmt)
    agents = result.all()

    return [
        WorkerRead(
            id=agent.id,
            handle=agent.handle,
            name=agent.name,
            type=agent.type,
            agent_type=agent.agent_type,
            capabilities=agent.capabilities,
            created_at=agent.created_at,
        )
        for agent in agents
    ]


@router.post("", response_model=WorkerRead, status_code=201)
async def create_agent(
    data: AgentCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> WorkerRead:
    """Register a global agent."""
    current_worker = await ensure_user_setup(session, user)

    # Check handle uniqueness
    stmt = select(Worker).where(Worker.handle == data.handle)
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(status_code=400, detail=f"Handle '{data.handle}' already exists")

    # Create agent
    agent = Worker(
        handle=data.handle,
        name=data.name,
        type="agent",
        agent_type=data.agent_type,
        capabilities=data.capabilities,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)

    # Audit log
    await log_action(
        session,
        entity_type="worker",
        entity_id=agent.id,
        action="created",
        actor_id=current_worker.id,
        details={
            "handle": agent.handle,
            "agent_type": agent.agent_type,
            "capabilities": agent.capabilities,
        },
    )

    return WorkerRead(
        id=agent.id,
        handle=agent.handle,
        name=agent.name,
        type=agent.type,
        agent_type=agent.agent_type,
        capabilities=agent.capabilities,
        created_at=agent.created_at,
    )


@router.get("/{agent_id}", response_model=WorkerRead)
async def get_agent(
    agent_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> WorkerRead:
    """Get agent details."""
    await ensure_user_setup(session, user)

    agent = await session.get(Worker, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.type != "agent":
        raise HTTPException(status_code=404, detail="Not an agent")

    return WorkerRead(
        id=agent.id,
        handle=agent.handle,
        name=agent.name,
        type=agent.type,
        agent_type=agent.agent_type,
        capabilities=agent.capabilities,
        created_at=agent.created_at,
    )


@router.put("/{agent_id}", response_model=WorkerRead)
async def update_agent(
    agent_id: int,
    data: AgentUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> WorkerRead:
    """Update agent details."""
    current_worker = await ensure_user_setup(session, user)

    agent = await session.get(Worker, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.type != "agent":
        raise HTTPException(status_code=404, detail="Not an agent")

    # Track changes
    changes = {}
    if data.name is not None and data.name != agent.name:
        changes["name"] = {"before": agent.name, "after": data.name}
        agent.name = data.name
    if data.agent_type is not None and data.agent_type != agent.agent_type:
        changes["agent_type"] = {"before": agent.agent_type, "after": data.agent_type}
        agent.agent_type = data.agent_type
    if data.capabilities is not None and data.capabilities != agent.capabilities:
        changes["capabilities"] = {"before": agent.capabilities, "after": data.capabilities}
        agent.capabilities = data.capabilities

    if changes:
        session.add(agent)
        await session.commit()
        await session.refresh(agent)

        # Audit log
        await log_action(
            session,
            entity_type="worker",
            entity_id=agent.id,
            action="updated",
            actor_id=current_worker.id,
            details=changes,
        )

    return WorkerRead(
        id=agent.id,
        handle=agent.handle,
        name=agent.name,
        type=agent.type,
        agent_type=agent.agent_type,
        capabilities=agent.capabilities,
        created_at=agent.created_at,
    )


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Delete an agent."""
    current_worker = await ensure_user_setup(session, user)

    agent = await session.get(Worker, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.type != "agent":
        raise HTTPException(status_code=404, detail="Not an agent")

    # Check if agent is member of any project
    stmt = select(ProjectMember).where(ProjectMember.worker_id == agent_id)
    result = await session.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=400,
            detail="Agent is a member of one or more projects. Remove from projects first.",
        )

    # Audit log before deletion
    await log_action(
        session,
        entity_type="worker",
        entity_id=agent.id,
        action="deleted",
        actor_id=current_worker.id,
        details={"handle": agent.handle, "agent_type": agent.agent_type},
    )

    await session.delete(agent)
    await session.commit()

    return {"ok": True}
