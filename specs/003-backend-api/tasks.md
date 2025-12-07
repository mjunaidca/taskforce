# Tasks: TaskFlow Backend API

**Feature Branch**: `003-backend-api`
**Plan**: `specs/003-backend-api/plan.md`
**Generated**: 2025-12-07

---

## Task Overview

| Phase | Tasks | Estimated Complexity |
|-------|-------|---------------------|
| 1. Foundation | 5 | Low |
| 2. Models | 5 | Medium |
| 3. Routers | 7 | Medium-High |
| 4. Services | 3 | Medium |
| 5. Testing | 4 | Medium |
| 6. Integration | 2 | Low |

**Total**: 26 tasks

---

## Phase 1: Foundation

### Task 1.1: Initialize Package Structure
**Priority**: P0 (Blocker)
**Dependencies**: None

**Actions**:
1. Create `packages/api/` directory
2. Run `uv init` in the directory
3. Configure `pyproject.toml` with:
   - Python 3.13+
   - Dependencies: fastapi, sqlmodel, pydantic, pydantic-settings, httpx, python-jose, uvicorn, asyncpg, sqlalchemy[asyncio]
   - Dev: pytest, pytest-asyncio, httpx, pytest-mock, aiosqlite
4. Create `src/taskflow_api/__init__.py`

**Acceptance**:
- [x] `uv sync` succeeds
- [x] Package importable: `from taskflow_api import __version__`

---

### Task 1.2: Create Config Module
**Priority**: P0 (Blocker)
**Dependencies**: 1.1

**File**: `src/taskflow_api/config.py`

**Actions**:
1. Create Pydantic BaseSettings class
2. Define environment variables:
   - `DATABASE_URL` (required)
   - `SSO_URL` (required)
   - `ALLOWED_ORIGINS` (default: localhost)
   - `DEBUG` (default: False)
   - `LOG_LEVEL` (default: INFO)
3. Add `.env.example` template

**Acceptance**:
- [x] Settings load from environment
- [x] Validation errors on missing required vars
- [x] `.env.example` documents all vars

---

### Task 1.3: Create Database Module
**Priority**: P0 (Blocker)
**Dependencies**: 1.2

**File**: `src/taskflow_api/database.py`

**Actions**:
1. Create async engine with URL conversion (postgresql → postgresql+asyncpg)
2. Create `async_session_maker` with `AsyncSession`
3. Create `create_db_and_tables()` function
4. Create `get_session()` dependency

**Acceptance**:
- [x] Connection to Neon PostgreSQL works
- [x] Async session yields correctly
- [x] Tables created on startup

---

### Task 1.4: Create Auth Module (JWT/JWKS)
**Priority**: P0 (Blocker)
**Dependencies**: 1.2

**File**: `src/taskflow_api/auth.py`

**Actions**:
1. Implement JWKS fetching with 1-hour cache
2. Implement `verify_token()` with RS256 validation
3. Implement `get_current_user()` dependency
4. Handle errors: 401 for invalid/expired tokens, 503 for SSO unavailable

**Acceptance**:
- [x] Valid JWT from SSO verifies successfully
- [x] Expired JWT returns 401
- [x] Invalid signature returns 401
- [x] JWKS cached for 1 hour
- [x] Graceful 503 when SSO down and no cache

---

### Task 1.5: Create Main Application Entry
**Priority**: P0 (Blocker)
**Dependencies**: 1.3, 1.4

**File**: `src/taskflow_api/main.py`

**Actions**:
1. Create FastAPI app with lifespan context manager
2. Add CORS middleware with `settings.allowed_origins`
3. Call `create_db_and_tables()` on startup
4. Add basic exception handlers

**Acceptance**:
- [x] `uv run uvicorn taskflow_api.main:app --reload` starts server
- [x] CORS headers present in responses
- [x] Database tables created on startup

---

## Phase 2: SQLModel Models

### Task 2.1: Create Base Models
**Priority**: P1
**Dependencies**: 1.3

**File**: `src/taskflow_api/models/base.py`

**Actions**:
1. Create `TimestampMixin` with `created_at`, `updated_at`
2. Export in `models/__init__.py`

**Acceptance**:
- [x] Mixin adds timestamp fields
- [x] Fields auto-populate on creation

---

### Task 2.2: Create Project Model
**Priority**: P1
**Dependencies**: 2.1

**File**: `src/taskflow_api/models/project.py`

**Actions**:
1. Create `Project` table with:
   - id, slug (unique), name, description, owner_id, is_default
   - created_at, updated_at
2. Create `ProjectMember` link table with:
   - id, project_id, worker_id, role, joined_at
3. Define relationships

**Acceptance**:
- [x] Project table created in DB
- [x] ProjectMember table created
- [x] Relationships load correctly
- [x] Slug uniqueness enforced

---

### Task 2.3: Create Worker Model
**Priority**: P1
**Dependencies**: 2.1

**File**: `src/taskflow_api/models/worker.py`

**Actions**:
1. Create `Worker` table with:
   - id, handle (unique), name, type (human|agent)
   - user_id (nullable, for humans)
   - agent_type, capabilities (JSON, for agents)
   - created_at
2. Add handle validation regex: `^@[a-z0-9_-]+$`

**Acceptance**:
- [x] Worker table created
- [x] Handle uniqueness enforced
- [x] agent_type required for agents (validator)
- [x] Capabilities stored as JSON array

---

### Task 2.4: Create Task Model
**Priority**: P1
**Dependencies**: 2.2, 2.3

**File**: `src/taskflow_api/models/task.py`

**Actions**:
1. Create `Task` table with:
   - id, title, description, status, priority, progress_percent
   - tags (JSON), due_date
   - project_id (FK), assignee_id (FK nullable), parent_task_id (FK nullable)
   - created_by_id (FK), started_at, completed_at
   - created_at, updated_at
2. Define relationships: project, assignee, parent, subtasks
3. Add self-referential relationship for parent/subtasks

**Acceptance**:
- [x] Task table created
- [x] Foreign keys enforced
- [x] Self-referential parent/subtasks works
- [x] Status enum validated

---

### Task 2.5: Create AuditLog Model
**Priority**: P1
**Dependencies**: 2.3

**File**: `src/taskflow_api/models/audit.py`

**Actions**:
1. Create `AuditLog` table with:
   - id, entity_type, entity_id, action
   - actor_id (FK), actor_type
   - details (JSON)
   - created_at
2. Add indexes on entity_type, entity_id, actor_id

**Acceptance**:
- [x] AuditLog table created
- [x] Details stored as JSON
- [x] No update/delete operations allowed (immutable)

---

## Phase 3: API Routers

### Task 3.1: Create Health Router
**Priority**: P1
**Dependencies**: 1.5

**File**: `src/taskflow_api/routers/health.py`

**Actions**:
1. `GET /health` - Return status: healthy, version
2. `GET /health/ready` - Check database connection

**Acceptance**:
- [x] `/health` returns 200 with version
- [x] `/health/ready` returns 200 when DB connected
- [x] `/health/ready` returns 503 when DB fails

---

### Task 3.2: Create Projects Router
**Priority**: P1
**Dependencies**: 2.2, 1.4

**File**: `src/taskflow_api/routers/projects.py`

**Actions**:
1. `GET /api/projects` - List user's projects (where user is member)
2. `POST /api/projects` - Create project, add user as owner
3. `GET /api/projects/{id}` - Get project details with member count
4. `PUT /api/projects/{id}` - Update project (owner only)
5. `DELETE /api/projects/{id}` - Delete project (owner only, with task check)

**Acceptance**:
- [x] List returns only user's projects
- [x] Create adds user as owner automatically
- [x] Update restricted to owner
- [x] Delete blocked if tasks exist (unless force=true)
- [x] All operations audit logged

---

### Task 3.3: Create Members Router
**Priority**: P1
**Dependencies**: 3.2, 2.3

**File**: `src/taskflow_api/routers/members.py`

**Actions**:
1. `GET /api/projects/{pid}/members` - List members (humans + agents)
2. `POST /api/projects/{pid}/members` - Add member:
   - If `user_id` provided: auto-create Worker from SSO profile
   - If `agent_id` provided: link existing agent
3. `DELETE /api/projects/{pid}/members/{id}` - Remove member

**Critical Logic**:
- Auto-create Worker when adding user by SSO ID
- Derive handle from email (e.g., `john.doe@example.com` → `@john-doe`)
- Validate agent exists before linking

**Acceptance**:
- [x] List returns unified human+agent list with type indicators
- [x] Adding user auto-creates worker record
- [x] Adding non-existent agent returns 404
- [x] Cannot remove project owner
- [x] All operations audit logged

---

### Task 3.4: Create Agents Router
**Priority**: P1
**Dependencies**: 2.3

**File**: `src/taskflow_api/routers/agents.py`

**Actions**:
1. `POST /api/workers/agents` - Register global agent
2. `GET /api/workers/agents` - List all agents
3. `GET /api/workers/agents/{id}` - Get agent details
4. `PUT /api/workers/agents/{id}` - Update agent
5. `DELETE /api/workers/agents/{id}` - Delete agent (cascade check)

**Acceptance**:
- [x] Create validates handle uniqueness
- [x] Create requires agent_type
- [x] Update preserves handle (or validates new one)
- [x] Delete blocked if agent is project member

---

### Task 3.5: Create Tasks Router (Core CRUD)
**Priority**: P0 (Critical Path)
**Dependencies**: 2.4, 3.3

**File**: `src/taskflow_api/routers/tasks.py`

**Actions**:
1. `GET /api/projects/{pid}/tasks` - List with filters (status, assignee, priority)
2. `POST /api/projects/{pid}/tasks` - Create task
3. `GET /api/tasks/{id}` - Get task with subtasks
4. `PUT /api/tasks/{id}` - Update task
5. `DELETE /api/tasks/{id}` - Delete task

**Critical Validations**:
- Assignee must be project member
- Parent task must be in same project
- Creator must be project member

**Acceptance**:
- [x] List supports status, assignee_id, priority filters
- [x] Create validates assignee is project member
- [x] Create validates parent in same project
- [x] Get includes nested subtasks
- [x] All operations audit logged

---

### Task 3.6: Create Tasks Router (Workflow Actions)
**Priority**: P0 (Critical Path)
**Dependencies**: 3.5

**Add to**: `src/taskflow_api/routers/tasks.py`

**Actions**:
1. `PATCH /api/tasks/{id}/status` - Change status with transition validation
2. `PATCH /api/tasks/{id}/progress` - Update progress (0-100)
3. `PATCH /api/tasks/{id}/assign` - Assign to project member
4. `POST /api/tasks/{id}/subtasks` - Create subtask
5. `POST /api/tasks/{id}/approve` - Approve (review → completed)
6. `POST /api/tasks/{id}/reject` - Reject (review → in_progress)

**Critical Logic**:
- Status transitions validated per `VALID_TRANSITIONS`
- Progress auto-set to 100 on completion
- started_at set when status → in_progress
- completed_at set when status → completed

**Acceptance**:
- [x] Invalid status transitions return 400
- [x] Progress validates 0-100 range
- [x] Assign validates member exists
- [x] Subtask validates same-project parent
- [x] Approve/reject only works on review status
- [x] All operations audit logged with before/after

---

### Task 3.7: Create Audit Router
**Priority**: P1
**Dependencies**: 2.5

**File**: `src/taskflow_api/routers/audit.py`

**Actions**:
1. `GET /api/tasks/{id}/audit` - Task audit trail (chronological)
2. `GET /api/projects/{pid}/audit` - Project audit trail (paginated)

**Acceptance**:
- [x] Task audit returns complete history
- [x] Project audit supports pagination (offset, limit)
- [x] Results ordered by timestamp desc
- [x] Actor name included in response

---

## Phase 4: Services

### Task 4.1: Create Audit Service
**Priority**: P1
**Dependencies**: 2.5

**File**: `src/taskflow_api/services/audit.py`

**Actions**:
1. Create `log_action()` helper function
2. Accept: entity_type, entity_id, action, actor_id, details
3. Auto-determine actor_type from Worker record
4. Support before/after diff for updates

**Acceptance**:
- [x] log_action creates AuditLog entry
- [x] actor_type correctly determined
- [x] Details include before/after for updates

---

### Task 4.2: Create Auth Service (First Login)
**Priority**: P1
**Dependencies**: 2.2, 2.3, 1.4

**File**: `src/taskflow_api/services/auth.py`

**Actions**:
1. Create `ensure_user_setup()` function
2. Check/create Worker from SSO user
3. Check/create Default project
4. Add user as Default project owner

**Acceptance**:
- [x] First API call creates worker + default project
- [x] Subsequent calls are idempotent
- [x] Handle derived correctly from email

---

### Task 4.3: Create Validation Helpers
**Priority**: P1
**Dependencies**: 2.4

**File**: `src/taskflow_api/services/validation.py`

**Actions**:
1. `validate_status_transition()` - Check allowed transitions
2. `validate_project_member()` - Check worker is project member
3. `validate_same_project_parent()` - Check parent task in same project
4. `detect_cycle()` - Detect circular parent references

**Acceptance**:
- [x] Status transitions match Phase 1 rules
- [x] Member validation works
- [x] Parent validation works
- [x] Cycle detection prevents infinite loops

---

## Phase 5: Testing

### Task 5.1: Create Test Fixtures
**Priority**: P1
**Dependencies**: All Phase 2 tasks

**File**: `src/taskflow_api/tests/conftest.py`

**Actions**:
1. Create async SQLite in-memory engine
2. Create test session fixture
3. Create mock `get_current_user` fixture
4. Create test client fixture with dependency overrides

**Acceptance**:
- [x] `pytest` discovers and runs tests
- [x] Tests isolated (fresh DB per test)
- [x] Auth mocked for all tests

---

### Task 5.2: Create Health Tests
**Priority**: P1
**Dependencies**: 5.1, 3.1

**File**: `src/taskflow_api/tests/test_health.py`

**Actions**:
1. Test `/health` returns 200
2. Test `/health/ready` returns 200 with DB
3. Test `/health/ready` handles DB failure

**Acceptance**:
- [x] All health tests pass

---

### Task 5.3: Create CRUD Tests
**Priority**: P1
**Dependencies**: 5.1, 3.2-3.7

**Files**:
- `test_projects.py`
- `test_members.py`
- `test_agents.py`
- `test_tasks.py`

**Actions per file**:
1. Test create (201)
2. Test list (200)
3. Test get (200, 404)
4. Test update (200, 404, 403)
5. Test delete (200, 404, 403)

**Acceptance**:
- [x] All CRUD tests pass
- [x] Error cases covered

---

### Task 5.4: Create Workflow Tests
**Priority**: P0 (Critical)
**Dependencies**: 5.3

**File**: `src/taskflow_api/tests/test_workflow.py`

**Actions**:
1. Test complete task lifecycle: create → start → progress → review → approve
2. Test rejection flow: create → start → review → reject → start → complete
3. Test subtask creation and progress rollup
4. Test audit trail completeness

**Acceptance**:
- [x] Full lifecycle test passes
- [x] Rejection flow test passes
- [x] Subtask test passes
- [x] Audit entries verified

---

## Phase 6: Integration

### Task 6.1: SSO Integration Verification
**Priority**: P0 (Critical)
**Dependencies**: All previous tasks

**Actions**:
1. Register TaskFlow API as OAuth client in SSO
2. Test JWT flow: Login → Get token → Call API
3. Verify user claims (sub, email, name) extracted correctly
4. Test JWKS caching behavior

**Acceptance**:
- [x] API accepts valid SSO JWT
- [x] User identity correctly extracted
- [x] Default project created on first call

---

### Task 6.2: Documentation & Cleanup
**Priority**: P2
**Dependencies**: 6.1

**Actions**:
1. Verify OpenAPI docs at `/docs` and `/redoc`
2. Add API description strings to all endpoints
3. Update root README with API section
4. Remove debug logging for production

**Acceptance**:
- [x] Swagger UI shows all endpoints
- [x] All endpoints documented
- [x] README includes API quick start

---

## Execution Order

```
Phase 1: 1.1 → 1.2 → 1.3 → 1.4 → 1.5
                          ↓
Phase 2: 2.1 → 2.2 → 2.3 → 2.4 → 2.5
              ↓     ↓     ↓
Phase 3: 3.1  3.2 → 3.3   3.4
              ↓     ↓
         3.5 ← ─ ─ ─┘
          ↓
         3.6 → 3.7
                          ↓
Phase 4:     4.1 ← ─ ─ ─ ─┘
             4.2
             4.3
                          ↓
Phase 5: 5.1 → 5.2 → 5.3 → 5.4
                          ↓
Phase 6: 6.1 → 6.2
```

---

## Definition of Done

- [x] All 26 tasks completed
- [x] All tests passing (`uv run pytest`)
- [x] No lint errors (`uv run ruff check .`)
- [x] SSO integration verified
- [x] OpenAPI documentation complete
- [x] Constitutional principles validated:
  - [x] Audit: Every state change logged
  - [x] Agent Parity: Same API for humans/agents
  - [x] Recursive Tasks: parent_task_id works
  - [x] Phase Continuity: Models compatible with Phase 1
