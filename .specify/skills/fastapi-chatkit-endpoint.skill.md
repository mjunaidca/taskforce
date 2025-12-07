# Skill: FastAPI ChatKit Endpoint Pattern

**ID**: fastapi-chatkit-endpoint
**Version**: 1.0.0
**Source Feature**: 006-chat-server
**Created**: 2025-12-07

## Overview

Pattern for adding a `/chatkit` POST endpoint to FastAPI that handles the ChatKit protocol with streaming responses.

## Core Pattern

```python
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from chatkit.server import StreamingResult

@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    """ChatKit protocol endpoint with streaming support."""

    # 1. Get ChatKit server from app state
    chatkit_server = getattr(request.app.state, "chatkit_server", None)
    if not chatkit_server:
        raise HTTPException(
            status_code=503,
            detail="ChatKit server not initialized"
        )

    # 2. Extract user identification
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")

    # 3. Extract auth token
    auth_header = request.headers.get("Authorization")
    access_token = None
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header[7:]

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header with Bearer token"
        )

    try:
        # 4. Parse ChatKit payload
        payload = await request.body()
        payload_dict = json.loads(payload)

        # 5. Extract metadata from ChatKit request structure
        metadata = {}
        if "params" in payload_dict and "input" in payload_dict["params"]:
            metadata = payload_dict["params"]["input"].get("metadata", {})

        # 6. Add auth token to metadata
        metadata["access_token"] = access_token

        # 7. Create request context
        context = RequestContext(
            user_id=user_id,
            request_id=request.headers.get("X-Request-ID"),
            metadata=metadata,
        )

        # 8. Process through ChatKit server
        result = await chatkit_server.process(payload, context)

        # 9. Return appropriate response type
        if isinstance(result, StreamingResult):
            return StreamingResponse(
                result,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            return Response(
                content=result.json,
                media_type="application/json",
            )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.exception("Error processing ChatKit request: %s", e)
        raise HTTPException(status_code=500, detail=f"Error: {e!s}")
```

## Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | Yes | User identifier for thread ownership |
| `Authorization` | Yes | `Bearer <token>` for API auth |
| `X-Request-ID` | No | Request correlation ID |
| `Content-Type` | Yes | `application/json` |

## ChatKit Request Structure

```json
{
  "jsonrpc": "2.0",
  "method": "threads.runs.submitMessage",
  "params": {
    "threadId": "thread-123",
    "input": {
      "message": {
        "content": [{"type": "text", "text": "Hello"}]
      },
      "metadata": {
        "user_name": "John",
        "project_name": "My Project",
        "project_id": 1
      }
    }
  }
}
```

## Response Types

### Streaming (SSE)
```
event: thread.item.delta
data: {"type": "text", "text": "Hello"}

event: thread.item.done
data: {"item": {...}}
```

### JSON (non-streaming)
```json
{
  "jsonrpc": "2.0",
  "result": {
    "threadId": "thread-123",
    "items": [...]
  }
}
```

## Lifespan Setup

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.chat_enabled:
        store_config = StoreConfig()
        chatkit_store = PostgresStore(config=store_config)
        await chatkit_store.initialize_schema()
        app.state.chatkit_store = chatkit_store
        app.state.chatkit_server = AppChatKitServer(
            chatkit_store,
            mcp_server_url=settings.mcp_server_url
        )
        logger.info("ChatKit initialized")

    yield

    # Shutdown
    if hasattr(app.state, "chatkit_store"):
        await app.state.chatkit_store.close()
        logger.info("ChatKit store closed")
```

## Environment Check

```python
# In config.py
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="ignore",  # Ignore TASKFLOW_CHATKIT_* vars
    )

    @property
    def chat_enabled(self) -> bool:
        """Check if chat is configured."""
        return os.getenv("TASKFLOW_CHATKIT_DATABASE_URL") is not None
```

## Common Issues

### E402 Linter Error
```python
# load_dotenv must run before env-dependent imports
from dotenv import load_dotenv
load_dotenv()

from .config import settings  # noqa: E402
```

### 503 Service Unavailable
- ChatKit server not in app.state
- Database URL not set
- Store initialization failed

### StreamError
- Check backend logs for actual exception
- Common: MCP connection, OpenAI API, prompt format

## Related Skills

- `chatkit-integration.skill.md` - Full integration pattern
- `mcp-agent-auth.skill.md` - Token passing pattern
