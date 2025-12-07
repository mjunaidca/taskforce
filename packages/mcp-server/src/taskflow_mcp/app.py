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


def _create_mcp() -> FastMCP:
    """Create FastMCP instance with stateless HTTP configuration.

    Returns:
        FastMCP: Configured MCP server instance
    """
    return FastMCP(
        "taskflow_mcp",
        stateless_http=True,  # Stateless Streamable HTTP transport
        json_response=True,  # Pure JSON responses (no SSE)
    )


# Singleton MCP instance imported by all tool modules
mcp = _create_mcp()
