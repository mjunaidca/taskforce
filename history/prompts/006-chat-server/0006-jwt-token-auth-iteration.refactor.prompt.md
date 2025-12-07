---
id: "0006"
title: "jwt-token-auth-iteration"
stage: refactor
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 006-chat-server
branch: 006-chat-server
user: mjs
command: implementation
labels: [jwt, auth, mcp, token-passing, security]
links:
  spec: specs/006-chat-server/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/9
files:
  - packages/api/src/taskflow_api/main.py
  - packages/api/src/taskflow_api/services/chat_agent.py
  - packages/api/src/taskflow_api/services/chatkit_server.py
tests:
  - null
---

## Prompt

MCP Server requires JWT access_token to call TaskFlow APIs. Agent is calling MCP tools without access_token. Frontend will send Authorization: Bearer token. Pass token to agent in system prompt so it includes in every tool call.

## Response snapshot

Implemented JWT token flow for MCP tool calls:

**Problem**: MCP tools need access_token to authenticate API calls, but agent wasn't receiving the token.

**Solution**: Pass token through system prompt so LLM includes it in tool parameters.

**Changes**:

1. **main.py** - Extract JWT from Authorization header:
```python
auth_header = request.headers.get("Authorization")
if auth_header and auth_header.startswith("Bearer "):
    access_token = auth_header[7:]
metadata["access_token"] = access_token
```

2. **chat_agent.py** - Updated system prompt:
```
## Authentication Context
- User ID: {user_id}
- Access Token: {access_token}

CRITICAL: When calling ANY MCP tool, you MUST ALWAYS include:
- user_id: "{user_id}"
- access_token: "{access_token}"
```

3. **chatkit_server.py** - Pass token to prompt:
```python
access_token = context.metadata.get("access_token", "")
instructions = TASKFLOW_SYSTEM_PROMPT.format(
    user_id=user_id,
    access_token=access_token,
    ...
)
```

**Auth Flow**:
1. Frontend sends `Authorization: Bearer <jwt>` header
2. /chatkit endpoint extracts token
3. Token added to metadata
4. Agent system prompt includes token
5. LLM includes token in every MCP tool call
6. MCP server uses token to authenticate API requests

## Outcome

- Impact: MCP tools can now authenticate to TaskFlow API
- Tests: Not run (needs integration testing)
- Files: 3 files modified
- Next prompts: Debug streaming error, test full auth flow
- Reflection: Passing auth via system prompt is pragmatic for MCP tool calls

## Evaluation notes (flywheel)

- Failure modes observed: StreamError after implementing - needs debugging
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Check backend logs for actual error cause
