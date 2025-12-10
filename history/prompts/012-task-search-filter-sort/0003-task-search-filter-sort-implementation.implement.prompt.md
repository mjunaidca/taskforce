---
id: 0003
title: task-search-filter-sort-implementation
stage: implement
date: 2025-12-10
surface: agent
model: claude-opus-4-5-20251101
feature: 012-task-search-filter-sort
branch: 012-task-search-filter-sort
user: agent-1
command: /sp.implement task-search-filter-sort
labels: [phase-v, n+1-fix, search, filter, sort, backend, frontend, performance]
links:
  spec: specs/012-task-search-filter-sort/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/api/src/taskflow_api/routers/tasks.py
  - web-dashboard/src/types/index.ts
  - web-dashboard/src/lib/api.ts
  - web-dashboard/src/app/tasks/page.tsx
  - specs/012-task-search-filter-sort/tasks.md
tests:
  - Backend: 61 tests passed (pytest)
  - Frontend: TypeScript build successful (pnpm build)
  - Linting: All checks passed (ruff check, ruff format)
---

## Prompt

Implement the task-search-filter-sort feature following the SDD workflow. The mission is to:
1. Fix N+1 query bug (51 queries -> 2 queries for 50 tasks)
2. Add server-side search, filter, and sort capabilities
3. Update frontend to use API-based filtering with debounced search
4. Remove client-side filtering

Time budget: 45-60 minutes
Priority: N+1 fix first (highest impact)

## Response snapshot

Successfully implemented all components following the plan:

**Backend Changes (packages/api/src/taskflow_api/routers/tasks.py)**:
- Added imports: `from sqlalchemy import case` and `from sqlalchemy.orm import selectinload`
- Added new query parameters: `search`, `tags`, `has_due_date`, `sort_by`, `sort_order`
- Fixed N+1 with `selectinload(Task.assignee)` for eager loading
- Implemented search with `Task.title.ilike(f"%{search}%")`
- Implemented tags filter with JSONB contains (AND logic)
- Implemented has_due_date filter
- Implemented dynamic sorting with custom priority order (critical>high>medium>low)
- Due date sorting with nullslast/nullsfirst
- Removed N+1 Python loop for assignee fetching

**Frontend Type Changes (web-dashboard/src/types/index.ts)**:
- Extended `TaskFilterParams` with: search, tags, has_due_date, sort_by, sort_order

**Frontend API Client (web-dashboard/src/lib/api.ts)**:
- Updated `getProjectTasks` to pass all new filter parameters

**Frontend UI (web-dashboard/src/app/tasks/page.tsx)**:
- Added `useDeferredValue` for debounced search (~300ms)
- Added sort state (sortBy, sortOrder)
- Updated useEffect to pass search/sort params to API
- Removed client-side filtering (`filteredTasks` -> `tasks`)
- Added Sort By dropdown (Created, Due Date, Priority, Title)
- Added Sort Order toggle (Ascending, Descending)

## Outcome

- ✅ Impact: N+1 bug fixed (96% query reduction: 51 -> 2), server-side search/filter/sort working
- 🧪 Tests: 61 backend tests pass, frontend builds successfully
- 📁 Files: 5 files modified (1 backend, 3 frontend, 1 task spec)
- 🔁 Next prompts: Manual testing in browser, create PR
- 🧠 Reflection: Clean implementation following plan exactly. Backend selectinload pattern worked as documented in constitution.

## Evaluation notes (flywheel)

- Failure modes observed: None - implementation followed plan successfully
- Graders run and results (PASS/FAIL): pytest PASS (61/61), pnpm build PASS, ruff PASS
- Prompt variant (if applicable): Routed to general-purpose agent (engineering work)
- Next experiment (smallest change to try): Manual browser testing to verify debounce and sort UI
