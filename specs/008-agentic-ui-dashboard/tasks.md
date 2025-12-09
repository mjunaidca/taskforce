# Tasks: Agentic UI Dashboard

**Input**: Design documents from `/specs/008-agentic-ui-dashboard/`
**Prerequisites**: plan.md (✓), spec.md (✓)
**Branch**: `008-agentic-ui-dashboard`
**Generated**: 2025-12-08

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `web-dashboard/src/`
- **Backend API**: `packages/api/src/taskflow_api/`
- **MCP Server**: `packages/mcp-server/src/taskflow_mcp/` (no changes needed)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure and dependencies for Agentic UI

- [ ] T001 Create widget templates directory at `packages/api/src/taskflow_api/services/widgets/templates/`
- [ ] T002 Create widget builders directory at `packages/api/src/taskflow_api/services/widgets/`
- [ ] T003 [P] Create `web-dashboard/src/lib/chatkit-config.ts` for centralized useChatKit configuration
- [ ] T004 [P] Add any missing ChatKit dependencies to `web-dashboard/package.json` if needed

---

## Phase 2: Foundational (Streaming Lifecycle & Context) - Plan Phase 1

**Purpose**: Core streaming infrastructure that MUST be complete before widget system

**⚠️ CRITICAL**: Widget interactions depend on proper UI locking/unlocking

### Frontend - Streaming Handlers

- [ ] T005 Add `isResponding` state to `web-dashboard/src/components/chat/ChatKitWidget.tsx`
- [ ] T006 Add `onResponseStart` handler to set `isResponding: true` and lock composer in `ChatKitWidget.tsx`
- [ ] T007 Add `onResponseEnd` handler to set `isResponding: false` and unlock UI in `ChatKitWidget.tsx`
- [ ] T008 Add `onError` handler to unlock UI on failure in `ChatKitWidget.tsx`
- [ ] T009 [P] Create `<ProgressIndicator message={string} />` component at `web-dashboard/src/components/chat/ProgressIndicator.tsx`
- [ ] T010 Integrate ProgressIndicator into ChatKitWidget, show when `isResponding === true`

### Frontend - Context Badge

- [ ] T011 [P] Create `<ContextBadge projectId={number} projectName={string} />` component at `web-dashboard/src/components/chat/ContextBadge.tsx`
- [ ] T012 Add context badge to chat header in `ChatKitWidget.tsx`, listen to `usePathname()` for route changes
- [ ] T013 Implement X button to clear context, show "All Projects" when cleared

### Backend - Progress Events

- [ ] T014 Add `ProgressUpdateEvent` imports to `packages/api/src/taskflow_api/services/chatkit_server.py`
- [ ] T015 Yield progress events before MCP calls in `respond()` method ("Fetching your tasks...", "Found N tasks...")
- [ ] T016 Update `TASKFLOW_SYSTEM_PROMPT` in `packages/api/src/taskflow_api/services/chat_agent.py` with project context instructions

**Checkpoint**: UI locks during responses, progress shows, context badge updates on navigation

---

## Phase 3: User Story 1 - Interactive Task List Widget (Priority: P1) 🎯 MVP

**Goal**: AI returns interactive task list widget with Complete/Start/View buttons

**Independent Test**: Ask "Show my tasks" → ListView widget renders → Click "Complete" → Task updates instantly

### Widget Templates for US1

- [ ] T017 [P] [US1] Create `task_list.widget` JSON template at `packages/api/src/taskflow_api/services/widgets/templates/task_list.widget`
- [ ] T018 [P] [US1] Create `__init__.py` at `packages/api/src/taskflow_api/services/widgets/__init__.py`

### Widget Builders for US1

- [ ] T019 [US1] Create `build_task_list_widget()` function in `packages/api/src/taskflow_api/services/widgets/task_list.py`
- [ ] T020 [US1] Add task list widget builder export to `packages/api/src/taskflow_api/services/widgets/__init__.py`

### Backend Server Actions for US1

- [ ] T021 [US1] Add `action()` method to `TaskFlowChatKitServer` class in `packages/api/src/taskflow_api/services/chatkit_server.py`
- [ ] T022 [US1] Implement `task.complete` action handler in `action()` method - call existing API, yield ThreadItemReplacedEvent
- [ ] T023 [US1] Implement `task.start` action handler in `action()` method - update status to in_progress
- [ ] T024 [US1] Add widget rendering wrapper to `respond()` method to wrap MCP task list outputs in widgets

### Frontend Widget Handling for US1

- [ ] T025 [US1] Add `widgets.onAction` callback to useChatKit configuration in `web-dashboard/src/lib/chatkit-config.ts`
- [ ] T026 [US1] Implement `handleClientAction()` for client-side actions (task.view → router.push) in chatkit-config.ts
- [ ] T027 [US1] Implement `sendCustomAction()` forwarding for server actions in chatkit-config.ts
- [ ] T028 [US1] Update ChatKitWidget.tsx to use centralized chatkit-config.ts configuration

**Checkpoint**: Task list widget renders, button clicks trigger server actions, widget updates instantly

---

## Phase 4: User Story 2 - @Mention Workers and Agents (Priority: P1)

**Goal**: Type @cl → Autocomplete shows @claude-code → Assign tasks via @mention

**Independent Test**: Type "@" → Autocomplete popup → Select @claude-code → Assignment succeeds

### Backend API for US2

- [ ] T029 [P] [US2] Create `/api/members` router at `packages/api/src/taskflow_api/routers/members.py`
- [ ] T030 [US2] Implement `GET /api/members` endpoint with query filter and project_id filter
- [ ] T031 [US2] Register members router in `packages/api/src/taskflow_api/main.py`

### Frontend Proxy for US2

- [ ] T032 [P] [US2] Create Next.js proxy route at `web-dashboard/src/app/api/members/route.ts`
- [ ] T033 [US2] Implement cookie-to-Authorization header forwarding in members proxy route

### Frontend Entity Tagging for US2

- [ ] T034 [US2] Add `entities.onTagSearch` callback to useChatKit config in `web-dashboard/src/lib/chatkit-config.ts`
- [ ] T035 [US2] Implement autocomplete fetch from `/api/members` with query parameter
- [ ] T036 [US2] Add `entities.onRequestPreview` callback for hover preview cards
- [ ] T037 [US2] Map response to Entity format with icons (bot/profile) and groups (AI Agents/Team Members)

### Backend Entity Processing for US2

- [ ] T038 [US2] Update system prompt in `chat_agent.py` to convert @mentions to XML format for agent parsing
- [ ] T039 [US2] Test entity tag extraction in agent responses

**Checkpoint**: Autocomplete shows workers/agents, @mentions render as chips, assignments work

---

## Phase 5: User Story 3 - Real-time Progress Indicators (Priority: P2)

**Goal**: See progress during operations, UI locked during streaming

**Independent Test**: Ask to create 3 tasks → See "Creating tasks... 1/3, 2/3, 3/3" → Tasks appear

### Backend Progress Enhancement for US3

- [ ] T040 [P] [US3] Add granular progress events to task creation flow in `chatkit_server.py`
- [ ] T041 [US3] Add progress events to task list fetching with item count updates
- [ ] T042 [US3] Add progress events to multi-step operations (batch creates, etc.)

### Frontend Progress Display for US3

- [ ] T043 [US3] Update ProgressIndicator to display message from ProgressUpdateEvent
- [ ] T044 [US3] Add visual feedback when progress updates (e.g., message changes)

**Checkpoint**: Progress indicators show operation status, messages update in real-time

---

## Phase 6: User Story 4 - Composer Tool Modes (Priority: P2)

**Goal**: Quick-access mode buttons for Tasks/Projects/Quick Actions contexts

**Independent Test**: Click "Tasks" mode → Placeholder changes → Response is task-focused

### Frontend Composer Tools for US4

- [ ] T045 [P] [US4] Add `composer.tools` configuration to useChatKit in `web-dashboard/src/lib/chatkit-config.ts`
- [ ] T046 [US4] Define tool options: tasks (checkbox icon), projects (folder icon), quick_actions (bolt icon)
- [ ] T047 [US4] Add placeholder overrides for each tool mode
- [ ] T048 [US4] Set `pinned: true` for Tasks and Projects modes

### Backend Tool Routing for US4

- [ ] T049 [US4] Extract `tool_choice` from request context metadata in `chatkit_server.py`
- [ ] T050 [US4] Create focused prompt variants: TASK_FOCUSED_PROMPT, PROJECT_FOCUSED_PROMPT, ACTION_FOCUSED_PROMPT in `chat_agent.py`
- [ ] T051 [US4] Route to appropriate prompt based on tool_choice in `respond()` method

**Checkpoint**: Mode buttons visible, placeholder changes on selection, responses match mode

---

## Phase 7: User Story 5 - Task Creation Form Widget (Priority: P2)

**Goal**: Say "Add a task" → Form widget appears → Fill and submit → Task created

**Independent Test**: Ask "Create new task" → Form renders → Submit → Success confirmation

### Widget Templates for US5

- [ ] T052 [P] [US5] Create `task_form.widget` JSON template at `packages/api/src/taskflow_api/services/widgets/templates/task_form.widget`
- [ ] T053 [P] [US5] Create `task_created_confirmation.widget` template for success state

### Widget Builders for US5

- [ ] T054 [US5] Create `build_task_form_widget()` function in `packages/api/src/taskflow_api/services/widgets/task_form.py`
- [ ] T055 [US5] Create `build_task_created_confirmation()` function in same file
- [ ] T056 [US5] Add form widget builder exports to `packages/api/src/taskflow_api/services/widgets/__init__.py`

### Backend Form Handling for US5

- [ ] T057 [US5] Implement `task.create` action handler in `action()` method of `chatkit_server.py`
- [ ] T058 [US5] Yield ThreadItemReplacedEvent with confirmation widget after successful creation
- [ ] T059 [US5] Add form widget rendering to `respond()` when user asks to create/add task

**Checkpoint**: Form widget renders with fields, submission creates task, confirmation appears

---

## Phase 8: User Story 6 - Project Context Badge (Priority: P3)

**Goal**: Visual context indicator with clear functionality

**Independent Test**: Navigate to /projects/5 → Badge shows "Project: Alpha" → Click X → Shows "All Projects"

### Frontend Context Enhancement for US6

- [ ] T060 [US6] Enhance ContextBadge styling to match IFK theme in `ContextBadge.tsx`
- [ ] T061 [US6] Add project name fetching from API or props
- [ ] T062 [US6] Add smooth transition animation when context changes

**Checkpoint**: Context badge shows project name, X clears to "All Projects", updates on navigation

---

## Phase 9: User Story 7 - Audit Timeline Widget (Priority: P3)

**Goal**: Ask "Show audit for task 5" → Timeline widget with actor badges

**Independent Test**: Ask for task history → Timeline renders → Actor icons distinguish human/agent

### Widget Templates for US7

- [ ] T063 [P] [US7] Create `audit_timeline.widget` JSON template at `packages/api/src/taskflow_api/services/widgets/templates/audit_timeline.widget`

### Widget Builders for US7

- [ ] T064 [US7] Create `build_audit_timeline_widget()` function in `packages/api/src/taskflow_api/services/widgets/audit_timeline.py`
- [ ] T065 [US7] Add timestamp formatting (relative: "2 hours ago")
- [ ] T066 [US7] Add actor type indicators (Bot icon for agents, User icon for humans)
- [ ] T067 [US7] Add audit timeline widget export to `packages/api/src/taskflow_api/services/widgets/__init__.py`

### Backend Audit Integration for US7

- [ ] T068 [US7] Add audit timeline widget rendering to `respond()` when user asks for task history/audit

**Checkpoint**: Timeline widget renders audit entries, actor badges show correct icons

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, and quality improvements

### Error Handling

- [ ] T069 [P] Add error toast component or utilize existing error handling in ChatKitWidget
- [ ] T070 Add graceful fallback to plain text if widget rendering fails
- [ ] T071 Add retry logic for failed server actions

### Edge Cases

- [ ] T072 [P] Create empty state widget for "No tasks found" with "Create your first task" button
- [ ] T073 Add pagination support to task list widget (10 items per page, "Show more" button)
- [ ] T074 Add stale data indicator (refresh prompt after 30 seconds)

### Testing

- [ ] T075 [P] Add unit tests for widget builders in `packages/api/src/taskflow_api/tests/test_widgets.py`
- [ ] T076 [P] Add integration tests for members endpoint in `packages/api/src/taskflow_api/tests/test_members.py`
- [ ] T077 Add E2E test for complete widget interaction flow

### Documentation

- [ ] T078 [P] Update README with Agentic UI feature documentation
- [ ] T079 Add widget template documentation to `packages/api/docs/widgets.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────┐
                          ↓
Phase 2 (Foundation) ─────┤ BLOCKS ALL USER STORIES
                          ↓
     ┌────────────────────┴────────────────────┐
     ↓                                         ↓
Phase 3 (US1: Widgets)              Phase 4 (US2: @Mentions)
     ↓                                         ↓
     │                              Phase 5 (US3: Progress)
     │                                         ↓
     │                              Phase 6 (US4: Composer)
     │                                         ↓
     │                              Phase 7 (US5: Forms)
     │                                         ↓
     └─────────────────────────────────────────┤
                                               ↓
                              Phase 8 (US6: Context Badge)
                                               ↓
                              Phase 9 (US7: Audit Timeline)
                                               ↓
                              Phase 10 (Polish)
```

### User Story Dependencies

- **US1 (Task List Widget)**: Depends on Phase 2 only - MVP deliverable
- **US2 (@Mentions)**: Depends on Phase 2 only - Can parallel with US1
- **US3 (Progress)**: Depends on Phase 2 - Enhances US1/US2 but independent
- **US4 (Composer Tools)**: Depends on Phase 2 only - Independent
- **US5 (Form Widget)**: Depends on US1 (widget system) - Sequential after US1
- **US6 (Context Badge)**: Already in Phase 2, enhancement only
- **US7 (Audit Timeline)**: Depends on US1 (widget system) - Sequential after US1

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```
T005 + T009 + T011 + T014 can run in parallel (different files)
```

**After Phase 2 completes**:
```
US1 (Phase 3) and US2 (Phase 4) can run in parallel
US3 (Phase 5) and US4 (Phase 6) can run in parallel after US1/US2
```

**Within Each User Story**:
```
Widget templates [P] can be created in parallel
Backend and frontend tasks on different files [P] can run in parallel
```

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Launch all widget templates together (different files):
Task T017: "Create task_list.widget template"
Task T018: "Create __init__.py for widgets"

# Launch backend and frontend in parallel (different packages):
Task T019-T024: Backend widget builders and server actions
Task T025-T028: Frontend widget handling
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T016)
3. Complete Phase 3: User Story 1 (T017-T028)
4. **STOP and VALIDATE**: Ask "Show my tasks" → Widget renders → Click Complete → Updates
5. Deploy/demo if ready - **This is a complete MVP!**

### Incremental Delivery

1. Phase 1-2 → Foundation ready
2. Phase 3 (US1) → Task widgets work → **MVP Demo** 🎯
3. Phase 4 (US2) → @Mentions work → Demo entity tagging
4. Phase 5-6 (US3-4) → Progress + Composer → Enhanced UX
5. Phase 7 (US5) → Form widgets → Full CRUD via chat
6. Phase 8-9 (US6-7) → Polish features → Complete experience
7. Phase 10 → Production ready

### Estimated Hours by Phase

| Phase | Hours | Cumulative |
|-------|-------|------------|
| Setup | 0.5h | 0.5h |
| Foundational | 2.5h | 3h |
| US1 (Widgets) | 4h | 7h |
| US2 (@Mentions) | 3h | 10h |
| US3-4 (Progress/Composer) | 2h | 12h |
| US5 (Forms) | 2h | 14h |
| US6-7 (Context/Audit) | 1.5h | 15.5h |
| Polish | 1.5h | 17h |

**Total: ~17 hours** (14 hours implementation + 3 hours polish/testing)

---

## Task Summary

- **Total Tasks**: 79
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 12 tasks
- **Phase 3 (US1)**: 12 tasks ← MVP
- **Phase 4 (US2)**: 11 tasks
- **Phase 5 (US3)**: 5 tasks
- **Phase 6 (US4)**: 7 tasks
- **Phase 7 (US5)**: 8 tasks
- **Phase 8 (US6)**: 3 tasks
- **Phase 9 (US7)**: 6 tasks
- **Phase 10 (Polish)**: 11 tasks

**Parallel Opportunities**: 28 tasks marked [P]

**Skills to Apply**:
- `chatkit-streaming` (Phase 2, US3)
- `chatkit-actions` (US1, US2, US4, US5, US7)
- `frontend-design` (All UI components)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Widget templates use ChatKit's built-in components only
- All server actions route through existing audited API endpoints
