"""TaskFlow API - Human-Agent Task Management Backend."""

import json
import logging
from contextlib import asynccontextmanager
from typing import Any

from chatkit.server import StreamingResult
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

# Load .env before anything else (for OPENAI_API_KEY used by Agents SDK)
load_dotenv()

from .chatkit_store import RequestContext  # noqa: E402
from .config import settings  # noqa: E402
from .database import create_db_and_tables  # noqa: E402
from .routers import agents, audit, health, members, projects, tasks  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else getattr(logging, settings.log_level.upper()),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting TaskFlow API...")
    logger.info("Debug mode: %s", settings.debug)
    logger.info("Dev mode (auth bypass): %s", settings.dev_mode)
    logger.info("SSO URL: %s", settings.sso_url)
    await create_db_and_tables()
    logger.info("Database initialized")

    # Initialize ChatKit store if configured (TASKFLOW_CHATKIT_DATABASE_URL)
    if settings.chat_enabled:
        logger.info("Chat enabled, initializing ChatKit store...")
        logger.info("MCP Server URL: %s", settings.mcp_server_url)

        from .chatkit_store import PostgresStore, StoreConfig
        from .services import create_chatkit_server

        try:
            # StoreConfig reads TASKFLOW_CHATKIT_DATABASE_URL from env automatically
            store_config = StoreConfig()
            chatkit_store = PostgresStore(config=store_config)
            await chatkit_store.initialize_schema()
            app.state.chatkit_store = chatkit_store
            app.state.chatkit_server = create_chatkit_server(
                chatkit_store,
                mcp_server_url=settings.mcp_server_url,
            )
            logger.info("ChatKit store initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize ChatKit store: %s", e)
            logger.warning("Chat features will be unavailable")
    else:
        logger.info("Chat disabled (TASKFLOW_CHATKIT_DATABASE_URL not set)")

    yield

    # Shutdown
    logger.info("Shutting down TaskFlow API...")

    # Cleanup ChatKit store
    if hasattr(app.state, "chatkit_store"):
        await app.state.chatkit_store.close()
        logger.info("ChatKit store closed")


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
# Split members routes: search is at /api/members/search, project-specific at /api/projects/{id}/members
app.include_router(members.search_router, prefix="/api/members")
app.include_router(members.project_router, prefix="/api/projects/{project_id}/members")
app.include_router(agents.router, prefix="/api/workers/agents")
app.include_router(tasks.router)  # Has its own prefixes defined
app.include_router(audit.router, prefix="/api")


@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    """
    Main ChatKit endpoint for conversational task management.

    Requires X-User-ID header for user identification.
    Uses JWT auth when available, falls back to X-User-ID header.
    """
    # Get server from app state
    chatkit_server = getattr(request.app.state, "chatkit_server", None)
    if not chatkit_server:
        raise HTTPException(
            status_code=503,
            detail="ChatKit server not initialized. Check CHATKIT_DATABASE_URL configuration.",
        )

    # Extract user ID from header (ChatKit protocol uses X-User-ID)
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")

    # Extract JWT token from Authorization header (Bearer token)
    auth_header = request.headers.get("Authorization")
    access_token = None
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header[7:]  # Remove "Bearer " prefix

    if not access_token:
        raise HTTPException(
            status_code=401, detail="Missing Authorization header with Bearer token"
        )

    try:
        # Process ChatKit request
        payload = await request.body()

        # Decode payload to extract metadata
        payload_dict = json.loads(payload)

        # Extract metadata from the correct location in ChatKit request
        metadata = {}
        if "params" in payload_dict and "input" in payload_dict["params"]:
            metadata = payload_dict["params"]["input"].get("metadata", {})

        # Add access_token to metadata so ChatKit server can pass it to agent
        metadata["access_token"] = access_token

        logger.debug("ChatKit request metadata keys: %s", list(metadata.keys()))

        # Create request context
        context = RequestContext(
            user_id=user_id,
            request_id=request.headers.get("X-Request-ID"),
            metadata=metadata,
        )

        result = await chatkit_server.process(payload, context)

        # Return appropriate response type
        if isinstance(result, StreamingResult):
            return StreamingResponse(
                result,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            return Response(
                content=result.json,
                media_type="application/json",
            )
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON in ChatKit request: %s", e)
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.exception("Error processing ChatKit request: %s", e)
        raise HTTPException(status_code=500, detail=f"Error processing request: {e!s}")


@app.get("/")
async def root() -> dict[str, Any]:
    """API root - returns basic info."""
    chatkit_status = (
        "active"
        if hasattr(app.state, "chatkit_server") and app.state.chatkit_server
        else "not configured"
    )
    return {
        "name": "TaskFlow API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "chatkit": f"/chatkit ({chatkit_status})",
    }
