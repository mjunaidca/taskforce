# Final Review & Test Prompts - Widget Actions Implementation

## ✅ FINAL REVIEW - ALL SYSTEMS VERIFIED

### 1. Backend Action Handler ✅
**File:** `packages/api/src/taskflow_api/services/chatkit_server.py`

**Verified:**
- ✅ `action()` method implemented (lines 598-639)
- ✅ `_action_to_message()` helper (lines 641-690)
- ✅ Converts widget actions to natural language
- ✅ Processes through normal agent flow
- ✅ Returns stream of events

**Action Mappings:**
- `task.start` → "Start task {id}"
- `task.complete` → "Complete task {id}"
- `task.create` → "Create a new task: {title} - {description} with priority {priority}"
- `task.create_form` → "Show me the task creation form"
- `task.refresh` → "Refresh and show all my tasks"
- `project.create` → "Show me the project creation form"

### 2. Frontend Action Handler ✅
**File:** `web-dashboard/src/components/chat/ChatKitWidget.tsx`

**Verified:**
- ✅ `onAction` handler added (lines 354-380)
- ✅ Handles client-side navigation
- ✅ Logs all actions for debugging

**Action Mappings:**
- `task.view` → `router.push(/tasks/${task_id})`
- `project.view` → `router.push(/projects/${project_id})`
- `form.cancel` → Logged (ChatKit may handle)

### 3. MCP Tool Integration ✅
**File:** `packages/api/src/taskflow_api/services/chatkit_server.py`

**Verified:**
- ✅ `_call_mcp_tool()` uses streaming (lines 158-252)
- ✅ Uses `client.stream()` not `client.post()`
- ✅ Processes newline-delimited JSON
- ✅ Strips "data: " prefix
- ✅ Handles both streaming and JSON response formats

**Local Tools:**
- ✅ `list_tasks` - wraps params correctly (line 286)
- ✅ `add_task` - wraps params correctly (line 336)
- ✅ `list_projects` - wraps params correctly (line 365)

### 4. Widget Structures ✅
**Files:** `packages/api/src/taskflow_api/services/widgets/*.py`

**Verified:**
- ✅ `task_list.py` - ListView format with proper components
- ✅ `task_form.py` - Card and Form components
- ✅ `projects.py` - ListView format
- ✅ `audit_timeline.py` - Timeline format
- ✅ All use correct ChatKit component types
- ✅ All actions have correct type/handler/payload structure

### 5. Integration Points ✅

**Context Flow:**
```
User Message → ChatKitServer.respond() → Agent → MCP Tools →
on_tool_end hook → Widget Stream → ChatKit UI
```

**Action Flow (Server):**
```
Button Click → action() → _action_to_message() →
respond() → Agent → MCP Tool → Response Stream
```

**Action Flow (Client):**
```
Button Click → onAction() → router.push() → Page Navigation
```

---

## 🧪 TEST PROMPTS - COMPREHENSIVE COVERAGE

### Pre-Test Setup
1. **Start Backend:**
   ```bash
   cd packages/api
   uv run uvicorn taskflow_api.main:app --reload --port 8000
   ```

2. **Start Frontend:**
   ```bash
   cd web-dashboard
   pnpm dev
   ```

3. **Verify MCP Server is accessible:**
   - Backend should connect to MCP server on startup
   - Check logs for: `TaskFlowChatKitServer initialized with MCP server`

4. **Login to the application**
   - Ensure you're authenticated before testing

---

### Test Suite 1: Task List Widget Actions

#### Test 1.1: List Tasks (Widget Rendering)
**Prompt:**
```
Show me all tasks for the default project
```

**Expected Result:**
- ✅ Agent calls MCP `taskflow_list_tasks`
- ✅ Widget streams with ListView format
- ✅ Tasks display with status badges, priority, assignee
- ✅ Each task has action buttons (Start/Complete/View based on status)

**Success Criteria:**
- Widget appears (NOT just "#2" text)
- Tasks are visible with proper formatting
- Buttons are present and styled

---

#### Test 1.2: Start Task Button (Server Action)
**Setup:** Ensure you have a task with status "pending"

**Action:** Click the **Start** button (play icon) on a pending task

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.start`
- ✅ Console log: `[ACTION] Converted to message: Start task X`
- ✅ Agent responds: "Task #X has been started" (or similar)
- ✅ Task status updates to "in_progress"
- ✅ Widget may refresh showing updated status

**Success Criteria:**
- Task status changes in database
- Agent provides confirmation message
- No errors in console

---

#### Test 1.3: Complete Task Button (Server Action)
**Setup:** Ensure you have a task with status "in_progress"

**Action:** Click the **Complete** button (check icon) on an in-progress task

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.complete`
- ✅ Console log: `[ACTION] Converted to message: Complete task X`
- ✅ Agent responds: "Task #X has been completed" (or similar)
- ✅ Task status updates to "completed"

**Success Criteria:**
- Task status changes in database
- Agent provides confirmation message
- No errors in console

---

#### Test 1.4: View Task Button (Client Action)
**Action:** Click the **View** button (eye icon) on any task

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.view`
- ✅ Console log: `[ChatKit] Navigating to task: X`
- ✅ Browser navigates to `/tasks/X`
- ✅ Task detail page loads

**Success Criteria:**
- URL changes to `/tasks/{task_id}`
- Task detail page renders
- No backend call (client-side only)

---

#### Test 1.5: Refresh Button (Server Action)
**Action:** Click the **Refresh** button in the task list header

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.refresh`
- ✅ Console log: `[ACTION] Converted to message: Refresh and show all my tasks`
- ✅ Agent re-queries tasks
- ✅ Updated widget streams with latest data

**Success Criteria:**
- Widget refreshes with current data
- Recent changes are reflected

---

### Test Suite 2: Task Form Widget Actions

#### Test 2.1: Show Task Form (Not Yet Implemented)
**Prompt:**
```
Show me the task creation form
```

**Expected Result:**
- ⚠️ Agent may respond with text (form widget auto-streaming not implemented)
- ⚠️ OR manually trigger form by clicking "Create Task" if available

**Note:** Form auto-streaming is a known limitation (see WIDGET_ACTIONS_IMPLEMENTED.md)

---

#### Test 2.2: Create Task via Form (Server Action)
**Setup:** If form appears or you create one manually

**Action:**
1. Fill in form:
   - Title: "Test Task from ChatKit"
   - Description: "Testing form submission"
   - Priority: "high"
2. Click **Create Task** button

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.create`
- ✅ Console log: `[ACTION] Converted to message: Create a new task: Test Task from ChatKit - Testing form submission with priority high`
- ✅ Agent calls MCP `taskflow_add_task`
- ✅ Task created in database
- ✅ Success confirmation widget appears
- ✅ Widget shows task ID and "View Task" button

**Success Criteria:**
- New task appears in database
- Confirmation message displayed
- Task ID returned

---

#### Test 2.3: Cancel Form (Client Action)
**Setup:** Task form is open

**Action:** Click **Cancel** button

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: form.cancel`
- ✅ Console log: `[ChatKit] Form cancelled`
- ✅ Form may close (ChatKit may handle automatically)

**Success Criteria:**
- No errors in console
- Form closes or resets

---

### Test Suite 3: Projects Widget Actions

#### Test 3.1: List Projects (Widget Rendering)
**Prompt:**
```
Show me all my projects
```

**Expected Result:**
- ✅ Agent calls MCP `taskflow_list_projects`
- ✅ Widget streams with ListView format
- ✅ Projects display with name, description, task count, member count
- ✅ Each project has "View Project" button

**Success Criteria:**
- Widget appears with projects
- Proper formatting and data
- Buttons are present

---

#### Test 3.2: View Project Button (Client Action)
**Action:** Click **View Project** button on any project

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: project.view`
- ✅ Console log: `[ChatKit] Navigating to project: X`
- ✅ Browser navigates to `/projects/X`
- ✅ Project detail page loads

**Success Criteria:**
- URL changes to `/projects/{project_id}`
- Project detail page renders
- No backend call (client-side only)

---

### Test Suite 4: Task Created Confirmation Widget

#### Test 4.1: View Task from Confirmation (Client Action)
**Setup:** Create a task and wait for confirmation widget

**Action:** Click **View Task** button on the confirmation widget

**Expected Result:**
- ✅ Console log: `[ChatKit] Action received: task.view`
- ✅ Console log: `[ChatKit] Navigating to task: X`
- ✅ Browser navigates to `/tasks/X`
- ✅ Newly created task detail page loads

**Success Criteria:**
- Navigates to correct task
- Task detail shows the just-created task

---

### Test Suite 5: Error Handling

#### Test 5.1: MCP Server Unavailable
**Setup:** Stop MCP server

**Prompt:**
```
Show me all tasks
```

**Expected Result:**
- ⚠️ MCP call fails
- ✅ Error logged in console
- ✅ Agent may respond with error message
- ✅ No crash or hang

**Success Criteria:**
- Graceful error handling
- User sees error message
- System remains functional

---

#### Test 5.2: Invalid Action Type
**Setup:** This would require manually sending an invalid action (edge case)

**Expected Result:**
- ✅ Console log: `[ChatKit] Unknown client action: invalid.action`
- ✅ No crash or error thrown

---

### Test Suite 6: Natural Language Prompts (General)

#### Test 6.1: Natural Language Task Creation
**Prompt:**
```
Create a high priority task called "Review pull request" with description "Review PR #123"
```

**Expected Result:**
- ✅ Agent calls `add_task` local tool
- ✅ MCP tool creates task
- ✅ Confirmation widget or message appears

---

#### Test 6.2: Natural Language Task Management
**Prompt:**
```
Start task 2
```

**Expected Result:**
- ✅ Agent recognizes intent
- ✅ Calls appropriate MCP tool
- ✅ Task status updates
- ✅ Confirmation provided

---

#### Test 6.3: Complex Query
**Prompt:**
```
Show me all in-progress tasks for the default project
```

**Expected Result:**
- ✅ Agent calls `list_tasks` with status filter
- ✅ Widget appears with filtered tasks
- ✅ Only in-progress tasks shown

---

## 🔍 DEBUGGING CHECKLIST

### If Widget Shows "#2" or Plain Text:
1. Check backend logs for widget structure
2. Verify `build_task_list_widget()` is returning correct format
3. Check that `_stream_task_list_widget()` is called
4. Verify `stream_widget()` is called with correct structure

### If Actions Don't Trigger:
1. **Server Actions:**
   - Check console for `[ACTION] Received action` log
   - Verify action type matches handler
   - Check agent logs for message processing
   - Verify MCP tools are accessible

2. **Client Actions:**
   - Check console for `[ChatKit] Action received` log
   - Verify router is imported and working
   - Check if routes exist (`/tasks/X`, `/projects/X`)

### If MCP Tools Fail:
1. Verify MCP server is running and accessible
2. Check that params are wrapped: `{"params": {...}}`
3. Check that `user_id` and `access_token` are passed
4. Verify streaming response is parsed correctly

### If Widgets Don't Appear:
1. Check `on_tool_end` hook is registered
2. Verify tool name matches in hook mapping
3. Check that `stream_widget()` is called
4. Verify widget structure matches ChatKit format

---

## ✅ SUCCESS CRITERIA SUMMARY

**All Tests Pass If:**
1. ✅ Task list widget appears with proper formatting
2. ✅ Start button starts tasks (backend action)
3. ✅ Complete button completes tasks (backend action)
4. ✅ View button navigates to task detail (frontend action)
5. ✅ Refresh button refreshes task list (backend action)
6. ✅ Form submission creates tasks (backend action)
7. ✅ Cancel button logs cancellation (frontend action)
8. ✅ View Project button navigates to project (frontend action)
9. ✅ No console errors or crashes
10. ✅ All actions logged appropriately

**Known Acceptable Limitations:**
- ⚠️ Form widgets may not auto-appear from natural language (future improvement)
- ⚠️ Form cancel may not close form (ChatKit may handle automatically)

---

## 📊 IMPLEMENTATION COMPLETENESS

| Component | Status | Lines |
|-----------|--------|-------|
| Backend Action Handler | ✅ Complete | chatkit_server.py:598-690 |
| Frontend Action Handler | ✅ Complete | ChatKitWidget.tsx:354-380 |
| MCP Tool Calling | ✅ Complete | chatkit_server.py:158-252 |
| Local Tools (3) | ✅ Complete | chatkit_server.py:258-370 |
| Widget Builders (4) | ✅ Complete | widgets/*.py |
| Widget Streaming Hooks | ✅ Complete | chatkit_server.py:489-594 |

**Total Implementation:** 6 major components, all complete

---

## 🎯 FINAL VERDICT

**READY FOR TESTING ✅**

All critical components have been implemented and verified:
- ✅ Widget structures match ChatKit format
- ✅ MCP integration uses correct streaming protocol
- ✅ Action handlers (backend + frontend) are complete
- ✅ Error handling is in place
- ✅ Logging is comprehensive

**Confidence Level:** HIGH

**Recommendation:** Proceed with testing using the prompts above. Start with Test Suite 1 (Task List Widget Actions) as it covers the most common use case.
