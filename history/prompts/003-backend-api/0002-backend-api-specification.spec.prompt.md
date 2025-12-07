---
id: 0002
title: Backend API Specification Creation
stage: spec
date: 2025-12-07
surface: agent
model: claude-sonnet-4-20250514
feature: 003-backend-api
branch: 003-backend-api
user: mjs
command: /sp.specify
labels: [spec, api, fastapi, sqlmodel, design]
links:
  spec: specs/003-backend-api/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-backend-api/spec.md
tests:
  - null
---

## Prompt

Create a detailed specification for Phase 2 TaskFlow Backend API. This evolves Phase 1's CLI-based JSON storage into a multi-user PostgreSQL backend with FastAPI and SQLModel. Must integrate with Better Auth SSO and maintain human-agent parity.

## Response snapshot

Created comprehensive specification covering:

**Executive Summary**:
- FastAPI service providing HTTP interface for TaskFlow
- Human-agent parity: same endpoints serve CLI, web, and MCP agents
- Constitutional alignment: audit, agent parity, recursive tasks, spec-driven

**User Stories (7 total)**:
1. Create and Manage Projects (P1)
2. Create and List Tasks (P1)
3. Execute Task Workflow (P1)
4. Create and Manage Subtasks (P2)
5. View Audit Trail (P2)
6. Authenticate via Better Auth SSO (P1)
7. Register and Link Agents (P2)

**Key Design Decisions**:
- Project-scoped workers with default project auto-creation
- Humans auto-created from SSO profile, agents registered globally
- Tasks can only be assigned to project members
- parent_task_id for recursive decomposition (same-project only)

**40+ Functional Requirements** organized by:
- API Infrastructure (FR-001 to FR-004)
- Authentication (FR-005 to FR-011)
- Projects (FR-012 to FR-015)
- Users & Members (FR-016 to FR-020e)
- Tasks (FR-021 to FR-028)
- Audit Trail (FR-029 to FR-033)
- Database (FR-034 to FR-037)
- CORS & Security (FR-038 to FR-040)

**API Endpoint Summary**: 25+ endpoints across Health, Projects, Members, Agents, Tasks, Audit

**Edge Cases**: 10 documented edge cases with expected behavior

## Outcome

- Impact: Foundation document for entire backend implementation
- Tests: N/A (spec phase)
- Files: 1 comprehensive spec document (383 lines)
- Next prompts: /sp.plan for implementation planning
- Reflection: Spec captures all Phase 1 model compatibility requirements and constitutional principles

## Evaluation notes (flywheel)

- Failure modes observed: Spec did not explicitly document async SQLAlchemy patterns (discovered during implementation)
- Graders run and results (PASS/FAIL): Manual review - PASS (functional requirements complete)
- Prompt variant (if applicable): Standard /sp.specify command
- Next experiment (smallest change to try): Add implementation pattern notes to spec for async concerns
