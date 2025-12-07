# Feature Specification: TaskFlow Backend API

**Feature Branch**: `003-backend-api`
**Created**: 2025-12-07
**Status**: Draft
**Input**: Phase 2 TaskFlow Backend API with FastAPI, SQLModel, PostgreSQL, and Better Auth SSO integration

---

## Executive Summary

The TaskFlow Backend API is a production-ready FastAPI service that provides the HTTP interface for the TaskFlow platform. It evolves Phase 1's CLI-based JSON storage into a multi-user, persistent PostgreSQL backend while maintaining **human-agent parity**: all operations available to humans via CLI/Web are equally available to AI agents via the same API endpoints.

**Core Innovation**: The same `POST /api/tasks/{id}/start` endpoint serves CLI users, web dashboard users, and MCP-connected AI agents. Actor type (human vs agent) is determined by authentication context, not by separate endpoints.

**Constitutional Alignment**:
- **Audit**: Every state change creates an immutable audit log entry
- **Agent Parity**: All endpoints work identically for humans and agents
- **Recursive Tasks**: `parent_task_id` enables unlimited subtask nesting (same-project only)
- **Spec-Driven**: This specification precedes implementation
- **Phase Continuity**: SQLModel schemas preserve Phase 1 Pydantic model contracts

**Worker Lifecycle Model (Project-Scoped with Default)**:
- **All tasks belong to a project** - no exceptions. Personal tasks go in user's Default project.
- **Default Project**: Auto-created for each user on first login. Provides personal workspace.
- **Humans**: No separate worker creation. Adding a user to a project (via SSO ID) auto-creates their worker record.
- **Agents**: Registered globally via `POST /api/workers/agents`, then linked to projects as needed.
- **Constraint**: Tasks can only be assigned to workers (users/agents) linked to that project.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Manage Projects (Priority: P1)

An authenticated user wants to create projects and manage members (humans and agents) who can be assigned tasks within those projects.

**Why this priority**: Foundation - projects and members are prerequisites for all task operations. This proves the API correctly handles authenticated multi-tenant access.

**Independent Test**: Can be fully tested by creating a project, adding users and agents as members, and verifying they appear in project member lists.

**Acceptance Scenarios**:

1. **Given** a new user logs in via SSO for the first time, **Then** a "Default" project is auto-created with the user as owner and sole member
2. **Given** an authenticated user, **When** they call `POST /api/projects` with `{"slug": "taskflow", "name": "TaskFlow Platform"}`, **Then** a project is created with the user as owner and an audit entry is logged
3. **Given** a project exists and user is owner, **When** they call `GET /api/projects/{id}`, **Then** full project details including member count are returned
4. **Given** a project exists, **When** owner calls `POST /api/projects/{pid}/members` with `{"user_id": "<sso-user-id>"}`, **Then** the user is added as a member (worker record auto-created from SSO profile)
5. **Given** a global agent `@claude-code` exists, **When** owner calls `POST /api/projects/{pid}/members` with `{"agent_id": agent.id}`, **Then** the agent is linked to the project
6. **Given** members exist in a project, **When** user calls `GET /api/projects/{pid}/members`, **Then** all members (human and agent) are returned in a unified list with type indicators

---

### User Story 2 - Create and List Tasks (Priority: P1)

A user wants to create tasks with full metadata, list tasks with filters, and view task details including subtasks.

**Why this priority**: Core CRUD - the essential task management functionality that enables all workflow operations.

**Independent Test**: Can be fully tested by creating tasks with various attributes, listing them with filters, and viewing individual task details.

**Acceptance Scenarios**:

1. **Given** a project with workers, **When** user calls `POST /api/projects/{pid}/tasks` with `{"title": "Implement auth", "assignee_id": 1, "priority": "high", "tags": ["api", "security"]}`, **Then** a task is created with ID and an audit entry is logged
2. **Given** tasks exist, **When** user calls `GET /api/projects/{pid}/tasks`, **Then** all project tasks are returned with ID, title, status, assignee, and priority
3. **Given** tasks exist, **When** user calls `GET /api/projects/{pid}/tasks?status=pending&assignee_id=1`, **Then** only matching tasks are returned
4. **Given** a task exists, **When** user calls `GET /api/tasks/{id}`, **Then** full task details including subtasks and latest audit entries are returned
5. **Given** a task exists, **When** user calls `PUT /api/tasks/{id}` with `{"title": "New title", "priority": "low"}`, **Then** the task is updated and an audit entry is logged with old/new values

---

### User Story 3 - Execute Task Workflow (Priority: P1)

A worker (human or agent) wants to claim a task, update progress, and complete it through the defined workflow with optional review gates.

**Why this priority**: The "magic loop" - proves the API can track work execution and handoffs between humans and agents identically.

**Independent Test**: Can be fully tested by walking a single task through the complete workflow: start -> progress -> review -> approve/reject -> complete.

**Acceptance Scenarios**:

1. **Given** a pending task assigned to current user, **When** user calls `PATCH /api/tasks/{id}/status` with `{"status": "in_progress"}`, **Then** task status changes and started_at is set, with audit entry
2. **Given** an in-progress task, **When** user calls `PATCH /api/tasks/{id}/progress` with `{"percent": 50, "note": "Halfway done"}`, **Then** progress is updated and audited
3. **Given** an in-progress task, **When** user calls `PATCH /api/tasks/{id}/status` with `{"status": "completed"}`, **Then** task is completed with 100% progress and completed_at set
4. **Given** an in-progress task, **When** worker calls `PATCH /api/tasks/{id}/status` with `{"status": "review"}`, **Then** task enters review state awaiting approval
5. **Given** a task in review, **When** reviewer calls `POST /api/tasks/{id}/approve`, **Then** task status changes to completed
6. **Given** a task in review, **When** reviewer calls `POST /api/tasks/{id}/reject` with `{"reason": "Needs more tests"}`, **Then** task returns to in_progress with rejection reason in audit

---

### User Story 4 - Create and Manage Subtasks (Priority: P2)

A user or agent wants to decompose tasks into subtasks with automatic progress rollup to parent tasks.

**Why this priority**: Enables recursive task decomposition - agents can autonomously break down work just like humans.

**Independent Test**: Can be fully tested by creating a parent task, adding subtasks via the API, and verifying progress rollup.

**Acceptance Scenarios**:

1. **Given** a task exists, **When** user calls `POST /api/tasks/{id}/subtasks` with `{"title": "Research OAuth"}`, **Then** a subtask is created linked to parent
2. **Given** a parent task with subtasks, **When** user calls `GET /api/tasks/{id}`, **Then** subtasks are included in the response
3. **Given** subtasks exist, **When** all subtasks are marked complete, **Then** parent task progress reflects aggregate completion (calculated field)
4. **Given** an agent is authenticated, **When** agent creates subtasks via API, **Then** audit trail shows agent as actor with identical format to human-created subtasks

---

### User Story 5 - View Audit Trail (Priority: P2)

A project manager wants to see the complete history of who did what, when, and why for any task or across the entire project.

**Why this priority**: Proves accountability - the audit trail is evidence that humans and agents collaborate with full transparency.

**Independent Test**: Can be fully tested by performing various actions and then querying the audit endpoints.

**Acceptance Scenarios**:

1. **Given** actions have been performed on a task, **When** user calls `GET /api/tasks/{id}/audit`, **Then** chronological history is returned showing actor, action, timestamp, and details
2. **Given** actions have been performed in a project, **When** user calls `GET /api/projects/{pid}/audit`, **Then** all project audit entries are returned with pagination
3. **Given** an agent completed work, **When** viewing audit via API, **Then** agent actions appear identically to human actions (only actor_type differs)
4. **Given** a task was updated, **When** viewing its audit, **Then** the entry includes before/after values for changed fields

---

### User Story 6 - Authenticate via Better Auth SSO (Priority: P1)

Users and agents authenticate using JWT tokens issued by the Better Auth SSO platform (002-sso-platform).

**Why this priority**: Security foundation - all API operations require authentication. This validates SSO integration.

**Independent Test**: Can be fully tested by obtaining a JWT from SSO, calling a protected endpoint, and verifying token validation.

**Acceptance Scenarios**:

1. **Given** a valid JWT from SSO, **When** user calls any protected endpoint with `Authorization: Bearer <token>`, **Then** request is authenticated and user info extracted
2. **Given** an expired JWT, **When** user calls a protected endpoint, **Then** 401 Unauthorized is returned with clear error message
3. **Given** a JWT with invalid signature, **When** user calls a protected endpoint, **Then** 401 Unauthorized is returned
4. **Given** SSO is temporarily unavailable, **When** JWKS is cached, **Then** authentication continues using cached keys
5. **Given** an agent (e.g., MCP server), **When** agent calls protected endpoint with JWT from its context, **Then** request is authenticated and actor_type determined from claims

---

### User Story 7 - Register and Link Agents (Priority: P2)

A user wants to register an AI agent globally and link it to their projects where it can work on tasks.

**Why this priority**: Enables Phase III MCP integration - agents need to be registered once and reused across projects.

**Independent Test**: Can be fully tested by registering an agent globally, linking it to a project, and verifying it can be assigned tasks.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they call `POST /api/workers/agents` with `{"handle": "@claude-code", "agent_type": "claude", "capabilities": ["coding"]}`, **Then** a global agent is created
2. **Given** a global agent exists, **When** project owner calls `POST /api/projects/{pid}/members` with `{"agent_id": agent.id}`, **Then** the agent is added as a project member
3. **Given** an agent is a project member, **When** user creates a task with that agent as assignee, **Then** task is created successfully
4. **Given** an agent is NOT a project member, **When** user tries to assign task to that agent, **Then** 400 Bad Request: "Agent not a member of this project"

---

### Edge Cases

- What happens when creating a task with non-existent assignee? -> 400 Bad Request: "Member with ID {id} not found in this project"
- What happens when assigning task to non-member? -> 400 Bad Request: "{handle} is not a member of project {slug}"
- What happens when completing a task that's not in_progress? -> 400 Bad Request with valid status transitions listed
- What happens with circular parent-child references? -> 400 Bad Request: "Circular reference detected"
- What happens when creating subtask with parent in different project? -> 400 Bad Request: "Parent task must be in the same project"
- What happens when creating task without assignee? -> Task created successfully with `assignee_id: null` (can be assigned later)
- What happens when database connection fails? -> 503 Service Unavailable with retry guidance
- What happens when JWKS fetch fails and no cache? -> 503 Service Unavailable: "Authentication service unavailable"
- What happens with concurrent updates to same task? -> Last-write-wins with both changes audited
- What happens when deleting project with tasks? -> 400 Bad Request: "Project has {n} tasks. Delete tasks first or use force=true"

---

## Requirements *(mandatory)*

### Functional Requirements

#### API Infrastructure
- **FR-001**: System MUST expose a RESTful API at `/api/*` endpoints
- **FR-002**: System MUST return JSON responses with consistent error format: `{"error": string, "detail": string, "status_code": int}`
- **FR-003**: System MUST include OpenAPI documentation at `/docs` (Swagger UI) and `/redoc`
- **FR-004**: System MUST provide health endpoints: `GET /health` (liveness) and `GET /health/ready` (readiness with DB check)

#### Authentication & Authorization
- **FR-005**: System MUST verify JWT tokens against Better Auth JWKS endpoint
- **FR-006**: System MUST cache JWKS keys for 1 hour to reduce SSO dependency
- **FR-007**: System MUST determine actor_type (human|agent) from JWT claims or worker registry
- **FR-008**: System MUST extract user identity (id, email, role) from JWT claims
- **FR-009**: System MUST reject requests without valid authentication with 401 Unauthorized
- **FR-010**: Project owners MUST be able to manage their project's workers and tasks
- **FR-011**: Workers MUST only modify tasks assigned to them (unless admin/owner)

#### Projects
- **FR-012**: System MUST support project CRUD operations (create, read, update, delete)
- **FR-013**: Projects MUST have unique slugs and human-readable names
- **FR-014**: System MUST track project owner (creator's user ID from SSO)
- **FR-015**: Deleting a project with tasks MUST require explicit confirmation

#### Users & Members
- **FR-016**: System MUST support two member types: `human` (SSO users) and `agent`
- **FR-017**: System MUST auto-create a "Default" project for each user on first login
- **FR-018**: Adding a user to a project MUST auto-create a worker record from their SSO profile (name, email → handle)
- **FR-019**: Human handles MUST be derived from SSO profile (e.g., email prefix or name → `@sarah`)
- **FR-020**: Agent workers MUST be created globally via `POST /api/workers/agents` with unique handle
- **FR-020a**: Agent handles MUST be globally unique in `@handle` format
- **FR-020e**: Agent workers MUST have `agent_type` and optional `capabilities` fields
- **FR-020b**: Members (users/agents) MUST be added to projects via `POST /api/projects/{pid}/members`
- **FR-020c**: Tasks can ONLY be assigned to members of that project

#### Tasks
- **FR-021**: System MUST auto-generate sequential integer IDs for tasks within a project
- **FR-022**: Tasks MUST have required `title` and optional `description`, `priority`, `tags`, `due_date`, `assignee_id`
- **FR-022a**: `assignee_id` is OPTIONAL at task creation (tasks can be created unassigned and assigned later)
- **FR-023**: Tasks MUST support assignment to any worker registered in the same project (validated against ProjectWorker)
- **FR-024**: Tasks MUST support status values: `pending`, `in_progress`, `review`, `completed`, `blocked`
- **FR-025**: System MUST enforce valid status transitions per Phase 1 specification
- **FR-026**: Tasks MUST support progress tracking as integer percentage (0-100)
- **FR-027**: Tasks MUST support recursive parent-child relationships via `parent_task_id`
- **FR-027a**: Parent task MUST belong to the same project as child task (cross-project hierarchies NOT supported)
- **FR-028**: System MUST prevent circular parent-child references

#### Audit Trail
- **FR-029**: System MUST create an audit log entry for EVERY state-changing operation
- **FR-030**: Audit entries MUST include: entity_type, entity_id, action, actor_id, actor_type, details, timestamp
- **FR-031**: Audit log MUST be append-only (no updates or deletes allowed)
- **FR-032**: System MUST support querying audit by task ID, project ID, or actor ID
- **FR-033**: Audit entries MUST capture before/after values for updates

#### Database
- **FR-034**: System MUST use PostgreSQL (Neon serverless) for persistence
- **FR-035**: System MUST use async database operations for all queries
- **FR-036**: System MUST support connection pooling for concurrent requests
- **FR-037**: Database schema MUST be compatible with Phase 1 Pydantic models

#### CORS & Security
- **FR-038**: System MUST configure CORS to allow frontend origin(s)
- **FR-039**: System MUST not expose internal error details in production
- **FR-040**: System MUST use parameterized queries to prevent SQL injection

---

### Key Entities

- **Project**: Container for tasks and workers. Has id (int PK), slug (unique), name, description, owner_id (SSO user), created_at, updated_at.

- **Worker**: A human or AI agent that can be assigned tasks. Has id (int PK), handle (@format), name, type (human|agent), agent_type (for agents), capabilities (list), user_id (for humans, FK to SSO user), created_at.
  - **Human workers**: Auto-created when user is added to a project; handle derived from SSO profile.
  - **Agent workers**: Created globally via API; handle must be globally unique.

- **ProjectMember**: Link table connecting users/agents to projects. Has project_id, worker_id, role (owner|member), joined_at. **Critical**: Tasks can only be assigned to members present in this table for their project.

- **Task**: A unit of work. Has id (int PK), title, description, project_id, assignee_id (FK to Worker, NULLABLE), parent_task_id (FK to self, MUST be same project), status, progress_percent, priority, tags, due_date, created_by_id, started_at, completed_at, created_at, updated_at.

- **AuditLog**: Immutable record of every action. Has id (int PK), entity_type, entity_id, action, actor_id, actor_type (human|agent), details (JSON), created_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a project and add workers in under 30 seconds via API
- **SC-002**: Users can create a task with full metadata in a single API call
- **SC-003**: Task status changes are reflected in subsequent GET requests within 1 second
- **SC-004**: Human and agent workers appear in the same unified worker list with type indicators
- **SC-005**: Task assignment to `@claude-code` uses identical API format as assignment to `@sarah`
- **SC-006**: Audit trail for any task shows complete history with actor identification
- **SC-007**: 100% of state-changing operations produce audit log entries
- **SC-008**: API responses return in under 200ms for single-entity operations (p95)
- **SC-009**: API handles 100 concurrent requests without error
- **SC-010**: JWT validation succeeds using cached JWKS when SSO is temporarily unavailable
- **SC-011**: All API endpoints return consistent error format with actionable messages

---

## Constraints

- **C-001**: MUST use FastAPI framework for API implementation
- **C-002**: MUST use SQLModel for database models (Pydantic + SQLAlchemy)
- **C-003**: MUST use Neon PostgreSQL (serverless) for database
- **C-004**: MUST integrate with existing Better Auth SSO (002-sso-platform)
- **C-005**: MUST use UV for Python package management
- **C-006**: MUST use async/await for all database operations
- **C-007**: Data models MUST be compatible with Phase 1 CLI Pydantic schemas
- **C-008**: API contracts MUST support Phase III MCP server integration

---

## Non-Goals

- **NG-001**: Web UI implementation (separate Phase II frontend spec)
- **NG-002**: MCP server implementation (Phase III)
- **NG-003**: Real-time WebSocket updates (Phase V)
- **NG-004**: File attachments to tasks
- **NG-005**: Email notifications or reminders
- **NG-006**: Calendar integration
- **NG-007**: Time tracking or billing
- **NG-008**: Database migration tooling (manual schema sync for now)

---

## Assumptions

- Python 3.13+ is available in the deployment environment
- Neon PostgreSQL database is provisioned and accessible
- Better Auth SSO (002-sso-platform) is deployed and operational
- Frontend will handle token refresh; backend only validates tokens
- Single-region deployment initially (multi-region is Phase V)
- Agents authenticate via API keys generated through the admin API
- All timestamps are stored in UTC

---

## API Endpoints Summary

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check (always returns 200) |
| GET | `/health/ready` | Readiness check (verifies DB connection) |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{pid}/members` | List project members (humans + agents) |
| POST | `/api/projects/{pid}/members` | Add user (by SSO ID) or agent to project |
| DELETE | `/api/projects/{pid}/members/{id}` | Remove member from project |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workers/agents` | Register global agent |
| GET | `/api/workers/agents` | List all global agents |
| GET | `/api/workers/agents/{id}` | Get agent details |
| PUT | `/api/workers/agents/{id}` | Update agent |
| DELETE | `/api/workers/agents/{id}` | Delete agent |

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
| POST | `/api/tasks/{id}/approve` | Approve reviewed task |
| POST | `/api/tasks/{id}/reject` | Reject reviewed task |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{id}/audit` | Get task audit trail |
| GET | `/api/projects/{pid}/audit` | Get project audit trail |

---

## Phase Continuity Notes

The data models defined here MUST persist through all 5 phases:

| Phase | Storage | Notes |
|-------|---------|-------|
| I (CLI) | JSON files | Pydantic models (implemented) |
| II (Web) | PostgreSQL | SQLModel (this spec) - same schema |
| III (MCP) | PostgreSQL | MCP tools call these API endpoints |
| IV (K8s) | PostgreSQL | Same APIs, containerized |
| V (Prod) | PostgreSQL + Kafka | Events for audit stream |

**Critical**: The Task, Worker, Project, AuditLog schemas defined here MUST be field-compatible with Phase 1 CLI models to ensure data portability.
