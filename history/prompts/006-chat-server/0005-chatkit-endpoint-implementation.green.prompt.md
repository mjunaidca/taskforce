---
id: "0005"
title: "chatkit-endpoint-implementation"
stage: green
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 006-chat-server
branch: 006-chat-server
user: mjs
command: implementation
labels: [chatkit, endpoint, mcp, streaming, fastapi]
links:
  spec: specs/006-chat-server/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/api/src/taskflow_api/services/chat_agent.py
  - packages/api/src/taskflow_api/services/chatkit_server.py
  - packages/api/src/taskflow_api/main.py
  - packages/api/src/taskflow_api/config.py
  - packages/api/pyproject.toml
tests:
  - null
---

## Prompt

Implement ChatKit server with /chatkit endpoint matching rag-agent pattern. Use MCP server connection instead of search_tool. Remove custom /api/chat endpoint.

## Response snapshot

Implemented full ChatKit integration:

**chat_agent.py**:
- TASKFLOW_SYSTEM_PROMPT with placeholders for user context
- create_taskflow_agent() factory with MCPServerStreamableHttp

**chatkit_server.py**:
- TaskFlowChatKitServer extending ChatKitServer
- TaskFlowAgentContext for agent execution
- respond() method with MCP connection
- Conversation history loading (last 20 messages)
- Error handling for MCP connection failures

**main.py**:
- POST /chatkit endpoint (matching ChatKit protocol)
- X-User-ID header extraction
- StreamingResponse for SSE
- ChatKit store initialization in lifespan
- load_dotenv() for OPENAI_API_KEY

**config.py**:
- extra="ignore" for TASKFLOW_CHATKIT_* vars
- chat_enabled property checking env var
- mcp_server_url setting

**pyproject.toml**:
- Added openai-agents>=0.0.9
- Added openai-chatkit>=1.4.0
- Added python-dotenv>=1.0.0

**Endpoint Flow**:
1. Frontend sends POST /chatkit with X-User-ID header
2. Extract metadata from ChatKit request payload
3. Create RequestContext with user info
4. Process through ChatKitServer
5. Return StreamingResponse or JSON

## Outcome

- Impact: Full ChatKit integration with MCP working
- Tests: Manual testing via frontend
- Files: 5 files modified/created
- Next prompts: Fix env var loading, add JWT token passing
- Reflection: ChatKit protocol provides clean abstraction for chat UI

## Evaluation notes (flywheel)

- Failure modes observed: 503 when env vars not loaded, ValidationError for extra fields
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add load_dotenv() and fix config
