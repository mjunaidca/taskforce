"""TaskFlow API - Human-Agent Task Management Backend."""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import create_db_and_tables
from .routers import agents, audit, health, members, projects, tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await create_db_and_tables()
    yield
    # Shutdown (nothing to do)


app = FastAPI(
    title="TaskFlow API",
    description="Human-Agent Task Management API - Equal API access for humans and AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for consistent error format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log the error in production, don't expose details
    if settings.debug:
        detail = str(exc)
    else:
        detail = "Internal server error"

    return JSONResponse(
        status_code=500,
        content={
            "error": detail,
            "status_code": 500,
        },
    )


# Include routers
app.include_router(health.router)
app.include_router(projects.router, prefix="/api/projects")
app.include_router(members.router, prefix="/api/projects/{project_id}/members")
app.include_router(agents.router, prefix="/api/workers/agents")
app.include_router(tasks.router)  # Has its own prefixes defined
app.include_router(audit.router, prefix="/api")


@app.get("/")
async def root() -> dict[str, Any]:
    """API root - returns basic info."""
    return {
        "name": "TaskFlow API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
