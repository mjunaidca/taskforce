# Skill: MCP Agent Authentication Pattern

**ID**: mcp-agent-auth
**Version**: 1.0.0
**Source Feature**: 006-chat-server
**Created**: 2025-12-07

## Overview

Pattern for passing authentication tokens from frontend through an AI agent to MCP tool calls, enabling authenticated API access.

## Problem

MCP tools need to call authenticated APIs, but:
1. Agent doesn't have direct access to request headers
2. MCP protocol doesn't have built-in auth header forwarding
3. Tools need user context for authorization

## Solution

Pass auth credentials via the agent's system prompt. The LLM will include them in every tool call.

## Pattern

### 1. Extract Token at Endpoint

```python
@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    # Extract from Authorization header
    auth_header = request.headers.get("Authorization")
    access_token = None
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header[7:]  # Remove "Bearer " prefix

    # Require token
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header with Bearer token"
        )

    # Pass to context
    metadata["access_token"] = access_token
```

### 2. System Prompt Template

```python
SYSTEM_PROMPT = """You are {app_name} Assistant.

## Authentication Context
- User ID: {user_id}
- Access Token: {access_token}

CRITICAL: When calling ANY MCP tool, you MUST ALWAYS include these parameters:
- user_id: "{user_id}"
- access_token: "{access_token}"

## User Context
- User Name: {user_name}
...
"""
```

### 3. Format Prompt with Credentials

```python
# In ChatKit server respond() method
user_id = context.user_id
access_token = context.metadata.get("access_token", "")

instructions = SYSTEM_PROMPT.format(
    user_id=user_id,
    access_token=access_token,
    user_name=context.metadata.get("user_name"),
    ...
)

agent = Agent(
    name="Assistant",
    instructions=instructions,
    mcp_servers=[mcp_server],
)
```

### 4. MCP Tool Receives Credentials

The LLM will call tools like:
```json
{
  "tool": "taskflow_add_task",
  "params": {
    "title": "Buy groceries",
    "user_id": "user-123",
    "access_token": "eyJhbG..."
  }
}
```

### 5. MCP Server Uses Token

```python
# In MCP server tool handler
@mcp.tool()
async def add_task(
    title: str,
    user_id: str,
    access_token: str,
) -> dict:
    # Call API with auth
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/api/tasks",
            json={"title": title},
            headers={"Authorization": f"Bearer {access_token}"}
        )
    return response.json()
```

## Complete Flow

```
┌─────────────┐     Authorization: Bearer <jwt>     ┌─────────────┐
│   Frontend  │ ─────────────────────────────────▶  │  /chatkit   │
└─────────────┘     X-User-ID: user-123             │  endpoint   │
                                                     └──────┬──────┘
                                                            │
                                                   Extract token
                                                   Add to metadata
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     System Prompt                                │
│  "Access Token: eyJhbG..."                                      │
│  "CRITICAL: Include access_token in every tool call"            │
└─────────────────────────────────────────────────────────────────┘
                                                            │
                                                            ▼
┌─────────────┐     {"access_token": "eyJhbG..."}   ┌─────────────┐
│    Agent    │ ─────────────────────────────────▶  │ MCP Server  │
│    (LLM)    │     Tool call with credentials      │   Tools     │
└─────────────┘                                     └──────┬──────┘
                                                            │
                                                   Authorization: Bearer <jwt>
                                                            │
                                                            ▼
                                                    ┌─────────────┐
                                                    │  TaskFlow   │
                                                    │    API      │
                                                    └─────────────┘
```

## Security Considerations

1. **Token in prompt**: The token is visible to the LLM. Use short-lived tokens.
2. **Logging**: Don't log the full system prompt in production.
3. **Token validation**: MCP server should validate tokens before API calls.
4. **Scope limitation**: Use tokens with minimal required scopes.

## Alternative Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **System prompt** (this pattern) | Works with any MCP server | Token visible to LLM |
| **MCP headers** | Cleaner separation | Requires MCP server changes |
| **Session-based** | No token in prompt | Requires session management |

## When to Use

- MCP tools need to call authenticated APIs
- Using OpenAI Agents SDK with MCPServerStreamableHttp
- Token-based authentication (JWT, OAuth)

## Related Skills

- `chatkit-integration.skill.md` - Full ChatKit setup
