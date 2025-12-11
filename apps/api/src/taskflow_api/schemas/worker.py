"""Worker API schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    """Schema for registering a global agent."""

    handle: str = Field(
        pattern=r"^@[a-z0-9_-]+$",
        max_length=50,
        description="Unique handle starting with @",
    )
    name: str = Field(max_length=200, description="Display name")
    agent_type: Literal["claude", "qwen", "gemini", "custom"] = Field(
        description="Type of agent",
    )
    capabilities: list[str] = Field(
        default_factory=list,
        description="Agent capabilities",
    )


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""

    name: str | None = None
    agent_type: Literal["claude", "qwen", "gemini", "custom"] | None = None
    capabilities: list[str] | None = None


class WorkerRead(BaseModel):
    """Schema for worker response."""

    id: int
    handle: str
    name: str
    type: Literal["human", "agent"]
    user_id: str | None = None
    agent_type: Literal["claude", "qwen", "gemini", "custom"] | None = None
    capabilities: list[str] = []
    created_at: datetime


class HumanWorkerCreate(BaseModel):
    """Internal schema for creating human worker from SSO profile."""

    user_id: str
    email: str
    name: str | None = None

    @property
    def derived_handle(self) -> str:
        """Derive handle from email."""
        local_part = self.email.split("@")[0]
        # Replace dots and other chars with hyphens
        handle = local_part.lower().replace(".", "-").replace("_", "-")
        return f"@{handle}"
