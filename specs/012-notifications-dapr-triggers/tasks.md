# Tasks: Notifications, Reminders & Dapr Integration

**Input**: Design documents from `/specs/012-notifications-dapr-triggers/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Total Tasks**: 62 tasks (~155 minutes implementation)
**Parallelizable**: 35 tasks (56%)
**Tests**: Manual testing approach (per spec - no TDD requested)

## Format: `[ID] [P?] [Story] FR-XXX: Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- **FR-XXX**: Functional requirement from spec.md
- Include exact file paths in descriptions

## AI-Native Execution Guide

### Official Documentation (Query via Context7 MCP)

**Phase 1-2: Backend Setup**
- FastAPI: `/tiangolo/fastapi` topics: "async routes", "dependencies", "background tasks", "lifespan"
- SQLModel: `/tiangolo/sqlmodel` topics: "models", "relationships", "indexes"
- APScheduler: Official docs at https://apscheduler.readthedocs.io

**Phase 3-4: Frontend**
- Next.js: `/vercel/next.js` topics: "app router", "client components", "use client"
- shadcn/ui: `/shadcn/ui` topics: "dropdown-menu", "badge", "button"

### Skills to Use (from `.claude/skills/engineering/`)

**Required Skills for This Feature:**
- **`fastapi-backend`** - Production FastAPI patterns, async session handling
- **`sqlmodel-database`** - SQLModel entities, relationships, indexes
- **`nextjs-16`** - Next.js 16 App Router patterns
- **`shadcn-ui`** - UI components with Tailwind

**Optional Skills (for troubleshooting):**
- **`mcp-builder`** - If adding MCP tools for agent parity
- **`better-auth-sso`** - If auth integration needed for notification endpoints

### Implementation Pattern (For Each Task)
1. Query relevant official docs via Context7 (NEVER skip)
2. Review plan.md section for architecture decisions
3. Check spec.md for functional requirements
4. Implement using official patterns
5. Verify with acceptance criteria
6. Mark task complete with checkbox

---

## Phase 1: Setup (4 tasks, 10 min)

**Purpose**: Configuration and project initialization

**Acceptance Criteria**:
- [ ] Config settings added for CRON_ENABLED, DAPR_ENABLED, NOTIFICATION_RETENTION_DAYS
  ```bash
  grep -E "(CRON_ENABLED|DAPR_ENABLED|NOTIFICATION_RETENTION)" packages/api/src/taskflow_api/config.py
  # Expected: 3 config variables defined
  ```
- [ ] APScheduler dependency added to pyproject.toml
  ```bash
  grep "apscheduler" packages/api/pyproject.toml
  # Expected: apscheduler in dependencies
  ```

**Tasks**:
- [ ] T001 [P] Add APScheduler dependency to packages/api/pyproject.toml
- [ ] T002 [P] Add CRON_ENABLED config to packages/api/src/taskflow_api/config.py
- [ ] T003 [P] Add DAPR_ENABLED and DAPR_HTTP_ENDPOINT config to packages/api/src/taskflow_api/config.py
- [ ] T004 [P] Add NOTIFICATION_RETENTION_DAYS config to packages/api/src/taskflow_api/config.py

---

## Phase 2: Foundational (8 tasks, 25 min)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**FRs**: FR-009 (notification storage)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Acceptance Criteria**:
- [ ] Notification model created with all required fields
  ```bash
  grep -E "class Notification" packages/api/src/taskflow_api/models/notification.py
  # Expected: Notification class definition
  ```
- [ ] Notification model imported in __init__.py
  ```bash
  grep "Notification" packages/api/src/taskflow_api/models/__init__.py
  # Expected: Notification import
  ```
- [ ] Event service created with publish_event function
  ```bash
  grep "async def publish_event" packages/api/src/taskflow_api/services/events.py
  # Expected: publish_event function
  ```

**Tasks**:
- [ ] T005 [P] FR-009: Create Notification SQLModel in packages/api/src/taskflow_api/models/notification.py
- [ ] T006 [P] FR-009: Add indexes to Notification model (user_id, task_id, created_at, composite)
- [ ] T007 FR-009: Add Notification import to packages/api/src/taskflow_api/models/__init__.py
- [ ] T008 [P] Create NotificationCreate schema in packages/api/src/taskflow_api/schemas/notification.py
- [ ] T009 [P] Create NotificationRead schema in packages/api/src/taskflow_api/schemas/notification.py
- [ ] T010 [P] Create NotificationUpdate schema in packages/api/src/taskflow_api/schemas/notification.py
- [ ] T011 [P] FR-021/FR-022: Create event service in packages/api/src/taskflow_api/services/events.py
- [ ] T012 FR-021: Add graceful degradation (try/except) to publish_event function

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Recurring Task Spawns on Due Date (Priority: P1) 🎯 MVP

**Goal**: Fix the critical bug where `recurrence_trigger=on_due_date` silently fails

**FRs**: FR-001, FR-002, FR-003, FR-004, FR-005

**Independent Test**: Create recurring task with `recurrence_trigger=on_due_date`, wait for due date to pass, verify new task spawned
```bash
# Test command
curl -X POST http://localhost:8000/api/cron/process-recurring-tasks
# Expected: {"spawned": N, "skipped": M}
```

**Acceptance Criteria**:
- [ ] Cron router created with process_recurring_tasks endpoint
  ```bash
  grep "process_recurring_tasks" packages/api/src/taskflow_api/routers/cron.py
  # Expected: Function definition
  ```
- [ ] APScheduler initialized in main.py lifespan
  ```bash
  grep "AsyncIOScheduler" packages/api/src/taskflow_api/main.py
  # Expected: Scheduler setup in lifespan
  ```
- [ ] Row-level locking implemented (SELECT FOR UPDATE SKIP LOCKED)
  ```bash
  grep -i "skip_locked" packages/api/src/taskflow_api/routers/cron.py
  # Expected: with_for_update(skip_locked=True)
  ```

### Implementation for User Story 1 (14 tasks, 45 min)

- [ ] T013 [P] [US1] FR-004: Create cron router file packages/api/src/taskflow_api/routers/cron.py
- [ ] T014 [US1] FR-001: Implement process_recurring_tasks() query with recurrence_trigger filter
- [ ] T015 [US1] FR-002: Add SELECT FOR UPDATE SKIP LOCKED for row-level locking
- [ ] T016 [US1] FR-003: Add max_occurrences check before spawning (count existing occurrences)
- [ ] T017 [US1] FR-005: Implement calculate_next_due() for pattern-based date calculation
- [ ] T018 [US1] FR-001: Create spawn_next_occurrence() function with database transaction
- [ ] T019 [US1] FR-001: Copy recurring task fields to new task (title, description, pattern, trigger, etc.)
- [ ] T020 [US1] Clone subtasks if clone_subtasks_on_recur=True (reuse Agent 2A logic)
- [ ] T021 [US1] FR-002: Set has_spawned_next=True on original task (idempotency)
- [ ] T022 [US1] Create audit entry for spawned task (action: task.spawned_recurring)
- [ ] T023 [P] [US1] FR-004: Add APScheduler initialization to packages/api/src/taskflow_api/main.py lifespan
- [ ] T024 [US1] FR-004: Schedule process_recurring_tasks job every 60 seconds
- [ ] T025 [US1] Import and include cron router in packages/api/src/taskflow_api/main.py
- [ ] T026 [US1] Add cron router to packages/api/src/taskflow_api/routers/__init__.py

**Checkpoint**: Recurring task spawn on due date is now functional. Test with:
```bash
# Create task with recurrence_trigger=on_due_date and past due_date
# Run: curl -X POST http://localhost:8000/api/cron/process-recurring-tasks
# Verify: New task created, original has has_spawned_next=True
```

---

## Phase 4: User Story 2 - Task Assignment Notification (Priority: P2)

**Goal**: Notify users when they are assigned a task

**FRs**: FR-010, FR-011, FR-012, FR-013

**Independent Test**: Assign task to user, verify notification appears in their list
```bash
# Test: Call assignment endpoint, then check notifications
curl http://localhost:8000/api/notifications?user_id=@test-user
# Expected: notification with type="task_assigned"
```

**Acceptance Criteria**:
- [ ] Notifications router created with list, unread-count, mark-read endpoints
  ```bash
  grep -E "(list_notifications|unread_count|mark_read)" packages/api/src/taskflow_api/routers/notifications.py
  # Expected: 3 function definitions
  ```
- [ ] Assignment hook added to tasks.py
  ```bash
  grep "task_assigned" packages/api/src/taskflow_api/routers/tasks.py
  # Expected: Notification creation in assign endpoint
  ```

### Implementation for User Story 2 (10 tasks, 30 min)

- [ ] T027 [P] [US2] FR-010: Create notifications router packages/api/src/taskflow_api/routers/notifications.py
- [ ] T028 [US2] FR-010: Implement GET /api/notifications endpoint (list filtered by user)
- [ ] T029 [US2] FR-011: Implement GET /api/notifications/unread-count endpoint
- [ ] T030 [US2] FR-012: Implement PATCH /api/notifications/{id}/read endpoint
- [ ] T031 [US2] Import and include notifications router in packages/api/src/taskflow_api/main.py
- [ ] T032 [US2] Add notifications router to packages/api/src/taskflow_api/routers/__init__.py
- [ ] T033 [US2] FR-013: Add notification creation to assign_task() in packages/api/src/taskflow_api/routers/tasks.py
- [ ] T034 [US2] FR-013: Add publish_event("task.assigned") call after assignment
- [ ] T035 [US2] FR-013: Create notification with type="task_assigned", title="Task assigned to you"
- [ ] T036 [US2] Skip notification if assignee has no user_id (edge case from spec)

**Checkpoint**: Assignment notifications working. Test with task assignment, verify notification created.

---

## Phase 5: User Story 3 - Due Date Reminder (Priority: P2)

**Goal**: Send reminder notifications for tasks due within 24 hours

**FRs**: FR-006, FR-007, FR-008, FR-016

**Independent Test**: Create task due in 23 hours, run cron, verify reminder notification sent
```bash
curl -X POST http://localhost:8000/api/cron/send-reminders
# Expected: {"sent": N}
```

**Acceptance Criteria**:
- [ ] send_reminders function implemented in cron.py
  ```bash
  grep "send_reminders" packages/api/src/taskflow_api/routers/cron.py
  # Expected: Function definition
  ```
- [ ] reminder_sent flag updated after sending
  ```bash
  grep "reminder_sent = True" packages/api/src/taskflow_api/routers/cron.py
  # Expected: Flag update
  ```

### Implementation for User Story 3 (8 tasks, 20 min)

- [ ] T037 [US3] FR-006: Implement send_reminders() function in packages/api/src/taskflow_api/routers/cron.py
- [ ] T038 [US3] FR-006: Query tasks due within 24 hours with reminder_sent=False
- [ ] T039 [US3] FR-008: Filter out completed, cancelled, and unassigned tasks
- [ ] T040 [US3] FR-006: Create notification with type="task_reminder", title="Task due in X hours"
- [ ] T041 [US3] FR-007: Set task.reminder_sent=True after sending (idempotency)
- [ ] T042 [US3] FR-016: Add publish_event("task.reminder") call
- [ ] T043 [US3] FR-004: Schedule send_reminders job in APScheduler (every 60 seconds)
- [ ] T044 [US3] Create audit entry for reminder sent (action: task.reminder_sent)

**Checkpoint**: Reminders working. Test with task due within 24h, run cron, verify notification.

---

## Phase 6: User Story 4 - Notification Bell in UI (Priority: P3)

**Goal**: Display notification bell with unread count in frontend header

**FRs**: FR-017, FR-018, FR-019, FR-020

**Independent Test**: Create notifications for user, verify bell shows count and dropdown works
```bash
# Manual test in browser - check bell icon shows unread count
```

**Acceptance Criteria**:
- [ ] NotificationBell component created
  ```bash
  ls web-dashboard/src/components/NotificationBell.tsx
  # Expected: File exists
  ```
- [ ] Bell added to Header component
  ```bash
  grep "NotificationBell" web-dashboard/src/components/layout/Header.tsx
  # Expected: Component imported and used
  ```

### Implementation for User Story 4 (10 tasks, 25 min)

- [ ] T045 [P] [US4] Create TypeScript types in web-dashboard/src/types/notification.ts
- [ ] T046 [P] [US4] FR-020: Add notification API functions to web-dashboard/src/lib/api.ts
- [ ] T047 [US4] FR-019: Create NotificationItem component in web-dashboard/src/components/NotificationItem.tsx
- [ ] T048 [US4] FR-017: Create NotificationBell component in web-dashboard/src/components/NotificationBell.tsx
- [ ] T049 [US4] FR-018: Add unread count badge to NotificationBell (show count, "9+" for 10+)
- [ ] T050 [US4] FR-019: Add dropdown menu with notification list (10 most recent)
- [ ] T051 [US4] FR-020: Add 30-second polling with useEffect in NotificationBell
- [ ] T052 [US4] Add click handler to mark notification as read
- [ ] T053 [US4] Add "View" link to navigate to task detail page
- [ ] T054 [US4] FR-017: Add NotificationBell to Header in web-dashboard/src/components/layout/Header.tsx

**Checkpoint**: Frontend bell working. Test in browser - bell shows count, dropdown displays notifications.

---

## Phase 7: User Story 5 - Task Completion Notification (Priority: P3)

**Goal**: Notify task creator when someone else completes their task

**FRs**: FR-014

**Independent Test**: User B completes task created by User A, verify User A gets notification

**Acceptance Criteria**:
- [ ] Completion notification logic added to tasks.py
  ```bash
  grep "task_completed" packages/api/src/taskflow_api/routers/tasks.py
  # Expected: Notification creation in completion logic
  ```

### Implementation for User Story 5 (4 tasks, 10 min)

- [ ] T055 [US5] FR-014: Add notification hook to completion logic in packages/api/src/taskflow_api/routers/tasks.py
- [ ] T056 [US5] FR-014: Check if completer != creator before sending notification
- [ ] T057 [US5] FR-014: Create notification with type="task_completed", title="Task completed"
- [ ] T058 [US5] FR-014: Add publish_event("task.completed") call

**Checkpoint**: Completion notifications working. Test with different creator/completer.

---

## Phase 8: User Story 6 - Recurring Task Spawn Notification (Priority: P3)

**Goal**: Notify assignee when recurring task spawns next occurrence

**FRs**: FR-015

**Independent Test**: Complete recurring task, verify assignee of new task gets notification

**Acceptance Criteria**:
- [ ] Spawn notification added to cron handler
  ```bash
  grep "task_spawned" packages/api/src/taskflow_api/routers/cron.py
  # Expected: Notification creation in spawn logic
  ```

### Implementation for User Story 6 (4 tasks, 10 min)

- [ ] T059 [US6] FR-015: Add notification creation to spawn_next_occurrence() in cron.py
- [ ] T060 [US6] FR-015: Create notification with type="task_spawned", title="Recurring task created"
- [ ] T061 [US6] FR-015: Add publish_event("task.spawned") call
- [ ] T062 [US6] Skip notification if new task has no assignee

**Checkpoint**: Spawn notifications working. Test with recurring task completion/due date.

---

## Phase 9: Polish & Validation (ongoing)

**Purpose**: Final validation and cleanup

**Acceptance Criteria**:
- [ ] All 7 success criteria from spec validated
  ```bash
  # SC-001: on_due_date triggers spawn
  # SC-002: Reminders within 5 minutes
  # SC-003: Assignment notifications <5s
  # SC-004: Bell updates within 30s
  # SC-005: System works without Dapr
  # SC-006: Notification API <1s
  # SC-007: No duplicate notifications
  ```

**Tasks** (no task IDs - validation checklist):
- [ ] Verify SC-001: Create recurring task with on_due_date, verify spawn
- [ ] Verify SC-002: Create task due in 23h, run cron, verify reminder
- [ ] Verify SC-003: Assign task, verify notification in <5s
- [ ] Verify SC-004: Create notification, verify bell updates in <30s
- [ ] Verify SC-005: Set DAPR_ENABLED=False, verify API still works
- [ ] Verify SC-006: Call notification endpoints, verify <1s response
- [ ] Verify SC-007: Run cron twice, verify no duplicate notifications

---

## Dependencies & Execution Order

### User Story Completion Order
```
Setup → Foundation → US1 → US2 → US3 → US4 → US5 → US6 → Polish
                                ↘ US4 ↗
                            (can parallel with US3)
```

### Critical Path (minimum time to completion)
- Setup: 10 min
- Foundation: 25 min
- US1: 45 min (P1 - critical bug fix)
- US2: 30 min
- US3: 20 min
- US4: 25 min (frontend can parallel with US3)
- US5: 10 min
- US6: 10 min
- Polish: ongoing

**Total Critical Path**: ~175 min (2h 55min)

### Parallel Opportunities
- **Phase 1**: All 4 setup tasks can run in parallel (different files)
- **Phase 2**: 6 of 8 foundational tasks can run in parallel
- **Phase 3-4**: US4 frontend can run in parallel with US2/US3 backend
- **Parallelizable**: 35 tasks (56% of total)

### Within Each User Story
- Models/schemas before services
- Services before routers
- Backend before frontend integration
- Core implementation before edge cases

---

## Implementation Strategy

### MVP Scope (US1 Only)
**Critical Path**: Setup → Foundation → US1
**Time**: ~80 min
**Outcome**: Critical bug fixed - on_due_date trigger works

### Quick Win: US1 + US2
**Add**: Assignment notifications
**Time**: ~110 min
**Outcome**: Bug fix + immediate productivity improvement

### Full Feature
**Add**: US3, US4, US5, US6
**Time**: ~175 min total
**Outcome**: Complete notification system with frontend bell

### Recommended Execution
1. Complete Setup + Foundation (35 min) → Validate config
2. Complete US1 (45 min) → **TEST: on_due_date spawn works**
3. Complete US2 (30 min) → **TEST: assignment notifications work**
4. Complete US3 (20 min) → **TEST: reminders work**
5. Complete US4 (25 min) → **TEST: frontend bell works**
6. Complete US5 + US6 (20 min) → **TEST: completion/spawn notifications**
7. Run validation checklist

---

## FR Traceability Matrix

| FR | Description | Tasks | User Story |
|----|-------------|-------|------------|
| FR-001 | Spawn on due_date with transaction | T014, T018, T019, T021 | US1 |
| FR-002 | No duplicate spawns | T015, T021 | US1 |
| FR-003 | Respect max_occurrences | T016 | US1 |
| FR-004 | Cron every 1 minute | T013, T023, T024, T043 | US1, US3 |
| FR-005 | Calculate next due date | T017 | US1 |
| FR-006 | Reminders for tasks due within 24h | T037, T038, T040 | US3 |
| FR-007 | Mark reminder_sent=True | T041 | US3 |
| FR-008 | Skip completed/unassigned | T039 | US3 |
| FR-009 | Store notifications | T005, T006, T007 | Foundation |
| FR-010 | List notifications API | T028 | US2 |
| FR-011 | Unread count API | T029 | US2 |
| FR-012 | Mark read API | T030 | US2 |
| FR-013 | Publish task.assigned | T033, T034, T035 | US2 |
| FR-014 | Publish task.completed | T055, T056, T057, T058 | US5 |
| FR-015 | Publish task.spawned | T059, T060, T061 | US6 |
| FR-016 | Publish task.reminder | T042 | US3 |
| FR-017 | Bell icon in header | T048, T054 | US4 |
| FR-018 | Unread count badge | T049 | US4 |
| FR-019 | Notification dropdown | T047, T050 | US4 |
| FR-020 | Poll every 30s | T046, T051 | US4 |
| FR-021 | Continue if Dapr unavailable | T011, T012 | Foundation |
| FR-022 | Log failed publishes | T012 | Foundation |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
- All FRs from spec.md are covered by tasks
