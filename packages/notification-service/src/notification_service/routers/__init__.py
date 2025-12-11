"""Notification service routers."""

from .dapr import router as dapr_router
from .notifications import router as notifications_router

__all__ = ["dapr_router", "notifications_router"]
