# Implementation Plan: TaskFlow Chat Server

**Feature**: 006-chat-server
**Spec**: `specs/006-chat-server/spec.md`
**Created**: 2025-12-07
**Status**: Ready for Implementation

## Technical Context

### Strategy: Reuse Existing Infrastructure + Focus on Agent

**Key Insight**: We already have working ChatKit infrastructure in `rag-agent/`. We will:
1. **Copy** the `chatkit_store/` module (proven, production-ready)
2. **Focus** on building the TaskFlow-specific agent with `@function_tool` decorators
3. **MCP Optional**: Agent works standalone; MCP integration added when server is ready

### Existing Infrastructure to REUSE

| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| FastAPI App | `packages/api/src/taskflow_api/main.py` | Extend with chat router |
| JWT/JWKS Auth | `packages/api/src/taskflow_api/auth.py` | Reuse `get_current_user` |
| Database Session | `packages/api/src/taskflow_api/database.py` | Use for task operations |
| **ChatKit Store** | `rag-agent/chatkit_store/` | **Copy entire module** (separate DB) |
| ChatKit Patterns | `rag-agent/chatkit_server.py` | Adapt respond() pattern |

### OpenAI Agents SDK - Key Classes (from Context7)

```python
# Agent with function tools (works WITHOUT MCP)
from agents import Agent, Runner, function_tool

@function_tool
def add_task(title: str, project_id: int) -> dict:
    """Add a new task to the project."""
    # Calls existing TaskFlow API/database directly
    ...

agent = Agent(
    name="TaskFlow Assistant",
    instructions=SYSTEM_PROMPT,
    tools=[add_task, list_tasks, complete_task, ...]  # Function tools
)

result = await Runner.run(agent, user_message)
```

```python
# Agent WITH MCP (when MCP server is ready)
from agents.mcp import MCPServerStreamableHttp

async with MCPServerStreamableHttp(
    name="TaskFlow MCP",
    params={
        "url": "http://localhost:8001/mcp",
        "timeout": 30,
    },
) as mcp_server:
    agent = Agent(
        name="TaskFlow Assistant",
        instructions=SYSTEM_PROMPT,
        mcp_servers=[mcp_server],  # MCP tools discovered dynamically
    )
```

### Key Dependencies

```toml
# Add to packages/api/pyproject.toml
[project.dependencies]
openai-agents = ">=0.0.9"
chatkit = ">=0.1.0"
# httpx already present for auth
```

## Constitution Check

| Principle | Status | Implementation |
|-----------|--------|----------------|
| Audit Trail | ✓ | Function tools call audit service directly |
| Agent Parity | ✓ | Same operations available via CLI/Web/Chat |
| Recursive Tasks | ✓ | add_subtask function tool available |
| Spec-Driven | ✓ | Spec exists at specs/006-chat-server/spec.md |
| Phase Continuity | ✓ | ChatKit uses separate DB; Task model unchanged |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      packages/api                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    FastAPI Application                       ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ ││
│  │  │ /api/projects │  │  /api/tasks   │  │   /api/chat     │ ││
│  │  │ /api/workers  │  │  /api/audit   │  │   (NEW)         │ ││
│  │  └───────────────┘  └───────────────┘  └────────┬────────┘ ││
│  └─────────────────────────────────────────────────┼──────────┘│
│                                                     │           │
│  ┌─────────────────────────────────────────────────▼──────────┐│
│  │                    Chat Service Layer                       ││
│  │  ┌────────────────────┐  ┌────────────────────────────────┐││
│  │  │   ChatKit Store    │  │     TaskFlow Agent             │││
│  │  │   (PostgresStore)  │  │   (OpenAI Agents SDK)          │││
│  │  │   [COPY from       │  │   [@function_tool decorators]  │││
│  │  │    rag-agent]      │  │                                │││
│  │  └────────────────────┘  └────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (OPTIONAL - Phase 2)
┌─────────────────────────────────────────────────────────────────┐
│                   TaskFlow MCP Server                            │
│           (MCPServerStreamableHttp when ready)                   │
│  URL: http://localhost:8001/mcp (Streamable HTTP transport)     │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Copy ChatKit Store Module (15 min)

**Goal**: Bring proven chatkit_store module into packages/api

**Files to Copy from `rag-agent/chatkit_store/`**:
```
packages/api/src/taskflow_api/
├── chatkit_store/
│   ├── __init__.py          # Copy as-is
│   ├── config.py            # Update prefix to TASKFLOW_CHATKIT_
│   ├── context.py           # Copy as-is
│   └── postgres_store.py    # Copy as-is
```

**Modifications**:
- `config.py`: Change `env_prefix="CHATKIT_STORE_"` → `env_prefix="TASKFLOW_CHATKIT_"`
- `config.py`: Change `schema_name: str = "chatkit"` → `schema_name: str = "taskflow_chat"`

### Phase 2: Create TaskFlow Agent with MCP (30 min) ⭐ CORE WORK

**Goal**: Configure Agent that connects to TaskFlow MCP Server via Streamable HTTP

**Files to Create**:
```
packages/api/src/taskflow_api/
├── services/
│   └── chat_agent.py        # Agent factory with MCP connection
```

**Agent with MCP** (tools discovered dynamically from MCP server):
```python
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

TASKFLOW_SYSTEM_PROMPT = """You are TaskFlow Assistant, helping users manage their tasks.

User: {user_name}
Current Project: {project_name} (ID: {project_id})

You can use the available tools to:
- Add, list, update, delete tasks
- Mark tasks complete
- Assign tasks to team members or agents
- Track progress

Always confirm actions with the user. Be concise and helpful.
When showing task lists, format them clearly with ID, title, status, and assignee.
"""

async def create_taskflow_agent(
    user_name: str,
    project_name: str,
    project_id: int,
    mcp_server_url: str,
) -> tuple[Agent, MCPServerStreamableHttp]:
    """Create agent with MCP server connection.

    Returns tuple of (agent, mcp_server) - caller must manage context.
    """
    mcp_server = MCPServerStreamableHttp(
        name="TaskFlow MCP",
        params={
            "url": mcp_server_url,  # http://localhost:8001/mcp
            "timeout": 30,
        },
        cache_tools_list=True,
        max_retry_attempts=3,
    )

    agent = Agent(
        name="TaskFlow Assistant",
        instructions=TASKFLOW_SYSTEM_PROMPT.format(
            user_name=user_name,
            project_name=project_name,
            project_id=project_id,
        ),
        mcp_servers=[mcp_server],  # Tools discovered from MCP!
    )

    return agent, mcp_server
```

**Key Point**: No `@function_tool` layer needed! MCP server exposes tools like:
- `taskflow_add_task`
- `taskflow_list_tasks`
- `taskflow_complete_task`
- `taskflow_update_task`
- `taskflow_delete_task`

Agent discovers these dynamically via MCP protocol.

### Phase 3: Create ChatKit Server Adapter (30 min)

**Goal**: Adapt ChatKit server pattern for TaskFlow with MCP integration

**Files to Create**:
```
packages/api/src/taskflow_api/
├── services/
│   └── chatkit_server.py    # TaskFlowChatKitServer class
```

**Key Implementation** (adapted from `rag-agent/chatkit_server.py`):
```python
from chatkit.server import ChatKitServer
from chatkit.agents import stream_agent_response
from agents.mcp import MCPServerStreamableHttp

class TaskFlowChatKitServer(ChatKitServer[RequestContext]):
    """ChatKit server for TaskFlow task management with MCP."""

    def __init__(self, store, mcp_server_url: str):
        super().__init__(store)
        self.mcp_server_url = mcp_server_url

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        # 1. Extract user message
        user_text = _user_message_text(input_user_message)

        # 2. Load conversation history (last 20 messages)
        previous_items = await self.store.load_thread_items(...)
        history_str = "\n".join([...])

        # 3. Create agent WITH MCP connection
        async with MCPServerStreamableHttp(
            name="TaskFlow MCP",
            params={"url": self.mcp_server_url, "timeout": 30},
            cache_tools_list=True,
        ) as mcp_server:
            agent = Agent(
                name="TaskFlow Assistant",
                instructions=SYSTEM_PROMPT.format(
                    user_name=context.metadata.get("user_name"),
                    project_name=context.metadata.get("project_name"),
                    project_id=context.metadata.get("project_id"),
                    history=history_str,
                ),
                mcp_servers=[mcp_server],  # Tools from MCP!
            )

            # 4. Run agent and stream response
            result = Runner.run_streamed(agent, user_text)
            async for event in stream_agent_response(agent_context, result):
                yield event
```

### Phase 4: Create Chat Router + Schemas (30 min)

**Goal**: Expose POST /api/chat endpoint with proper schemas

**Files to Create**:
```
packages/api/src/taskflow_api/
├── schemas/
│   └── chat.py              # Request/Response schemas
├── routers/
│   └── chat.py              # POST /api/chat endpoint
```

**Schemas**:
```python
class ChatRequest(BaseModel):
    conversation_id: str | None = None  # ChatKit thread_id
    message: str
    project_id: int | None = None

class ToolCallResult(BaseModel):
    tool: str
    args: dict[str, Any]
    result: dict[str, Any]

class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    tool_calls: list[ToolCallResult]
```

**Endpoint**:
```python
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
):
    chatkit_server = request.app.state.chatkit_server

    # Build context with JWT user info
    context = RequestContext(
        user_id=user.id,
        metadata={
            "user_name": user.name,
            "project_id": request.project_id,
        }
    )

    # Process through ChatKit
    result = await chatkit_server.process(payload, context)
    return result
```

### Phase 5: Wire Up in Main App (15 min)

**Goal**: Initialize ChatKit store in app lifespan

**Files to Modify**:
```
packages/api/src/taskflow_api/
├── main.py                  # Add ChatKit lifespan
├── config.py                # Add new settings
```

**Config Additions**:
```python
class Settings(BaseSettings):
    # Existing...

    # ChatKit (separate database)
    chatkit_database_url: str | None = None  # Falls back to database_url

    # MCP Server (required for chat)
    mcp_server_url: str = "http://localhost:8001/mcp"

    # OpenAI
    openai_api_key: str
```

**Lifespan**:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Existing startup...

    # Initialize ChatKit store
    chatkit_db_url = settings.chatkit_database_url or settings.database_url
    if chatkit_db_url:
        store_config = StoreConfig(database_url=chatkit_db_url)
        chatkit_store = PostgresStore(config=store_config)
        await chatkit_store.initialize_schema()
        app.state.chatkit_store = chatkit_store
        app.state.chatkit_server = TaskFlowChatKitServer(
            chatkit_store,
            mcp_server_url=settings.mcp_server_url,
        )

    yield

    # Cleanup
    if hasattr(app.state, "chatkit_store"):
        await app.state.chatkit_store.close()
```

### Phase 6: Testing (20 min)

**Goal**: Verify agent works end-to-end with MCP

**Test Cases**:
1. Chat with MCP tools - "Add a task called Buy groceries"
2. List tasks via chat - "Show me my tasks"
3. Conversation persistence - Thread ID persists across requests
4. Auth required - 401 without JWT
5. MCP connection error - Graceful failure message

## File Summary

### New Files (7 files)

| File | Purpose | Lines (Est.) |
|------|---------|--------------|
| `chatkit_store/__init__.py` | Module exports (copy from rag-agent) | 20 |
| `chatkit_store/config.py` | Store configuration (modify prefix) | 60 |
| `chatkit_store/context.py` | Request context (copy as-is) | 30 |
| `chatkit_store/postgres_store.py` | PostgreSQL store (copy as-is) | 400 |
| `schemas/chat.py` | Request/Response schemas | 40 |
| `services/chatkit_server.py` | **ChatKit server with MCP** | 200 |
| `routers/chat.py` | POST /api/chat endpoint | 80 |

### Modified Files (3 files)

| File | Changes |
|------|---------|
| `main.py` | Add ChatKit lifespan, include chat router |
| `config.py` | Add chatkit_database_url, mcp_server_url, openai_api_key |
| `pyproject.toml` | Add openai-agents, chatkit dependencies |

## Configuration

### Environment Variables

```bash
# ChatKit Store (separate from main database - can use same DB, different schema)
TASKFLOW_CHATKIT_DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/taskflow

# MCP Server (Streamable HTTP transport)
MCP_SERVER_URL=http://localhost:8001/mcp

# OpenAI API (required)
OPENAI_API_KEY=sk-...

# Existing
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/taskflow
SSO_URL=http://localhost:3001
```

## Dependency Graph

```
Phase 1 (chatkit_store copy) ────────────────┐
                                              │
Phase 2 (chat_agent.py) ⭐ ──────────────────┤
     [Agent + MCPServerStreamableHttp]        │
                                              ▼
Phase 3 (chatkit_server.py) ─────────► Phase 4 (chat.py router + schemas)
     [ChatKit + MCP integration]              │
                                              ▼
                                       Phase 5 (main.py integration)
                                              │
                                              ▼
                                       Phase 6 (tests)
```

## MCP Integration (Direct - No Function Tools Layer)

Agent connects directly to TaskFlow MCP Server via Streamable HTTP:

```python
from agents.mcp import MCPServerStreamableHttp

async with MCPServerStreamableHttp(
    name="TaskFlow MCP",
    params={
        "url": "http://localhost:8001/mcp",
        "timeout": 30,
    },
    cache_tools_list=True,
    max_retry_attempts=3,
) as mcp_server:
    agent = Agent(
        name="TaskFlow Assistant",
        instructions=system_prompt,
        mcp_servers=[mcp_server],  # Tools discovered dynamically!
    )
```

**Benefits**:
- Tools defined once in MCP server, used by CLI/Web/Chat/Agents
- Dynamic tool discovery (no code changes needed when tools added)
- Standardized protocol for agent-to-service communication
- No duplicate `@function_tool` implementations

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| MCP Server not running | Return friendly error, log for debugging |
| OpenAI API rate limits | Log warnings, return error to user |
| ChatKit store connection issues | Separate schema, main API still works |
| Tool call failures | Catch exceptions, inform user of partial failure |

## Success Validation

After implementation:

1. [ ] `POST /api/chat` returns valid response
2. [ ] Task created via chat appears in `GET /api/tasks`
3. [ ] Conversation persists across requests
4. [ ] JWT auth required for chat endpoint
5. [ ] Tool calls visible in response (from MCP)
6. [ ] MCP connection error returns friendly message
7. [ ] All tests pass (`uv run pytest`)
