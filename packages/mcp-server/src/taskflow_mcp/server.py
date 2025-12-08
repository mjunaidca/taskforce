"""FastMCP server for TaskFlow.

Main entry point for the MCP server with Stateless Streamable HTTP transport.

Follows MCP SDK best practices:
- Direct use of FastMCP's streamable_http_app() - already includes /mcp route
- CORS middleware for browser-based clients and MCP Inspector
- Tool modules imported to register @mcp.tool() decorators
"""

from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from taskflow_mcp.app import mcp
from taskflow_mcp.config import get_config

# Import all tool modules to register their @mcp.tool() decorators
# These imports have side effects: they register tools with the mcp instance
import taskflow_mcp.tools.tasks  # noqa: F401 - 9 task tools
import taskflow_mcp.tools.projects  # noqa: F401 - 1 project tool

# Load configuration
config = get_config()

# Use FastMCP's built-in streamable_http_app directly
# It already handles lifespan and includes the /mcp route
_mcp_app = mcp.streamable_http_app()


class HealthMiddleware:
    """Add /health endpoint to an ASGI app without breaking lifespan."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] == "/health":
            response = JSONResponse({"status": "healthy", "service": "taskflow-mcp"})
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


# Add health endpoint middleware, then CORS
app_with_health = HealthMiddleware(_mcp_app)

# Wrap with CORS middleware for MCP Inspector and browser-based clients
streamable_http_app = CORSMiddleware(
    app_with_health,
    allow_origins=["*"],  # Allow all origins for MCP clients
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"],
)


if __name__ == "__main__":
    """Run the MCP server.

    Usage:
        python -m taskflow_mcp.server

    Or with uvicorn directly:
        uvicorn taskflow_mcp.server:streamable_http_app --host 0.0.0.0 --port 8001

    Server runs at http://0.0.0.0:8001/mcp by default.
    Configure via environment variables (TASKFLOW_*).
    """
    import uvicorn

    print("TaskFlow MCP Server")
    print(f"API Backend: {config.api_url}")
    print(f"Server: http://{config.mcp_host}:{config.mcp_port}/mcp")
    print(f"Tools: {len(mcp._tool_manager._tools)} registered")

    uvicorn.run(
        "taskflow_mcp.server:streamable_http_app",
        host=config.mcp_host,
        port=config.mcp_port,
        reload=True,
    )
