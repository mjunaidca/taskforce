# Skill: ChatKit Server Integration

**ID**: chatkit-integration
**Version**: 1.0.0
**Source Feature**: 006-chat-server
**Created**: 2025-12-07

## Overview

Pattern for integrating ChatKit server with FastAPI applications using OpenAI Agents SDK and MCP.

## When to Use

- Adding conversational AI to a FastAPI application
- Integrating with MCP servers for tool execution
- Building chat interfaces with conversation persistence
- Passing authentication tokens through agent prompts

## Prerequisites

```toml
# pyproject.toml dependencies
openai-agents = ">=0.0.9"
openai-chatkit = ">=1.4.0"
python-dotenv = ">=1.0.0"
asyncpg = ">=0.30.0"
```

## Core Pattern

### 1. ChatKit Store Module Structure

```
chatkit_store/
├── __init__.py          # Exports: PostgresStore, StoreConfig, RequestContext
├── config.py            # StoreConfig with env prefix (e.g., TASKFLOW_CHATKIT_)
├── context.py           # RequestContext dataclass
└── postgres_store.py    # PostgresStore implementation
```

**Config Pattern**:
```python
class StoreConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="TASKFLOW_CHATKIT_",  # Customize per project
        env_file=".env",
    )
    database_url: str
    schema_name: str = "taskflow_chat"  # Separate schema
```

### 2. Agent with MCP Connection

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

SYSTEM_PROMPT = """You are {app_name} Assistant.

## Authentication Context
- User ID: {user_id}
- Access Token: {access_token}

CRITICAL: When calling ANY MCP tool, you MUST ALWAYS include:
- user_id: "{user_id}"
- access_token: "{access_token}"

## User Context
- User Name: {user_name}
- Current Project: {project_name}

{domain_specific_instructions}
"""

async with MCPServerStreamableHttp(
    name="MCP Server",
    params={"url": mcp_server_url, "timeout": 30},
    cache_tools_list=True,
    max_retry_attempts=3,
) as mcp_server:
    agent = Agent(
        name="Assistant",
        instructions=SYSTEM_PROMPT.format(...),
        mcp_servers=[mcp_server],
    )
    result = Runner.run_streamed(agent, user_text)
```

### 3. ChatKit Server Class

```python
from chatkit.server import ChatKitServer
from chatkit.agents import stream_agent_response

class AppChatKitServer(ChatKitServer[RequestContext]):
    def __init__(self, store: PostgresStore, mcp_server_url: str):
        super().__init__(store, attachment_store=None)
        self.mcp_server_url = mcp_server_url

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        # 1. Extract user message
        # 2. Load conversation history
        # 3. Connect to MCP server
        # 4. Create agent with context
        # 5. Stream response
        async with MCPServerStreamableHttp(...) as mcp_server:
            agent = Agent(...)
            result = Runner.run_streamed(agent, user_text)
            async for event in stream_agent_response(agent_context, result):
                yield event
```

### 4. FastAPI Endpoint

```python
@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    # Extract headers
    user_id = request.headers.get("X-User-ID")
    auth_header = request.headers.get("Authorization")
    access_token = auth_header[7:] if auth_header?.startswith("Bearer ") else None

    # Build context with token
    payload = await request.body()
    metadata = extract_metadata(payload)
    metadata["access_token"] = access_token

    context = RequestContext(user_id=user_id, metadata=metadata)
    result = await chatkit_server.process(payload, context)

    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    return Response(content=result.json, media_type="application/json")
```

### 5. App Lifespan Integration

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize ChatKit store
    if settings.chat_enabled:
        store_config = StoreConfig()
        chatkit_store = PostgresStore(config=store_config)
        await chatkit_store.initialize_schema()
        app.state.chatkit_store = chatkit_store
        app.state.chatkit_server = AppChatKitServer(
            chatkit_store,
            mcp_server_url=settings.mcp_server_url
        )
    yield
    # Cleanup
    if hasattr(app.state, "chatkit_store"):
        await app.state.chatkit_store.close()
```

## Key Patterns

### Token Passing via System Prompt

MCP tools need auth tokens. Pass them in the system prompt so the LLM includes them in every tool call:

```python
instructions = f"""
## Authentication Context
- Access Token: {access_token}

CRITICAL: Include access_token="{access_token}" in every tool call.
"""
```

### Separate Database Schema

ChatKit uses its own schema to avoid conflicts:
- Main app: `public` schema
- ChatKit: `taskflow_chat` schema (or custom)

### Environment Variables

```bash
# ChatKit store (separate connection recommended)
TASKFLOW_CHATKIT_DATABASE_URL=postgresql+asyncpg://...

# MCP Server
MCP_SERVER_URL=http://localhost:8001/mcp

# OpenAI (required for Agents SDK)
OPENAI_API_KEY=sk-...
```

## Error Handling

```python
except ConnectionError as e:
    # MCP server unavailable
    yield error_message("Task service unavailable. Please try again.")
except Exception as e:
    logger.exception("Agent error: %s", e)
    yield error_message("Error processing request.")
```

## Files to Create

| File | Purpose |
|------|---------|
| `chatkit_store/__init__.py` | Module exports |
| `chatkit_store/config.py` | Store configuration |
| `chatkit_store/context.py` | Request context |
| `chatkit_store/postgres_store.py` | PostgreSQL store |
| `services/chat_agent.py` | System prompt + agent factory |
| `services/chatkit_server.py` | ChatKitServer subclass |
| `main.py` | /chatkit endpoint + lifespan |

## Related PHRs

- `0002-chatkit-server-spec-creation.spec.prompt.md`
- `0003-chatkit-server-implementation-plan.plan.prompt.md`
- `0005-chatkit-endpoint-implementation.green.prompt.md`
- `0006-jwt-token-auth-iteration.refactor.prompt.md`
