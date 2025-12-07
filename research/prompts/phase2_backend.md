# Phase 2: TaskFlow Backend Implementation

## Context

You are implementing the **FastAPI backend** for TaskFlow Phase 2. Phase 1 (CLI) is complete with local file storage. Now we need a production-ready backend with PostgreSQL.

**Read these first:**
1. `.specify/memory/constitution.md` — Platform governance and 5 non-negotiable principles
2. `research/DIRECTIVES.md` — Phase 2 execution guidance
3. `.claude/skills/engineering/fastapi-backend/SKILL.md` — FastAPI patterns
4. `.claude/skills/engineering/sqlmodel-database/SKILL.md` — SQLModel patterns
5. `.claude/skills/engineering/better-auth-sso/SKILL.md` — Better Auth SSO integration

---

## Mission

Build the TaskFlow backend that fulfills our **core vision**: humans and AI agents as equal, auditable first-class workers.

**The 5 Non-Negotiable Principles (from constitution):**
1. **Every Action MUST Be Auditable** — Every state change creates an audit log entry
2. **Agents Are First-Class Citizens** — If humans can do it, agents can do it
3. **Recursive Task Decomposition** — Tasks can spawn infinite subtasks
4. **Spec-Driven Development** — Specs before code
5. **Phase Continuity** — Data models persist across all phases

See phase 1 work at pacakges and use it as reference when needed.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│    FastAPI      │────▶│  Neon Postgres  │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │ Hackathon 1 SSO │
         │  (Better Auth)  │
         └─────────────────┘
```

---

## Project Structure

Create this structure in `/backend`:

```
backend/
├── pyproject.toml           # UV configuration
├── .env.example             # Environment template
├── src/
│   └── taskflow_api/
│       ├── __init__.py
│       ├── main.py          # FastAPI app entry
│       ├── config.py        # Settings from env
│       ├── db.py            # Neon connection + async session
│       │
│       ├── models/          # SQLModel schemas
│       │   ├── __init__.py
│       │   ├── base.py      # TimestampMixin, base classes
│       │   ├── project.py   # Project model
│       │   ├── worker.py    # Worker model (human + agent)
│       │   ├── task.py      # Task model with parent_id
│       │   ├── audit.py     # AuditLog model
│       │   └── linked_resource.py
│       │
│       ├── schemas/         # Pydantic request/response
│       │   ├── __init__.py
│       │   ├── project.py
│       │   ├── worker.py
│       │   ├── task.py
│       │   └── audit.py
│       │
│       ├── auth/            # Better Auth JWT verification
│       │   ├── __init__.py
│       │   ├── jwks.py      # JWKS fetcher + cache
│       │   ├── dependencies.py  # get_current_user dependency
│       │   └── rbac.py      # Role-based access
│       │
│       ├── services/        # Business logic
│       │   ├── __init__.py
│       │   ├── project.py
│       │   ├── worker.py
│       │   ├── task.py
│       │   └── audit.py     # Audit logging service
│       │
│       ├── routes/          # API endpoints
│       │   ├── __init__.py
│       │   ├── health.py
│       │   ├── projects.py
│       │   ├── workers.py
│       │   ├── tasks.py
│       │   └── audit.py
│       │
│       └── utils/
│           ├── __init__.py
│           └── exceptions.py
│
└── tests/
    ├── conftest.py
    ├── test_projects.py
    ├── test_workers.py
    ├── test_tasks.py
    └── test_audit.py
```

---

## Data Models (SQLModel)

### Base Mixin

```python
# models/base.py
from datetime import datetime
from sqlmodel import SQLModel, Field

class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Project

```python
# models/project.py
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from .base import TimestampMixin

class Project(TimestampMixin, table=True):
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True, max_length=50)
    name: str = Field(max_length=200)
    description: Optional[str] = None
    owner_id: str = Field(index=True)  # User ID from SSO

    # Relationships
    tasks: List["Task"] = Relationship(back_populates="project")
    workers: List["ProjectWorker"] = Relationship(back_populates="project")
```

### Worker

```python
# models/worker.py
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Literal
from enum import Enum

class WorkerType(str, Enum):
    HUMAN = "human"
    AGENT = "agent"

class Worker(TimestampMixin, table=True):
    __tablename__ = "workers"

    id: Optional[int] = Field(default=None, primary_key=True)
    handle: str = Field(index=True, unique=True, max_length=50)  # @claude-code
    name: str = Field(max_length=200)
    worker_type: WorkerType
    capabilities: Optional[str] = None  # Comma-separated for agents
    user_id: Optional[str] = None  # SSO user ID for humans
    api_key_hash: Optional[str] = None  # For agent authentication

    # Relationships
    assigned_tasks: List["Task"] = Relationship(back_populates="assignee")
```

### Task (with recursive parent_id)

```python
# models/task.py
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Literal
from enum import Enum
from .base import TimestampMixin

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Task(TimestampMixin, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    progress_percent: int = Field(default=0, ge=0, le=100)

    # Relationships
    project_id: int = Field(foreign_key="projects.id", index=True)
    project: Optional["Project"] = Relationship(back_populates="tasks")

    assignee_id: Optional[int] = Field(default=None, foreign_key="workers.id", index=True)
    assignee: Optional["Worker"] = Relationship(back_populates="assigned_tasks")

    # RECURSIVE: parent task for subtasks
    parent_task_id: Optional[int] = Field(default=None, foreign_key="tasks.id", index=True)
    subtasks: List["Task"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Task.parent_task_id]"}
    )

    # Metadata
    created_by_id: str  # User ID who created
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    tags: Optional[str] = None  # Comma-separated
```

### AuditLog (append-only, immutable)

```python
# models/audit.py
from sqlmodel import SQLModel, Field
from typing import Optional, Literal
from datetime import datetime

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)

    # What was affected
    entity_type: str = Field(index=True)  # task, project, worker
    entity_id: str = Field(index=True)

    # What happened
    action: str = Field(index=True)  # created, started, progressed, completed, etc.

    # Who did it
    actor_id: str = Field(index=True)  # @handle or user_id
    actor_type: Literal["human", "agent"]

    # Context
    details: Optional[str] = None  # JSON string with action-specific data

    # When (immutable)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
```

---

## Authentication (Better Auth SSO)

### JWKS Verification

```python
# auth/jwks.py
import httpx
import time
from jose import jwt, JWTError
from typing import Optional
from ..config import settings

_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour

async def get_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{settings.AUTH_SERVER_URL}/api/auth/jwks")
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
        return _jwks_cache

async def verify_token(token: str) -> dict:
    """Verify JWT against Better Auth JWKS."""
    # Implementation from better-auth-sso skill
    pass
```

### Dependency

```python
# auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwks import verify_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """FastAPI dependency to extract and verify current user."""
    token = credentials.credentials
    payload = await verify_token(token)

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "user"),
    }
```

---

## API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{pid}/workers` | List project workers |
| POST | `/api/projects/{pid}/workers` | Add worker to project |
| POST | `/api/workers/agents` | Register new agent (returns API key) |
| DELETE | `/api/projects/{pid}/workers/{id}` | Remove worker |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{pid}/tasks` | List tasks (with filters) |
| POST | `/api/projects/{pid}/tasks` | Create task |
| GET | `/api/tasks/{id}` | Get task details + subtasks |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| PATCH | `/api/tasks/{id}/status` | Change status |
| PATCH | `/api/tasks/{id}/progress` | Update progress |
| PATCH | `/api/tasks/{id}/assign` | Assign to worker |
| POST | `/api/tasks/{id}/subtasks` | Create subtask |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{id}/audit` | Get task audit trail |
| GET | `/api/projects/{pid}/audit` | Get project audit trail |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| GET | `/health/ready` | Readiness check (DB connected) |

---

## Audit Logging Service

**CRITICAL: Every state change MUST create an audit log entry.**

```python
# services/audit.py
from datetime import datetime
import json
from sqlmodel import Session
from ..models.audit import AuditLog

async def log_action(
    session: Session,
    entity_type: str,
    entity_id: str | int,
    action: str,
    actor_id: str,
    actor_type: Literal["human", "agent"],
    details: dict | None = None
) -> AuditLog:
    """Create immutable audit log entry."""
    log = AuditLog(
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        actor_id=actor_id,
        actor_type=actor_type,
        details=json.dumps(details) if details else None,
        created_at=datetime.utcnow()
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log
```

**Actions to log:**
- `created` — Task/project/worker created
- `updated` — Any field changed
- `started` — Task started (status → in_progress)
- `progressed` — Progress updated (include old and new %)
- `completed` — Task completed
- `assigned` — Assignee changed
- `delegated` — Task delegated to another worker
- `review_requested` — Agent requests human review
- `approved` — Human approves agent work
- `rejected` — Human rejects agent work
- `subtask_added` — Subtask created under parent

---

## Task Service Example

```python
# services/task.py
from sqlmodel import Session, select
from datetime import datetime
from ..models.task import Task, TaskStatus
from ..models.audit import AuditLog
from .audit import log_action

async def create_task(
    session: Session,
    project_id: int,
    title: str,
    created_by_id: str,
    **kwargs
) -> Task:
    """Create task with audit logging."""
    task = Task(
        project_id=project_id,
        title=title,
        created_by_id=created_by_id,
        **kwargs
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)

    # AUDIT: Task created
    await log_action(
        session,
        entity_type="task",
        entity_id=task.id,
        action="created",
        actor_id=created_by_id,
        actor_type="human",
        details={"title": title, "project_id": project_id}
    )

    return task

async def start_task(
    session: Session,
    task_id: int,
    actor_id: str,
    actor_type: str,
    subtask_titles: list[str] | None = None
) -> Task:
    """Start task, optionally creating subtasks."""
    task = await session.get(Task, task_id)
    if not task:
        raise NotFoundError(f"Task {task_id} not found")

    old_status = task.status
    task.status = TaskStatus.IN_PROGRESS
    task.started_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    await session.commit()

    # AUDIT: Task started
    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action="started",
        actor_id=actor_id,
        actor_type=actor_type,
        details={"old_status": old_status, "new_status": "in_progress"}
    )

    # Create subtasks if provided (recursive decomposition)
    if subtask_titles:
        for title in subtask_titles:
            subtask = await create_task(
                session,
                project_id=task.project_id,
                title=title,
                created_by_id=actor_id,
                parent_task_id=task_id,
                assignee_id=task.assignee_id
            )

            # AUDIT: Subtask added
            await log_action(
                session,
                entity_type="task",
                entity_id=task_id,
                action="subtask_added",
                actor_id=actor_id,
                actor_type=actor_type,
                details={"subtask_id": subtask.id, "title": title}
            )

    await session.refresh(task)
    return task
```

---

## Environment Variables

```env
# .env.example

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# SSO (Better Auth)
AUTH_SERVER_URL=https://your-sso.example.com
SSO_CLIENT_ID=your-client-id

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

---

## Validation Checklist

Before completing, verify:

- [ ] **Audit Coverage**: Every task state change creates audit entry
- [ ] **Agent Parity**: All human operations work for agents (via API key auth)
- [ ] **Recursive Tasks**: parent_task_id enables infinite nesting
- [ ] **Better Auth**: JWKS verification working
- [ ] **CORS**: Configured for frontend origin
- [ ] **Async**: All DB operations use async/await
- [ ] **Health Checks**: `/health` and `/health/ready` work
- [ ] **Error Handling**: HTTPException with meaningful codes
- [ ] **Tests**: At least happy-path tests for each endpoint

---

## Success Criteria

1. `POST /api/projects` creates project with audit log
2. `POST /api/projects/{pid}/workers` adds human or agent
3. `POST /api/projects/{pid}/tasks` creates task with audit
4. `PATCH /api/tasks/{id}/progress` updates progress with audit
5. `POST /api/tasks/{id}/subtasks` creates child task
6. `GET /api/tasks/{id}/audit` returns full trail
7. Better Auth JWT verification works
8. Agent API key authentication works (for Phase 3)

---

## Commands

```bash
# Setup
cd backend
uv sync

# Run dev server
uv run uvicorn taskflow_api.main:app --reload --port 8000

# Run tests
uv run pytest

# Lint
uv run ruff check src/
uv run ruff format src/
```

---

**Go build. Every audit log entry is proof that AI-native development works.**
