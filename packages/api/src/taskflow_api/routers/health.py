"""Health check endpoints."""

from fastapi import APIRouter, Depends
from sqlmodel import text
from sqlmodel.ext.asyncio.session import AsyncSession

from ..database import get_session

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health() -> dict:
    """Liveness check - always returns 200 if server is running."""
    return {"status": "healthy", "version": "1.0.0"}


@router.get("/health/ready")
async def ready(session: AsyncSession = Depends(get_session)) -> dict:
    """Readiness check - verifies database connection."""
    try:
        await session.exec(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
