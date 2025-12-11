"""Audit API schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class AuditRead(BaseModel):
    """Schema for audit log response."""

    id: int
    entity_type: str
    entity_id: int
    action: str
    actor_id: int
    actor_handle: str | None = None
    actor_type: Literal["human", "agent"]
    details: dict[str, Any]
    created_at: datetime
