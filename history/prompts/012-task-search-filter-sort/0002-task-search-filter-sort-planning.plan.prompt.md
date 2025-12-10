---
id: 0002
title: task-search-filter-sort-planning
stage: plan
date: 2025-12-10
surface: agent
model: claude-opus-4-5-20251101
feature: 012-task-search-filter-sort
branch: 012-task-search-filter-sort
user: agent-1
command: /sp.plan task-search-filter-sort
labels: [phase-v, architecture, implementation-plan, api-design, frontend-integration]
links:
  spec: specs/012-task-search-filter-sort/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/012-task-search-filter-sort/plan.md
tests:
  - N/A (plan phase - no implementation yet)
---

## Prompt

Create implementation plan for task-search-filter-sort feature:
- Fix N+1 query bug (51 queries → 2 queries)
- Add search, tags, has_due_date filter parameters
- Add sort_by and sort_order parameters
- Update frontend with debounced search and sort dropdowns
- Remove client-side filtering

## Response snapshot

Created comprehensive 970-line implementation plan covering:

**5 Architecture Decisions (ADRs)**:
- AD-001: selectinload for N+1 fix
- AD-002: PostgreSQL ILIKE for search
- AD-003: Custom CASE for priority sort
- AD-004: NULLSLAST/NULLSFIRST for due dates
- AD-005: 300ms debounce with useDeferredValue

**4 Component Breakdown**:
1. Backend routers/tasks.py (20 min)
2. Frontend types/index.ts (5 min)
3. Frontend lib/api.ts (5 min)
4. Frontend app/tasks/page.tsx (15 min)

**8 Manual Test Cases** with explicit pass/fail criteria

**Performance Targets**:
- 96% query reduction (51 → 2)
- 60%+ response time improvement (500ms → <200ms)

## Outcome

- ✅ Impact: Complete implementation blueprint with code snippets
- 🧪 Tests: 8 manual test cases defined with curl commands
- 📁 Files: 1 plan file (970 lines), 4 files to modify
- 🔁 Next prompts: /sp.tasks task-search-filter-sort
- 🧠 Reflection: Sequential dependency chain clear (backend → types → api → UI)

## Evaluation notes (flywheel)

- Failure modes observed: None - plan generation successful
- Graders run and results (PASS/FAIL): N/A (plan phase)
- Prompt variant (if applicable): Routed to general-purpose agent (engineering work)
- Next experiment (smallest change to try): Proceed to task generation
