# Implementation Plan: TaskFlow Backend API

**Feature Branch**: `003-backend-api`
**Spec**: `specs/003-backend-api/spec.md`
**Created**: 2025-12-07
**Skills Used**: fastapi-backend, sqlmodel-database, better-auth-sso

---

## Executive Summary

This plan implements the TaskFlow Backend API - a production-ready FastAPI service providing HTTP interface for the TaskFlow platform. The implementation evolves Phase 1's CLI-based JSON storage into a multi-user PostgreSQL backend while maintaining human-agent parity.

**Key Architectural Decisions**:
1. **Async-first**: All database operations use `AsyncSession` with `asyncpg`
2. **Project-scoped with Default**: Every user gets a "Default" project on first login
3. **Unified worker model**: Humans auto-created from SSO, agents registered globally
4. **JWT/JWKS verification**: Validate tokens against existing SSO platform (002-sso-platform)

---

## Project Structure

```
packages/api/
├── pyproject.toml           # UV package config
├── src/
│   └── taskflow_api/
│       ├── __init__.py
│       ├── main.py          # FastAPI app, lifespan, CORS
│       ├── config.py        # Settings (Pydantic BaseSettings)
│       ├── database.py      # Async engine, session dependency
│       ├── auth.py          # JWT/JWKS verification, get_current_user
│       ├── models/          # SQLModel schemas
│       │   ├── __init__.py
│       │   ├── base.py      # Shared base classes
│       │   ├── project.py   # Project, ProjectMember
│       │   ├── worker.py    # Worker (human/agent)
│       │   ├── task.py      # Task with parent_task_id
│       │   └── audit.py     # AuditLog (immutable)
│       ├── schemas/         # API request/response models
│       │   ├── __init__.py
│       │   ├── project.py
│       │   ├── worker.py
│       │   ├── task.py
│       │   └── audit.py
│       ├── routers/         # API route handlers
│       │   ├── __init__.py
│       │   ├── health.py    # /health, /health/ready
│       │   ├── projects.py  # /api/projects/*
│       │   ├── members.py   # /api/projects/{pid}/members/*
│       │   ├── agents.py    # /api/workers/agents/*
│       │   ├── tasks.py     # /api/projects/{pid}/tasks/*, /api/tasks/*
│       │   └── audit.py     # /api/tasks/{id}/audit, /api/projects/{pid}/audit
│       ├── services/        # Business logic (minimal, avoid over-engineering)
│       │   ├── __init__.py
│       │   ├── audit.py     # Audit logging helper
│       │   └── auth.py      # Default project creation
│       └── tests/
│           ├── __init__.py
│           ├── conftest.py  # Fixtures, test DB
│           ├── test_health.py
│           ├── test_projects.py
│           ├── test_members.py
│           ├── test_agents.py
│           ├── test_tasks.py
│           └── test_audit.py
└── .env.example             # Environment template
```

---

## Implementation Phases

### Phase 1: Foundation (Database + Auth)

**Goal**: Establish database connection and JWT verification

#### 1.1 Project Setup
```bash
# Create package
mkdir -p packages/api
cd packages/api
uv init

# Add dependencies
uv add fastapi sqlmodel pydantic pydantic-settings httpx python-jose uvicorn asyncpg sqlalchemy[asyncio]

# Dev dependencies
uv add --dev pytest pytest-asyncio httpx pytest-mock
```

**Files to create**:
- `pyproject.toml` - Package config with Python 3.13+
- `src/taskflow_api/__init__.py` - Package init
- `src/taskflow_api/config.py` - Settings from env vars

#### 1.2 Database Connection (Async)

**File**: `src/taskflow_api/database.py`

```python
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from .config import settings

# Convert sync URL to async
DATABASE_URL = settings.database_url
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://", 1
    ).replace("sslmode=", "ssl=")

engine = create_async_engine(DATABASE_URL, echo=settings.debug)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
```

#### 1.3 JWT/JWKS Authentication

**File**: `src/taskflow_api/auth.py`

Pattern from `fastapi-backend` skill + integration with `better-auth-sso`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
import time
from .config import settings

security = HTTPBearer()

# JWKS cache
_jwks_cache = None
_jwks_cache_time = 0
JWKS_CACHE_TTL = 3600  # 1 hour

async def get_jwks():
    """Fetch and cache JWKS from Better Auth SSO."""
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.sso_url}/api/auth/jwks")
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
        return _jwks_cache

async def verify_token(token: str) -> dict:
    """Verify JWT against Better Auth JWKS."""
    try:
        jwks = await get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail="Key not found")

        payload = jwt.decode(token, rsa_key, algorithms=["RS256"], options={"verify_aud": False})
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract current user from JWT."""
    payload = await verify_token(credentials.credentials)
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "user"),
    }
```

---

### Phase 2: SQLModel Schemas

**Goal**: Define database models compatible with Phase 1 Pydantic models

#### 2.1 Base Models

**File**: `src/taskflow_api/models/base.py`

```python
from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional

class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

#### 2.2 Project Model

**File**: `src/taskflow_api/models/project.py`

```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, Literal

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True, regex=r"^[a-z0-9-]+$")
    name: str = Field(max_length=200)
    description: Optional[str] = None
    owner_id: str = Field(index=True)  # SSO user ID
    is_default: bool = Field(default=False)  # True for auto-created Default project
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    members: List["ProjectMember"] = Relationship(back_populates="project")
    tasks: List["Task"] = Relationship(back_populates="project")

class ProjectMember(SQLModel, table=True):
    __tablename__ = "project_member"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    worker_id: int = Field(foreign_key="worker.id", index=True)
    role: Literal["owner", "member"] = Field(default="member")
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Optional[Project] = Relationship(back_populates="members")
    worker: Optional["Worker"] = Relationship(back_populates="memberships")
```

#### 2.3 Worker Model

**File**: `src/taskflow_api/models/worker.py`

```python
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON
from datetime import datetime
from typing import Optional, List, Literal

class Worker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    handle: str = Field(unique=True, index=True, regex=r"^@[a-z0-9_-]+$")
    name: str = Field(max_length=200)
    type: Literal["human", "agent"]

    # Human-specific
    user_id: Optional[str] = Field(default=None, index=True)  # SSO user ID

    # Agent-specific
    agent_type: Optional[Literal["claude", "qwen", "gemini", "custom"]] = None
    capabilities: List[str] = Field(default=[], sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    memberships: List["ProjectMember"] = Relationship(back_populates="worker")
    assigned_tasks: List["Task"] = Relationship(back_populates="assignee")
```

#### 2.4 Task Model

**File**: `src/taskflow_api/models/task.py`

```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, Literal
from sqlalchemy import Column, JSON

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=500)
    description: Optional[str] = None
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] = "pending"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    progress_percent: int = Field(default=0, ge=0, le=100)
    tags: List[str] = Field(default=[], sa_column=Column(JSON))
    due_date: Optional[datetime] = None

    # Foreign keys
    project_id: int = Field(foreign_key="project.id", index=True)
    assignee_id: Optional[int] = Field(default=None, foreign_key="worker.id")
    parent_task_id: Optional[int] = Field(default=None, foreign_key="task.id")
    created_by_id: int = Field(foreign_key="worker.id")

    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    project: Optional["Project"] = Relationship(back_populates="tasks")
    assignee: Optional["Worker"] = Relationship(
        back_populates="assigned_tasks",
        sa_relationship_kwargs={"foreign_keys": "[Task.assignee_id]"}
    )
    parent: Optional["Task"] = Relationship(
        back_populates="subtasks",
        sa_relationship_kwargs={"remote_side": "Task.id"}
    )
    subtasks: List["Task"] = Relationship(back_populates="parent")
```

#### 2.5 AuditLog Model

**File**: `src/taskflow_api/models/audit.py`

```python
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON
from datetime import datetime
from typing import Optional, Literal, Any

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)  # "task", "project", "worker"
    entity_id: int = Field(index=True)
    action: str  # "created", "updated", "started", "completed", etc.
    actor_id: int = Field(foreign_key="worker.id", index=True)
    actor_type: Literal["human", "agent"]
    details: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### Phase 3: API Routers

**Goal**: Implement all API endpoints per spec

#### 3.1 Health Endpoints

**File**: `src/taskflow_api/routers/health.py`

```python
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from ..database import get_session

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@router.get("/health/ready")
async def ready(session: AsyncSession = Depends(get_session)):
    try:
        await session.exec(select(1))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}, 503
```

#### 3.2 Projects Router

**File**: `src/taskflow_api/routers/projects.py`

Key endpoints:
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project (user becomes owner)
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project (with confirmation)

#### 3.3 Members Router

**File**: `src/taskflow_api/routers/members.py`

Key endpoints:
- `GET /api/projects/{pid}/members` - List project members
- `POST /api/projects/{pid}/members` - Add user (by SSO ID) or agent
- `DELETE /api/projects/{pid}/members/{id}` - Remove member

**Critical Logic**:
- When adding a user by `user_id`, auto-create Worker record from SSO profile
- When adding an agent by `agent_id`, validate agent exists globally

#### 3.4 Agents Router

**File**: `src/taskflow_api/routers/agents.py`

Key endpoints:
- `POST /api/workers/agents` - Register global agent
- `GET /api/workers/agents` - List all agents
- `GET /api/workers/agents/{id}` - Get agent details
- `PUT /api/workers/agents/{id}` - Update agent
- `DELETE /api/workers/agents/{id}` - Delete agent

#### 3.5 Tasks Router

**File**: `src/taskflow_api/routers/tasks.py`

Key endpoints:
- `GET /api/projects/{pid}/tasks` - List tasks with filters
- `POST /api/projects/{pid}/tasks` - Create task
- `GET /api/tasks/{id}` - Get task with subtasks
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `PATCH /api/tasks/{id}/status` - Change status (with validation)
- `PATCH /api/tasks/{id}/progress` - Update progress
- `PATCH /api/tasks/{id}/assign` - Assign to member
- `POST /api/tasks/{id}/subtasks` - Create subtask
- `POST /api/tasks/{id}/approve` - Approve reviewed task
- `POST /api/tasks/{id}/reject` - Reject reviewed task

**Critical Logic**:
- Status transitions validated per `VALID_TRANSITIONS` from Phase 1
- Assignee must be a project member
- Parent task must be in same project
- Cycle detection for parent_task_id

#### 3.6 Audit Router

**File**: `src/taskflow_api/routers/audit.py`

Key endpoints:
- `GET /api/tasks/{id}/audit` - Task audit trail
- `GET /api/projects/{pid}/audit` - Project audit trail

---

### Phase 4: Business Logic

#### 4.1 Audit Service

**File**: `src/taskflow_api/services/audit.py`

```python
from sqlmodel.ext.asyncio.session import AsyncSession
from ..models.audit import AuditLog
from ..models.worker import Worker
from typing import Optional, Any

async def log_action(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_id: int,
    details: Optional[dict[str, Any]] = None,
):
    """Create immutable audit log entry."""
    # Get actor type from worker
    worker = await session.get(Worker, actor_id)
    actor_type = worker.type if worker else "human"

    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details or {},
    )
    session.add(log)
    await session.commit()
    return log
```

#### 4.2 First Login / Default Project

**File**: `src/taskflow_api/services/auth.py`

```python
async def ensure_user_setup(session: AsyncSession, user: dict) -> Worker:
    """
    On first API call, ensure:
    1. Worker record exists for user
    2. Default project exists for user
    3. User is member of Default project
    """
    from sqlmodel import select
    from ..models.worker import Worker
    from ..models.project import Project, ProjectMember

    user_id = user["id"]

    # Check/create worker
    stmt = select(Worker).where(Worker.user_id == user_id)
    result = await session.exec(stmt)
    worker = result.first()

    if not worker:
        # Derive handle from email
        email = user.get("email", "")
        handle = f"@{email.split('@')[0].lower().replace('.', '-')}"

        worker = Worker(
            handle=handle,
            name=user.get("name", email),
            type="human",
            user_id=user_id,
        )
        session.add(worker)
        await session.commit()
        await session.refresh(worker)

    # Check/create Default project
    stmt = select(Project).where(Project.owner_id == user_id, Project.is_default == True)
    result = await session.exec(stmt)
    default_project = result.first()

    if not default_project:
        default_project = Project(
            slug=f"default-{user_id[:8]}",
            name="Default",
            owner_id=user_id,
            is_default=True,
        )
        session.add(default_project)
        await session.commit()
        await session.refresh(default_project)

        # Add user as owner
        membership = ProjectMember(
            project_id=default_project.id,
            worker_id=worker.id,
            role="owner",
        )
        session.add(membership)
        await session.commit()

    return worker
```

---

### Phase 5: Main Application

**File**: `src/taskflow_api/main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import create_db_and_tables
from .routers import health, projects, members, agents, tasks, audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_db_and_tables()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="TaskFlow API",
    description="Human-Agent Task Management API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(projects.router, prefix="/api/projects")
app.include_router(members.router, prefix="/api/projects/{project_id}/members")
app.include_router(agents.router, prefix="/api/workers/agents")
app.include_router(tasks.router)  # Has both /api/projects and /api/tasks routes
app.include_router(audit.router, prefix="/api")
```

---

### Phase 6: Testing

**Test Strategy**:
1. Use in-memory SQLite for fast unit tests
2. Mock JWT verification for auth tests
3. Integration tests against Neon (CI only)

**File**: `src/taskflow_api/tests/conftest.py`

```python
import pytest
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from httpx import AsyncClient
from ..main import app
from ..database import get_session
from ..auth import get_current_user

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def session():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

@pytest.fixture
async def client(session):
    async def get_session_override():
        yield session

    async def get_current_user_override():
        return {"id": "test-user-123", "email": "test@example.com", "name": "Test User", "role": "user"}

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
```

---

## Environment Variables

**File**: `packages/api/.env.example`

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# SSO (Better Auth)
SSO_URL=http://localhost:3001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Debug
DEBUG=true
LOG_LEVEL=INFO
```

---

## Constitutional Validation

| Principle | Implementation |
|-----------|----------------|
| **Audit** | `AuditLog` table + `log_action()` service called on every state change |
| **Agent Parity** | Same endpoints serve humans and agents; actor_type from Worker.type |
| **Recursive Tasks** | `parent_task_id` with same-project validation and cycle detection |
| **Spec-Driven** | This plan follows spec.md; code follows this plan |
| **Phase Continuity** | SQLModel schemas match Phase 1 Pydantic models (field-compatible) |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| JWKS fetch fails | Cache JWKS for 1 hour; return 503 if no cache |
| Circular parent references | Recursive check before saving parent_task_id |
| Cross-project assignment | Validate assignee in ProjectMember before task creation |
| Race conditions on status | Optimistic locking with updated_at check |

---

## Success Criteria Mapping

| Criteria | Implementation |
|----------|----------------|
| SC-001: Project + workers in 30s | Single API calls with clear contracts |
| SC-002: Task with metadata in 1 call | POST with full JSON body |
| SC-003: Status reflected in 1s | Direct DB write, no queue |
| SC-004: Unified member list | Single GET endpoint returns both types |
| SC-005: Same format for @claude-code and @sarah | Worker model is type-agnostic |
| SC-006: Complete audit history | AuditLog with chronological query |
| SC-007: 100% audit coverage | log_action() in every state-changing endpoint |
| SC-008: <200ms p95 | Async DB, indexed queries |
| SC-009: 100 concurrent requests | Connection pooling |
| SC-010: Cached JWKS | 1-hour TTL cache |
| SC-011: Consistent error format | HTTPException with {error, detail, status_code} |

---

## Next Steps

1. **Run `/sp.tasks`** to generate granular task breakdown
2. **Run `/sp.implement`** to execute implementation
3. **Validate** with tests and SSO integration check
