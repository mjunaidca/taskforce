# Implementation Plan: Agentic UI Dashboard

**Feature**: TaskFlow Agentic UI Dashboard with Interactive Widgets
**Branch**: `008-agentic-ui-dashboard`
**Created**: 2025-12-08
**Spec**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/specs/008-agentic-ui-dashboard/spec.md`

---

## Summary

Transform TaskFlow's basic ChatKit widget into a full **Agentic UI** experience where users interact with live, actionable widgets instead of plain text. Users will @mention workers/agents, click buttons in task list widgets to complete/start/assign tasks, see real-time progress indicators, and switch between contextual modes (Tasks, Projects, Quick Actions). This elevates Phase III (MCP + ChatKit) from conversational to truly interactive AI-native UX.

**Core Innovation**: Widget-based interactions where AI responses contain interactive components (task lists, forms, timelines) with buttons that execute server actions, update instantly via `ThreadItemReplacedEvent`, and maintain full audit trail per the constitution.

---

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.x (frontend), Next.js 16 (App Router)
**Primary Dependencies**:
- Frontend: `@openai/chatkit-react`, `next`, Better Auth
- Backend: `chatkit`, `agents` (OpenAI Agents SDK), `fastapi`, `sqlmodel`
- Infrastructure: PostgreSQL (Neon), MCP Server (9 task tools)

**Storage**: PostgreSQL (Neon) - existing tables (tasks, workers, projects, audit_logs), ChatKit conversations in separate schema (`taskflow_chat`)
**Testing**: Pytest (backend), Vitest (frontend), Playwright (E2E)
**Target Platform**: Web (Desktop-first, 1024px+ viewport)
**Project Type**: Web application (Next.js frontend + FastAPI backend + MCP server)
**Performance Goals**:
- Widget render time: <100ms (P95)
- Action handler response: <2s (P95)
- @mention autocomplete: <200ms (P95)
- Progress indicators for ops >500ms

**Constraints**:
- Desktop-first (mobile out of scope)
- ChatKit widget component library only (no custom React widgets)
- httpOnly cookie authentication (requires server-side proxy)
- SSE streaming (no WebSocket in this phase)

**Scale/Scope**:
- 7 user stories (P1-P3 prioritization)
- 4 widget types (task list, form, detail, audit timeline)
- 3 composer tool modes
- ~15 frontend components, ~10 backend modules
- Estimated: 14 hours across 4 phases

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle 1: Every Action MUST Be Auditable

**Compliance**: All widget actions route through existing audited API endpoints.
- Widget button click → Server action → API call → Audit entry created
- Same audit trail as direct API calls or MCP tool invocations
- No new audit requirements (existing system handles it)

**Validation**: Verified that `action()` method calls existing endpoints (`complete_task`, `start_task`, etc.) which already create audit logs.

### ✅ Principle 2: Agents Are First-Class Citizens

**Compliance**: @mention autocomplete treats humans and agents equally.
- Both appear in same autocomplete list
- Agents shown with Bot icon, humans with User icon
- Assignment dropdown populated from same `/api/members` endpoint
- Agent work visible in audit timeline widget

**Validation**: Entity tagging implementation doesn't distinguish between human/agent in UX—only in icon display for clarity.

### ✅ Principle 3: Recursive Task Decomposition

**Compliance**: Widget system supports subtasks.
- Task detail widget shows subtasks if `parent_id` is set
- "Add Subtask" button available in detail widget
- Form widget supports `parent_id` field
- Subtask rendering uses same widget template (recursive)

**Validation**: Data model already supports `parent_id` (Phase II). Widgets leverage existing structure.

### ✅ Principle 4: Spec-Driven Development

**Compliance**: Implementation generated from spec `/specs/008-agentic-ui-dashboard/spec.md`.
- 7 user stories with acceptance scenarios
- Technical boundaries clearly separated from implementation details
- This plan implements spec requirements exactly
- Test strategy derived from user scenarios

**Validation**: ✅ Spec exists and is comprehensive (300+ lines, 7 user stories, edge cases defined).

---

## Project Structure

### Documentation (this feature)

```text
specs/008-agentic-ui-dashboard/
├── plan.md              # This file (/sp.plan command output)
├── spec.md              # Feature specification (EXISTING)
├── checklists/          # Phase-specific validation checklists (EXISTING)
└── tasks.md             # NOT YET CREATED - run /sp.tasks after plan approval
```

### Source Code (repository root)

**Existing Foundation** (NO CHANGES):
```text
web-dashboard/src/
├── app/
│   ├── layout.tsx                 # ChatKit script loaded via beforeInteractive
│   └── api/chatkit/route.ts       # httpOnly cookie proxy (working)
└── components/
    ├── providers/auth-provider.tsx  # Better Auth integration
    └── chat/
        ├── ChatKitWidget.tsx        # EXTEND (add widgets, entities, composer tools)
        └── styles.module.css        # MAY EXTEND (widget style overrides)

packages/api/src/taskflow_api/
├── main.py                        # FastAPI app with /chatkit endpoint (working)
├── services/
│   ├── chatkit_server.py          # EXTEND (add action() method)
│   └── chat_agent.py              # EXTEND (update system prompt)
└── chatkit_store/                 # PostgreSQL store (working)

packages/mcp-server/src/taskflow_mcp/tools/
└── tasks.py                       # 9 MCP tools (NO CHANGES - working)
```

**New Additions**:
```text
web-dashboard/src/
├── app/api/
│   └── members/route.ts           # NEW - Autocomplete endpoint for @mentions
├── components/chat/
│   └── widgets/                   # NEW - Widget utilities (optional)
│       └── index.ts
└── lib/
    └── chatkit-config.ts          # NEW - Centralized useChatKit configuration

packages/api/src/taskflow_api/
├── services/widgets/              # NEW - Widget rendering logic
│   ├── __init__.py
│   ├── task_list.py               # build_task_list_widget()
│   ├── task_form.py               # build_task_form_widget()
│   ├── task_detail.py             # build_task_detail_widget()
│   ├── audit_timeline.py          # build_audit_timeline_widget()
│   └── templates/                 # NEW - Widget JSON templates
│       ├── task_list.widget       # ListView with action buttons
│       ├── task_form.widget       # Form with validation
│       ├── task_detail.widget     # Expandable card with progress bar
│       └── audit_timeline.widget  # Timeline with actor badges
└── routers/
    └── members.py                 # NEW - GET /api/members for autocomplete
```

**Structure Decision**: Extends existing web application structure (Next.js + FastAPI + MCP). No new top-level directories required. Widget templates live in backend (server-side rendering), widget action handlers in ChatKitServer (Python). Frontend remains thin (useChatKit configuration only).

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**NO VIOLATIONS** - All constitutional principles satisfied without compromises.

---

## Implementation Phases

### Phase 1: Foundation - Streaming Lifecycle & Context Awareness (3 hours)

**Goal**: Lock UI during responses, show progress indicators, update context badge

**Skill Applied**: `chatkit-streaming` (Tier 2)

**Frontend Tasks**:

1. **Extend ChatKitWidget.tsx with streaming handlers**
   - Add `onResponseStart` → Set `isResponding: true`, lock composer
   - Add `onResponseEnd` → Set `isResponding: false`, unlock UI
   - Add `onError` → Unlock UI on failure
   - State: `const [isResponding, setIsResponding] = useState(false)`

2. **Add Progress Indicator Component**
   - Create `<ProgressIndicator message={string} />` component
   - Show when `isResponding === true`
   - Display message from `ProgressUpdateEvent`
   - Position: Overlay on chat or inline in composer

3. **Enhance Context Badge**
   - Component: `<ContextBadge projectId={number} projectName={string} />`
   - Visual: Badge in chat header "Project: Alpha" with X button
   - Listen to Next.js router: `usePathname()` → Update on route change
   - X button clears context → Show "All Projects"

**Backend Tasks**:

1. **Add ProgressUpdateEvent to agent responses**
   - In `chatkit_server.py` → `respond()` method
   - Yield progress before MCP calls:
     ```python
     yield ProgressUpdateEvent(message="Fetching your tasks...")
     # ... call MCP tool
     yield ProgressUpdateEvent(message=f"Found {len(tasks)} tasks...")
     ```

2. **Update system prompt with project context**
   - Modify `TASKFLOW_SYSTEM_PROMPT` in `chat_agent.py`
   - Include `project_id`, `project_name` in formatted prompt
   - Instruct agent: "Scope all queries to Project: {project_name} (ID: {project_id})"

**Testing**:
- ✅ Send message → Composer locks, can't type
- ✅ Progress indicator shows "Fetching tasks..."
- ✅ Navigate `/projects/5` → Badge shows "Project: Alpha"
- ✅ Click X → Badge shows "All Projects"
- ✅ Response completes → UI unlocks

**Evidence**: `chatkit-streaming` skill patterns 1, 3, 4

---

### Phase 2: Widget System - Task List with Server Actions (4 hours)

**Goal**: AI returns interactive task list widget with Complete/Start/Assign buttons

**Skill Applied**: `chatkit-actions` (Tier 3)

**Frontend Tasks**:

1. **Add widgets configuration to useChatKit**
   ```typescript
   widgets: {
     onAction: async (action, widgetItem) => {
       if (action.handler === "server") {
         await chatkit.sendCustomAction(action, widgetItem.id);
       } else {
         handleClientAction(action);  // Navigate, etc.
       }
     }
   }
   ```

2. **Implement client action handler stub** (for future navigation)
   ```typescript
   const handleClientAction = (action) => {
     switch (action.type) {
       case "task.view":
         router.push(`/tasks/${action.payload.task_id}`);
         break;
     }
   };
   ```

**Backend Tasks**:

1. **Create widget templates** (`services/widgets/templates/`)
   - `task_list.widget` - JSON template (see Appendix A1 for full example)
     - ListView with ListViewItem per task
     - Row layout: icon, title, priority, assignee
     - Buttons: Start (status=pending), Complete (status=in_progress), View (all)
     - Each button has `onClickAction: { type, handler: "server", payload }`

2. **Create widget builder** (`services/widgets/task_list.py`)
   ```python
   from chatkit.widgets import WidgetTemplate, WidgetRoot

   _template = WidgetTemplate.from_file("task_list.widget")

   def build_task_list_widget(tasks: list[dict]) -> WidgetRoot:
       return _template.build(data={"tasks": tasks})
   ```

3. **Implement action() method in TaskFlowChatKitServer**
   ```python
   async def action(
       self, thread, action, sender, context
   ) -> AsyncIterator[ThreadStreamEvent]:

       user_id = context.user_id
       token = context.metadata.get("access_token")
       project_id = context.metadata.get("project_id")

       if action.type == "task.complete":
           task_id = action.payload["task_id"]

           # Call existing API (creates audit entry)
           client = get_api_client()
           await client.complete_task(user_id, task_id, token)

           # Fetch updated tasks
           tasks = await client.list_tasks(user_id, project_id, token)

           # Build updated widget
           updated_widget = build_task_list_widget(tasks)

           # Replace widget in thread
           yield ThreadItemReplacedEvent(
               item=sender.model_copy(update={"widget": updated_widget})
           )

           # Confirmation message
           yield ThreadItemDoneEvent(
               item=AssistantMessageItem(
                   id=self.store.generate_item_id("msg", thread, context),
                   thread_id=thread.id,
                   created_at=datetime.now(),
                   content=[{"text": f"✅ Task {task_id} completed!"}],
               )
           )
   ```

4. **Wrap MCP responses in widgets**
   - Option A: Agent prompt instructs widget usage
   - Option B: Wrapper in `respond()` intercepts tool outputs
   - **Recommendation**: Option B (more reliable)

**Testing**:
- ✅ Ask "Show my tasks" → Task list widget renders
- ✅ Click "Complete" button → Button shows loading spinner
- ✅ Widget updates to show "completed" badge
- ✅ Confirmation message appears
- ✅ Verify audit entry in database

**Evidence**: `chatkit-actions` skill patterns 1, 3, 8

---

### Phase 3: Entity Tagging - @Mentions for Workers/Agents (3 hours)

**Goal**: Type @cl → See @claude-code in autocomplete → Assign tasks via @mention

**Skill Applied**: `chatkit-actions` (Tier 3, Pattern 5)

**Frontend Tasks**:

1. **Add entities configuration to useChatKit**
   ```typescript
   entities: {
     onTagSearch: async (query: string) => {
       const res = await fetch(`/api/members?q=${query}`);
       const members = await res.json();

       return members.map(m => ({
         id: m.id,
         title: m.handle,  // "@claude-code"
         icon: m.type === "agent" ? "bot" : "profile",
         group: m.type === "agent" ? "AI Agents" : "Team Members",
         data: { type: m.type, worker_id: m.id },
       }));
     },

     onRequestPreview: async (entity) => ({
       preview: {
         type: "Card",
         children: [
           { type: "Text", value: entity.title, weight: "bold" },
           { type: "Text", value: `Type: ${entity.data.type}`, color: "tertiary" },
         ],
       },
     }),
   }
   ```

**Backend Tasks**:

1. **Create /api/members endpoint** (`routers/members.py`)
   ```python
   @router.get("/members")
   async def get_members(
       q: str = "",
       project_id: int | None = None,
       session: AsyncSession = Depends(get_session),
       user: dict = Depends(verify_jwt),
   ):
       query = select(Worker).where(Worker.handle.ilike(f"%{q}%"))
       if project_id:
           query = query.join(ProjectMember).where(
               ProjectMember.project_id == project_id
           )

       results = await session.execute(query)
       workers = results.scalars().all()

       return [
           {
               "id": w.id,
               "handle": w.handle,
               "name": w.name,
               "type": w.type,  # "human" or "agent"
               "capabilities": w.capabilities if w.type == "agent" else None,
           }
           for w in workers
       ]
   ```

2. **Create Next.js proxy route** (`app/api/members/route.ts`)
   - Reads httpOnly cookie `taskflow_id_token`
   - Forwards to backend `/api/members` with Authorization header
   - Similar pattern to `/api/chatkit/route.ts`

3. **Update system prompt to handle entity tags**
   - Convert @mentions to XML:
     ```
     User: "Assign task 5 to @claude-code"

     Agent input:
     "Assign task 5 to <WORKER_REFERENCE id='3' type='agent'>@claude-code</WORKER_REFERENCE>"
     ```
   - Agent extracts `id='3'` → Calls `taskflow_assign_task` with `assignee_id=3`

**Testing**:
- ✅ Type "@" → Autocomplete popup appears
- ✅ Type "@cl" → Filters to @claude-code with Bot icon
- ✅ Arrow keys navigate, Enter selects
- ✅ Send "Assign to @claude-code" → Agent assigns correctly
- ✅ Click @mention chip → Preview popup shows agent info

**Evidence**: `chatkit-actions` skill pattern 5

---

### Phase 4: Advanced Features - Forms, Composer Tools, Audit Timeline (4 hours)

**Goal**: Task creation form, mode buttons, audit timeline widget

**Skill Applied**: `chatkit-actions` (Tier 3, Patterns 2, 6, 7)

**Frontend Tasks**:

1. **Add composer tools configuration**
   ```typescript
   composer: {
     placeholder: "Ask about your tasks...",
     tools: [
       {
         id: "tasks",
         label: "Tasks",
         icon: "checkbox",
         placeholderOverride: "What tasks need attention?",
         pinned: true,
       },
       {
         id: "projects",
         label: "Projects",
         icon: "folder",
         placeholderOverride: "Ask about project status...",
         pinned: true,
       },
       {
         id: "quick_actions",
         label: "Quick Actions",
         icon: "bolt",
         placeholderOverride: "Complete, start, or assign...",
         pinned: false,
       },
     ],
   }
   ```

**Backend Tasks**:

1. **Create task form widget** (`task_form.widget`)
   - Form fields: title (text, required), description (textarea), priority (dropdown), assignee (member selector)
   - Submit button: `onClickAction: { type: "task.create", handler: "server" }`
   - Validation: Client-side via ChatKit form validation

2. **Build form widget function** (`task_form.py`)
   ```python
   def build_task_form_widget(
       project_id: int, members: list[dict]
   ) -> WidgetRoot:
       # Populate assignee dropdown from members
       return form_template.build(data={
           "project_id": project_id,
           "members": members,
       })
   ```

3. **Handle task.create action**
   ```python
   if action.type == "task.create":
       data = action.payload
       task = await client.create_task(
           user_id, data["project_id"], data["title"],
           description=data.get("description"),
           priority=data.get("priority"),
           assignee_id=data.get("assignee_id"),
           access_token=token,
       )

       # Replace form with success confirmation
       success_widget = build_task_created_confirmation(task)
       yield ThreadItemReplacedEvent(
           item=sender.model_copy(update={"widget": success_widget})
       )
   ```

4. **Create audit timeline widget** (`audit_timeline.widget`)
   - Timeline layout: vertical list of entries
   - Entry: Row with actor icon, action text, timestamp
   - Actor badge: Bot icon (agents) or User icon (humans)

5. **Build audit timeline function** (`audit_timeline.py`)
   ```python
   def build_audit_timeline_widget(audit_logs: list[dict]) -> WidgetRoot:
       # Format timestamps as relative ("2 hours ago")
       # Add actor type indicators
       return timeline_template.build(data={"entries": audit_logs})
   ```

6. **Route by tool_choice in respond()**
   ```python
   tool_choice = context.metadata.get("tool_choice", "tasks")

   if tool_choice == "projects":
       instructions = PROJECT_FOCUSED_PROMPT
   elif tool_choice == "quick_actions":
       instructions = ACTION_FOCUSED_PROMPT
   else:
       instructions = TASK_FOCUSED_PROMPT
   ```

**Testing**:
- ✅ Say "Add a task" → Form widget appears
- ✅ Fill fields, click Create → Form replaced with success
- ✅ Click "Tasks" mode → Placeholder updates
- ✅ Ask "Show audit for task 5" → Timeline appears
- ✅ Actor badges show correct icons

**Evidence**: `chatkit-actions` skill patterns 2, 6, 7

---

## Component Architecture

### Frontend Component Hierarchy

```
<ChatKitWidget>                    # Root component
  ├── [Script Loading Detection]   # Wait for custom element
  ├── [Progress Indicator]         # NEW - show during isResponding
  ├── <ContextBadge>               # NEW - project context display
  ├── <ChatKit control={control}>  # ChatKit React component
  │   ├── [Composer with Tools]    # NEW - mode buttons
  │   ├── [Entity Autocomplete]    # NEW - @mention popup
  │   ├── [Thread Messages]
  │   │   ├── UserMessage
  │   │   ├── AssistantMessage
  │   │   └── WidgetItem           # NEW - interactive widgets
  │   │       ├── TaskListWidget
  │   │       ├── TaskFormWidget
  │   │       ├── TaskDetailWidget
  │   │       └── AuditTimelineWidget
  └── <Settings Menu>              # Existing - personalize button
```

### Backend Handler Flow

```
User clicks widget button
    ↓
Frontend: widgets.onAction({ type: "task.complete", payload: { task_id: 5 } })
    ↓
Frontend: chatkit.sendCustomAction(action, widgetItem.id)
    ↓
Backend: action() method receives Action
    ↓
Backend: Extracts task_id from payload
    ↓
Backend: Calls API endpoint → Creates audit entry
    ↓
Backend: Fetches updated task list
    ↓
Backend: Builds new widget with updated data
    ↓
Backend: Yields ThreadItemReplacedEvent(updated_widget)
    ↓
Frontend: Widget updates instantly (no page refresh)
```

---

## Test Strategy

### Unit Tests

**Frontend (Vitest)**:
- `ChatKitWidget.spec.tsx`
  - ✅ onResponseStart locks composer
  - ✅ onResponseEnd unlocks UI
  - ✅ Context badge updates on route change
  - ✅ Entity autocomplete fetches /api/members
  - ✅ Tool selection changes placeholder

**Backend (Pytest)**:
- `test_chatkit_server.py`
  - ✅ action() method handles task.complete
  - ✅ Widget builder creates valid JSON
  - ✅ ProgressUpdateEvent yielded before long ops
  - ✅ Entity tags converted to XML in prompt

- `test_members_router.py`
  - ✅ GET /api/members returns workers + agents
  - ✅ Query filter works (q="claude")
  - ✅ Project filter works (project_id=5)

### Integration Tests (Playwright)

- ✅ Load chat → Ask "Show tasks" → Widget appears
- ✅ Click "Complete" → Widget updates
- ✅ Audit entry created in DB
- ✅ Type "@cl" → Autocomplete shows @claude-code
- ✅ Send message → Progress indicator appears

### E2E Test (Complete Flow)

1. Navigate to `/projects/5`
2. Open chat → Context badge shows "Project: Alpha"
3. Click "Tasks" mode → Placeholder changes
4. Ask "Show my tasks" → Task list widget appears
5. Click "Start" on pending task → Widget updates
6. Type "@cl" → @claude-code appears
7. Send "Assign task 3 to @claude-code"
8. Widget updates to show assignment
9. Ask "Show audit for task 3" → Timeline appears
10. Verify audit entries match expectations

---

## Risk Assessment

### High-Risk Areas

1. **Widget Template Syntax Errors**
   - **Risk**: Invalid JSON breaks rendering
   - **Mitigation**: Validate templates on load, graceful fallback to text
   - **Fallback**: Plain text responses if widget fails

2. **Action Handler Race Conditions**
   - **Risk**: Concurrent button clicks cause conflicts
   - **Mitigation**: Disable buttons during `isResponding`, queue server-side
   - **Fallback**: Optimistic UI updates, rollback on failure

3. **Entity Tag Parsing Failures**
   - **Risk**: LLM doesn't extract entity IDs correctly
   - **Mitigation**: Clear XML format in prompt, fallback regex
   - **Fallback**: Direct @mention text matching

### Medium-Risk Areas

- Widget state synchronization (stale data if updated elsewhere)
- Composer tool mode confusion (unclear to users)
- Large task lists (100+ items slow rendering)

### Low-Risk Areas

- Progress indicators (cosmetic)
- Context badge (read-only)
- Audit timeline (read-only)

---

## Acceptance Criteria

### Must-Have (P1)

- ✅ US1: Task list widget with action buttons
- ✅ US1: Click "Complete" → Task status updates
- ✅ US2: @mention autocomplete for workers/agents
- ✅ US2: Assign via @mention in natural language
- ✅ US3: Progress indicator during operations
- ✅ Audit entries for all widget actions
- ✅ Agent parity in autocomplete

### Should-Have (P2)

- ✅ US4: Composer tool modes
- ✅ US5: Task creation form widget
- ✅ Loading states on buttons
- ✅ Error handling with user-friendly messages

### Nice-to-Have (P3)

- ✅ US6: Context badge
- ✅ US7: Audit timeline widget
- ✅ Entity hover preview
- ✅ Empty state widgets

---

## Implementation Sequence (Day-by-Day)

### Day 1: Foundation (Phase 1)

1. Add `onResponseStart/End` handlers
2. Create `ProgressIndicator` component
3. Add context badge to chat header
4. Backend: Add `ProgressUpdateEvent` yields
5. Backend: Update system prompt with project context
6. **Test**: UI locks/unlocks, progress shows, context updates

### Day 2: Widget Setup (Phase 2 Part 1)

1. Create `services/widgets/` directory
2. Create `task_list.widget` template (JSON)
3. Implement `build_task_list_widget()` function
4. Test widget builder outputs valid JSON
5. **Test**: Widget renders with static data

### Day 3: Server Actions (Phase 2 Part 2)

1. Implement `action()` method in ChatKitServer
2. Handle `task.complete` and `task.start` actions
3. Add `widgets.onAction` handler to useChatKit
4. Implement `sendCustomAction` forwarding
5. **Test**: Click button → Action executes → Widget updates

### Day 4: Entity Tagging (Phase 3)

1. Create `/api/members` endpoint
2. Test endpoint returns workers + agents
3. Add `entities.onTagSearch` to useChatKit
4. Add `entities.onRequestPreview` for hover
5. Update system prompt for entity tag conversion
6. **Test**: Autocomplete works, assignments succeed

### Day 5: Advanced Features (Phase 4)

1. Add `composer.tools` configuration
2. Implement tool_choice routing in `respond()`
3. Create `task_form.widget` template
4. Implement form submission handler
5. Create `audit_timeline.widget` template
6. Implement timeline builder function
7. **Test**: Form creates task, timeline displays audit

---

## Next Steps After Implementation

### Immediate

- Deploy to staging
- User acceptance testing
- Performance profiling
- Bug fixes

### Future Enhancements

- Real-time widget updates (WebSocket sync)
- Drag-and-drop task reordering
- Bulk actions (multi-select)
- Custom widget templates
- Voice input
- Mobile optimization

---

## References

### Specifications

- **Feature Spec**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/specs/008-agentic-ui-dashboard/spec.md`
- **Constitution**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/.specify/memory/constitution.md`
- **Directives**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/docs/research/DIRECTIVES.md`

### Skills

- **chatkit-integration**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/.claude/skills/engineering/chatkit-integration/SKILL.md`
- **chatkit-streaming**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/.claude/skills/engineering/chatkit-streaming/SKILL.md`
- **chatkit-actions**: `/Users/mjs/Documents/code/mjunaidca/tf-agui/.claude/skills/engineering/chatkit-actions/SKILL.md`

### Existing Code

- Frontend: `/Users/mjs/Documents/code/mjunaidca/tf-agui/web-dashboard/src/components/chat/ChatKitWidget.tsx`
- Backend Server: `/Users/mjs/Documents/code/mjunaidca/tf-agui/packages/api/src/taskflow_api/services/chatkit_server.py`
- MCP Tools: `/Users/mjs/Documents/code/mjunaidca/tf-agui/packages/mcp-server/src/taskflow_mcp/tools/tasks.py`

---

**END OF PLAN**
