# PRD: Agent 2B - Notifications, Reminders & Dapr Integration

**Phase**: V (Advanced Cloud Deployment)  
**Owner**: Agent 2B  
**Estimated Time**: 60-75 minutes  
**Priority**: HIGH (Hackathon requirement)  
**Dependency**: Agent 2A completed (recurring task fields and spawn-on-completion logic exist)

---

## Executive Summary

Agent 2B implements the **Event-Driven Architecture layer** on top of Agent 2A's recurring tasks:

1. **On Due Date Trigger** - Spawn next recurring task when due date passes (fixes silent failure bug!)
2. **Reminders** - Notify users when tasks are due soon
3. **Activity Notifications** - Notify on task assignment, completion, spawn
4. **Dapr Integration** - Event publishing via pub/sub

### What Agent 2A Built (7 Database Fields)

| Field | Type | Status |
|-------|------|--------|
| `is_recurring` | bool | ✅ Works |
| `recurrence_pattern` | str | ✅ 9 patterns (1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly) |
| `max_occurrences` | int | ✅ Spawn limits via COUNT query |
| `recurring_root_id` | FK | ✅ Chain tracking (⚠️ needs index!) |
| `recurrence_trigger` | str | ⚠️ **PARTIAL** - only `on_complete` works |
| `clone_subtasks_on_recur` | bool | ✅ Optional subtask cloning |
| `has_spawned_next` | bool | ✅ Duplicate prevention |

### Critical Bug to Fix

**`recurrence_trigger` accepts values that don't work:**
- `on_complete` ✅ Implemented by Agent 2A
- `on_due_date` ❌ **Silently fails - Agent 2B must implement**
- `both` ❌ **Silently fails - Agent 2B must implement**

Users can currently set `on_due_date` and nothing happens!

### Success Criteria

- [ ] `on_due_date` trigger works (cron spawns next occurrence when due date passes)
- [ ] Tasks due within 24h trigger reminder notifications
- [ ] Task assignment triggers notification to assignee
- [ ] Notification bell shows unread count in frontend
- [ ] Events publish via Dapr (Redis pub/sub)
- [ ] Dapr sidecars running (2/2 containers per pod)
- [ ] API continues if notification service down (non-blocking)

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
│  │  │ - CRUD    │  │            │  │    │  │ - Store   │  │            │ ││
│  │  │ - Cron    │  │            │  │    │  │ - API     │  │            │ ││
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
│                         │     (triggers every 1 min)    │                  │
│                         └───────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. What Agent 2B Builds

### 2.1 On Due Date Spawn Trigger (Cron)

Agent 2A added a `spawn_trigger` field with options:
- `on_completion` ← Already works (Agent 2A)
- `on_due_date` ← **Agent 2B implements via cron**
- `both` ← Works when either trigger fires

**Cron Logic**:
```python
# Every 1 minute, check for recurring tasks where:
# - spawn_trigger IN ('on_due_date', 'both')
# - due_date has passed
# - status != 'completed' (not already handled by completion trigger)
# - hasn't already spawned for this due date

# For each matching task:
# 1. Create next occurrence (same as completion spawn logic)
# 2. Optionally clone subtasks
# 3. Mark original as "spawned" or update tracking field
```

### 2.2 Reminder Notifications

**When**: Task due within 24 hours (configurable)  
**Who**: Task assignee  
**What**: Notification saying "Task X due in Y hours"

**Cron Logic**:
```python
# Every 5 minutes, check for tasks where:
# - due_date is within 24 hours from now
# - due_date > now (not yet overdue)
# - reminder_sent = False
# - status NOT IN ('completed', 'cancelled')
# - has assignee

# For each matching task:
# 1. Publish task.reminder event
# 2. Set reminder_sent = True
```

### 2.3 Activity Notifications

| Event | Trigger | Recipient |
|-------|---------|-----------|
| `task.assigned` | Task assigned to someone | Assignee |
| `task.completed` | Task marked complete | Creator (if different from completer) |
| `task.spawned` | Recurring task spawned new occurrence | Assignee of new task |

### 2.4 Event Payload Schema

```json
{
  "type": "task.reminder",
  "task_id": 42,
  "task_title": "Weekly Standup",
  "project_id": 1,
  "user_id": "recipient-sso-user-id",
  "actor_id": "system",
  "metadata": {
    "due_date": "2025-12-15T09:00:00Z",
    "hours_until_due": 24,
    "is_recurring": true,
    "recurrence_pattern": "weekly"
  }
}
```

---

## 3. Model Additions

### 3.1 Add `reminder_sent` Field (If Not Present)

**File**: `packages/api/src/taskflow_api/models/task.py`

```python
# Add if not present:
reminder_sent: bool = Field(
    default=False,
    description="Whether reminder was sent for current due date",
)
```

### 3.2 Fields Agent 2A Created (Verify These Exist)

```python
# These should already exist from Agent 2A:
is_recurring: bool = Field(default=False)
recurrence_pattern: str | None = Field(default=None)  # 1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly
max_occurrences: int | None = Field(default=None)
recurring_root_id: int | None = Field(default=None, foreign_key="task.id")  # ⚠️ Add index=True!
recurrence_trigger: str = Field(default="on_complete")  # on_complete, on_due_date, both
clone_subtasks_on_recur: bool = Field(default=False)
has_spawned_next: bool = Field(default=False)
```

### 3.3 Add Missing Index (P0 Fix)

```python
# FIX: Add index for performance
recurring_root_id: int | None = Field(
    default=None,
    foreign_key="task.id",
    index=True,  # ← ADD THIS
)
```

---

## 4. Implementation

### 4.1 Event Service

**File**: `packages/api/src/taskflow_api/services/events.py` (NEW)

```python
"""Event publishing via Dapr pub/sub - non-blocking."""

import logging
from typing import Any
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

DAPR_URL = "http://localhost:3500"
PUBSUB_NAME = "taskflow-pubsub"


async def publish_event(topic: str, payload: dict[str, Any]) -> bool:
    """Publish event via Dapr. Non-blocking - failures don't crash the app."""
    
    # Dev mode without Dapr
    if not getattr(settings, 'dapr_enabled', False):
        logger.info("[EVENT] Would publish %s: %s", topic, payload.get("task_title", ""))
        return True
    
    url = f"{DAPR_URL}/v1.0/publish/{PUBSUB_NAME}/{topic}"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info("[EVENT] Published %s for task %s", topic, payload.get("task_id"))
            return True
    except Exception as e:
        logger.warning("[EVENT] Failed to publish %s: %s (continuing)", topic, e)
        return False
```

### 4.2 Cron Handler

**File**: `packages/api/src/taskflow_api/routers/dapr.py` (NEW)

```python
"""Dapr cron handler - recurring spawns and reminders."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..database import get_session
from ..models.task import Task
from ..models.worker import Worker
from ..services.events import publish_event
from ..services.audit import log_action

router = APIRouter(prefix="/dapr", tags=["Dapr"])

REMINDER_HOURS = 24


@router.post("/cron")
async def handle_cron(session: AsyncSession = Depends(get_session)) -> dict:
    """Called by Dapr cron every minute. Handles:
    1. On-due-date recurring task spawns
    2. Reminder notifications for tasks due soon
    """
    now = datetime.utcnow()
    results = {"spawned": 0, "reminders": 0}
    
    # ========================================
    # 1. ON DUE DATE RECURRING SPAWN
    # ========================================
    # Find recurring tasks where:
    # - recurrence_trigger is 'on_due_date' or 'both'
    # - due_date has passed
    # - not yet spawned (has_spawned_next = False)
    # - not completed (on_complete handles those)
    
    spawn_stmt = select(Task).where(
        Task.is_recurring == True,
        Task.recurrence_trigger.in_(["on_due_date", "both"]),
        Task.due_date.isnot(None),
        Task.due_date <= now,
        Task.status != "completed",  # Completion spawn handled by Agent 2A
        Task.has_spawned_next == False,  # Haven't spawned yet
    )
    
    spawn_result = await session.exec(spawn_stmt)
    for task in spawn_result.all():
        try:
            # Check max_occurrences limit (reuse Agent 2A's get_spawn_count logic)
            if task.max_occurrences:
                root_id = task.recurring_root_id or task.id
                count_stmt = select(func.count(Task.id)).where(Task.recurring_root_id == root_id)
                count_result = await session.exec(count_stmt)
                spawn_count = count_result.one()
                if spawn_count >= task.max_occurrences:
                    continue  # Limit reached, don't spawn
            
            # Calculate next due date
            next_due = calculate_next_due(task.recurrence_pattern, task.due_date)
            
            # Create next occurrence (mirrors Agent 2A's create_next_occurrence)
            new_task = Task(
                title=task.title,
                description=task.description,
                project_id=task.project_id,
                assignee_id=task.assignee_id,
                created_by_id=task.created_by_id,
                priority=task.priority,
                tags=task.tags.copy() if task.tags else [],
                due_date=next_due,
                is_recurring=True,
                recurrence_pattern=task.recurrence_pattern,
                recurrence_trigger=task.recurrence_trigger,
                max_occurrences=task.max_occurrences,
                recurring_root_id=task.recurring_root_id or task.id,
                clone_subtasks_on_recur=task.clone_subtasks_on_recur,
                has_spawned_next=False,
            )
            session.add(new_task)
            await session.flush()  # Get new_task.id
            
            # Mark original so we don't spawn again
            task.has_spawned_next = True
            session.add(task)
            
            # Clone subtasks if enabled (reuse Agent 2A's logic)
            if task.clone_subtasks_on_recur:
                await clone_subtasks_recursive(session, task.id, new_task.id, task.created_by_id)
            
            # Audit log
            await log_action(
                session,
                entity_type="task",
                entity_id=new_task.id,
                action="spawned_on_due_date",
                actor_id=task.created_by_id,
                actor_type="system",
                details={"from_task": task.id, "pattern": task.recurrence_pattern, "trigger": "on_due_date"},
            )
            
            # Publish notification event
            if task.assignee_id:
                assignee = await session.get(Worker, task.assignee_id)
                if assignee and assignee.user_id:
                    await publish_event("task.spawned", {
                        "type": "task.spawned",
                        "task_id": new_task.id,
                        "task_title": new_task.title,
                        "project_id": new_task.project_id,
                        "user_id": assignee.user_id,
                        "metadata": {"spawned_from": task.id, "trigger": "on_due_date"}
                    })
            
            results["spawned"] += 1
            
        except Exception as e:
            logger.error("[CRON] Spawn error for task %s: %s", task.id, e)
    
    # ========================================
    # 2. REMINDERS
    # ========================================
    reminder_threshold = now + timedelta(hours=REMINDER_HOURS)
    
    reminder_stmt = select(Task).where(
        Task.due_date.isnot(None),
        Task.due_date <= reminder_threshold,
        Task.due_date > now,
        Task.status.notin_(["completed", "cancelled"]),
        Task.reminder_sent == False,
        Task.assignee_id.isnot(None),
    )
    
    reminder_result = await session.exec(reminder_stmt)
    for task in reminder_result.all():
        try:
            assignee = await session.get(Worker, task.assignee_id)
            if not assignee or not assignee.user_id:
                continue
            
            hours_until = (task.due_date - now).total_seconds() / 3600
            
            await publish_event("task.reminder", {
                "type": "task.reminder",
                "task_id": task.id,
                "task_title": task.title,
                "project_id": task.project_id,
                "user_id": assignee.user_id,
                "metadata": {
                    "due_date": task.due_date.isoformat(),
                    "hours_until_due": int(hours_until),
                    "is_recurring": task.is_recurring,
                }
            })
            
            task.reminder_sent = True
            session.add(task)
            results["reminders"] += 1
            
        except Exception as e:
            logger.error("[CRON] Reminder error for task %s: %s", task.id, e)
    
    await session.commit()
    return {"status": "ok", **results}


def calculate_next_due(pattern: str, from_time: datetime) -> datetime:
    """Calculate next due date from recurrence pattern.
    
    Note: 'monthly' is 30 days, not calendar-accurate (documented behavior).
    """
    patterns = {
        "1m": timedelta(minutes=1),
        "5m": timedelta(minutes=5),
        "10m": timedelta(minutes=10),
        "15m": timedelta(minutes=15),
        "30m": timedelta(minutes=30),
        "1h": timedelta(hours=1),
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": timedelta(days=30),  # Simplified: 30 days, not calendar month
    }
    return from_time + patterns.get(pattern, timedelta(days=1))


async def clone_subtasks_recursive(
    session: AsyncSession,
    source_task_id: int,
    target_task_id: int,
    creator_id: int,
) -> None:
    """Clone subtasks from source task to target task.
    
    This should reuse Agent 2A's existing clone logic if available.
    Otherwise implement recursive cloning here.
    """
    # Check if Agent 2A exposed this as a reusable function
    # If not, implement:
    stmt = select(Task).where(Task.parent_task_id == source_task_id)
    result = await session.exec(stmt)
    for subtask in result.all():
        cloned = Task(
            title=subtask.title,
            description=subtask.description,
            project_id=subtask.project_id,
            parent_task_id=target_task_id,
            assignee_id=subtask.assignee_id,
            created_by_id=creator_id,
            priority=subtask.priority,
            tags=subtask.tags.copy() if subtask.tags else [],
            # Note: due_date kept as-is (documented behavior from Agent 2A)
            due_date=subtask.due_date,
        )
        session.add(cloned)
        await session.flush()
        # Recurse for nested subtasks
        await clone_subtasks_recursive(session, subtask.id, cloned.id, creator_id)
```

### 4.3 Wire Events to Task CRUD

**File**: `packages/api/src/taskflow_api/routers/tasks.py` (MODIFY)

```python
from ..services.events import publish_event

# In assign_task(), after commit:
if assignee.user_id:
    await publish_event("task.assigned", {
        "type": "task.assigned",
        "task_id": task_id,
        "task_title": task.title,
        "project_id": task.project_id,
        "user_id": assignee.user_id,
        "actor_id": user.id,
        "actor_name": worker.name,
    })

# In update_status() when completing:
if data.status == "completed":
    # ... existing completion logic ...
    
    # Notify creator if different from completer
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

### 4.4 Notification Service

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
│       ├── dapr.py          # Event subscription
│       └── notifications.py  # User API
├── Dockerfile
└── pyproject.toml
```

**File**: `packages/notification-service/src/notification_service/models.py`

```python
from datetime import datetime
from sqlmodel import Field, SQLModel

class Notification(SQLModel, table=True):
    __tablename__ = "notification"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    type: str  # task.assigned, task.reminder, task.completed, task.spawned
    title: str = Field(max_length=200)
    body: str | None = Field(default=None, max_length=500)
    task_id: int | None = None
    project_id: int | None = None
    read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**File**: `packages/notification-service/src/notification_service/routers/dapr.py`

```python
from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from ..database import get_session
from ..models import Notification

router = APIRouter(prefix="/dapr")

@router.get("/subscribe")
async def subscribe():
    return [
        {"pubsubname": "taskflow-pubsub", "topic": "task.assigned", "route": "/dapr/events"},
        {"pubsubname": "taskflow-pubsub", "topic": "task.reminder", "route": "/dapr/events"},
        {"pubsubname": "taskflow-pubsub", "topic": "task.completed", "route": "/dapr/events"},
        {"pubsubname": "taskflow-pubsub", "topic": "task.spawned", "route": "/dapr/events"},
    ]

@router.post("/events")
async def handle_event(request: Request, session: AsyncSession = Depends(get_session)):
    event = await request.json()
    user_id = event.get("user_id")
    if not user_id:
        return {"status": "skipped"}
    
    title, body = _generate_content(event)
    
    notification = Notification(
        user_id=user_id,
        type=event.get("type"),
        title=title,
        body=body,
        task_id=event.get("task_id"),
        project_id=event.get("project_id"),
    )
    session.add(notification)
    await session.commit()
    return {"status": "ok"}

def _generate_content(event: dict) -> tuple[str, str]:
    event_type = event.get("type")
    task_title = event.get("task_title", "Task")
    actor_name = event.get("actor_name", "Someone")
    metadata = event.get("metadata", {})
    
    if event_type == "task.assigned":
        return "Task assigned to you", f"{actor_name} assigned '{task_title}'"
    elif event_type == "task.reminder":
        hours = metadata.get("hours_until_due", 24)
        return f"Task due in {hours} hours", f"'{task_title}' is due soon"
    elif event_type == "task.completed":
        return "Task completed", f"'{task_title}' was completed"
    elif event_type == "task.spawned":
        return "Recurring task created", f"Next '{task_title}' is ready"
    return "Notification", task_title
```

**File**: `packages/notification-service/src/notification_service/routers/notifications.py`

```python
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from ..database import get_session
from ..models import Notification

router = APIRouter(prefix="/api/notifications")

@router.get("")
async def list_notifications(
    user_id: str = Query(...),
    unread_only: bool = False,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.read == False)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await session.exec(stmt)
    return [{"id": n.id, "type": n.type, "title": n.title, "body": n.body, 
             "task_id": n.task_id, "read": n.read, "created_at": n.created_at.isoformat()} 
            for n in result.all()]

@router.get("/unread-count")
async def unread_count(user_id: str = Query(...), session: AsyncSession = Depends(get_session)):
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id, Notification.read == False)
    result = await session.exec(stmt)
    return {"count": result.one()}

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: int, session: AsyncSession = Depends(get_session)):
    notification = await session.get(Notification, notification_id)
    if notification:
        notification.read = True
        await session.commit()
    return {"status": "ok"}
```

### 4.5 Helm Charts

**File**: `helm/taskflow/templates/dapr/pubsub.yaml`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

**File**: `helm/taskflow/templates/dapr/cron-binding.yaml`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-cron
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "*/1 * * * *"  # Every minute for on_due_date triggers
scopes:
  - taskflow-api
```

### 4.6 Frontend Notification Bell

**File**: `web-dashboard/src/components/NotificationBell.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Notification {
  id: number; type: string; title: string; body: string; task_id: number | null; read: boolean; created_at: string;
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
    } catch (e) { console.error("Failed to fetch notifications"); }
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
    if (type === "task.spawned") return "🔄";
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
            <DropdownMenuItem key={n.id} className={`p-3 cursor-pointer ${!n.read ? "bg-muted/50" : ""}`} onClick={() => markRead(n.id)}>
              <span className="mr-2 text-lg">{getIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.body}</p>
              </div>
              {n.task_id && (
                <Link href={`/tasks/${n.task_id}`} className="text-xs text-primary ml-2" onClick={(e) => e.stopPropagation()}>View</Link>
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

## 5. Implementation Checklist

### Phase 0: P0 Fixes (5 min)
- [ ] **Add index to `recurring_root_id`** - Performance critical!
- [ ] Add `reminder_sent` field to Task model (if not present)
- [ ] Run migration: `alembic revision --autogenerate -m "add recurring index and reminder_sent"`

### Phase 2: Event Service (10 min)
- [ ] Create `services/events.py`
- [ ] Add `dapr_enabled` config
- [ ] Test with logging

### Phase 3: Cron Handler (20 min)
- [ ] Create `routers/dapr.py`
- [ ] Implement on_due_date spawn logic
- [ ] Implement reminder logic
- [ ] Register router in `main.py`

### Phase 4: Wire Events (10 min)
- [ ] Add event publishing to `assign_task()`
- [ ] Add event publishing to `update_status()`
- [ ] Add event publishing to spawn (if not already in 2A)

### Phase 5: Notification Service (20 min)
- [ ] Create package structure
- [ ] Implement models
- [ ] Implement Dapr subscription
- [ ] Implement notifications API
- [ ] Create Dockerfile

### Phase 6: Helm Charts (10 min)
- [ ] Create `dapr/pubsub.yaml`
- [ ] Create `dapr/cron-binding.yaml`
- [ ] Update API deployment annotations
- [ ] Create notification service deployment

### Phase 7: Frontend (10 min)
- [ ] Create NotificationBell component
- [ ] Add to navbar
- [ ] Test polling

---

## 6. Testing

```bash
# Trigger cron manually
curl -X POST "http://localhost:8000/dapr/cron"

# Check notifications
curl "http://localhost:8001/api/notifications?user_id=test-user"

# Verify Dapr sidecars
kubectl get pods  # 2/2 containers

# Demo flow:
# 1. Create recurring task with spawn_trigger="on_due_date"
# 2. Wait for due_date to pass
# 3. Cron creates next occurrence
# 4. 🔄 notification appears in bell
```

---

## 7. Definition of Done

### P0 Fixes (Critical)
- [ ] Index added to `recurring_root_id` (performance)
- [ ] `reminder_sent` field exists on Task model
- [ ] `on_due_date` and `both` triggers now work (fixes silent failure bug)

### Core Features
- [ ] `on_due_date` spawn trigger works via cron
- [ ] `both` trigger works (on_complete OR on_due_date, whichever first)
- [ ] Reminders sent for tasks due within 24h
- [ ] `task.spawned` event published when cron creates new occurrence
- [ ] Notifications stored in notification service
- [ ] Frontend bell shows unread count

### Infrastructure
- [ ] Dapr sidecars running (2/2 containers)
- [ ] API continues if notification service down (non-blocking)
- [ ] Cron runs every 1 minute (for 1m pattern support)

### Demo Scenarios
- [ ] Create task with `recurrence_trigger=on_due_date` → Due date passes → New task spawns
- [ ] Task assigned → Assignee sees notification in bell
- [ ] Task due in 24h → Reminder notification appears
- [ ] Recurring task spawns → Assignee notified of new occurrence
