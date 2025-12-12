"""FastMCP application instance for TaskFlow MCP Server.

This module holds the singleton FastMCP instance that both the server
and all tool modules import. This prevents the double-import issue
when running as `python -m taskflow_mcp.server`.

Configuration:
- Stateless HTTP transport (no persistent sessions)
- JSON responses (not SSE streaming)
- No authentication (user_id passed as parameter)
"""

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings


def _create_mcp() -> FastMCP:
    """Create FastMCP instance with stateless HTTP configuration.

    Returns:
        FastMCP: Configured MCP server instance
    """
    # Configure transport security to allow various host headers
    # Default allowed_hosts is ["127.0.0.1:*", "localhost:*", "[::1]:*"]
    # We add container names and public domains for production
    transport_security = TransportSecuritySettings(
        allowed_hosts=[
            "127.0.0.1:*",
            "localhost:*",
            "[::1]:*",
            "mcp-server:*",  # Docker container name
            "0.0.0.0:*",
            "mcp.avixato.com:*",  # Production public domain
            "mcp.avixato.com",  # Without port
            "*.avixato.com:*",  # Any avixato subdomain
            "*.avixato.com",  # Any avixato subdomain without port
        ],
    )

    return FastMCP(
        "taskflow_mcp",
        stateless_http=True,  # Stateless Streamable HTTP transport
        json_response=True,  # Pure JSON responses (no SSE)
        transport_security=transport_security,
    )


# Singleton MCP instance imported by all tool modules
mcp = _create_mcp()
