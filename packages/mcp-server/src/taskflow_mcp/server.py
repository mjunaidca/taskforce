"""FastMCP server for TaskFlow with OAuth authentication.

Main entry point for the MCP server with Stateless Streamable HTTP transport.

Authentication (014-mcp-oauth-standardization):
- JWT validation via SSO's JWKS endpoint
- API key validation (tf_* prefix)
- Dev mode bypass with X-User-ID header
- OAuth metadata endpoint at /.well-known/oauth-authorization-server

Follows MCP SDK best practices:
- Direct use of FastMCP's streamable_http_app() - already includes /mcp route
- CORS middleware for browser-based clients and MCP Inspector
- Tool modules imported to register @mcp.tool() decorators
"""

import logging

from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from taskflow_mcp.app import mcp
from taskflow_mcp.auth import (
    AuthenticatedUser,
    authenticate,
    create_dev_user,
    get_jwks,
    set_current_user,
)
from taskflow_mcp.config import get_config

# Import all tool modules to register their @mcp.tool() decorators
# These imports have side effects: they register tools with the mcp instance
import taskflow_mcp.tools.tasks  # noqa: F401 - 10 task tools
import taskflow_mcp.tools.projects  # noqa: F401 - 1 project tool

logger = logging.getLogger(__name__)

# Load configuration
config = get_config()

# Use FastMCP's built-in streamable_http_app directly
# It already handles lifespan and includes the /mcp route
_mcp_app = mcp.streamable_http_app()


class AuthMiddleware:
    """Authentication middleware for MCP server.

    Validates Authorization header and sets user context.
    Allows unauthenticated access to public endpoints.

    Public endpoints (no auth required):
    - /health - Health check
    - /.well-known/oauth-authorization-server - OAuth AS metadata (RFC 8414)
    - /.well-known/oauth-protected-resource - Protected resource metadata (RFC 9728)
    """

    # Paths that don't require authentication
    PUBLIC_PATHS = {
        "/health",
        "/.well-known/oauth-authorization-server",
        "/.well-known/oauth-authorization-server/mcp",
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-protected-resource/mcp",
    }

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            # Pass through non-HTTP requests (websocket, lifespan)
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # Health check - no auth required
        if path == "/health":
            response = JSONResponse({
                "status": "healthy",
                "service": "taskflow-mcp",
                "auth_mode": "dev" if config.dev_mode else "oauth",
            })
            await response(scope, receive, send)
            return

        # Debug endpoint - echo headers (no auth required)
        if path == "/debug/headers":
            request = Request(scope)
            response = JSONResponse({
                "path": path,
                "method": request.method,
                "headers": dict(request.headers),
                "has_authorization": "authorization" in request.headers,
            })
            await response(scope, receive, send)
            return

        # OAuth Authorization Server metadata (RFC 8414)
        # Handles: /.well-known/oauth-authorization-server and /.well-known/oauth-authorization-server/mcp
        if path in ("/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/mcp"):
            response = JSONResponse({
                "issuer": config.sso_url,
                "authorization_endpoint": f"{config.sso_url}/api/auth/oauth2/authorize",
                "token_endpoint": f"{config.sso_url}/api/auth/oauth2/token",
                "device_authorization_endpoint": f"{config.sso_url}/api/auth/device/code",
                "jwks_uri": f"{config.sso_url}/api/auth/jwks",
                # Only standard OIDC scopes - Better Auth doesn't support custom scopes
                "scopes_supported": [
                    "openid",
                    "profile",
                    "email",
                ],
                "response_types_supported": ["code"],
                "grant_types_supported": [
                    "authorization_code",
                    "refresh_token",
                    "urn:ietf:params:oauth:grant-type:device_code",
                ],
                "code_challenge_methods_supported": ["S256"],
                "token_endpoint_auth_methods_supported": ["none"],  # Public clients
            })
            await response(scope, receive, send)
            return

        # OAuth Protected Resource metadata (RFC 9728)
        # This tells clients where to authenticate for this resource
        # Handles: /.well-known/oauth-protected-resource and /.well-known/oauth-protected-resource/mcp
        if path in ("/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"):
            response = JSONResponse({
                "resource": f"http://{config.mcp_host}:{config.mcp_port}/mcp",
                "authorization_servers": [config.sso_url],
                # Only standard OIDC scopes
                "scopes_supported": [
                    "openid",
                    "profile",
                    "email",
                ],
                "bearer_methods_supported": ["header"],
                "resource_documentation": "https://github.com/mjunaidca/taskforce",
            })
            await response(scope, receive, send)
            return

        # For MCP endpoints, require authentication
        request = Request(scope)

        # Dev mode bypass: skip auth entirely or use X-User-ID header
        if config.dev_mode:
            user_id = request.headers.get("x-user-id") or "dev-user"
            user = create_dev_user(user_id)
            set_current_user(user)
            logger.debug("Dev mode: Authenticated as %s", user_id)

            try:
                await self.app(scope, receive, send)
            finally:
                set_current_user(None)
            return

        # Production: require Authorization header
        auth_header = request.headers.get("authorization")
        
        # Debug: log all headers to troubleshoot auth issues
        logger.debug("Request path: %s, method: %s", path, request.method)
        logger.debug("All headers: %s", dict(request.headers))
        logger.debug("Authorization header present: %s, value length: %s", 
                    bool(auth_header), len(auth_header) if auth_header else 0)

        try:
            user = await authenticate(auth_header)
            set_current_user(user)
            logger.debug("Authenticated user: %s (type: %s)", user.id, user.token_type)
        except Exception as e:
            logger.warning("Authentication failed: %s", e)
            # Return 401 with OAuth challenge per MCP spec
            response = JSONResponse(
                {
                    "error": "unauthorized",
                    "error_description": str(e),
                    "auth_uri": f"{config.sso_url}/api/auth/device/code",
                },
                status_code=401,
                headers={
                    "WWW-Authenticate": (
                        f'Bearer realm="taskflow", '
                        f'authorization_uri="{config.sso_url}/api/auth/oauth2/authorize", '
                        f'device_authorization_uri="{config.sso_url}/api/auth/device/code"'
                    ),
                },
            )
            await response(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        finally:
            # Clear user context after request completes
            set_current_user(None)


# Apply middleware stack: Auth first, then CORS
app_with_auth = AuthMiddleware(_mcp_app)

# Wrap with CORS middleware for MCP Inspector and browser-based clients
streamable_http_app = CORSMiddleware(
    app_with_auth,
    allow_origins=["*"],  # Allow all origins for MCP clients
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization"],  # Explicitly include Authorization
    expose_headers=["Mcp-Session-Id", "WWW-Authenticate"],
)


async def warmup_jwks() -> None:
    """Pre-fetch JWKS keys at startup to avoid first-request delay."""
    if config.dev_mode:
        logger.info("[STARTUP] Dev mode - skipping JWKS warmup")
        return

    try:
        logger.info("[STARTUP] Warming up JWKS cache...")
        await get_jwks()
        logger.info("[STARTUP] JWKS cache warmed up successfully")
    except Exception as e:
        logger.warning("[STARTUP] JWKS warmup failed (will retry on first request): %s", e)


if __name__ == "__main__":
    """Run the MCP server.

    Usage:
        python -m taskflow_mcp.server

    Or with uvicorn directly:
        uvicorn taskflow_mcp.server:streamable_http_app --host 0.0.0.0 --port 8001

    Server runs at http://0.0.0.0:8001/mcp by default.
    Configure via environment variables (TASKFLOW_*).
    """
    import asyncio
    import uvicorn

    print("TaskFlow MCP Server (OAuth Enabled)")
    print(f"API Backend: {config.api_url}")
    print(f"SSO Platform: {config.sso_url}")
    print(f"Server: http://{config.mcp_host}:{config.mcp_port}/mcp")
    print(f"OAuth Metadata: http://{config.mcp_host}:{config.mcp_port}/.well-known/oauth-authorization-server")
    print(f"Auth Mode: {'DEV' if config.dev_mode else 'OAuth'}")
    print(f"Tools: {len(mcp._tool_manager._tools)} registered")

    # Warm up JWKS cache before starting server
    asyncio.run(warmup_jwks())

    uvicorn.run(
        "taskflow_mcp.server:streamable_http_app",
        host=config.mcp_host,
        port=config.mcp_port,
        reload=True,
    )
