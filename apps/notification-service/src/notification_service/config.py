"""Configuration for Notification Service."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Notification service settings from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database - SEPARATE from main TaskFlow DB
    database_url: str

    # SSO configuration (for JWT verification)
    sso_url: str = "http://localhost:3001"

    # Dev mode (bypass JWT verification for local dev)
    dev_mode: bool = False

    # Dapr configuration
    dapr_http_endpoint: str = "http://localhost:3500"
    dapr_pubsub_name: str = "taskflow-pubsub"
    dapr_app_id: str = "notification-service"

    # Service configuration
    debug: bool = False
    log_level: str = "INFO"

    # CORS (for direct API access if needed)
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
