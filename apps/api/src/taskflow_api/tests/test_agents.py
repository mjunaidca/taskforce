"""Tests for agent endpoints."""

import pytest
from httpx import AsyncClient

from .conftest import create_test_agent


@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient) -> None:
    """Test creating a new agent."""
    response = await client.post(
        "/api/workers/agents",
        json={
            "handle": "@claude-agent",
            "name": "Claude Agent",
            "agent_type": "claude",
            "capabilities": ["code", "analysis"],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["handle"] == "@claude-agent"
    assert data["name"] == "Claude Agent"
    assert data["type"] == "agent"
    assert data["agent_type"] == "claude"
    assert data["capabilities"] == ["code", "analysis"]


@pytest.mark.asyncio
async def test_create_agent_duplicate_handle(client: AsyncClient) -> None:
    """Test creating agent with duplicate handle fails."""
    await create_test_agent(client, "@duplicate-agent")
    response = await client.post(
        "/api/workers/agents",
        json={
            "handle": "@duplicate-agent",
            "name": "Another Agent",
            "agent_type": "gemini",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["error"].lower()


@pytest.mark.asyncio
async def test_list_agents(client: AsyncClient) -> None:
    """Test listing all agents."""
    await create_test_agent(client, "@agent-1")
    await create_test_agent(client, "@agent-2")

    response = await client.get("/api/workers/agents")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    handles = [a["handle"] for a in data]
    assert "@agent-1" in handles
    assert "@agent-2" in handles


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient) -> None:
    """Test getting a specific agent."""
    agent = await create_test_agent(client, "@get-test-agent")
    response = await client.get(f"/api/workers/agents/{agent['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["handle"] == "@get-test-agent"


@pytest.mark.asyncio
async def test_get_agent_not_found(client: AsyncClient) -> None:
    """Test getting non-existent agent returns 404."""
    response = await client.get("/api/workers/agents/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_agent(client: AsyncClient) -> None:
    """Test updating an agent."""
    agent = await create_test_agent(client, "@update-agent")
    response = await client.put(
        f"/api/workers/agents/{agent['id']}",
        json={"name": "Updated Agent Name", "capabilities": ["new-cap"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Agent Name"
    assert data["capabilities"] == ["new-cap"]


@pytest.mark.asyncio
async def test_delete_agent(client: AsyncClient) -> None:
    """Test deleting an agent."""
    agent = await create_test_agent(client, "@delete-agent")
    response = await client.delete(f"/api/workers/agents/{agent['id']}")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify deleted
    response = await client.get(f"/api/workers/agents/{agent['id']}")
    assert response.status_code == 404
