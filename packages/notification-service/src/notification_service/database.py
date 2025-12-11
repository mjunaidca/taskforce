"""Database configuration for Notification Service.

Uses a SEPARATE database from main TaskFlow API.
This is the microservice pattern - each service owns its data.
"""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings

logger = logging.getLogger(__name__)

# Convert postgres:// to postgresql+asyncpg:// for async
db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)


async def init_db() -> None:
    """Create all tables in the notification database."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("Notification database initialized")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields async database sessions."""
    async with AsyncSession(engine) as session:
        yield session
