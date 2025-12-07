"""Test fixtures for TaskFlow API tests."""

# Patch JSONB to JSON FIRST before any model imports
# This allows us to use SQLite in-memory for testing while using JSONB in production
from sqlalchemy import JSON
import sqlalchemy.dialects.postgresql as pg_dialects
pg_dialects.JSONB = JSON  # type: ignore

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from taskflow_api.auth import CurrentUser, get_current_user
from taskflow_api.database import get_session
from taskflow_api.main import app

# Test database URL (SQLite in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# Create test session maker
TestAsyncSession = sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Mock user for tests
TEST_USER = CurrentUser({
    "sub": "test-user-123",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user",
})

TEST_USER_2 = CurrentUser({
    "sub": "test-user-456",
    "email": "other@example.com",
    "name": "Other User",
    "role": "user",
})


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for session-scoped fixtures."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_database() -> AsyncGenerator[None, None]:
    """Create tables before each test and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


async def get_test_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a test database session."""
    async with TestAsyncSession() as session:
        yield session


def get_test_user() -> CurrentUser:
    """Return mock authenticated user."""
    return TEST_USER


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a database session for direct model testing."""
    async with TestAsyncSession() as session:
        yield session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async test client with mocked auth."""
    # Override dependencies
    app.dependency_overrides[get_session] = get_test_session
    app.dependency_overrides[get_current_user] = get_test_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture
def mock_user() -> CurrentUser:
    """Return the mock test user."""
    return TEST_USER


@pytest.fixture
def mock_user_2() -> CurrentUser:
    """Return second mock test user."""
    return TEST_USER_2


@pytest.fixture
async def client_user_2() -> AsyncGenerator[AsyncClient, None]:
    """Provide test client authenticated as second user."""

    def get_user_2() -> CurrentUser:
        return TEST_USER_2

    app.dependency_overrides[get_session] = get_test_session
    app.dependency_overrides[get_current_user] = get_user_2

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# Helper functions for tests


async def create_test_project(client: AsyncClient, slug: str = "test-project") -> dict[str, Any]:
    """Create a test project and return response data."""
    response = await client.post(
        "/api/projects",
        json={"slug": slug, "name": f"Test Project {slug}"},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_test_agent(client: AsyncClient, handle: str = "@test-agent") -> dict[str, Any]:
    """Create a test agent and return response data."""
    response = await client.post(
        "/api/workers/agents",
        json={
            "handle": handle,
            "name": "Test Agent",
            "agent_type": "claude",
            "capabilities": ["code", "test"],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_test_task(
    client: AsyncClient,
    project_id: int,
    title: str = "Test Task",
    **kwargs: Any,
) -> dict[str, Any]:
    """Create a test task and return response data."""
    data = {"title": title, **kwargs}
    response = await client.post(f"/api/projects/{project_id}/tasks", json=data)
    assert response.status_code == 201, response.text
    return response.json()
