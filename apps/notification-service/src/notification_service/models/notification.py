"""Notification model - stored in notification service's own database."""

from datetime import datetime
from typing import Literal

from sqlmodel import Field, SQLModel


NotificationType = Literal[
    "task_assigned",
    "task_completed",
    "task_spawned",
    "task_reminder",
    "task_created",
    "task_updated",
    "task_deleted",
]


class Notification(SQLModel, table=True):
    """Notification stored in notification service database.

    This is the ONLY table in this service's database.
    Each microservice owns its data - no shared DB.
    """

    __tablename__ = "notification"

    id: int | None = Field(default=None, primary_key=True)

    # Who receives this notification
    user_id: str = Field(index=True, description="SSO user ID of recipient")
    user_type: str = Field(default="human", description="human or agent")

    # Notification content
    type: str = Field(description="Notification type (task_assigned, task_reminder, etc.)")
    title: str = Field(max_length=200)
    body: str | None = Field(default=None, max_length=500)

    # Link back to task (optional)
    task_id: int | None = Field(default=None, index=True)
    project_id: int | None = Field(default=None)

    # State
    read: bool = Field(default=False, index=True)

    # Metadata from event
    actor_id: str | None = Field(default=None, description="Who triggered this notification")
    actor_name: str | None = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: datetime | None = Field(default=None)


class NotificationRead(SQLModel):
    """Response schema for notification."""

    id: int
    user_id: str
    type: str
    title: str
    body: str | None
    task_id: int | None
    project_id: int | None
    read: bool
    actor_name: str | None
    created_at: datetime


class NotificationUpdate(SQLModel):
    """Request schema for updating notification."""

    read: bool
