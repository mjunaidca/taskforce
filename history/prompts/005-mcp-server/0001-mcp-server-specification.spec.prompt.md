---
id: 0001
title: MCP Server Specification
stage: spec
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 005-mcp-server
branch: 005-mcp-server
user: mjunaidca
command: /sp.specify
labels: ["mcp", "phase-3", "ai-agents", "fastmcp"]
links:
  spec: specs/005-mcp-server/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/10
files:
  - specs/005-mcp-server/spec.md
tests:
  - null
---

## Prompt

Build MCP server for Phase 3 of TaskFlow platform that exposes task management tools for AI agents via Stateless Streamable HTTP transport.

Requirements:
- 10 MCP tools (5 core + 5 extended): taskflow_add_task, taskflow_list_tasks, taskflow_complete_task, taskflow_delete_task, taskflow_update_task, taskflow_list_projects, taskflow_assign_task, taskflow_start_task, taskflow_update_progress, taskflow_request_review
- Stateless Streamable HTTP transport (not stdio)
- No auth at MCP level - receives user_id as parameter (Chat Server validates JWT upstream)
- Calls existing REST API endpoints (doesn't duplicate DB logic)
- Uses Python with FastMCP, httpx, Pydantic

Reference implementation: panaversity-fs MCP server pattern

## Response snapshot

Created comprehensive specification for TaskFlow MCP Server:
- Defined 10 MCP tools with input/output schemas
- Specified stateless HTTP transport via FastMCP
- Documented three auth modes: dev, production (JWT forwarding), service token
- Mapped tools to existing REST API endpoints
- Established package structure following panaversity-fs patterns

## Outcome

- Impact: Created spec foundation for Phase III MCP integration
- Tests: N/A (spec phase)
- Files: specs/005-mcp-server/spec.md
- Next prompts: Generate implementation plan
- Reflection: Clear requirements from user enabled precise spec

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A
