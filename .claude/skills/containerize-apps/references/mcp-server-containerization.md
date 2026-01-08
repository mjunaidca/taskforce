# MCP Server Containerization Guide

## The Problem

MCP (Model Context Protocol) servers using FastMCP have transport security that validates the `Host` header. When running in Docker, requests come from other containers using service names (e.g., `mcp-server:8001`) which are rejected by default.

## Error Symptoms

```
httpx.HTTPStatusError: Client error '421 Misdirected Request' for url 'http://mcp-server:8001/mcp'
```

Or in MCP server logs:
```
Invalid Host header: mcp-server:8001
```

## Root Cause

FastMCP's default transport security settings:
```python
allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*"]
```

Docker service names like `mcp-server` are not in this list.

## Solution: Configure Transport Security

```python
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

# Allow Docker container names
transport_security = TransportSecuritySettings(
    allowed_hosts=[
        "127.0.0.1:*",
        "localhost:*",
        "[::1]:*",
        "mcp-server:*",      # Docker Compose service name
        "mcp-svc:*",         # Kubernetes service name (if applicable)
        "0.0.0.0:*",
    ],
)

mcp = FastMCP(
    "my_mcp_server",
    stateless_http=True,
    json_response=True,
    transport_security=transport_security,  # Add this!
)
```

## Health Check Endpoint

MCP's `/mcp` endpoint only accepts POST with proper MCP protocol headers. GET requests return `406 Not Acceptable`, breaking Docker health checks.

**Solution:** Add a `/health` endpoint via ASGI middleware without breaking MCP's lifespan:

```python
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class HealthMiddleware:
    """Add /health endpoint without breaking MCP lifespan."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] == "/health":
            response = JSONResponse({"status": "healthy", "service": "mcp-server"})
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


# Build the app stack
_mcp_app = mcp.streamable_http_app()
app_with_health = HealthMiddleware(_mcp_app)

# Add CORS if needed
streamable_http_app = CORSMiddleware(
    app_with_health,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"],
)
```

**Why not use Starlette Mount?**
Using `Starlette(routes=[Mount("/", app=_mcp_app)])` breaks MCP's lifespan context, causing:
```
RuntimeError: Task group is not initialized. Make sure to use run().
```

The middleware approach preserves the lifespan correctly.

## Docker Compose Configuration

```yaml
services:
  mcp-server:
    build:
      context: ./packages/mcp-server
    environment:
      - TASKFLOW_API_URL=http://api:8000  # Internal Docker network
      - TASKFLOW_MCP_HOST=0.0.0.0
      - TASKFLOW_MCP_PORT=8001
    ports:
      - "8001:8001"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      # Use /health, NOT /mcp (which returns 406 on GET)
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health').read()"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

## Dockerfile Pattern

```dockerfile
FROM python:3.13-slim AS builder
WORKDIR /app

RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock* ./

# Increase timeout for slow networks
RUN UV_HTTP_TIMEOUT=120 uv pip install --system --no-cache -r pyproject.toml

COPY src ./src

FROM python:3.13-slim
WORKDIR /app

RUN useradd --create-home --uid 1000 appuser
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=appuser:appuser src ./src

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

USER appuser
EXPOSE 8001

# Use /health endpoint (not /mcp)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health').read()" || exit 1

CMD ["python", "-m", "my_mcp_server.server"]
```

## Client Configuration (API connecting to MCP)

When the API uses MCP client to connect:

```python
from agents.mcp import MCPServerStreamableHttp

mcp_server = MCPServerStreamableHttp(
    name="TaskFlow MCP",
    params={
        "url": "http://mcp-server:8001/mcp",  # Docker service name
        "timeout": 30,
    },
)
```

The 421 error occurs on the SERVER side (MCP server rejecting the Host header), not the client side.

## Checklist

- [ ] Transport security configured with Docker service name
- [ ] `/health` endpoint added via middleware (not Mount)
- [ ] Health check uses `/health` endpoint
- [ ] Uses `127.0.0.1` not `localhost` in health checks
- [ ] UV_HTTP_TIMEOUT increased if build fails
- [ ] MCP_HOST set to `0.0.0.0` (not `127.0.0.1`)
