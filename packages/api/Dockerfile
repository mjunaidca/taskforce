# syntax=docker/dockerfile:1
# =============================================================================
# TaskFlow API - FastAPI Dockerfile
# =============================================================================
# Multi-stage build with uv for fast dependency resolution
#
# ENTRY POINT: taskflow_api.main:app
# PORT: 8000
# =============================================================================

# ----- Stage 1: Build -----
FROM python:3.13-slim AS builder

WORKDIR /app

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv pip install --system --no-cache -r pyproject.toml

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
ENV PORT=8000

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

CMD ["uvicorn", "taskflow_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
