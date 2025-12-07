"""Project and ProjectMember models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .task import Task
    from .worker import Worker


class Project(SQLModel, table=True):
    """A project containing tasks and members."""

    __tablename__ = "project"

    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(
        unique=True,
        index=True,
        max_length=100,
        regex=r"^[a-z0-9-]+$",
        description="Unique project identifier (lowercase, numbers, hyphens)",
    )
    name: str = Field(max_length=200, description="Human-readable project name")
    description: str | None = Field(default=None, description="Optional project description")
    owner_id: str = Field(index=True, description="SSO user ID of project owner")
    is_default: bool = Field(
        default=False,
        description="True for auto-created Default project",
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    members: list["ProjectMember"] = Relationship(back_populates="project")
    tasks: list["Task"] = Relationship(back_populates="project")


class ProjectMember(SQLModel, table=True):
    """Link table connecting workers to projects."""

    __tablename__ = "project_member"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    worker_id: int = Field(foreign_key="worker.id", index=True)
    role: str = Field(
        default="member",
        description="Member role: owner or member",
    )
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Project = Relationship(back_populates="members")
    worker: "Worker" = Relationship(back_populates="memberships")
