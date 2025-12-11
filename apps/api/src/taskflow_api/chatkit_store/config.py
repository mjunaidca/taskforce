"""Configuration for TaskFlow ChatKit store."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class StoreConfig(BaseSettings):
    """
    PostgreSQL Store configuration for TaskFlow ChatKit.

    All settings can be overridden via environment variables with the
    TASKFLOW_CHATKIT_ prefix (e.g., TASKFLOW_CHATKIT_DATABASE_URL).
    """

    model_config = SettingsConfigDict(
        env_prefix="TASKFLOW_CHATKIT_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database connection
    database_url: str = Field(
        ...,
        description="PostgreSQL connection URL (postgresql+asyncpg://user:pass@host:port/db)",
    )

    # Connection pool settings
    pool_size: int = Field(
        default=20,
        description="Maximum number of connections in the pool",
        ge=1,
        le=100,
    )

    max_overflow: int = Field(
        default=10,
        description="Maximum overflow connections beyond pool_size",
        ge=0,
        le=50,
    )

    pool_timeout: float = Field(
        default=30.0,
        description="Seconds to wait before timing out on getting a connection",
        gt=0,
    )

    pool_recycle: int = Field(
        default=3600, description="Seconds after which connections are recycled", ge=300
    )

    # Query settings
    statement_timeout: int = Field(
        default=30000, description="Statement timeout in milliseconds", ge=1000
    )

    # Schema - use taskflow_chat to isolate from main taskflow schema
    schema_name: str = Field(default="taskflow_chat", description="Database schema name for tables")

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Ensure database URL uses asyncpg driver and fix SSL parameters."""
        if not v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            raise ValueError("database_url must start with postgresql:// or postgresql+asyncpg://")

        # Convert to asyncpg if needed
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Fix SSL parameters for asyncpg
        if "sslmode=require" in v:
            v = v.replace("sslmode=require", "ssl=require")
        elif "sslmode=prefer" in v:
            v = v.replace("sslmode=prefer", "ssl=prefer")
        elif "sslmode=allow" in v:
            v = v.replace("sslmode=allow", "ssl=allow")
        elif "sslmode=disable" in v:
            v = v.replace("sslmode=disable", "ssl=disable")

        return v
