---
id: "0006"
title: "Task Breakdown Generation"
stage: tasks
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 001-cli-core
branch: 001-cli-core
user: mjs
command: /sp.tasks 001-cli-core
labels: ["task-breakdown", "sprint-planning", "implementation-tasks"]
links:
  spec: specs/001-cli-core/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-cli-core/tasks.md
tests:
  - Task count validation: 91 tasks
  - Parallelizable tasks: 42 (46%)
  - Sprint coverage: 3 sprints mapped
---

## Prompt

Generate comprehensive task breakdown for CLI Core implementation based on:
- Spec: 40 functional requirements (FR-001 to FR-040)
- Plan: 1000+ line implementation plan with architecture
- Sprint targets from DIRECTIVES.md (30+20+19 = 69 minutes)

## Response snapshot

**Comprehensive 91-task breakdown generated across 12 phases:**

### Phase Structure

| Phase | Purpose | Tasks |
|-------|---------|-------|
| Phase 1 | Setup (Project Init) | T001-T006 |
| Phase 2 | Foundational (Core Infrastructure) | T007-T024 |
| Phase 3 | US1 - Init/Workers | T025-T036 |
| Phase 4 | US2 - Task CRUD | T037-T046 |
| Phase 5 | US3 - Workflow | T047-T056 |
| Phase 6 | US4 - Subtasks | T057-T059 |
| Phase 7 | US5 - Audit View | T060-T064 |
| Phase 8 | US6 - Search/Filter | T065-T068 |
| Phase 9 | US7 - Due Dates | T069-T072 |
| Phase 10 | US8 - Interactive | T073-T076 |
| Phase 11 | Demo/Config | T077-T085 |
| Phase 12 | Polish | T086-T091 |

### Key Features

1. **Parallel Opportunities**: 42 tasks marked [P] for parallel execution
2. **User Story Mapping**: Each task labeled with [US#] for traceability
3. **Sprint Mapping**: Aligned with DIRECTIVES.md timing
4. **Checkpoints**: Validation point after each phase
5. **Dependency Chain**: Clear phase dependencies documented

### Sprint Breakdown

- Sprint 1 (30 min): T001-T036 - Init, projects, workers
- Sprint 2 (20 min): T037-T046 - Task CRUD
- Sprint 3 (19 min): T047-T085 - Workflow, audit, demo

### MVP vs Full Scope

- MVP Scope: Phases 1-5 (T001-T056) = 56 tasks
- Demo-Ready: Add US5 + Demo = 70 tasks
- Full Scope: All 91 tasks

## Outcome

- Impact: Complete executable task list ready for implementation
- Tests: Task structure validated against spec and plan
- Files: 1 created (tasks.md - 400 lines)
- Next prompts: /sp.analyze, then /sp.implement 001-cli-core
- Reflection: Task organization by user story enables parallel development and independent testing

## Evaluation notes (flywheel)

- Failure modes observed: None - task breakdown aligned with plan structure
- Graders run and results (PASS/FAIL): Sprint mapping: PASS, Parallelization: PASS
- Prompt variant (if applicable): general-purpose agent with engineering focus
- Next experiment (smallest change to try): Consider generating GitHub issues from tasks
