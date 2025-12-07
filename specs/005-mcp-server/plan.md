# Implementation Plan: TaskFlow MCP Server

**Branch**: `005-mcp-server` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-mcp-server/spec.md`

## Summary

Build a FastMCP-based MCP server that exposes 10 task management tools for AI agents. The server uses Stateless Streamable HTTP transport, accepts user_id as a parameter (no auth), and calls the existing REST API endpoints via httpx. This enables AI agents to be first-class workers in the TaskFlow platform.

## Technical Context

**Language/Version**: Python 3.13+
**Primary Dependencies**: FastMCP (mcp>=1.22.0), httpx, pydantic, starlette
**Storage**: N/A (calls REST API which handles persistence)
**Testing**: pytest with pytest-asyncio
**Target Platform**: Linux/macOS server, Docker container
**Project Type**: Single package in monorepo
**Performance Goals**: <2s response time per tool call
**Constraints**: No authentication (user_id passed as parameter)
**Scale/Scope**: 10 MCP tools, single server instance

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| ✓ Audit | PASS | MCP tools call REST API which already creates audit entries |
| ✓ Agent Parity | PASS | 10 MCP tools mirror CLI/Web operations |
| ✓ Recursive Tasks | PASS | Agents can create subtasks via taskflow_add_task with parent context |
| ✓ Spec-Driven | PASS | Spec created before implementation |
| ✓ Phase Continuity | PASS | No new data models - uses existing REST API |

## Project Structure

### Documentation (this feature)

```text
specs/005-mcp-server/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown (created by /sp.tasks)
```

### Source Code

```text
packages/mcp-server/
├── pyproject.toml           # Package configuration (uv/hatch)
├── README.md                # Quick start documentation
├── src/
│   └── taskflow_mcp/
│       ├── __init__.py      # Package exports
│       ├── app.py           # FastMCP singleton instance
│       ├── server.py        # Starlette app with CORS, uvicorn entry
│       ├── config.py        # Pydantic settings from environment
│       ├── api_client.py    # httpx async REST API client
│       ├── models.py        # Pydantic input/output models
│       └── tools/
│           ├── __init__.py  # Tool registration imports
│           ├── tasks.py     # 8 task management tools
│           └── projects.py  # 2 project tools
└── tests/
    ├── conftest.py          # Test fixtures
    ├── test_api_client.py   # API client unit tests
    └── test_tools.py        # Tool integration tests
```

**Structure Decision**: Follows panaversity-fs pattern with singleton MCP instance in app.py, Starlette wrapper in server.py, and tool modules that import from app.py.

## Implementation Phases

### Phase 1: Project Setup & Configuration

**Goal**: Create package structure with configuration management

**Files to create**:
- `packages/mcp-server/pyproject.toml` - Package dependencies
- `packages/mcp-server/src/taskflow_mcp/__init__.py` - Package exports
- `packages/mcp-server/src/taskflow_mcp/config.py` - Pydantic settings

**Dependencies**:
```toml
[project]
dependencies = [
    "mcp>=1.22.0",
    "httpx>=0.28.0",
    "pydantic>=2.12.0",
    "pydantic-settings>=2.0.0",
    "starlette>=0.45.0",
    "uvicorn>=0.34.0",
]
```

**Configuration**:
```python
class Settings(BaseSettings):
    api_url: str = "http://localhost:8000"
    api_timeout: float = 30.0
    mcp_host: str = "0.0.0.0"
    mcp_port: int = 8001

    model_config = SettingsConfigDict(env_prefix="TASKFLOW_")
```

### Phase 2: API Client

**Goal**: Create async httpx client for REST API calls

**File**: `packages/mcp-server/src/taskflow_mcp/api_client.py`

**Key patterns**:
- Singleton httpx.AsyncClient with connection pooling
- User context passed via custom header (X-User-ID)
- Error handling that returns actionable messages
- Automatic JSON response parsing

**Methods**:
```python
class TaskFlowAPIClient:
    async def list_projects(self, user_id: str) -> list[dict]
    async def list_tasks(self, user_id: str, project_id: int, status: str | None) -> list[dict]
    async def create_task(self, user_id: str, project_id: int, title: str, description: str | None) -> dict
    async def get_task(self, user_id: str, task_id: int) -> dict
    async def update_task(self, user_id: str, task_id: int, title: str | None, description: str | None) -> dict
    async def delete_task(self, user_id: str, task_id: int) -> dict
    async def update_status(self, user_id: str, task_id: int, status: str) -> dict
    async def update_progress(self, user_id: str, task_id: int, percent: int, note: str | None) -> dict
    async def assign_task(self, user_id: str, task_id: int, assignee_id: int) -> dict
```

### Phase 3: Pydantic Models

**Goal**: Define input validation models for all MCP tools

**File**: `packages/mcp-server/src/taskflow_mcp/models.py`

**Models**:
```python
# Input models (one per tool)
class AddTaskInput(BaseModel):
    user_id: str
    project_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None

class ListTasksInput(BaseModel):
    user_id: str
    project_id: int
    status: Literal["all", "pending", "in_progress", "completed"] | None = "all"

class TaskIdInput(BaseModel):
    user_id: str
    task_id: int

class UpdateTaskInput(BaseModel):
    user_id: str
    task_id: int
    title: str | None = None
    description: str | None = None

class ProgressInput(BaseModel):
    user_id: str
    task_id: int
    progress_percent: int = Field(..., ge=0, le=100)
    note: str | None = None

class AssignInput(BaseModel):
    user_id: str
    task_id: int
    assignee_id: int

class ListProjectsInput(BaseModel):
    user_id: str

# Output models
class TaskResult(BaseModel):
    task_id: int
    status: str
    title: str
```

### Phase 4: FastMCP Server Setup

**Goal**: Create FastMCP instance with stateless HTTP transport

**Files**:
- `packages/mcp-server/src/taskflow_mcp/app.py` - Singleton MCP instance
- `packages/mcp-server/src/taskflow_mcp/server.py` - Starlette wrapper

**app.py pattern** (from panaversity-fs):
```python
from mcp.server.fastmcp import FastMCP

def _create_mcp() -> FastMCP:
    return FastMCP(
        "taskflow_mcp",
        stateless_http=True,
        json_response=True,
    )

mcp = _create_mcp()
```

**server.py pattern**:
```python
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount

# Import tools to register them
import taskflow_mcp.tools.tasks
import taskflow_mcp.tools.projects

streamable_http_app = CORSMiddleware(
    Starlette(
        routes=[Mount("/", app=mcp.streamable_http_app())],
        lifespan=starlette_lifespan,
    ),
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### Phase 5: MCP Tools - Tasks

**Goal**: Implement 8 task management tools

**File**: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`

**Tools**:
1. `taskflow_add_task` - Create new task
2. `taskflow_list_tasks` - List project tasks
3. `taskflow_complete_task` - Mark task complete
4. `taskflow_delete_task` - Remove task
5. `taskflow_update_task` - Modify task
6. `taskflow_start_task` - Claim and start task
7. `taskflow_update_progress` - Report progress
8. `taskflow_request_review` - Submit for review
9. `taskflow_assign_task` - Assign to worker

**Tool pattern**:
```python
@mcp.tool(
    name="taskflow_add_task",
    annotations={
        "title": "Add Task",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False
    }
)
async def taskflow_add_task(params: AddTaskInput, ctx: Context) -> str:
    """Create a new task in a project."""
    client = get_api_client()
    result = await client.create_task(
        user_id=params.user_id,
        project_id=params.project_id,
        title=params.title,
        description=params.description,
    )
    return json.dumps({
        "task_id": result["id"],
        "status": "created",
        "title": result["title"],
    })
```

### Phase 6: MCP Tools - Projects

**Goal**: Implement project listing tool

**File**: `packages/mcp-server/src/taskflow_mcp/tools/projects.py`

**Tools**:
1. `taskflow_list_projects` - List user's projects

### Phase 7: Testing

**Goal**: Create test suite for API client and tools

**Files**:
- `packages/mcp-server/tests/conftest.py` - Fixtures
- `packages/mcp-server/tests/test_api_client.py` - Client tests
- `packages/mcp-server/tests/test_tools.py` - Integration tests

**Testing approach**:
- Mock httpx responses for unit tests
- Use respx library for HTTP mocking
- Test error handling paths

## Complexity Tracking

> No constitution violations detected. Implementation follows established patterns from panaversity-fs reference.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| REST API not running | Clear error message with connection retry suggestion |
| Invalid user_id | Return 403 error from REST API, pass through to agent |
| Rate limiting | httpx client with reasonable timeouts |
| MCP SDK version incompatibility | Pin to mcp>=1.22.0 (tested with panaversity-fs) |

## Dependencies

- Existing REST API must be running (packages/api)
- No database access needed (stateless)
- No authentication handling (Chat Server responsibility)
