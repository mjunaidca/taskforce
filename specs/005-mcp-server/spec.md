# Feature Specification: TaskFlow MCP Server

**Feature Branch**: `005-mcp-server`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Build MCP server for Phase III that exposes task management tools for AI agents via Stateless Streamable HTTP transport"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Lists and Manages Tasks (Priority: P1)

An AI agent connects to the TaskFlow MCP server to view assigned tasks and perform basic operations. The agent can list tasks in a project, create new tasks, and mark tasks as complete.

**Why this priority**: Core functionality required by hackathon - agents must be able to perform basic task CRUD operations to demonstrate human-agent parity.

**Independent Test**: Can be fully tested by connecting MCP Inspector to the server and invoking `taskflow_list_tasks`, `taskflow_add_task`, and `taskflow_complete_task` tools.

**Acceptance Scenarios**:

1. **Given** an agent with a valid user_id and project_id, **When** agent calls `taskflow_list_tasks`, **Then** returns array of tasks in that project with id, title, status, and assignee_handle
2. **Given** an agent with a valid user_id and project_id, **When** agent calls `taskflow_add_task` with title, **Then** creates task and returns task_id, status="created", and title
3. **Given** an agent with a valid user_id and task_id, **When** agent calls `taskflow_complete_task`, **Then** marks task as completed and returns task_id, status="completed", title

---

### User Story 2 - Agent Updates and Deletes Tasks (Priority: P2)

An AI agent modifies existing tasks by updating their title/description or deleting tasks that are no longer needed.

**Why this priority**: Essential for full task lifecycle management, but secondary to create/read/complete operations.

**Independent Test**: Can be tested by creating a task, updating it via `taskflow_update_task`, then deleting via `taskflow_delete_task`.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** agent calls `taskflow_update_task` with new title, **Then** task title is updated and returns task_id, status="updated", new title
2. **Given** an existing task without subtasks, **When** agent calls `taskflow_delete_task`, **Then** task is deleted and returns task_id, status="deleted", title

---

### User Story 3 - Agent Workflow Operations (Priority: P2)

An AI agent performs workflow actions: starting a task, updating progress, assigning to workers, and requesting review.

**Why this priority**: Enables agents to be first-class workers who can claim and progress through tasks autonomously.

**Independent Test**: Can be tested by claiming a task with `taskflow_start_task`, updating progress with `taskflow_update_progress`, then requesting review with `taskflow_request_review`.

**Acceptance Scenarios**:

1. **Given** a pending task assigned to the agent, **When** agent calls `taskflow_start_task`, **Then** task status changes to "in_progress" and started_at is set
2. **Given** an in_progress task, **When** agent calls `taskflow_update_progress` with percent and note, **Then** progress_percent is updated and audit log created
3. **Given** an in_progress task, **When** agent calls `taskflow_request_review`, **Then** task status changes to "review"
4. **Given** a task, **When** agent calls `taskflow_assign_task` with assignee_handle, **Then** task is assigned to that worker

---

### User Story 4 - Agent Project Discovery (Priority: P3)

An AI agent lists available projects to understand the workspace context before managing tasks.

**Why this priority**: Useful for agents to discover context, but agents typically already know their project_id from the chat server.

**Independent Test**: Can be tested by calling `taskflow_list_projects` and verifying projects are returned.

**Acceptance Scenarios**:

1. **Given** an agent with a valid user_id, **When** agent calls `taskflow_list_projects`, **Then** returns array of projects the user belongs to with id, name, slug

---

### Edge Cases

- What happens when task_id doesn't exist? → Returns error with message "Task not found"
- What happens when user_id is not a member of the project? → Returns error "Not a member of this project"
- What happens when invalid status transition is attempted? → Returns error with valid transitions
- What happens when REST API is unavailable? → Returns connection error with retry suggestion
- What happens when trying to delete task with subtasks? → Returns error "Cannot delete task with subtasks"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: MCP server MUST expose 10 tools for task management (5 core + 5 extended)
- **FR-002**: MCP server MUST use Stateless Streamable HTTP transport (not stdio)
- **FR-003**: MCP server MUST accept user_id as a parameter (no auth - Chat Server validates upstream)
- **FR-004**: MCP server MUST call existing REST API endpoints (not duplicate DB logic)
- **FR-005**: MCP server MUST return JSON responses (machine-readable for agents)
- **FR-006**: MCP server MUST include relevant IDs and status in all responses
- **FR-007**: MCP server MUST handle REST API errors gracefully with actionable messages
- **FR-008**: MCP server MUST use httpx for async REST API calls
- **FR-009**: MCP server MUST use Pydantic for input validation
- **FR-010**: MCP server MUST be configurable via environment variables (TASKFLOW_API_URL, MCP_PORT)

### MCP Tools Specification

| Tool | Purpose | Params | REST Endpoint |
|------|---------|--------|---------------|
| `taskflow_add_task` | Create new task | user_id, project_id, title, description? | POST /api/projects/{id}/tasks |
| `taskflow_list_tasks` | List project tasks | user_id, project_id, status? | GET /api/projects/{id}/tasks |
| `taskflow_complete_task` | Mark task complete | user_id, task_id | PATCH /api/tasks/{id}/status |
| `taskflow_delete_task` | Remove task | user_id, task_id | DELETE /api/tasks/{id} |
| `taskflow_update_task` | Modify task | user_id, task_id, title?, description? | PUT /api/tasks/{id} |
| `taskflow_list_projects` | List user projects | user_id | GET /api/projects |
| `taskflow_assign_task` | Assign to worker | user_id, task_id, assignee_id | PATCH /api/tasks/{id}/assign |
| `taskflow_start_task` | Claim and start task | user_id, task_id | PATCH /api/tasks/{id}/status |
| `taskflow_update_progress` | Report progress | user_id, task_id, percent, note? | PATCH /api/tasks/{id}/progress |
| `taskflow_request_review` | Submit for review | user_id, task_id | PATCH /api/tasks/{id}/status |

### Key Entities

- **MCP Server**: FastMCP instance with stateless HTTP transport exposing task management tools
- **API Client**: httpx-based async client that calls TaskFlow REST API with user context
- **Tool Input Models**: Pydantic models for each MCP tool's input validation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 10 MCP tools respond within 2 seconds under normal load
- **SC-002**: MCP Inspector can connect and list all tools without errors
- **SC-003**: Each tool returns properly formatted JSON with task_id, status, and relevant data
- **SC-004**: Error responses include actionable message and original task_id for context
- **SC-005**: Server starts and accepts connections on configured port (default 8001)
- **SC-006**: All tool invocations create corresponding audit entries via REST API

## Technical Context

### Package Structure
```
packages/mcp-server/
├── pyproject.toml
├── src/
│   └── taskflow_mcp/
│       ├── __init__.py
│       ├── app.py              # FastMCP singleton instance
│       ├── server.py           # Starlette app with CORS
│       ├── config.py           # Settings from environment
│       ├── api_client.py       # httpx REST API client
│       ├── models.py           # Pydantic input/output models
│       └── tools/
│           ├── __init__.py
│           ├── tasks.py        # Task management tools
│           └── projects.py     # Project tools
└── tests/
    └── test_tools.py
```

### Configuration
- `TASKFLOW_API_URL`: REST API base URL (default: http://localhost:8000)
- `TASKFLOW_SERVICE_TOKEN`: Optional token for internal API calls
- `MCP_PORT`: Server port (default: 8001)
- `MCP_HOST`: Server host (default: 0.0.0.0)

### Reference Implementation
- Pattern reference: `panaversity-fs` MCP server in this repo
- Uses FastMCP with `stateless_http=True, json_response=True`
- Starlette wrapper with CORS for browser-based MCP clients
