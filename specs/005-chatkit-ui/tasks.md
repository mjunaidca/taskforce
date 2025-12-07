# Task Breakdown: TaskFlow ChatKit UI

**Feature Branch**: `005-chatkit-ui`
**Generated**: 2025-12-07
**Spec Version**: 1.0
**Plan Version**: 1.0

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 35 |
| Setup Tasks | 4 |
| Foundational Tasks | 6 |
| User Story Tasks | 21 |
| Polish Tasks | 4 |
| Parallel Opportunities | 12 |

### Task Distribution by User Story

| Story | Priority | Task Count | Description |
|-------|----------|------------|-------------|
| US1 | P1 | 5 | Open Chat and Send Message |
| US2 | P1 | 4 | Authenticate Chat Requests |
| US3 | P2 | 4 | Project Context Awareness |
| US4 | P2 | 4 | Conversation Persistence |
| US5 | P2 | 2 | Task Management via Chat |
| US6/7 | P3 | 2 | Close/Toggle + Tool Call Visibility |

---

## Phase 1: Setup

**Goal**: Project initialization and dependency installation

- [x] T001 Add @openai/chatkit-react dependency in `web-dashboard/package.json` *(skipped - using custom components with IFK design)*
- [x] T002 Create chat components directory structure at `web-dashboard/src/components/chat/`
- [x] T003 Create hooks directory if not exists at `web-dashboard/src/hooks/`
- [ ] T004 Add openai-agents SDK dependency in `packages/api/pyproject.toml` *(deferred to full Agents SDK integration)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Core infrastructure that all user stories depend on

- [x] T005 [P] Create ChatMessage and ChatContext types in `web-dashboard/src/types/chat.ts`
- [x] T006 [P] Create chat-api.ts client module in `web-dashboard/src/lib/chat-api.ts`
- [x] T007 [P] Create chat router placeholder in `packages/api/src/taskflow_api/routers/chat.py`
- [x] T008 Register chat router in FastAPI app at `packages/api/src/taskflow_api/main.py`
- [x] T009 Create Next.js API route proxy at `web-dashboard/src/app/api/chat/route.ts`
- [x] T010 Create useChat hook skeleton in `web-dashboard/src/hooks/useChat.ts`

---

## Phase 3: User Story 1 - Open Chat and Send Message (P1)

**Story Goal**: Basic chat that sends messages and receives responses

**Independent Test**: Click chat button, type "What tasks do I have?", verify response appears

### Tasks

- [x] T011 [P] [US1] Create ChatButton component with floating button UI in `web-dashboard/src/components/chat/ChatButton.tsx`
- [x] T012 [P] [US1] Create ChatInput component with text input and send button in `web-dashboard/src/components/chat/ChatInput.tsx`
- [x] T013 [P] [US1] Create ChatMessages component with scrollable message list in `web-dashboard/src/components/chat/ChatMessages.tsx`
- [x] T014 [US1] Create ChatPanel component composing header, messages, and input in `web-dashboard/src/components/chat/ChatPanel.tsx`
- [x] T015 [US1] Create ChatWidget main wrapper with open/close state in `web-dashboard/src/components/chat/ChatWidget.tsx`

---

## Phase 4: User Story 2 - Authenticate Chat Requests (P1)

**Story Goal**: Chat works only for authenticated users

**Independent Test**: Unauthenticated user clicks chat button, sees login prompt; authenticated user's message returns user-specific data

### Tasks

- [x] T016 [P] [US2] Create LoginPrompt component with login button in `web-dashboard/src/components/chat/LoginPrompt.tsx`
- [x] T017 [US2] Add auth check to ChatWidget using AuthProvider context in `web-dashboard/src/components/chat/ChatWidget.tsx`
- [x] T018 [US2] Update Next.js API route to handle 401 and forward cookies in `web-dashboard/src/app/api/chat/route.ts`
- [x] T019 [US2] Implement auth validation in FastAPI chat endpoint in `packages/api/src/taskflow_api/routers/chat.py`

---

## Phase 5: User Story 3 - Project Context Awareness (P2)

**Story Goal**: Chat knows which project you're viewing

**Independent Test**: Navigate to `/projects/5`, open chat, verify "Context: Project Name" shown, send message, verify project_id in request

### Tasks

- [x] T020 [P] [US3] Create ChatHeader component showing project context in `web-dashboard/src/components/chat/ChatHeader.tsx`
- [x] T021 [US3] Add usePathname/useParams for project ID extraction in ChatWidget at `web-dashboard/src/components/chat/ChatWidget.tsx`
- [x] T022 [US3] Update useChat hook to accept and send project_id in `web-dashboard/src/hooks/useChat.ts`
- [x] T023 [US3] Update FastAPI chat endpoint to use project_id filter in `packages/api/src/taskflow_api/routers/chat.py`

---

## Phase 6: User Story 4 - Conversation Persistence (P2)

**Story Goal**: Chat history persists across sessions

**Independent Test**: Have conversation, close tab, reopen, verify previous messages visible

### Tasks

- [ ] T024 [P] [US4] Create Conversation SQLModel in `packages/api/src/taskflow_api/models/conversation.py`
- [ ] T025 [P] [US4] Create conversation Pydantic schemas in `packages/api/src/taskflow_api/schemas/conversation.py`
- [ ] T026 [US4] Add conversation CRUD to chat router in `packages/api/src/taskflow_api/routers/chat.py`
- [ ] T027 [US4] Update useChat hook to load history and track conversation_id in `web-dashboard/src/hooks/useChat.ts`

---

## Phase 7: User Story 5 - Task Management via Chat (P2)

**Story Goal**: Create, update, complete tasks through natural language

**Independent Test**: Say "Add task: Buy groceries", verify task created; say "Complete task 1", verify status changes

### Tasks

- [ ] T028 [US5] Integrate OpenAI Agents SDK with MCP tools in chat router at `packages/api/src/taskflow_api/routers/chat.py`
- [ ] T029 [US5] Connect chat agent to existing task tools (list_tasks, add_task, complete_task) in `packages/api/src/taskflow_api/routers/chat.py`

---

## Phase 8: User Stories 6 & 7 - Close/Toggle + Tool Call Visibility (P3)

**Story Goal**: Smooth UX, tool call transparency for power users

**Independent Test**: Open chat, close, reopen - conversation intact; enable tool calls, see "Called: add_task" in response

### Tasks

- [x] T030 [P] [US7] Create ToolCallDisplay collapsible component in `web-dashboard/src/components/chat/ToolCallDisplay.tsx`
- [x] T031 [US6] Add smooth open/close animations to ChatWidget in `web-dashboard/src/components/chat/ChatWidget.tsx`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Final integration, edge cases, theme matching

### Tasks

- [x] T032 Add ChatWidget to dashboard layout in `web-dashboard/src/app/dashboard/layout.tsx` and `web-dashboard/src/app/projects/layout.tsx`
- [x] T033 Add error state with retry button to ChatPanel in `web-dashboard/src/components/chat/ChatPanel.tsx`
- [x] T034 Add empty state with welcome message and suggested prompts in `web-dashboard/src/components/chat/ChatMessages.tsx`
- [x] T035 Ensure chat theme matches IFK dashboard theme (Tailwind classes) in all chat components

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← All user stories depend on this
    ↓
┌─────────────────────────────────────────────┐
│  Phase 3 (US1: Send Message)                │
│      ↓                                       │
│  Phase 4 (US2: Authentication)              │
│      ↓                                       │
│  ┌────────────────┬────────────────┐        │
│  │ Phase 5 (US3)  │ Phase 6 (US4)  │ ← Can  │
│  │ Context        │ Persistence    │   run  │
│  └────────┬───────┴───────┬────────┘   in   │
│           └───────┬───────┘            par. │
│                   ↓                         │
│           Phase 7 (US5: Task Mgmt)          │
└─────────────────────────────────────────────┘
    ↓
Phase 8 (US6/US7: Polish features)
    ↓
Phase 9 (Final integration)
```

### Critical Path

1. T001-T004 (Setup) → T005-T010 (Foundation)
2. T011-T015 (US1) → T016-T019 (US2) - Auth depends on basic messaging
3. T020-T023 (US3) || T024-T027 (US4) - Can run in parallel
4. Both must complete before T028-T029 (US5)
5. T030-T031 (US6/7) can start after US1
6. T032-T035 (Polish) after all stories complete

---

## Parallel Execution Opportunities

### Within Phase 2 (Foundation)
```
T005 (types) || T006 (api client) || T007 (router placeholder)
     ↓              ↓                    ↓
          T008 (register router)
               ↓
          T009 (Next.js route)
               ↓
          T010 (useChat hook)
```

### Within Phase 3 (US1)
```
T011 (ChatButton) || T012 (ChatInput) || T013 (ChatMessages)
                           ↓
                    T014 (ChatPanel)
                           ↓
                    T015 (ChatWidget)
```

### Within Phase 4 (US2)
```
T016 (LoginPrompt) || T017 (auth check) || T018 (API route auth)
                              ↓
                       T019 (FastAPI auth)
```

### Phases 5 and 6 (US3 || US4)
```
┌────────────────────────┐   ┌────────────────────────┐
│ T020 (ChatHeader)      │   │ T024 (Conversation)    │
│ T021 (URL extraction)  │   │ T025 (schemas)         │
│ T022 (useChat update)  │   │ T026 (CRUD)            │
│ T023 (FastAPI update)  │   │ T027 (useChat history) │
└────────────────────────┘   └────────────────────────┘
            ↓                           ↓
            └───────────┬───────────────┘
                        ↓
              Phase 7 (US5: Task Mgmt)
```

---

## Implementation Strategy

### MVP Scope (User Story 1 only)

For fastest time-to-demo, implement only:
- T001-T004 (Setup)
- T005-T010 (Foundation)
- T011-T015 (US1: Send Message)

**Result**: Working chat that can send/receive messages. ~10 tasks, demonstrable value.

### Incremental Delivery

| Milestone | Stories | Cumulative Tasks |
|-----------|---------|------------------|
| MVP | US1 | 15 |
| Auth | US1 + US2 | 19 |
| Smart Chat | + US3 | 23 |
| Persistent | + US4 | 27 |
| Task Mgmt | + US5 | 29 |
| Polished | + US6/7 + Polish | 35 |

### Suggested Order for Single Developer

1. **Day 1**: Setup + Foundation (T001-T010)
2. **Day 2**: US1 (T011-T015) - get basic chat working
3. **Day 3**: US2 (T016-T019) - add authentication
4. **Day 4**: US3 + US4 (T020-T027) - context and persistence
5. **Day 5**: US5 + US6/7 + Polish (T028-T035) - task management and polish

---

## Success Criteria Mapping

| Criterion | Covered By |
|-----------|------------|
| SC-001: Response < 5s | T015, T028 |
| SC-002: Chat on all pages | T032 |
| SC-003: 100% auth | T017, T018, T019 |
| SC-004: Project context | T021, T022, T023 |
| SC-005: History persists | T024-T027 |
| SC-006: User-friendly errors | T033 |
| SC-007: Smooth animations | T031 |
| SC-008: Add task < 30s | T028, T029 |
| SC-009: Theme matches | T035 |
| SC-010: Works after nav | T021, T022 |

---

## Notes

- All frontend tasks are in `web-dashboard/src/`
- All backend tasks are in `packages/api/src/taskflow_api/`
- Reference implementation at `robolearn-interface/src/components/ChatKitWidget/` for patterns
- Use Tailwind CSS for styling (no CSS modules)
- Use existing AuthProvider for auth state
- ChatKit requires external script - use script loading detection pattern from reference
