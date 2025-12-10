---
id: 0001
title: Create implementation plan for Recurring Tasks feature
stage: plan
date: 2025-12-10
surface: agent
model: claude-sonnet-4-5-20250929
feature: 013-recurring-tasks
branch: main
user: mjunaidca
command: Create implementation plan for Recurring Tasks feature
labels: ["planning", "recurring-tasks", "phase-v", "spec-driven"]
links:
  spec: specs/013-recurring-tasks/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/013-recurring-tasks/plan.md
tests:
  - None (planning phase)
---

## Prompt

Create implementation plan for Recurring Tasks feature.

## Context Files to Read
1. Spec: specs/013-recurring-tasks/spec.md
2. Constitution: .specify/memory/constitution.md
3. PRD: specs/011-phase-v-features-planner/agent-2a-recurring-tasks-prd.md

## Current Codebase Structure
- Backend: packages/api/src/taskflow_api/
  - models/task.py - Task SQLModel
  - schemas/task.py - Pydantic schemas (TaskCreate, TaskUpdate, TaskRead, TaskListItem)
  - routers/tasks.py - Task API endpoints including update_status
- Frontend: web-dashboard/src/
  - types/index.ts - TypeScript types
  - app/projects/[id]/tasks/new/page.tsx - Task creation form

## Your Task
Create a comprehensive implementation plan at specs/013-recurring-tasks/plan.md that includes:

1. **Summary**: Primary requirement + technical approach

2. **Technical Context**:
   - Language: Python 3.13 (backend), TypeScript (frontend)
   - Framework: FastAPI + SQLModel (backend), Next.js 16 (frontend)
   - Database: PostgreSQL via Neon (production), SQLite (tests)
   - Testing: pytest (backend)

3. **Constitution Check**: Verify against 5 Non-Negotiable Principles:
   - Audit: Every action auditable
   - Agent Parity: Same API for humans/agents
   - Recursive Tasks: N/A for this feature
   - Spec-Driven: Spec exists before code
   - Phase Continuity: Data model works through Phase V

4. **Implementation Phases**:

   **Phase 1: Backend Model + Migration** (Priority: Highest)
   - Add 5 fields to Task model: is_recurring, recurrence_pattern, reminder_sent, max_occurrences, occurrences_created
   - Create Alembic migration
   - Test with pytest

   **Phase 2: Schema Updates**
   - Update TaskCreate with is_recurring, recurrence_pattern, max_occurrences
   - Update TaskUpdate with same fields
   - Update TaskRead, TaskListItem with is_recurring indicator
   - Add validation (pattern required when recurring=true)

   **Phase 3: Recurring Logic**
   - Add calculate_next_due() function
   - Add create_next_occurrence() async function
   - Modify update_status endpoint to trigger on completion
   - Create audit log entry for spawned tasks

   **Phase 4: Frontend Updates**
   - Update TypeScript types (TaskCreate, TaskRead, TaskListItem)
   - Add RECURRENCE_PATTERNS constant
   - Add recurring toggle + pattern selector to task create form
   - Add recurring badge to task list
   - Add recurring indicator to task detail view

5. **File Changes Summary**:
   List all files to be modified/created with specific changes

6. **Test Strategy**:
   - Unit tests for calculate_next_due()
   - Integration test for complete recurring task flow
   - Edge case tests (max_occurrences, no due_date, etc.)

7. **Risk Assessment**:
   - Database migration on production
   - Backward compatibility with existing tasks

Write the complete plan to: specs/013-recurring-tasks/plan.md

## Response snapshot

Created comprehensive implementation plan at `specs/013-recurring-tasks/plan.md` with the following structure:

**Key Sections:**
1. **Summary**: Auto-create next occurrence on task completion with time-based (1m-1h) and calendar-based (daily/weekly/monthly) patterns
2. **Technical Context**: Python 3.13/FastAPI/SQLModel backend, TypeScript/Next.js 16 frontend, PostgreSQL database
3. **Constitution Check**: ✅ All 5 principles verified (Audit, Agent Parity, Recursive N/A, Spec-Driven, Phase Continuity)
4. **4 Implementation Phases** (45min total):
   - Phase 1: Backend Model + Migration (15min) - Add 5 fields, generate/apply Alembic migration
   - Phase 2: Schema Updates (10min) - Extend TaskCreate/Update/Read with validation
   - Phase 3: Recurring Logic (15min) - Implement calculate_next_due(), create_next_occurrence(), integrate into update_status
   - Phase 4: Frontend (15min) - Add recurring toggle, pattern selector, badges/indicators
5. **File Changes**: 8 files, ~307 lines total
6. **Test Strategy**: Unit tests (calculate_next_due), integration tests (completion flow, max_occurrences, audit), manual testing checklist
7. **Risk Assessment**: 5 risks identified with mitigation (migration safety, backward compat, infinite loops, timezones, UI validation)

**Technical Highlights:**
- New Task fields: `is_recurring`, `recurrence_pattern`, `reminder_sent`, `max_occurrences`, `occurrences_created`
- Recurrence patterns: 1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly
- Triggers only on `status=completed` (one-time event, no loops)
- Inherits: title, description, assignee, priority, tags, project
- Audit log links new task to source (`recurring_from` detail)
- Backend validation: pattern required when recurring=true
- Frontend: Checkbox + Select dropdown + optional max occurrences input

**Constitution Compliance:**
- ✅ Audit: log_action() for new task with recurring_from reference
- ✅ Agent Parity: Same /api/tasks/{id}/status endpoint for humans/agents
- ⚠️ Recursive: N/A (new tasks are siblings, not subtasks)
- ✅ Spec-Driven: Follows specs/013-recurring-tasks/spec.md
- ✅ Phase Continuity: Additive fields with defaults, backward compatible

## Outcome

- ✅ Impact: Created production-ready implementation plan with 13 sections covering all aspects (model, schemas, logic, frontend, tests, risks)
- 🧪 Tests: Test strategy includes unit tests (9 pattern calculations), integration tests (4 scenarios: basic flow, max_occurrences, no due_date, audit), manual checklist
- 📁 Files: Plan document (1 created), identifies 8 files to modify (4 backend, 4 frontend), ~307 total lines
- 🔁 Next prompts: (1) Implement Phase 1 (backend model + migration), (2) Implement Phase 2 (schemas), (3) Implement Phase 3 (recurring logic), (4) Implement Phase 4 (frontend)
- 🧠 Reflection: Plan follows constitution's 5 principles, provides clear phase breakdown with time estimates, includes rollback strategies for migration risk, documents edge cases (no due_date → use completion time, monthly = 30 days not calendar month)

## Evaluation notes (flywheel)

- Failure modes observed: None - plan creation successful on first attempt
- Graders run and results (PASS/FAIL): N/A (planning phase, no code execution)
- Prompt variant (if applicable): Base prompt with structured sections (Context + Task breakdown)
- Next experiment (smallest change to try): Begin Phase 1 implementation (backend model changes)
