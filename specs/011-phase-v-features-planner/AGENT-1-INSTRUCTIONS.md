# Agent 1: Feature Fields Implementation Instructions

**Priority**: CRITICAL (Demo Blocker)  
**Time Budget**: 45-60 minutes  
**Spec**: Read `agent-1-feature-fields-prd.md` alongside this file

---

## Mission

Implement **search, filter, and sort** capabilities for tasks across **both API and Frontend**, fixing a critical N+1 performance bug in the process. Your work makes existing placeholder UI functional.

---

## Critical Context

### 1. Search Bar is CLIENT-SIDE (Bug!)

**Location**: `web-dashboard/src/app/tasks/page.tsx:121-123`

```typescript
// CURRENT: Client-side filtering - BAD for large datasets
const filteredTasks = tasks.filter((task) =>
  task.title.toLowerCase().includes(searchQuery.toLowerCase())
)
```

**Problem**: Fetches ALL tasks, then filters in JavaScript. Doesn't scale.

**Your Fix**: Wire `searchQuery` to API via debounced call, remove client-side filter.

---

### 2. N+1 Query (GitHub #14) - CRITICAL

**Location**: `packages/api/src/taskflow_api/routers/tasks.py:165-169`

```python
# CURRENT: N+1 queries - one DB call per task!
for task in tasks:
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)  # 💥 N queries
```

**Your Fix**: Use `selectinload(Task.assignee)` to batch-load in 2 queries.

---

### 3. Existing UI Elements to Wire Up

| UI Element | Location | Current State | Your Action |
|------------|----------|---------------|-------------|
| Search Input | `page.tsx:206-212` | ✅ Exists, ❌ Client-side | Wire to API with debounce |
| Status Filter | `page.tsx:229-241` | ✅ Works via API | No change |
| Priority Filter | `page.tsx:243-254` | ✅ Works via API | No change |
| Sort Dropdown | ❌ Missing | N/A | **Add new UI** |

---

## Execution Checklist

### Phase 1: Backend API (25 min)

**File**: `packages/api/src/taskflow_api/routers/tasks.py`

- [ ] **1.1** Import `selectinload` from `sqlalchemy.orm`
- [ ] **1.2** Import `case` from `sqlalchemy`
- [ ] **1.3** Add `selectinload(Task.assignee)` to query options (N+1 fix)
- [ ] **1.4** Add `search: str | None` parameter with `Query(default=None, max_length=200)`
- [ ] **1.5** Add `tags: str | None` parameter (comma-separated)
- [ ] **1.6** Add `has_due_date: bool | None` parameter
- [ ] **1.7** Add `sort_by: Literal["created_at", "due_date", "priority", "title"]` defaulting to `"created_at"`
- [ ] **1.8** Add `sort_order: Literal["asc", "desc"]` defaulting to `"desc"`
- [ ] **1.9** Implement search filter: `Task.title.ilike(f"%{search}%")`
- [ ] **1.10** Implement tags filter: `Task.tags.contains([tag])` for each tag
- [ ] **1.11** Implement has_due_date filter
- [ ] **1.12** Implement sorting with special handling for `priority` and `due_date` nulls
- [ ] **1.13** Update response loop to use `task.assignee` directly (eager-loaded)

### Phase 2: Frontend Types & API (8 min)

**File**: `web-dashboard/src/types/index.ts`

- [ ] **2.1** Add to `TaskFilterParams`:
  ```typescript
  search?: string;
  tags?: string;
  has_due_date?: boolean;
  sort_by?: "created_at" | "due_date" | "priority" | "title";
  sort_order?: "asc" | "desc";
  ```

**File**: `web-dashboard/src/lib/api.ts`

- [ ] **2.2** Update `getProjectTasks` to pass new params to URLSearchParams

### Phase 3: Frontend UI (12 min)

**File**: `web-dashboard/src/app/tasks/page.tsx`

- [ ] **3.1** Add state: `sortBy`, `sortOrder`
- [ ] **3.2** Add debounce hook for search (300ms)
- [ ] **3.3** Wire `searchQuery` to API call (add to `useEffect` deps)
- [ ] **3.4** **REMOVE** client-side filter (line 121-123)
- [ ] **3.5** Add Sort dropdown UI after Priority filter
- [ ] **3.6** Pass `search`, `sort_by`, `sort_order` to `api.getProjectTasks()`

### Phase 4: MCP Server (5 min) - OPTIONAL

**File**: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`

- [ ] **4.1** Add new params to `ListTasksInput` Pydantic model
- [ ] **4.2** Pass params to API client

---

## Code Templates

### Backend: Complete list_tasks (Copy & Adapt)

```python
from sqlalchemy import case
from sqlalchemy.orm import selectinload

@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskListItem])
async def list_tasks(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    # Existing
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] | None = None,
    assignee_id: int | None = None,
    priority: Literal["low", "medium", "high", "critical"] | None = None,
    # NEW
    search: str | None = Query(default=None, max_length=200),
    tags: str | None = Query(default=None, description="Comma-separated tags"),
    has_due_date: bool | None = Query(default=None),
    sort_by: Literal["created_at", "due_date", "priority", "title"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    # Pagination
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[TaskListItem]:
    worker = await ensure_user_setup(session, user)
    await check_project_membership(session, project_id, worker.id)

    # Build query with eager loading
    stmt = (
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.assignee))
    )

    # Filters
    if status:
        stmt = stmt.where(Task.status == status)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if search:
        stmt = stmt.where(Task.title.ilike(f"%{search}%"))
    if tags:
        for tag in [t.strip() for t in tags.split(",") if t.strip()]:
            stmt = stmt.where(Task.tags.contains([tag]))
    if has_due_date is not None:
        stmt = stmt.where(Task.due_date.isnot(None) if has_due_date else Task.due_date.is_(None))

    # Sorting
    if sort_by == "priority":
        order_expr = case(
            (Task.priority == "critical", 0),
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 3),
        )
        order_expr = order_expr.asc() if sort_order == "asc" else order_expr.desc()
    elif sort_by == "due_date":
        order_expr = Task.due_date.asc().nullslast() if sort_order == "asc" else Task.due_date.desc().nullsfirst()
    else:
        col = getattr(Task, sort_by)
        order_expr = col.asc() if sort_order == "asc" else col.desc()

    stmt = stmt.order_by(order_expr).offset(offset).limit(limit)
    result = await session.exec(stmt)
    tasks = result.all()

    return [
        TaskListItem(
            id=task.id,
            title=task.title,
            status=task.status,
            priority=task.priority,
            progress_percent=task.progress_percent,
            assignee_id=task.assignee_id,
            assignee_handle=task.assignee.handle if task.assignee else None,
            due_date=task.due_date,
            created_at=task.created_at,
        )
        for task in tasks
    ]
```

### Frontend: Debounce Hook

```typescript
// Add to top of file or create hooks/useDebounce.ts
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Usage in component
const debouncedSearch = useDebounce(searchQuery, 300);

// Add to useEffect deps
useEffect(() => {
  // ... fetch logic
}, [selectedProject, statusFilter, priorityFilter, debouncedSearch, sortBy, sortOrder]);
```

### Frontend: Sort Dropdown

```tsx
// Add after Priority filter
<Select value={sortBy} onValueChange={setSortBy}>
  <SelectTrigger className="w-[150px]">
    <SelectValue placeholder="Sort by" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="created_at">Created</SelectItem>
    <SelectItem value="due_date">Due Date</SelectItem>
    <SelectItem value="priority">Priority</SelectItem>
    <SelectItem value="title">Title</SelectItem>
  </SelectContent>
</Select>

<Select value={sortOrder} onValueChange={setSortOrder}>
  <SelectTrigger className="w-[100px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="desc">↓ Desc</SelectItem>
    <SelectItem value="asc">↑ Asc</SelectItem>
  </SelectContent>
</Select>
```

---

## Testing Commands

```bash
# After backend changes - test API
curl "http://localhost:8000/api/projects/1/tasks?search=meeting"
curl "http://localhost:8000/api/projects/1/tasks?sort_by=priority&sort_order=desc"
curl "http://localhost:8000/api/projects/1/tasks?has_due_date=true&sort_by=due_date"

# Verify N+1 fix (enable SQL logging or check response time)
# Before: ~500ms for 50 tasks
# After: ~50ms for 50 tasks
```

---

## DO NOT

- ❌ Create new API endpoints - extend existing `list_tasks`
- ❌ Add new database columns - use existing fields
- ❌ Change Task model structure - it's complete
- ❌ Touch Agent 2's files (events, Dapr, recurring)
- ❌ Modify existing working filters (status, priority, assignee)

---

## Definition of Done

- [ ] N+1 query fixed (verify 2 DB queries for list)
- [ ] Search input queries API (not client-side)
- [ ] Sort dropdown works (priority, due_date, created_at, title)
- [ ] All existing tests pass
- [ ] No TypeScript/Python lint errors
- [ ] Manual test: search → sort → filter combination works

---

## Files You Own

```
packages/api/src/taskflow_api/routers/tasks.py    # PRIMARY
web-dashboard/src/types/index.ts                  # Types
web-dashboard/src/lib/api.ts                      # API client
web-dashboard/src/app/tasks/page.tsx              # UI
packages/mcp-server/src/taskflow_mcp/tools/tasks.py  # OPTIONAL
```

---

## Questions? Clarifications?

If you encounter:
- **Import errors**: Check `sqlalchemy.orm` for `selectinload`
- **JSONB contains not working**: Try `from sqlalchemy.dialects.postgresql import JSONB`
- **Type errors**: Ensure Literal types match exactly

Start with the N+1 fix - it's the highest impact, lowest risk change.

