"""Notification Service - Dapr pub/sub consumer microservice.

This is a separate microservice that:
1. Subscribes to Dapr pub/sub topics (task-events, reminders)
2. Stores notifications in its OWN database
3. Exposes REST API for frontend to fetch notifications

Architecture:
- Runs as separate K8s deployment with Dapr sidecar
- Has its own PostgreSQL database (separate from TaskFlow API)
- Receives events via Dapr, no direct coupling to TaskFlow API
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import dapr_router, notifications_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    logger.info("Starting Notification Service...")
    await init_db()
    logger.info("Notification Service ready - Dapr subscriptions active")
    yield
    logger.info("Shutting down Notification Service...")


app = FastAPI(
    title="TaskFlow Notification Service",
    description="Dapr pub/sub consumer for task notifications",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for direct API access (if frontend calls this service directly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dapr_router)
app.include_router(notifications_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for K8s probes."""
    return {"status": "healthy", "service": "notification-service"}


@app.get("/")
async def root() -> dict:
    """Root endpoint with service info."""
    return {
        "service": "TaskFlow Notification Service",
        "version": "0.1.0",
        "dapr_app_id": settings.dapr_app_id,
        "subscriptions": [
            "task-events",
            "reminders",
        ],
    }
