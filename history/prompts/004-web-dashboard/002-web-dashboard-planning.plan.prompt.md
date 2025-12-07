---
id: 002
title: Web Dashboard Implementation Planning
stage: plan
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: web-dashboard
branch: 004-web-dashboard
user: mjs
command: /sp.plan web-dashboard
labels: [plan, dashboard, architecture, oauth, next16]
links:
  spec: specs/004-web-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/004-web-dashboard/plan.md
tests:
  - N/A (planning phase)
---

## Prompt

Create implementation plan for web-dashboard feature. Route to general-purpose agent for engineering work (Next.js 16 frontend, OAuth2 PKCE, API integration).

## Response snapshot

Created comprehensive 880-line implementation plan covering:

**Technical Stack**:
- Next.js 16 with App Router, React 19, TypeScript 5
- OAuth2 PKCE flow for SSO integration (port 3001)
- API client for FastAPI backend (port 8000)
- IFK theme copied from sso-platform

**Architecture Decisions**:
1. OAuth2 PKCE with hybrid token storage (access in memory, refresh in localStorage)
2. Singleton API client with automatic auth injection
3. React Server Components + URL state (no Redux/Zustand)
4. Feature-based component structure

**Implementation Phases** (21 hours total):
1. Project Setup & Theme Migration (2h)
2. Auth Flow Implementation (4h)
3. Core Layout & Navigation (3h)
4. Projects Module (3h)
5. Tasks Module (4h)
6. Workers Module (2h)
7. Audit Module (1h)
8. Integration Testing & Polish (2h)

**Constitutional Compliance**:
- Agent Parity: WorkerDropdown shows humans + agents equally
- Audit Trail: All actions visible in audit logs
- Recursive Tasks: TaskTree component for unlimited nesting
- Spec-Driven: All FRs traced to implementation tasks

**45+ Components** across 6 feature areas:
- Layout, Auth, Projects, Tasks, Workers, Audit

## Outcome

- ✅ Impact: Complete architectural plan ready for task generation
- 🧪 Tests: N/A (planning phase)
- 📁 Files: plan.md (883 lines)
- 🔁 Next prompts: /sp.tasks web-dashboard
- 🧠 Reflection: Comprehensive plan with clear phase dependencies and constitutional compliance verification

## Evaluation notes (flywheel)

- Failure modes observed: None - plan covers all spec requirements
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A - proceeding to tasks
