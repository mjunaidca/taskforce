---
id: "0004"
title: "chatkit-store-module-copy"
stage: tasks
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 006-chat-server
branch: 006-chat-server
user: mjs
command: implementation
labels: [chatkit-store, postgres, persistence, copy]
links:
  spec: specs/006-chat-server/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/api/src/taskflow_api/chatkit_store/__init__.py
  - packages/api/src/taskflow_api/chatkit_store/config.py
  - packages/api/src/taskflow_api/chatkit_store/context.py
  - packages/api/src/taskflow_api/chatkit_store/postgres_store.py
tests:
  - null
---

## Prompt

Execute Phase 1: Copy ChatKit Store Module from rag-agent to packages/api with modifications for TaskFlow.

## Response snapshot

Copied and adapted chatkit_store module:

**Files Created (4)**:
1. `chatkit_store/__init__.py` - Module exports
2. `chatkit_store/config.py` - StoreConfig with TASKFLOW_CHATKIT_ prefix
3. `chatkit_store/context.py` - RequestContext dataclass
4. `chatkit_store/postgres_store.py` - PostgresStore implementation

**Key Modifications**:
- Config prefix: `CHATKIT_STORE_` → `TASKFLOW_CHATKIT_`
- Schema name: `chatkit` → `taskflow_chat`
- Environment variable: `TASKFLOW_CHATKIT_DATABASE_URL`

**PostgresStore Features**:
- Async connection pool with asyncpg
- Thread CRUD operations
- Message persistence with pagination
- Auto-schema initialization
- Connection cleanup on close

**Database Schema** (taskflow_chat):
- threads table: id, user_id, metadata, created_at
- thread_items table: id, thread_id, type, content, created_at

## Outcome

- Impact: Conversation persistence infrastructure ready
- Tests: Not run (infrastructure copy)
- Files: 4 files created (~510 lines)
- Next prompts: Phase 2 - Create TaskFlow Agent with MCP
- Reflection: Reusing proven code reduces bugs and speeds development

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Create chat_agent.py with MCP connection
