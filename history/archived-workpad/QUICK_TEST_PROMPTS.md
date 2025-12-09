# Quick Test Prompts - Widget Actions

## 🚀 Start Servers First
```bash
# Terminal 1 - Backend
cd packages/api
uv run uvicorn taskflow_api.main:app --reload --port 8000

# Terminal 2 - Frontend
cd web-dashboard
pnpm dev
```

## 📋 Essential Test Prompts (Copy & Paste)

### 1. Show Task List Widget
```
Show me all tasks for the default project
```
**What to verify:** Widget appears (NOT "#2" text), tasks visible with Start/Complete/View buttons

---

### 2. Alternative Task List
```
in default project show me all of the tasks
```
**What to verify:** Same as above, tests different phrasing

---

### 3. Show Projects
```
Show me all my projects
```
**What to verify:** Projects widget appears with View Project buttons

---

### 4. Create Task (Natural Language)
```
Create a high priority task called "Test Widget Actions" with description "Testing the interactive widgets"
```
**What to verify:** Task created, confirmation appears

---

### 5. Start Task (Natural Language)
```
Start task 2
```
**What to verify:** Task #2 status changes to in_progress

---

### 6. Complete Task (Natural Language)
```
Complete task 2
```
**What to verify:** Task #2 status changes to completed

---

### 7. Filtered Task List
```
Show me all in-progress tasks for the default project
```
**What to verify:** Only in-progress tasks shown

---

## 🎯 Button Click Tests

### After showing task list, click these buttons:

1. **Start Button** (play icon on pending task)
   - ✅ Should start the task via agent
   - ✅ Should show confirmation message

2. **Complete Button** (check icon on in-progress task)
   - ✅ Should complete the task via agent
   - ✅ Should show confirmation message

3. **View Button** (eye icon on any task)
   - ✅ Should navigate to `/tasks/{id}` page
   - ✅ No backend call (client-side navigation)

4. **Refresh Button** (in widget header)
   - ✅ Should reload tasks with latest data

5. **View Project Button** (on projects widget)
   - ✅ Should navigate to `/projects/{id}` page
   - ✅ No backend call (client-side navigation)

---

## ✅ Success Indicators

**Console Logs to Watch For:**

**Server Actions:**
```
[ChatKit] Action received: task.start
[ACTION] Received action: type=task.start, payload={'task_id': 2}
[ACTION] Converted to message: Start task 2
```

**Client Actions:**
```
[ChatKit] Action received: task.view
[ChatKit] Navigating to task: 2
```

**Widgets:**
```
[HOOKS] Streaming task list widget with 5 tasks
[HOOKS] Widget structure: {"type":"ListView","status":...}
[HOOKS] Task list widget streamed successfully
```

---

## ⚠️ What Could Go Wrong

### Widget Shows "#2" Instead of List
- **Cause:** Widget structure format issue
- **Check:** Backend logs for widget structure
- **Fix:** Verify `build_task_list_widget()` output

### Buttons Don't Do Anything
- **Cause:** Action handler not registered or action type mismatch
- **Check:** Console for action logs
- **Fix:** Verify action types match between widget and handler

### "params Field required" Error
- **Cause:** MCP tool arguments not wrapped in params object
- **Check:** Already fixed in chatkit_server.py:286, 336, 365
- **Should:** Not happen with current code

### JSON Parsing Error
- **Cause:** Not using streaming protocol
- **Check:** Already fixed with client.stream()
- **Should:** Not happen with current code

---

## 🎉 All Tests Pass If:

1. ✅ Widgets appear with proper formatting (not "#2")
2. ✅ All buttons are clickable and styled
3. ✅ Server actions (Start/Complete/Refresh) trigger agent responses
4. ✅ Client actions (View Task/Project) navigate to correct pages
5. ✅ No errors in console (frontend or backend)
6. ✅ Database updates reflect action results

---

## 📁 Full Details

See `FINAL_REVIEW_AND_TEST_PROMPTS.md` for:
- Complete test suites
- Expected results for each test
- Debugging checklists
- Implementation verification
