# Tasks: TaskFlow Chat Server

**Feature**: 006-chat-server
**Spec**: `specs/006-chat-server/spec.md`
**Plan**: `specs/006-chat-server/plan.md`
**Created**: 2025-12-07
**Status**: Completed

## Task Summary

| ID | Task | Status | Dependencies |
|----|------|--------|--------------|
| T1 | Copy ChatKit store module | ✅ Done | - |
| T2 | Create TaskFlow agent with MCP | ✅ Done | T1 |
| T3 | Create ChatKit server adapter | ✅ Done | T1, T2 |
| T4 | Add /chatkit endpoint | ✅ Done | T3 |
| T5 | Wire up in main app lifespan | ✅ Done | T3, T4 |
| T6 | Add JWT token extraction | ✅ Done | T4 |
| T7 | Pass auth token to agent | ✅ Done | T2, T6 |
| T8 | Fix E402 linter errors | ✅ Done | T4 |
| T9 | Create PHRs | ✅ Done | T1-T8 |
| T10 | Update skills and agents | ✅ Done | T9 |

---

## T1: Copy ChatKit Store Module

**Status**: ✅ Done
**Dependencies**: None
**Assignee**: @claude-code

### Description

Copy the proven `chatkit_store/` module from `rag-agent/` to `packages/api/src/taskflow_api/`.

### Acceptance Criteria

- [x] `chatkit_store/__init__.py` created with exports
- [x] `chatkit_store/config.py` with `TASKFLOW_CHATKIT_` prefix
- [x] `chatkit_store/context.py` with RequestContext dataclass
- [x] `chatkit_store/postgres_store.py` with PostgresStore class
- [x] Schema name changed to `taskflow_chat`

### Files

- `packages/api/src/taskflow_api/chatkit_store/__init__.py`
- `packages/api/src/taskflow_api/chatkit_store/config.py`
- `packages/api/src/taskflow_api/chatkit_store/context.py`
- `packages/api/src/taskflow_api/chatkit_store/postgres_store.py`

---

## T2: Create TaskFlow Agent with MCP

**Status**: ✅ Done
**Dependencies**: T1
**Assignee**: @claude-code

### Description

Create agent factory that connects to TaskFlow MCP Server via Streamable HTTP transport.

### Acceptance Criteria

- [x] System prompt template with placeholders for user context
- [x] MCPServerStreamableHttp connection configuration
- [x] Agent discovers tools dynamically from MCP
- [x] Conversation history included in prompt

### Files

- `packages/api/src/taskflow_api/services/chat_agent.py`

---

## T3: Create ChatKit Server Adapter

**Status**: ✅ Done
**Dependencies**: T1, T2
**Assignee**: @claude-code

### Description

Create TaskFlowChatKitServer class extending ChatKitServer with MCP integration.

### Acceptance Criteria

- [x] TaskFlowChatKitServer extends ChatKitServer[RequestContext]
- [x] TaskFlowAgentContext for agent execution
- [x] respond() method with MCP connection
- [x] Conversation history loading (last 20 messages)
- [x] Error handling for MCP connection failures

### Files

- `packages/api/src/taskflow_api/services/chatkit_server.py`

---

## T4: Add /chatkit Endpoint

**Status**: ✅ Done
**Dependencies**: T3
**Assignee**: @claude-code

### Description

Add POST /chatkit endpoint matching ChatKit protocol specification.

### Acceptance Criteria

- [x] POST /chatkit endpoint handles ChatKit protocol
- [x] X-User-ID header extraction
- [x] StreamingResponse for SSE
- [x] JSON response for non-streaming
- [x] Error handling (400, 401, 500, 503)

### Files

- `packages/api/src/taskflow_api/main.py`

---

## T5: Wire Up in Main App Lifespan

**Status**: ✅ Done
**Dependencies**: T3, T4
**Assignee**: @claude-code

### Description

Initialize ChatKit store and server in FastAPI lifespan.

### Acceptance Criteria

- [x] ChatKit store initialized on startup
- [x] ChatKit server created with MCP URL
- [x] Store cleanup on shutdown
- [x] Conditional initialization (only if DATABASE_URL set)
- [x] chat_enabled property in Settings

### Files

- `packages/api/src/taskflow_api/main.py`
- `packages/api/src/taskflow_api/config.py`

---

## T6: Add JWT Token Extraction

**Status**: ✅ Done
**Dependencies**: T4
**Assignee**: @claude-code

### Description

Extract JWT token from Authorization header for MCP tool calls.

### Acceptance Criteria

- [x] Extract Authorization header
- [x] Parse Bearer token
- [x] Require token (return 401 if missing)
- [x] Add token to metadata

### Files

- `packages/api/src/taskflow_api/main.py`

---

## T7: Pass Auth Token to Agent

**Status**: ✅ Done
**Dependencies**: T2, T6
**Assignee**: @claude-code

### Description

Include user_id and access_token in agent system prompt so LLM passes them in tool calls.

### Acceptance Criteria

- [x] System prompt includes Authentication Context section
- [x] user_id placeholder in prompt
- [x] access_token placeholder in prompt
- [x] CRITICAL instruction to include in every tool call
- [x] ChatKit server extracts and formats credentials

### Files

- `packages/api/src/taskflow_api/services/chat_agent.py`
- `packages/api/src/taskflow_api/services/chatkit_server.py`

---

## T8: Fix E402 Linter Errors

**Status**: ✅ Done
**Dependencies**: T4
**Assignee**: @claude-code

### Description

Add noqa comments for imports after load_dotenv().

### Acceptance Criteria

- [x] `# noqa: E402` on imports after load_dotenv()
- [x] ruff check passes

### Files

- `packages/api/src/taskflow_api/main.py`

---

## T9: Create PHRs

**Status**: ✅ Done
**Dependencies**: T1-T8
**Assignee**: @claude-code

### Description

Create Prompt History Records documenting the development journey.

### Acceptance Criteria

- [x] PHR for spec creation
- [x] PHR for plan creation
- [x] PHR for chatkit_store copy
- [x] PHR for endpoint implementation
- [x] PHR for JWT auth iteration
- [x] PHR for git commit/PR

### Files

- `history/prompts/006-chat-server/0001-chatkit-jwt-auth-commit-pr.green.prompt.md`
- `history/prompts/006-chat-server/0002-chatkit-server-spec-creation.spec.prompt.md`
- `history/prompts/006-chat-server/0003-chatkit-server-implementation-plan.plan.prompt.md`
- `history/prompts/006-chat-server/0004-chatkit-store-module-copy.tasks.prompt.md`
- `history/prompts/006-chat-server/0005-chatkit-endpoint-implementation.green.prompt.md`
- `history/prompts/006-chat-server/0006-jwt-token-auth-iteration.refactor.prompt.md`

---

## T10: Update Skills and Agents

**Status**: ✅ Done
**Dependencies**: T9
**Assignee**: @claude-code

### Description

Harvest learnings into existing chatkit-integration skill and agent.

### Acceptance Criteria

- [x] Pattern 6: MCP Agent Authentication added to skill
- [x] Pattern 7: Separate ChatKit Store Configuration added
- [x] New pitfalls documented (#6, #7)
- [x] MCP Integration Checklist added to agent
- [x] References updated

### Files

- `.claude/skills/engineering/chatkit-integration/skill.md`
- `.claude/agents/engineering/chatkit-integration-agent.md`

---

## Dependency Graph

```
T1 (chatkit_store)
    │
    ├──► T2 (agent) ──────┐
    │                      │
    └──► T3 (server) ◄────┘
              │
              ├──► T4 (endpoint) ──► T6 (JWT extract) ──► T7 (pass to agent)
              │         │
              │         └──► T8 (E402 fix)
              │
              └──► T5 (lifespan)

T1-T8 ──► T9 (PHRs) ──► T10 (skills/agents)
```

## Completion Summary

All tasks completed. Feature 006-chat-server is ready for testing.

**Remaining work**: Debug streaming error reported in frontend (see PHR 0006).
