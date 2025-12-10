# PRD: Agent 2B - Notifications & Dapr Integration

**Phase**: V (Advanced Cloud Deployment)  
**Owner**: Agent 2B  
**Estimated Time**: 60 minutes  
**Priority**: HIGH (Hackathon requirement)  
**Dependency**: Agent 2A completed (recurring task fields exist)

---

## Executive Summary

Agent 2B implements **Event-Driven Notifications** using Dapr:
- Event publishing from API when tasks change
- Notification service that stores and serves notifications
- Reminder system via Dapr cron
- Frontend notification bell

### Success Criteria

- [ ] Events published via Dapr on task CRUD
- [ ] Notification service receives and stores events
- [ ] Cron triggers reminder checks every 5 minutes
- [ ] Tasks due within 24h trigger reminder notifications
- [ ] Frontend bell shows unread count
- [ ] Dapr sidecars running (2/2 containers)
- [ ] If notification service fails, API continues working

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KUBERNETES CLUSTER                                │
│                                                                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐│
│  │         API SERVICE POD         │    │    NOTIFICATION SERVICE POD     ││
│  │  ┌───────────┐  ┌────────────┐  │    │  ┌───────────┐  ┌────────────┐ ││
│  │  │ TaskFlow  │  │   Dapr     │  │    │  │ Notif     │  │   Dapr     │ ││
│  │  │   API     │◀─┼─▶ Sidecar  │──┼────┼─▶│  Service  │◀─┼─▶ Sidecar  │ ││
│  │  │           │  │   :3500    │  │    │  │           │  │   :3500    │ ││
│  │  └───────────┘  └────────────┘  │    │  └───────────┘  └────────────┘ ││
│  └─────────────────────────────────┘    └─────────────────────────────────┘│
│                         │                              ▲                    │
│                         │        ┌─────────────┐       │                    │
│                         └───────▶│ Dapr Pubsub │───────┘                    │
│                                  │   (Redis)   │                            │
│                                  └─────────────┘                            │
│                                         ▲                                   │
│                         ┌───────────────┴───────────────┐                  │
│                         │        Dapr Cron Binding      │                  │
│                         │     (triggers every 5 min)    │                  │
│                         └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Event Types

| Event | Trigger | Recipient | Purpose |
|-------|---------|-----------|---------|
| `task.assigned` | Task assigned | Assignee | "You have new work" |
| `task.completed` | Task completed | Creator | "Task is done" |
| `task.reminder` | Cron (due soon) | Assignee | "Due in X hours" |

### Event Payload

```json
{
  "type": "task.assigned",
  "task_id": 42,
  "task_title": "Fix bug #123",
  "project_id": 1,
  "user_id": "recipient-sso-id",
  "actor_id": "actor-sso-id",
  "actor_name": "Sarah",
  "metadata": {
    "due_date": "2025-12-15T10:00:00Z"
  }
}
```

---

## 3. Implementation

### 3.1 Event Service (API)

**File**: `packages/api/src/taskflow_api/services/events.py` (NEW)

```python
"""Event publishing service using Dapr pubsub."""

import logging
from typing import Any

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

DAPR_URL = "http://localhost:3500"
PUBSUB_NAME = "taskflow-pubsub"


async def publish_event(topic: str, payload: dict[str, Any]) -> bool:
    """Publish event via Dapr pubsub.
    
    NON-BLOCKING: If Dapr unavailable, logs warning and returns False.
    The main application flow continues regardless.
    
    Args:
        topic: Event topic (e.g., "task.assigned")
        payload: Event data including user_id for recipient
        
    Returns:
        True if published successfully, False otherwise
    """
    # Skip in dev mode without Dapr
    if settings.dev_mode and not getattr(settings, 'dapr_enabled', False):
        logger.info("[EVENT] Dev mode, Dapr disabled. Would publish %s: %s", 
                   topic, payload.get("task_title", ""))
        return True
    
    url = f"{DAPR_URL}/v1.0/publish/{PUBSUB_NAME}/{topic}"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info("[EVENT] Published %s for task %s", topic, payload.get("task_id"))
            return True
    except httpx.TimeoutException:
        logger.warning("[EVENT] Timeout publishing %s - continuing without notification", topic)
        return False
    except httpx.HTTPError as e:
        logger.warning("[EVENT] HTTP error publishing %s: %s - continuing", topic, str(e))
        return False
    except Exception as e:
        logger.error("[EVENT] Unexpected error publishing %s: %s - continuing", topic, str(e))
        return False
```

**File**: `packages/api/src/taskflow_api/config.py` (ADD)

```python
# Add to Settings class:
dapr_enabled: bool = False  # Set True in K8s deployment
```

### 3.2 Wire Events to Task CRUD

**File**: `packages/api/src/taskflow_api/routers/tasks.py` (MODIFY)

```python
# Add import at top
from ..services.events import publish_event

# In assign_task(), after session.commit():
async def assign_task(...):
    # ... existing code ...
    
    await session.commit()
    await session.refresh(task)
    
    # NEW: Publish event (non-blocking)
    if assignee.user_id:  # Only notify humans
        await publish_event("task.assigned", {
            "type": "task.assigned",
            "task_id": task_id,
            "task_title": task.title,
            "project_id": task.project_id,
            "user_id": assignee.user_id,
            "actor_id": user.id,
            "actor_name": worker.name,
            "metadata": {
                "due_date": task.due_date.isoformat() if task.due_date else None,
            }
        })
    
    return task_to_read(task, assignee)


# In update_status() when completing:
async def update_status(...):
    # ... existing code ...
    
    elif data.status == "completed":
        task.completed_at = datetime.utcnow()
        task.progress_percent = 100
        
        # Existing: Handle recurring task
        if task.is_recurring and task.recurrence_pattern:
            await create_next_occurrence(session, task, worker_id, worker_type)
        
        # NEW: Publish completion event
        # Get creator's user_id
        creator = await session.get(Worker, task.created_by_id)
        if creator and creator.user_id and creator.user_id != user.id:
            await publish_event("task.completed", {
                "type": "task.completed",
                "task_id": task_id,
                "task_title": task.title,
                "project_id": task.project_id,
                "user_id": creator.user_id,
                "actor_id": user.id,
                "actor_name": worker.name,
            })
```

### 3.3 Cron Handler for Reminders

**File**: `packages/api/src/taskflow_api/routers/dapr.py` (NEW)

```python
"""Dapr integration - cron handler for reminders."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..database import get_session
from ..models.task import Task
from ..models.worker import Worker
from ..services.events import publish_event

router = APIRouter(prefix="/dapr", tags=["Dapr"])

REMINDER_HOURS = 24  # Send reminder when due within 24 hours


@router.post("/cron")
async def handle_cron(session: AsyncSession = Depends(get_session)) -> dict:
    """Called by Dapr cron binding every 5 minutes.
    
    Checks for tasks due soon and publishes reminder events.
    """
    now = datetime.utcnow()
    reminder_threshold = now + timedelta(hours=REMINDER_HOURS)
    
    results = {"reminders_sent": 0, "errors": 0}
    
    # Find tasks due soon that haven't been reminded
    stmt = select(Task).where(
        Task.due_date.isnot(None),
        Task.due_date <= reminder_threshold,
        Task.due_date > now,  # Not overdue yet
        Task.status.notin_(["completed", "cancelled"]),
        Task.reminder_sent == False,
        Task.assignee_id.isnot(None),
    )
    
    result = await session.exec(stmt)
    tasks = result.all()
    
    for task in tasks:
        try:
            # Get assignee's user_id
            assignee = await session.get(Worker, task.assignee_id)
            if not assignee or not assignee.user_id:
                continue
            
            # Calculate hours until due
            hours_until = (task.due_date - now).total_seconds() / 3600
            
            # Publish reminder event
            success = await publish_event("task.reminder", {
                "type": "task.reminder",
                "task_id": task.id,
                "task_title": task.title,
                "project_id": task.project_id,
                "user_id": assignee.user_id,
                "metadata": {
                    "due_date": task.due_date.isoformat(),
                    "hours_until_due": int(hours_until),
                }
            })
            
            if success:
                task.reminder_sent = True
                session.add(task)
                results["reminders_sent"] += 1
                
        except Exception as e:
            results["errors"] += 1
    
    await session.commit()
    
    return {"status": "ok", **results}


@router.get("/health")
async def dapr_health():
    """Health check for Dapr sidecar."""
    return {"status": "healthy", "component": "dapr-integration"}
```

**Register in main.py**:

```python
from .routers import dapr

app.include_router(dapr.router)
```

### 3.4 Notification Service

**Structure**:
```
packages/notification-service/
├── src/notification_service/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   └── routers/
│       ├── __init__.py
│       ├── dapr.py
│       └── notifications.py
├── Dockerfile
├── pyproject.toml
└── README.md
```

**File**: `packages/notification-service/src/notification_service/models.py`

```python
from datetime import datetime
from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    """User notification - stores all notification types."""
    
    __tablename__ = "notification"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    
    type: str  # task.assigned, task.reminder, task.completed
    title: str = Field(max_length=200)
    body: str | None = Field(default=None, max_length=500)
    
    task_id: int | None = None
    project_id: int | None = None
    actor_id: str | None = None
    
    read: bool = Field(default=False)
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**File**: `packages/notification-service/src/notification_service/routers/dapr.py`

```python
"""Dapr subscription endpoint."""

import logging
from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from ..database import get_session
from ..models import Notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dapr", tags=["Dapr"])


@router.get("/subscribe")
async def subscribe():
    """Dapr subscription configuration."""
    return [
        {"pubsubname": "taskflow-pubsub", "topic": "task.assigned", "route": "/dapr/events"},
        {"pubsubname": "taskflow-pubsub", "topic": "task.reminder", "route": "/dapr/events"},
        {"pubsubname": "taskflow-pubsub", "topic": "task.completed", "route": "/dapr/events"},
    ]


@router.post("/events")
async def handle_event(request: Request, session: AsyncSession = Depends(get_session)):
    """Handle incoming events from Dapr."""
    try:
        event = await request.json()
        event_type = event.get("type")
        user_id = event.get("user_id")
        
        if not user_id:
            return {"status": "skipped", "reason": "no user_id"}
        
        # Generate notification content
        title, body = _generate_content(event)
        
        # Store notification
        notification = Notification(
            user_id=user_id,
            type=event_type,
            title=title,
            body=body,
            task_id=event.get("task_id"),
            project_id=event.get("project_id"),
            actor_id=event.get("actor_id"),
        )
        session.add(notification)
        await session.commit()
        
        logger.info("[NOTIFICATION] Stored: %s for %s", title, user_id)
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("[NOTIFICATION] Error: %s", str(e))
        return {"status": "error"}


def _generate_content(event: dict) -> tuple[str, str]:
    """Generate notification title and body."""
    event_type = event.get("type")
    task_title = event.get("task_title", "Task")
    actor_name = event.get("actor_name", "Someone")
    metadata = event.get("metadata", {})
    
    if event_type == "task.assigned":
        return (
            "Task assigned to you",
            f"{actor_name} assigned '{task_title}'"
        )
    elif event_type == "task.reminder":
        hours = metadata.get("hours_until_due", 24)
        return (
            f"Task due in {hours} hours",
            f"'{task_title}' is due soon"
        )
    elif event_type == "task.completed":
        return (
            "Task completed",
            f"'{task_title}' was completed by {actor_name}"
        )
    return ("Notification", task_title)
```

**File**: `packages/notification-service/src/notification_service/routers/notifications.py`

```python
"""User-facing notification API."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from ..database import get_session
from ..models import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(
    user_id: str = Query(...),
    unread_only: bool = False,
    limit: int = Query(default=20, le=100),
    session: AsyncSession = Depends(get_session),
):
    """List notifications for a user."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    
    result = await session.exec(stmt)
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "task_id": n.task_id,
            "read": n.read,
            "created_at": n.created_at.isoformat(),
        }
        for n in result.all()
    ]


@router.get("/unread-count")
async def unread_count(
    user_id: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    """Get unread notification count."""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.read == False,
    )
    result = await session.exec(stmt)
    return {"count": result.one()}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Mark notification as read."""
    notification = await session.get(Notification, notification_id)
    if notification:
        notification.read = True
        notification.read_at = datetime.utcnow()
        await session.commit()
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_read(
    user_id: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    """Mark all as read for user."""
    stmt = select(Notification).where(
        Notification.user_id == user_id,
        Notification.read == False,
    )
    result = await session.exec(stmt)
    count = 0
    for n in result.all():
        n.read = True
        n.read_at = datetime.utcnow()
        count += 1
    await session.commit()
    return {"status": "ok", "marked": count}
```

### 3.5 Helm Charts

**File**: `helm/taskflow/templates/dapr/pubsub.yaml`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
  namespace: {{ .Release.Namespace }}
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "{{ .Values.redis.host | default "redis" }}:{{ .Values.redis.port | default "6379" }}"
```

**File**: `helm/taskflow/templates/dapr/cron-binding.yaml`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-cron
  namespace: {{ .Release.Namespace }}
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "*/5 * * * *"
    - name: direction
      value: "input"
scopes:
  - taskflow-api
```

**Update**: `helm/taskflow/templates/api/deployment.yaml` (add annotations)

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "taskflow-api"
        dapr.io/app-port: "8000"
```

### 3.6 Frontend Bell

**File**: `web-dashboard/src/components/NotificationBell.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  task_id: number | null;
  read: boolean;
  created_at: string;
}

const NOTIFICATION_URL = process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:8001";

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${NOTIFICATION_URL}/api/notifications?user_id=${userId}&limit=10`);
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch (e) {
      console.error("Failed to fetch notifications");
    }
  };

  const markRead = async (id: number) => {
    await fetch(`${NOTIFICATION_URL}/api/notifications/${id}/read`, { method: "PATCH" });
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const getIcon = (type: string) => {
    if (type === "task.reminder") return "⏰";
    if (type === "task.assigned") return "📋";
    if (type === "task.completed") return "✅";
    return "🔔";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b font-semibold">Notifications</div>
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} className={`p-3 ${!n.read ? "bg-muted/50" : ""}`} onClick={() => markRead(n.id)}>
              <span className="mr-2">{getIcon(n.type)}</span>
              <div className="flex-1">
                <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
              {n.task_id && (
                <Link href={`/tasks/${n.task_id}`} className="text-xs text-primary" onClick={(e) => e.stopPropagation()}>
                  View
                </Link>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 4. Implementation Checklist

### Phase 1: Event Service (15 min)
- [ ] Create `services/events.py`
- [ ] Add `dapr_enabled` to config
- [ ] Test publish_event with logging

### Phase 2: Wire Events (10 min)
- [ ] Add event publishing to `assign_task()`
- [ ] Add event publishing to `update_status()` completion
- [ ] Verify non-blocking behavior

### Phase 3: Cron Handler (10 min)
- [ ] Create `routers/dapr.py`
- [ ] Implement reminder check logic
- [ ] Register in `main.py`

### Phase 4: Notification Service (20 min)
- [ ] Create package structure
- [ ] Implement models
- [ ] Implement Dapr subscription
- [ ] Implement notifications API
- [ ] Create Dockerfile

### Phase 5: Helm Charts (10 min)
- [ ] Create `dapr/pubsub.yaml`
- [ ] Create `dapr/cron-binding.yaml`
- [ ] Update API deployment
- [ ] Create notification service deployment

### Phase 6: Frontend (10 min)
- [ ] Create NotificationBell component
- [ ] Add to navbar
- [ ] Test polling

---

## 5. Testing

```bash
# Manual trigger cron
curl -X POST "http://localhost:8000/dapr/cron"

# Check notifications
curl "http://localhost:8001/api/notifications?user_id=test-user"

# Verify Dapr pods
kubectl get pods  # Should show 2/2 for API and notification service
```

---

## 6. Definition of Done

- [ ] Events publish via Dapr (or log in dev mode)
- [ ] Cron handler sends reminders for tasks due soon
- [ ] Notification service stores notifications
- [ ] Frontend bell shows unread count
- [ ] Dapr sidecars running (2/2)
- [ ] API continues if notification service down
- [ ] Demo: Assign task → notification appears
- [ ] Demo: Task due soon → reminder notification

