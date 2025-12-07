---
id: 0003
title: Backend API Implementation Plan
stage: plan
date: 2025-12-07
surface: agent
model: claude-sonnet-4-20250514
feature: 003-backend-api
branch: 003-backend-api
user: mjs
command: /sp.plan
labels: [plan, architecture, fastapi, sqlmodel, implementation]
links:
  spec: specs/003-backend-api/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-backend-api/plan.md
tests:
  - null
---

## Prompt

Create implementation plan based on specs/003-backend-api/spec.md. Define project structure, implementation phases, code patterns, and success criteria mapping.

## Response snapshot

Created detailed implementation plan covering:

**Project Structure**:
```
packages/api/
├── src/taskflow_api/
│   ├── main.py, config.py, database.py, auth.py
│   ├── models/ (5 files)
│   ├── schemas/ (5 files)
│   ├── routers/ (7 files)
│   ├── services/ (2 files)
│   └── tests/ (7 files)
```

**6 Implementation Phases**:
1. Foundation (Database + Auth)
2. SQLModel Models
3. API Routers
4. Business Logic/Services
5. Testing
6. Integration

**Key Architectural Decisions**:
1. Async-first with AsyncSession + asyncpg
2. Project-scoped with Default project per user
3. Unified worker model (human/agent)
4. JWT/JWKS verification against SSO

**Code Patterns Documented**:
- Database connection with URL conversion
- JWKS fetching with 1-hour cache
- SQLModel schemas for all entities
- Health, CRUD, and workflow endpoints
- Audit service with log_action()
- First login with ensure_user_setup()

**Constitutional Validation Matrix**:
- Audit: AuditLog + log_action() service
- Agent Parity: Same endpoints, actor_type from Worker.type
- Recursive Tasks: parent_task_id with validation
- Spec-Driven: Plan follows spec
- Phase Continuity: SQLModel matches Phase 1 Pydantic

**Risk Assessment**: JWKS failure, circular refs, cross-project assignment, race conditions

## Outcome

- Impact: Blueprint for implementation phase
- Tests: N/A (plan phase)
- Files: 1 comprehensive plan document (730 lines)
- Next prompts: /sp.tasks for task breakdown
- Reflection: Plan provides clear code examples but didn't include async pitfall warnings (lesson for future)

## Evaluation notes (flywheel)

- Failure modes observed: Plan showed `await session.commit()` in service functions - this pattern caused issues
- Graders run and results (PASS/FAIL): Manual review - PASS (architecture sound)
- Prompt variant (if applicable): Standard /sp.plan command
- Next experiment (smallest change to try): Include async session lifecycle warnings in plan templates
