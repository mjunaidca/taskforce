# Widget Actions Review

## ⚠️ CRITICAL ISSUES FOUND

### Problem 1: No Backend Action Handlers
The widgets define actions with `handler: "server"`, but **no action handlers are implemented** in the backend. When users click these buttons, the actions won't be processed.

### Problem 2: Client Actions Not Implemented
Actions with `handler: "client"` need frontend JavaScript handlers that don't exist yet.

---

## Task List Widget Actions

### ✅ WORKING (via MCP tools)
None - all actions require handlers!

### ❌ NEEDS BACKEND HANDLER

1. **task.start**
   - Current: `handler: "server"`, payload: `{"task_id": X}`
   - Required: Backend handler that calls `taskflow_start_task` MCP tool
   - MCP Tool: ✅ EXISTS (`taskflow_start_task`)
   - **FIX NEEDED**: Add action handler

2. **task.complete**
   - Current: `handler: "server"`, payload: `{"task_id": X}`
   - Required: Backend handler that calls `taskflow_complete_task` MCP tool
   - MCP Tool: ✅ EXISTS (`taskflow_complete_task`)
   - **FIX NEEDED**: Add action handler

3. **task.create_form**
   - Current: `handler: "server"`, payload: `{"project_id": X}`
   - Required: Backend handler that streams task form widget
   - **FIX NEEDED**: Add action handler + form streaming logic

4. **task.refresh**
   - Current: `handler: "server"`
   - Required: Backend handler that re-calls list_tasks and streams updated widget
   - **FIX NEEDED**: Add action handler

### ❌ NEEDS FRONTEND HANDLER

5. **task.view**
   - Current: `handler: "client"`, payload: `{"task_id": X}`
   - Required: Frontend code to navigate to task detail or show modal
   - **FIX NEEDED**: Add client-side handler in ChatKitWidget.tsx

---

## Task Created Confirmation Actions

### ❌ NEEDS FRONTEND HANDLER

1. **task.view**
   - Same as above - needs client-side navigation

---

## Task Form Widget Actions

### ❌ NEEDS BACKEND HANDLER

1. **task.create**
   - Current: `handler: "server"`, payload: `{"project_id": X}` + form data
   - Required: Backend handler that:
     - Extracts form data
     - Calls `taskflow_add_task` MCP tool
     - Streams success confirmation widget
   - MCP Tool: ✅ EXISTS (`taskflow_add_task`)
   - **FIX NEEDED**: Add action handler + form data extraction

### ❌ NEEDS FRONTEND HANDLER

2. **form.cancel**
   - Current: `handler: "client"`
   - Required: Frontend code to close/hide the form widget
   - **FIX NEEDED**: Add client-side handler

---

## Projects Widget Actions

### ❌ NEEDS FRONTEND HANDLER

1. **project.view**
   - Current: `handler: "client"`, payload: `{"project_id": X}`
   - Required: Frontend navigation to project detail page
   - **FIX NEEDED**: Add client-side handler

### ❌ NEEDS BACKEND HANDLER

2. **project.create**
   - Current: `handler: "server"`
   - Required: Backend handler to stream project creation form or create project
   - MCP Tool: ❓ UNKNOWN (need to check if project creation tool exists)
   - **FIX NEEDED**: Add action handler

---

## Recommended Solutions

### Option 1: Convert Server Actions to Natural Language (Quick Fix)
Instead of direct action handlers, convert button clicks to user messages that the agent processes naturally.

**Example:**
- User clicks "Start Task #2" button
- Frontend sends message: "Start task 2"
- Agent processes message, calls MCP tool, responds with confirmation

**Pros:**
- ✅ Works with existing agent infrastructure
- ✅ No new backend handlers needed
- ✅ Agent can provide natural language feedback

**Cons:**
- ⚠️ Less immediate feedback
- ⚠️ Relies on agent understanding

### Option 2: Implement ChatKit Action Handlers (Proper Fix)
Add proper action handler infrastructure to the ChatKitServer.

**Required Changes:**
1. Add `handle_action()` method to ChatKitServer
2. Register action handlers for each action type
3. Each handler calls appropriate MCP tool and streams response

**Pros:**
- ✅ Immediate, structured responses
- ✅ Better UX
- ✅ Proper separation of concerns

**Cons:**
- ⚠️ More implementation work
- ⚠️ Need to understand ChatKit's action handling API

### Option 3: Hybrid Approach (Recommended)
- **Client actions** → Frontend handlers for navigation (task.view, project.view, form.cancel)
- **Simple server actions** → Convert to natural language (task.start, task.complete)
- **Complex server actions** → Proper handlers (task.create with form data)

---

## Immediate Actions Required

### 1. Frontend Handlers (ChatKitWidget.tsx)
```typescript
// Add to useChatKit configuration
onWidgetAction: async (action) => {
  switch (action.type) {
    case 'task.view':
      router.push(`/tasks/${action.payload.task_id}`);
      break;
    case 'project.view':
      router.push(`/projects/${action.payload.project_id}`);
      break;
    case 'form.cancel':
      // Close form widget (handled by ChatKit internally?)
      break;
  }
}
```

### 2. Backend Action Handler
```python
# In ChatKitServer
async def handle_action(self, action_type: str, payload: dict, context: RequestContext):
    """Handle widget action from frontend."""
    if action_type == "task.start":
        # Call MCP tool
        # Stream confirmation widget
        pass
    elif action_type == "task.complete":
        # Call MCP tool
        # Stream confirmation widget
        pass
    # etc.
```

### 3. Or: Convert to Natural Language
Modify button actions to send messages instead:
```python
# Instead of:
{
  "type": "Button",
  "label": "Start",
  "onClickAction": {
    "type": "task.start",
    "handler": "server",
    "payload": {"task_id": 123}
  }
}

# Use:
{
  "type": "Button",
  "label": "Start",
  "onClickAction": {
    "type": "send_message",
    "handler": "client",
    "message": "Start task 123"
  }
}
```

---

## Current Status: ❌ WIDGETS WILL RENDER BUT ACTIONS WON'T WORK

**Users will see beautiful widgets, but clicking buttons will do nothing or throw errors.**

## Decision Needed

Which approach should we take?
1. Quick fix: Natural language conversion
2. Proper fix: Action handler infrastructure
3. Hybrid: Mix of both

I recommend **Option 3 (Hybrid)** for the best balance of functionality and implementation effort.
