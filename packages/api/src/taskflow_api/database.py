"""Async database connection and session management."""

from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings

# Import all models to ensure they're registered with SQLModel.metadata
# This MUST happen before create_db_and_tables() is called
from .models import AuditLog, Project, ProjectMember, Task, Worker  # noqa: F401


def get_async_database_url(url: str) -> str:
    """Convert sync PostgreSQL URL to async-compatible format.

    Handles:
    - Driver prefix: postgresql:// → postgresql+asyncpg://
    - SSL param: sslmode=require → ssl=require
    - Removes unsupported params (channel_binding, etc.)
    - SQLite URLs for testing (returned as-is)
    """
    if not url:
        raise ValueError("DATABASE_URL is required")

    # SQLite URLs for testing - return as-is
    if url.startswith("sqlite"):
        return url

    # Convert driver prefix
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Parse URL to handle params
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    # Convert sslmode to ssl for asyncpg
    if "sslmode" in params:
        params["ssl"] = params.pop("sslmode")

    # Remove unsupported asyncpg params
    unsupported = ["channel_binding"]
    for param in unsupported:
        params.pop(param, None)

    # Rebuild query string (parse_qs returns lists, flatten single values)
    clean_params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}
    new_query = urlencode(clean_params)

    # Rebuild URL
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment,
        )
    )


# Create async engine with cleaned URL
DATABASE_URL = get_async_database_url(settings.database_url)

# SQLite doesn't support connection pooling params
if DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.debug,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.debug,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Check connection is alive before using (essential for Neon)
        pool_recycle=300,  # Recycle connections after 5 minutes (Neon closes idle connections)
    )


async def create_db_and_tables() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Dependency that yields async database sessions."""
    async with AsyncSession(engine) as session:
        yield session
