"""Project API schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a project."""

    slug: str = Field(
        pattern=r"^[a-z0-9-]+$",
        max_length=100,
        description="Unique project identifier",
    )
    name: str = Field(max_length=200, description="Human-readable name")
    description: str | None = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: str | None = None
    description: str | None = None


class ProjectRead(BaseModel):
    """Schema for project response."""

    id: int
    slug: str
    name: str
    description: str | None
    owner_id: str
    is_default: bool
    member_count: int = 0
    task_count: int = 0
    created_at: datetime
    updated_at: datetime


class MemberCreate(BaseModel):
    """Schema for adding a member to a project."""

    user_id: str | None = Field(
        default=None,
        description="SSO user ID (for adding humans)",
    )
    agent_id: int | None = Field(
        default=None,
        description="Agent worker ID (for linking existing agents)",
    )


class MemberRead(BaseModel):
    """Schema for member response."""

    id: int
    worker_id: int
    handle: str
    name: str
    type: Literal["human", "agent"]
    role: Literal["owner", "member"]
    joined_at: datetime
