---
id: "0002"
title: "chatkit-server-spec-creation"
stage: spec
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 006-chat-server
branch: 006-chat-server
user: mjs
command: /sp.specify
labels: [spec, chatkit, mcp, agents-sdk]
links:
  spec: specs/006-chat-server/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/006-chat-server/spec.md
tests:
  - null
---

## Prompt

Build ChatKit server in existing FastAPI packages/api with OpenAI Agents SDK, MCP integration, conversation persistence, and JWT auth.

Reference: Use rag-agent/ as working ChatKit pattern to reuse.

## Response snapshot

Created comprehensive feature specification for TaskFlow Chat Server:

**User Stories (5 total)**:
1. P1: Natural Language Task Creation - "Add a task to buy groceries"
2. P1: Task Listing and Status Queries - "Show me pending tasks"
3. P2: Task Completion and Updates - "Mark task 3 as complete"
4. P2: Task Deletion - "Delete the meeting task"
5. P3: Conversation Continuity - Session persistence

**Functional Requirements (10 total)**:
- FR-001: POST /api/chat endpoint
- FR-002: JWT/JWKS authentication
- FR-003: Conversation persistence
- FR-004: MCP Server connection via HTTP transport
- FR-005: Conversation history (last 20 messages)
- FR-006-010: Additional requirements for context, audit, etc.

**Key Decisions**:
- Reuse chatkit_store from rag-agent (proven infrastructure)
- Separate database schema (taskflow_chat)
- MCP for tool discovery (no duplicate @function_tool implementations)

Spec file: `specs/006-chat-server/spec.md`

## Outcome

- Impact: Clear specification defining chat server requirements and acceptance criteria
- Tests: Acceptance scenarios defined for each user story
- Files: 1 file created (spec.md)
- Next prompts: Create implementation plan from spec
- Reflection: Spec-driven development ensures clear requirements before coding

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A (spec phase)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Implement plan based on spec
