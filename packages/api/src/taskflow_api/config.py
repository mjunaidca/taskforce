"""Application configuration from environment variables."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore TASKFLOW_CHATKIT_* vars (handled by StoreConfig)
    )

    # Database (required)
    database_url: str

    # SSO (required)
    sso_url: str

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    # Debug
    debug: bool = False
    log_level: str = "INFO"

    # Dev mode - bypasses auth for local development
    dev_mode: bool = False
    dev_user_id: str = "dev-user-123"
    dev_user_email: str = "dev@localhost"
    dev_user_name: str = "Dev User"

    # MCP Server URL for TaskFlow tools (required for chat)
    mcp_server_url: str = "http://localhost:8001/mcp"

    # OpenAI API Key (required for chat)
    openai_api_key: str | None = None

    # Dapr configuration (Phase V requires Full Dapr: Pub/Sub, State, Bindings, Secrets, Service Invocation)
    dapr_http_endpoint: str = "http://localhost:3500"
    dapr_pubsub_name: str = "taskflow-pubsub"  # Kafka via Dapr

    # Notification configuration
    notification_retention_days: int = 90

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def chat_enabled(self) -> bool:
        """Check if chat features are enabled (TASKFLOW_CHATKIT_DATABASE_URL set)."""
        return os.getenv("TASKFLOW_CHATKIT_DATABASE_URL") is not None


settings = Settings()
