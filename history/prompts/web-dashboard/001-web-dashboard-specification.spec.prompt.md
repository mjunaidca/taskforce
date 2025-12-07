---
id: 001
title: Web Dashboard Specification
stage: spec
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: web-dashboard
branch: 004-web-dashboard
user: mjs
command: /sp.specify web-dashboard
labels: [spec, dashboard, oauth, agent-parity]
links:
  spec: specs/004-web-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/004-web-dashboard/spec.md
  - specs/004-web-dashboard/checklists/requirements.md
tests:
  - spec-architect validation (PASS)
---

## Prompt

Create specification for TaskFlow Web Dashboard - Task management UI where humans and AI agents are equal workers. Integrates with TaskFlow SSO (OAuth2/OIDC) on port 3001 and TaskFlow API (FastAPI backend) on port 8000.

## Response snapshot

Created comprehensive specification with:
- 10 prioritized user stories (P1: Dashboard + Auth, P2: Projects/Tasks/Assignment/Workflow, P3: Subtasks/Audit/Members/Agents)
- 40+ functional requirements covering authentication, projects, tasks, workflow, assignment, subtasks, agents, audit, and UI/UX
- 10 measurable success criteria (SC-001 through SC-010)
- 9 edge cases including cycle prevention and cross-project constraints
- Constitutional alignment verified for all 4 principles

Applied formal verification fixes:
- FR-050: Scoped assignment dropdown to current project members
- FR-052a: Added cross-project assignment prevention
- FR-060: Required same-project parent for subtasks
- FR-060a: Explicit cross-project parent prevention
- FR-063: Added circular parent prevention constraint

## Outcome

- ✅ Impact: Complete specification ready for planning phase
- 🧪 Tests: spec-architect validation PASS (9.5/10 readiness)
- 📁 Files: spec.md (380 lines), checklists/requirements.md (132 lines)
- 🔁 Next prompts: /sp.plan web-dashboard
- 🧠 Reflection: Formal verification identified 3 critical constraints that would have caused runtime issues - cycle prevention, cross-project assignment, and cross-project parent tasks

## Evaluation notes (flywheel)

- Failure modes observed: Initial spec missing relational constraints for recursive tasks
- Graders run and results (PASS/FAIL): spec-architect validation PASS after fixes
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A - proceeding to planning
