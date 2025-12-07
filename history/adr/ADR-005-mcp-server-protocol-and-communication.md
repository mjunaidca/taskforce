# ADR-005: MCP Server Protocol and Communication

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 005-mcp-server
- **Context:** specs/005-mcp-server/spec.md

## Decision

Built an MCP (Model Context Protocol) server using FastMCP with Stateless Streamable HTTP transport. The server exposes task management tools that AI agents can invoke, with the server acting as a thin HTTP client to the existing REST API rather than duplicating database logic.

**Technology Stack:**
- **MCP Framework**: FastMCP with streamable_http_app()
- **Transport**: Stateless Streamable HTTP (not stdio)
- **HTTP Server**: Starlette with CORS middleware
- **API Client**: httpx for async REST API calls
- **Input Validation**: Pydantic models for all tool inputs

**Communication Architecture:**
- MCP Server → REST API: httpx async client with user_id passthrough
- No direct database access (all operations via REST API)
- CORS enabled for browser-based MCP clients and MCP Inspector
- Tools discovered dynamically by connecting clients

**Tool Design:**
- 10 MCP tools covering full task lifecycle (add, list, update, delete, start, complete, etc.)
- Each tool accepts user_id parameter (auth validated upstream by Chat Server)
- JSON responses with task_id, status, and relevant data for machine parsing
- Error responses include actionable messages

## Consequences

### Positive
- Stateless HTTP transport enables load balancing and horizontal scaling
- REST API as single source of truth prevents data inconsistency
- FastMCP's streamable_http_app() handles MCP protocol automatically
- CORS support enables MCP Inspector testing without proxy
- Tool discovery eliminates client-side tool configuration

### Negative
- HTTP roundtrip to REST API adds latency vs. direct DB access
- No authentication at MCP layer (relies on Chat Server upstream)
- Stateless transport doesn't support long-running operations well
- CORS "*" is permissive for production

## Alternatives Considered

### Alternative A: MCP stdio transport
- Pros: Simpler protocol, no HTTP overhead, standard MCP pattern
- Cons: Requires subprocess management, no load balancing, single-process limit
- Why rejected: HTTP transport enables multi-instance deployment and browser-based clients

### Alternative B: Direct database access in MCP Server
- Pros: Lower latency, fewer network hops, simpler architecture
- Cons: Duplicates business logic, data consistency risks, separate DB connections
- Why rejected: REST API as single source of truth ensures all clients see consistent data

### Alternative C: gRPC for MCP-to-API communication
- Pros: Binary protocol, type-safe, efficient
- Cons: Additional complexity, REST API already exists, no browser support
- Why rejected: REST API is already implemented and works; gRPC adds unnecessary complexity

## Implementation Patterns

**FastMCP HTTP App:**
```python
# Use FastMCP's built-in streamable_http_app
_mcp_app = mcp.streamable_http_app()

# Wrap with CORS for MCP Inspector
streamable_http_app = CORSMiddleware(
    _mcp_app,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    expose_headers=["Mcp-Session-Id"],
)
```

**Tool → REST API Pattern:**
```python
@mcp.tool()
async def taskflow_add_task(user_id: str, project_id: int, title: str):
    response = await api_client.post(
        f"/api/projects/{project_id}/tasks",
        json={"title": title},
        headers={"X-User-Id": user_id}
    )
    return {"task_id": response["id"], "status": "created", "title": title}
```

## References
- Spec: specs/005-mcp-server/spec.md
- Plan: specs/005-mcp-server/plan.md
- Implementation: packages/mcp-server/src/taskflow_mcp/
- Key files: server.py, tools/tasks.py, api_client.py
