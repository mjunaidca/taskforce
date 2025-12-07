"""Configuration management for TaskFlow MCP Server.

Environment variables:
- TASKFLOW_API_URL: REST API base URL (default: http://localhost:8000)
- TASKFLOW_API_TIMEOUT: Request timeout in seconds (default: 30.0)
- TASKFLOW_MCP_HOST: Server host (default: 0.0.0.0)
- TASKFLOW_MCP_PORT: Server port (default: 8001)
- TASKFLOW_DEV_MODE: Enable dev mode (API must also be in dev mode)
- TASKFLOW_SERVICE_TOKEN: Service token for internal API calls (optional)
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # REST API configuration
    api_url: str = "http://localhost:8000"
    api_timeout: float = 30.0

    # MCP Server configuration
    mcp_host: str = "0.0.0.0"
    mcp_port: int = 8001

    # Authentication mode
    # Dev mode: API must also have DEV_MODE=true, uses X-User-ID header
    # Production: Chat Server passes JWT via access_token parameter
    dev_mode: bool = False

    # Optional service token for internal API calls
    # If set, used as Bearer token instead of user JWT
    service_token: str | None = None

    model_config = SettingsConfigDict(
        env_prefix="TASKFLOW_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_config() -> Settings:
    """Get cached settings instance."""
    return Settings()
