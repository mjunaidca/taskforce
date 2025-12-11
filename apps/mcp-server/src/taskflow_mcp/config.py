"""Configuration management for TaskFlow MCP Server.

Environment variables:
- TASKFLOW_API_URL: REST API base URL (default: http://localhost:8000)
- TASKFLOW_API_TIMEOUT: Request timeout in seconds (default: 30.0)
- TASKFLOW_MCP_HOST: Server host (default: 0.0.0.0)
- TASKFLOW_MCP_PORT: Server port (default: 8001)
- TASKFLOW_DEV_MODE: Enable dev mode (API must also be in dev mode)
- TASKFLOW_SERVICE_TOKEN: Service token for internal API calls (optional)
- TASKFLOW_SSO_URL: SSO Platform URL for OAuth (default: http://localhost:3001)
- TASKFLOW_OAUTH_CLIENT_ID: OAuth client ID (default: taskflow-mcp)
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

    # OAuth/SSO configuration (014-mcp-oauth-standardization)
    # SSO Platform URL for JWKS and API key verification
    sso_url: str = "http://localhost:3001"
    # OAuth client ID (for audience validation, optional)
    oauth_client_id: str = "taskflow-mcp"

    # Authentication mode
    # Dev mode: API must also have DEV_MODE=true, uses X-User-ID header
    # Production: Uses Authorization: Bearer header with JWT or API key
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
