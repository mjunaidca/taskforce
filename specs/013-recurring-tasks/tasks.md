# Tasks: Recurring Tasks

**Input**: Design documents from `/specs/013-recurring-tasks/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)
**Generated**: 2025-12-10
**Branch**: main (implemented on main)
**Status**: ✅ COMPLETE (2025-12-11)

---

## Implementation Summary

### Design Changes from Original Spec

During implementation, the design was refined based on discovered issues:

1. **Removed Fields**:
   - `occurrences_created` - Counter would reset to 0 on each spawn, breaking max_occurrences
   - `reminder_sent` - Not used in this feature (Phase 2B)

2. **Added Fields**:
   - `recurring_root_id` - FK to root task for chain tracking
   - `recurrence_trigger` - "on_complete" | "on_due_date" | "both"
   - `clone_subtasks_on_recur` - Clone subtasks when spawning

3. **Spawn Count**: Now derived via COUNT query instead of stored counter

### Completed Work

| Component | Status | Notes |
|-----------|--------|-------|
| Task model (6 recurring fields) | ✅ | models/task.py |
| TaskCreate/Update/Read schemas | ✅ | schemas/task.py with validation |
| create_next_occurrence() | ✅ | Chain tracking via recurring_root_id |
| clone_subtasks_recursive() | ✅ | Deep clone subtasks |
| get_spawn_count() | ✅ | COUNT query for limit check |
| task_to_read() helper | ✅ | All inline TaskRead updated |
| Frontend types | ✅ | types/index.ts |
| Task creation form | ✅ | Clone subtasks toggle, trigger dropdown |
| Task detail view | ✅ | Shows all recurring fields |

### Test Results

- Backend: 74 passed, 3 skipped
- Frontend: Build successful

---

## Original Task Breakdown (Reference)

> Note: Tasks below reflect original design. See Implementation Summary above for actual work completed.

**Path Conventions**:
- Backend: `packages/api/src/taskflow_api/`
- Frontend: `web-dashboard/src/`
- Tests: `packages/api/src/taskflow_api/tests/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch setup and verify prerequisites

- [ ] T001 Checkout/verify on `recurring-tasks` branch
- [ ] T002 Read constitution (`.specify/memory/constitution.md`)
- [ ] T003 Review spec (`specs/013-recurring-tasks/spec.md`)
- [ ] T004 [P] Verify existing tests pass (`uv run pytest`)
- [ ] T005 [P] Verify frontend builds (`cd web-dashboard && pnpm build`)

**Checkpoint**: Environment ready for implementation

---

## Phase 2: Foundational (Backend Model + Migration)

**Purpose**: Core infrastructure - add recurring fields to Task model and apply migration

**⚠️ CRITICAL**: No user story work can begin until this phase is complete (model fields required)

### Model Updates

- [ ] T006 Add 5 recurring fields to Task model in `packages/api/src/taskflow_api/models/task.py`
  - `is_recurring: bool = Field(default=False)`
  - `recurrence_pattern: str | None = Field(default=None)`
  - `reminder_sent: bool = Field(default=False)`
  - `max_occurrences: int | None = Field(default=None)`
  - `occurrences_created: int = Field(default=0)`

### Migration

- [ ] T007 Generate Alembic migration: `cd packages/api && uv run alembic revision --autogenerate -m "Add recurring task fields"`
- [ ] T008 Review migration SQL for correct types and defaults
- [ ] T009 Apply migration locally: `uv run alembic upgrade head`
- [ ] T010 Test migration rollback: `uv run alembic downgrade -1 && uv run alembic upgrade head`
- [ ] T011 Commit: "feat(models): add recurring task fields to Task model"

**Checkpoint**: Database schema ready - schema and logic phases can begin

---

## Phase 3: User Story 1 - Complete Recurring Task Creates Next Occurrence (Priority: P1) 🎯 MVP

**Goal**: When a recurring task is completed, automatically create the next occurrence with correct due date

**Independent Test**: Create a task with `is_recurring=true`, `recurrence_pattern="daily"`, complete it, verify new pending task appears with due_date +1 day

### Schema Updates for US1

- [ ] T012 [P] [US1] Update TaskRead schema in `packages/api/src/taskflow_api/schemas/task.py`
  - Add: `is_recurring: bool`, `recurrence_pattern: str | None`, `max_occurrences: int | None`, `occurrences_created: int`
- [ ] T013 [P] [US1] Update TaskListItem schema in `packages/api/src/taskflow_api/schemas/task.py`
  - Add: `is_recurring: bool` (minimal for list badge display)
- [ ] T014 [US1] Update `task_to_read` helper in `packages/api/src/taskflow_api/routers/tasks.py`
  - Add recurring fields to returned TaskRead
- [ ] T015 [US1] Update list endpoint response mapping in `packages/api/src/taskflow_api/routers/tasks.py`
  - Add `is_recurring` to TaskListItem mapping

### Recurring Logic for US1

- [ ] T016 [US1] Add `timedelta` import to `packages/api/src/taskflow_api/routers/tasks.py` (line 3)
- [ ] T017 [US1] Implement `calculate_next_due(pattern, from_time)` function in `packages/api/src/taskflow_api/routers/tasks.py`
  - Support all 9 patterns: 1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly
  - Monthly = 30 days (simplified)
  - Fallback to daily for unknown patterns
- [ ] T018 [US1] Implement `create_next_occurrence(session, completed_task, creator_id, creator_type)` function
  - Check max_occurrences limit
  - Calculate next due date (from original due_date or completion time)
  - Create new task inheriting: title, description, project_id, assignee_id, parent_task_id, priority, tags
  - Reset: status="pending", progress_percent=0, reminder_sent=False
  - Increment source task's occurrences_created counter
  - Create audit log entry with `recurring_from` reference
- [ ] T019 [US1] Modify `update_status` endpoint in `packages/api/src/taskflow_api/routers/tasks.py` (~line 570)
  - Add recurring logic after `task.completed_at = datetime.utcnow()`
  - Call `create_next_occurrence` when status="completed" and task.is_recurring

### Tests for US1

- [ ] T020 [P] [US1] Create `packages/api/src/taskflow_api/tests/test_recurring.py`
  - Unit tests for `calculate_next_due` with all 9 patterns
  - Test unknown pattern fallback to daily
- [ ] T021 [P] [US1] Create `packages/api/src/taskflow_api/tests/test_recurring_integration.py`
  - Integration test: complete recurring task creates new pending task
  - Integration test: new task has correct due_date calculated from pattern
  - Integration test: audit log entry created with `recurring_from` reference
- [ ] T022 [US1] Run tests: `uv run pytest -xvs packages/api/src/taskflow_api/tests/test_recurring*.py`
- [ ] T023 [US1] Commit: "feat(api): implement recurring task creation logic (US1)"

**Checkpoint**: US1 complete - completing recurring task creates next occurrence

---

## Phase 4: User Story 2 - Create Recurring Task via Form (Priority: P1) 🎯 MVP

**Goal**: Users can create a new task and mark it as recurring with a selected pattern

**Independent Test**: Open task create form, toggle "Make recurring", select "daily", save, verify is_recurring=true

### Schema Updates for US2

- [ ] T024 [US2] Update TaskCreate schema in `packages/api/src/taskflow_api/schemas/task.py`
  - Add: `is_recurring: bool = False`
  - Add: `recurrence_pattern: Literal["1m", "5m", ..., "monthly"] | None = None`
  - Add: `max_occurrences: int | None = Field(default=None, gt=0)`
  - Add `model_validator` to require pattern when is_recurring=True
  - Add `model_validator` to auto-enable recurring when pattern provided
- [ ] T025 [US2] Run tests to verify validation: `uv run pytest -xvs -k "create"`
- [ ] T026 [US2] Commit: "feat(schemas): add recurring fields to TaskCreate with validation (US2)"

### Frontend Types for US2

- [ ] T027 [P] [US2] Update TypeScript types in `web-dashboard/src/types/index.ts`
  - Add `is_recurring` to TaskListItem interface
  - Add `is_recurring`, `recurrence_pattern`, `max_occurrences`, `occurrences_created` to TaskRead
  - Add `is_recurring?`, `recurrence_pattern?`, `max_occurrences?` to TaskCreate
  - Add `RECURRENCE_PATTERNS` constant array at end of file

### Frontend Form for US2

- [ ] T028 [US2] Add recurring toggle and pattern selector to `web-dashboard/src/app/projects/[id]/tasks/new/page.tsx`
  - Add state: `isRecurring`, `recurrencePattern`, `maxOccurrences`
  - Import: `Checkbox`, `Select`, `RECURRENCE_PATTERNS`
  - Add checkbox "Make this a recurring task"
  - Show pattern dropdown + max occurrences input when checked
  - Add validation: require pattern when recurring enabled
  - Include fields in form submission
- [ ] T029 [US2] Test form in browser: create recurring task, verify API receives correct fields
- [ ] T030 [US2] Run frontend lint: `cd web-dashboard && pnpm lint`
- [ ] T031 [US2] Commit: "feat(frontend): add recurring task creation form (US2)"

**Checkpoint**: US2 complete - can create recurring tasks via form

---

## Phase 5: User Story 3 - View Recurring Task Indicator (Priority: P2)

**Goal**: Users can identify which tasks are recurring from task lists and detail views

**Independent Test**: Create recurring task, navigate to task list, verify recurring badge appears

### Task List Indicator for US3

- [ ] T032 [P] [US3] Add recurring badge to task list in `web-dashboard/src/app/projects/[id]/page.tsx` (or wherever tasks are listed)
  - Show badge with repeat icon + "Recurring" text when `task.is_recurring`
- [ ] T033 [P] [US3] Add recurring badge to `web-dashboard/src/app/tasks/page.tsx` if different list exists

### Task Detail View for US3

- [ ] T034 [US3] Add recurring details section to `web-dashboard/src/app/tasks/[id]/page.tsx`
  - Show pattern label (from RECURRENCE_PATTERNS lookup)
  - Show occurrences counter: "X of Y occurrences created" (if max set)
  - Show "X occurrences created (unlimited)" (if no max)
- [ ] T035 [US3] Test in browser: verify badges and details display correctly
- [ ] T036 [US3] Commit: "feat(frontend): add recurring task indicators (US3)"

**Checkpoint**: US3 complete - can visually identify recurring tasks

---

## Phase 6: User Story 4 - Edit Task Recurrence Settings (Priority: P2)

**Goal**: Users can modify recurrence settings on existing tasks

**Independent Test**: Open existing non-recurring task, enable recurring with "weekly" pattern, save, verify task updated

### Schema Updates for US4

- [ ] T037 [US4] Update TaskUpdate schema in `packages/api/src/taskflow_api/schemas/task.py`
  - Add: `is_recurring: bool | None = None`
  - Add: `recurrence_pattern: Literal[...] | None = None`
  - Add: `max_occurrences: int | None = None`
  - Add lenient validator (allows partial updates)
- [ ] T038 [US4] Run tests: `uv run pytest -xvs -k "update"`

### Frontend Edit Form for US4 (if separate page exists)

- [ ] T039 [US4] Add recurring toggle to task edit form (if `web-dashboard/src/app/tasks/[id]/edit/page.tsx` exists)
  - Pre-populate state from existing task
  - Same UI as create form
- [ ] T040 [US4] Test in browser: edit non-recurring → recurring, edit recurring → change pattern
- [ ] T041 [US4] Commit: "feat: allow editing task recurrence settings (US4)"

**Checkpoint**: US4 complete - can modify recurrence settings

---

## Phase 7: User Story 5 - Max Occurrences Limit (Priority: P3)

**Goal**: Users can limit how many times a recurring task repeats

**Independent Test**: Create recurring task with max_occurrences=3, complete 3 times, verify 4th completion does NOT create new task

### Integration Test for US5

- [ ] T042 [US5] Add integration test for max_occurrences in `packages/api/src/taskflow_api/tests/test_recurring_integration.py`
  - Create task with max_occurrences=2
  - Complete task 3 times
  - Verify only 2 new occurrences created (3 total completed tasks)
  - Verify no pending task remains after limit reached
- [ ] T043 [US5] Test with max_occurrences=0 (should never recur)
- [ ] T044 [US5] Run tests: `uv run pytest -xvs -k "max_occurrences"`
- [ ] T045 [US5] Commit: "test: verify max_occurrences limit enforcement (US5)"

**Checkpoint**: US5 complete - max occurrences limits work

---

## Phase 8: Polish & Integration

**Purpose**: Final testing, documentation, and cleanup

### Full Test Suite

- [ ] T046 [P] Run full backend tests: `cd packages/api && uv run pytest`
- [ ] T047 [P] Run frontend lint: `cd web-dashboard && pnpm lint`
- [ ] T048 [P] Run frontend build: `cd web-dashboard && pnpm build`

### Manual Testing

- [ ] T049 Manual test: Create "Weekly Report" task with due date, recurring="weekly"
- [ ] T050 Manual test: Complete task, verify new task appears with due_date +7 days
- [ ] T051 Manual test: Check audit log shows `recurring_from` reference
- [ ] T052 Manual test: Verify recurring badge in task list
- [ ] T053 Manual test: Test max_occurrences limit in UI

### Documentation & PHR

- [ ] T054 Create PHR for implementation phase: `history/prompts/recurring-tasks/003-recurring-tasks-implementation.green.prompt.md`
- [ ] T055 Review and update any inline code comments

### Final Commit & PR

- [ ] T056 Run `uv run ruff format .` to format code
- [ ] T057 Run `uv run ruff check .` for lint issues
- [ ] T058 Final commit: "feat: complete recurring tasks feature"
- [ ] T059 Push branch and create PR referencing spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup - BLOCKS all user stories
- **Phase 3-7 (User Stories)**: Depend on Phase 2 completion
  - US1 (P1) and US2 (P1) can run in parallel after Phase 2
  - US3 (P2), US4 (P2), US5 (P3) can follow in priority order
- **Phase 8 (Polish)**: Depends on all user stories

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallelize With |
|-------|----------|--------------|---------------------|
| US1 | P1 | Phase 2 | US2 (different files) |
| US2 | P1 | Phase 2 | US1 (different files) |
| US3 | P2 | Phase 2 | US4 (different files) |
| US4 | P2 | Phase 2, partially US2 schemas | US3 (different files) |
| US5 | P3 | US1 (core logic) | None |

### Within Each User Story

1. Schema changes before implementation
2. Backend before frontend
3. Implementation before tests
4. Tests pass before commit

### Parallel Opportunities

- T004 and T005 (Setup verification)
- T012 and T013 (Schema updates - different classes)
- T020 and T021 (Tests - different files)
- T027 (Types) with backend tasks (different packages)
- T032 and T033 (Different list pages)
- T046, T047, T048 (Final test suite - different commands)

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (model + migration)
3. Complete Phase 3: US1 (recurring logic)
4. Complete Phase 4: US2 (create form)
5. **STOP and VALIDATE**: Demo flow works (create → complete → new task appears)
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Database ready
2. Add US1 → Backend logic works → Test with API calls
3. Add US2 → Frontend creates recurring tasks → Demo ready!
4. Add US3 → Visual indicators → Better UX
5. Add US4 → Edit capability → Full CRUD
6. Add US5 → Max occurrences → Advanced feature
7. Polish → Production ready

### Estimated Time

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1 (Setup) | 5 | 2 min |
| Phase 2 (Foundational) | 6 | 15 min |
| Phase 3 (US1 - Core Logic) | 12 | 15 min |
| Phase 4 (US2 - Create Form) | 8 | 10 min |
| Phase 5 (US3 - Indicators) | 5 | 5 min |
| Phase 6 (US4 - Edit) | 5 | 5 min |
| Phase 7 (US5 - Max Limit) | 4 | 3 min |
| Phase 8 (Polish) | 14 | 5 min |
| **Total** | **59** | **~60 min** |

---

## Notes

- `[P]` = Parallelizable (different files, no dependencies)
- `[US#]` = User story mapping for traceability
- Commit after each logical group
- Stop at any checkpoint to validate independently
- All tests should pass before proceeding to next phase
