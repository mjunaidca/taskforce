"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
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

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
