---
id: "0003"
title: "chatkit-server-implementation-plan"
stage: plan
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 006-chat-server
branch: 006-chat-server
user: mjs
command: /sp.plan
labels: [plan, architecture, mcp, chatkit, openai-agents]
links:
  spec: specs/006-chat-server/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/006-chat-server/plan.md
tests:
  - null
---

## Prompt

Create implementation plan for ChatKit server based on spec. Strategy: reuse existing infrastructure from rag-agent and focus on MCP integration.

## Response snapshot

Created 6-phase implementation plan:

**Phase 1: Copy ChatKit Store Module (15 min)**
- Copy chatkit_store/ from rag-agent
- Modify prefix: CHATKIT_STORE_ → TASKFLOW_CHATKIT_
- Modify schema: chatkit → taskflow_chat

**Phase 2: Create TaskFlow Agent with MCP (30 min) - CORE WORK**
- Agent factory with MCPServerStreamableHttp connection
- System prompt with user context
- Dynamic tool discovery from MCP server

**Phase 3: Create ChatKit Server Adapter (30 min)**
- TaskFlowChatKitServer class extending ChatKitServer
- Integration with MCP for respond() method
- Conversation history loading

**Phase 4: Create Chat Router + Schemas (30 min)**
- POST /api/chat endpoint
- Request/Response schemas
- JWT auth integration

**Phase 5: Wire Up in Main App (15 min)**
- ChatKit lifespan initialization
- Config additions for MCP URL, OpenAI key

**Phase 6: Testing (20 min)**
- End-to-end MCP tool calls
- Conversation persistence
- Auth and error handling

**Key Architecture Decision**: Direct MCP connection (no @function_tool layer)
- Tools defined once in MCP server
- Dynamic discovery
- No duplicate implementations

Plan file: `specs/006-chat-server/plan.md`

## Outcome

- Impact: Clear implementation roadmap with time estimates and file structure
- Tests: Test cases defined for Phase 6
- Files: 1 file created (plan.md)
- Next prompts: Execute Phase 1 - copy chatkit_store module
- Reflection: Plan identifies dependencies and risk mitigations upfront

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A (plan phase)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Begin Phase 1 implementation
