# Notification Service Dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files first (for layer caching)
COPY pyproject.toml README.md ./

# Copy source code
COPY src/ src/

# Install dependencies (after copying src for -e install)
RUN uv pip install --system -e .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/health').raise_for_status()"

CMD ["uvicorn", "notification_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
