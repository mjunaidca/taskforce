"""Notification API endpoints.

These endpoints are called by the frontend to fetch/manage notifications.
Uses JWT auth - same pattern as TaskFlow API.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_session
from ..models.notification import Notification, NotificationRead, NotificationUpdate

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_notifications(
    user: CurrentUser = Depends(get_current_user),
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationRead]:
    """List notifications for the current user.

    Uses JWT auth to identify user - no query param needed.
    """
    # Use SSO user ID to find notifications
    # Notifications are stored with user_id = SSO sub claim
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if unread_only:
        stmt = stmt.where(Notification.read == False)  # noqa: E712

    result = await session.exec(stmt)
    notifications = result.all()

    return [
        NotificationRead(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            title=n.title,
            body=n.body,
            task_id=n.task_id,
            project_id=n.project_id,
            read=n.read,
            actor_name=n.actor_name,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get count of unread notifications."""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user.id,
        Notification.read == False,  # noqa: E712
    )

    result = await session.exec(stmt)
    count = result.one() or 0

    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_read(
    notification_id: int,
    update: NotificationUpdate,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationRead:
    """Mark a notification as read or unread."""
    notification = await session.get(Notification, notification_id)

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    notification.read = update.read
    notification.read_at = datetime.utcnow() if update.read else None
    session.add(notification)
    await session.commit()
    await session.refresh(notification)

    return NotificationRead(
        id=notification.id,
        user_id=notification.user_id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        task_id=notification.task_id,
        project_id=notification.project_id,
        read=notification.read,
        actor_name=notification.actor_name,
        created_at=notification.created_at,
    )


@router.post("/mark-all-read")
async def mark_all_read(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Mark all notifications as read for current user."""
    stmt = select(Notification).where(
        Notification.user_id == user.id,
        Notification.read == False,  # noqa: E712
    )

    result = await session.exec(stmt)
    notifications = result.all()

    now = datetime.utcnow()
    for notification in notifications:
        notification.read = True
        notification.read_at = now
        session.add(notification)

    await session.commit()

    return {"updated": len(notifications)}
