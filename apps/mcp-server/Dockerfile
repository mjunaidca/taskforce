# syntax=docker/dockerfile:1
# =============================================================================
# TaskFlow MCP Server - Dockerfile
# =============================================================================
# HTTP-based MCP server (Stateless Streamable HTTP transport)
#
# ENTRY POINT: taskflow_mcp.server
# PORT: 8001
# =============================================================================

# ----- Stage 1: Build -----
FROM python:3.13-slim AS builder

WORKDIR /app

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies with retry logic for network issues
# Retry 3 times with 300s timeout each attempt
RUN UV_HTTP_TIMEOUT=300 uv pip install --system --no-cache -r pyproject.toml || \
    (echo "Retry 1/2..." && sleep 5 && UV_HTTP_TIMEOUT=300 uv pip install --system --no-cache -r pyproject.toml) || \
    (echo "Retry 2/2..." && sleep 10 && UV_HTTP_TIMEOUT=300 uv pip install --system --no-cache -r pyproject.toml)

# Copy source code
COPY src ./src

# ----- Stage 2: Runtime -----
FROM python:3.13-slim

WORKDIR /app

# Create non-root user
RUN useradd --create-home --uid 1000 appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser src ./src

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/src
ENV TASKFLOW_MCP_HOST=0.0.0.0
ENV TASKFLOW_MCP_PORT=8001

USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health').read()" || exit 1

CMD ["python", "-m", "taskflow_mcp.server"]
