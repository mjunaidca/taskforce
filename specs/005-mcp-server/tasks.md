# Tasks: TaskFlow MCP Server

**Branch**: `005-mcp-server` | **Date**: 2025-12-07 | **Plan**: [plan.md](./plan.md)

## Task Dependency Graph

```
[T1] Package Setup
     ↓
[T2] Configuration ──┐
     ↓               │
[T3] API Client ─────┤
     ↓               │
[T4] Pydantic Models─┤
     ↓               │
[T5] FastMCP App ────┤
     ↓               │
[T6] Task Tools ─────┤
     ↓               │
[T7] Project Tools ──┘
     ↓
[T8] Server Entry Point
     ↓
[T9] Tests
     ↓
[T10] Documentation
```

## Tasks

### T1: Create Package Structure
**Status**: pending
**Priority**: P1
**Estimate**: 5 min

Create the MCP server package with pyproject.toml and directory structure.

**Files to create**:
- `packages/mcp-server/pyproject.toml`
- `packages/mcp-server/src/taskflow_mcp/__init__.py`
- `packages/mcp-server/src/taskflow_mcp/tools/__init__.py`
- `packages/mcp-server/tests/__init__.py`

**Acceptance**:
- [ ] `cd packages/mcp-server && uv sync` succeeds
- [ ] Package imports work: `from taskflow_mcp import __version__`

---

### T2: Implement Configuration Module
**Status**: pending
**Priority**: P1
**Estimate**: 5 min
**Depends on**: T1

Create Pydantic settings for environment configuration.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/config.py`

**Configuration**:
```python
TASKFLOW_API_URL=http://localhost:8000
TASKFLOW_API_TIMEOUT=30.0
TASKFLOW_MCP_HOST=0.0.0.0
TASKFLOW_MCP_PORT=8001
```

**Acceptance**:
- [ ] Settings load from environment variables
- [ ] Default values work when env vars not set
- [ ] `get_config()` returns singleton settings instance

---

### T3: Implement API Client
**Status**: pending
**Priority**: P1
**Estimate**: 15 min
**Depends on**: T2

Create async httpx client for REST API calls.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/api_client.py`

**Methods to implement**:
- `list_projects(user_id)` → GET /api/projects
- `list_tasks(user_id, project_id, status)` → GET /api/projects/{id}/tasks
- `create_task(user_id, project_id, title, description)` → POST /api/projects/{id}/tasks
- `get_task(user_id, task_id)` → GET /api/tasks/{id}
- `update_task(user_id, task_id, title, description)` → PUT /api/tasks/{id}
- `delete_task(user_id, task_id)` → DELETE /api/tasks/{id}
- `update_status(user_id, task_id, status)` → PATCH /api/tasks/{id}/status
- `update_progress(user_id, task_id, percent, note)` → PATCH /api/tasks/{id}/progress
- `assign_task(user_id, task_id, assignee_id)` → PATCH /api/tasks/{id}/assign

**Key patterns**:
- User context passed via custom header for internal service calls
- Graceful error handling with actionable messages
- Connection pooling via singleton client

**Acceptance**:
- [ ] All API methods implemented
- [ ] Error responses include original error message
- [ ] Timeout handling works correctly

---

### T4: Create Pydantic Input Models
**Status**: pending
**Priority**: P1
**Estimate**: 10 min
**Depends on**: T1

Define input validation models for all MCP tools.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/models.py`

**Models**:
- `AddTaskInput` - user_id, project_id, title, description?
- `ListTasksInput` - user_id, project_id, status?
- `TaskIdInput` - user_id, task_id (for complete, delete, start, review)
- `UpdateTaskInput` - user_id, task_id, title?, description?
- `ProgressInput` - user_id, task_id, progress_percent, note?
- `AssignInput` - user_id, task_id, assignee_id
- `ListProjectsInput` - user_id

**Acceptance**:
- [ ] All input models defined with proper validation
- [ ] Field constraints (min/max length, ranges) specified
- [ ] Optional fields have sensible defaults

---

### T5: Create FastMCP Application Instance
**Status**: pending
**Priority**: P1
**Estimate**: 5 min
**Depends on**: T2

Create singleton FastMCP instance with stateless HTTP configuration.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/app.py`

**Configuration**:
```python
mcp = FastMCP(
    "taskflow_mcp",
    stateless_http=True,
    json_response=True,
)
```

**Acceptance**:
- [ ] MCP instance created with correct settings
- [ ] Singleton pattern prevents multiple instances

---

### T6: Implement Task Tools
**Status**: pending
**Priority**: P1
**Estimate**: 20 min
**Depends on**: T3, T4, T5

Implement 9 task management MCP tools.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`

**Tools to implement**:
1. `taskflow_add_task` - Create new task
2. `taskflow_list_tasks` - List project tasks
3. `taskflow_complete_task` - Mark task complete (status → completed)
4. `taskflow_delete_task` - Remove task
5. `taskflow_update_task` - Modify task title/description
6. `taskflow_start_task` - Claim and start task (status → in_progress)
7. `taskflow_update_progress` - Report progress percentage
8. `taskflow_request_review` - Submit for review (status → review)
9. `taskflow_assign_task` - Assign to worker

**Tool annotations**:
- readOnlyHint: false for mutations, true for list
- destructiveHint: true for delete
- idempotentHint: based on operation

**Acceptance**:
- [ ] All 9 tools registered with MCP instance
- [ ] Each tool has proper annotations
- [ ] Error handling returns actionable messages
- [ ] Response format: {task_id, status, title}

---

### T7: Implement Project Tools
**Status**: pending
**Priority**: P2
**Estimate**: 5 min
**Depends on**: T3, T4, T5

Implement project listing MCP tool.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/tools/projects.py`

**Tools**:
1. `taskflow_list_projects` - List user's projects

**Acceptance**:
- [ ] Tool returns array of projects with id, name, slug
- [ ] readOnlyHint: true

---

### T8: Create Server Entry Point
**Status**: pending
**Priority**: P1
**Estimate**: 10 min
**Depends on**: T5, T6, T7

Create Starlette wrapper with CORS and uvicorn entry point.

**Files to create**:
- `packages/mcp-server/src/taskflow_mcp/server.py`

**Key components**:
- Import all tool modules to register decorators
- Starlette app with MCP mount at "/"
- CORS middleware for browser clients
- Lifespan manager for session cleanup
- uvicorn runner with reload for development

**Acceptance**:
- [ ] Server starts on configured port
- [ ] MCP Inspector can connect and list tools
- [ ] CORS allows browser-based clients

---

### T9: Create Test Suite
**Status**: pending
**Priority**: P2
**Estimate**: 15 min
**Depends on**: T8

Create tests for API client and tools.

**Files to create**:
- `packages/mcp-server/tests/conftest.py`
- `packages/mcp-server/tests/test_api_client.py`
- `packages/mcp-server/tests/test_tools.py`

**Test cases**:
- API client error handling
- Tool input validation
- Response format verification

**Acceptance**:
- [ ] Tests pass with mocked API responses
- [ ] Error paths covered

---

### T10: Create Documentation
**Status**: pending
**Priority**: P3
**Estimate**: 5 min
**Depends on**: T8

Create README with quick start instructions.

**Files to create**:
- `packages/mcp-server/README.md`

**Content**:
- Quick start commands
- Environment variables
- MCP Inspector testing instructions
- Tool reference table

**Acceptance**:
- [ ] README includes all setup steps
- [ ] Tool reference table complete

---

## Summary

| Task | Status | Priority | Estimate | Dependencies |
|------|--------|----------|----------|--------------|
| T1: Package Setup | pending | P1 | 5 min | - |
| T2: Configuration | pending | P1 | 5 min | T1 |
| T3: API Client | pending | P1 | 15 min | T2 |
| T4: Pydantic Models | pending | P1 | 10 min | T1 |
| T5: FastMCP App | pending | P1 | 5 min | T2 |
| T6: Task Tools | pending | P1 | 20 min | T3, T4, T5 |
| T7: Project Tools | pending | P2 | 5 min | T3, T4, T5 |
| T8: Server Entry | pending | P1 | 10 min | T5, T6, T7 |
| T9: Tests | pending | P2 | 15 min | T8 |
| T10: Documentation | pending | P3 | 5 min | T8 |

**Total Estimated Time**: ~95 minutes
