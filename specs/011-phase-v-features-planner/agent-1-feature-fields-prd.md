# PRD: Agent 1 - Feature Fields & Performance

**Phase**: V (Advanced Cloud Deployment)  
**Owner**: Agent 1  
**Estimated Time**: 45-60 minutes  
**Priority**: Critical (blocks demo)

---

## Executive Summary

Agent 1 is responsible for implementing **Intermediate Level** task features (search, filter, sort) and **fixing critical performance issues** (N+1 query bug #14). This work spans the API backend and web dashboard.

### Success Criteria

- [ ] `GET /tasks?search=keyword` returns fuzzy-matched results
- [ ] `GET /tasks?tags=work,urgent` filters by tags
- [ ] `GET /tasks?has_due_date=true` filters tasks with due dates
- [ ] `GET /tasks?sort_by=due_date&sort_order=asc` sorts results
- [ ] N+1 query fixed (single query for task list + assignees)
- [ ] Frontend filters work with new API params
- [ ] All existing tests pass + new tests for features

---

## 1. Problem Statement

### 1.1 Current Limitations

| Issue | Impact | Reference |
|-------|--------|-----------|
| N+1 Query in list_tasks | O(n) DB queries for n tasks - **critical performance bug** | [GitHub #14](https://github.com/mjunaidca/taskforce/issues/14) |
| No search capability | Users can't find tasks by keyword | Hackathon requirement |
| No tag filtering | Tags exist but can't filter by them | Hackathon requirement |
| Limited sorting | Only `created_at DESC` hardcoded | Hackathon requirement |
| No due date filter | Can't find overdue/upcoming tasks | Hackathon requirement |

### 1.2 N+1 Query Analysis

**Current Code** (`packages/api/src/taskflow_api/routers/tasks.py:165-169`):

```python
# BAD: N+1 queries - one query per task for assignee
for task in tasks:
    assignee_handle = None
    if task.assignee_id:
        assignee = await session.get(Worker, task.assignee_id)  # 💥 N queries
        assignee_handle = assignee.handle if assignee else None
```

**Impact**: 50 tasks = 51 queries (1 for tasks + 50 for assignees)

---

## 2. Solution Design

### 2.1 API Changes

#### Endpoint: `GET /api/projects/{project_id}/tasks`

**New Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | null | Case-insensitive search in title |
| `tags` | string | null | Comma-separated tag filter (AND logic) |
| `has_due_date` | bool | null | Filter for tasks with/without due dates |
| `sort_by` | enum | "created_at" | Sort field: `created_at`, `due_date`, `priority`, `title` |
| `sort_order` | enum | "desc" | Sort direction: `asc`, `desc` |

**Updated Signature**:

```python
@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskListItem])
async def list_tasks(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    # Existing filters
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] | None = None,
    assignee_id: int | None = None,
    priority: Literal["low", "medium", "high", "critical"] | None = None,
    # NEW: Search & Filter
    search: str | None = Query(default=None, max_length=200),
    tags: str | None = Query(default=None, description="Comma-separated tags"),
    has_due_date: bool | None = Query(default=None),
    # NEW: Sorting
    sort_by: Literal["created_at", "due_date", "priority", "title"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    # Pagination
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[TaskListItem]:
```

### 2.2 N+1 Fix Strategy

**Solution**: Use SQLAlchemy `selectinload` to batch-load assignees:

```python
from sqlalchemy.orm import selectinload

# Build query with eager loading
stmt = (
    select(Task)
    .where(Task.project_id == project_id)
    .options(selectinload(Task.assignee))  # Eager load assignees
)
```

**Result**: 2 queries total (1 for tasks, 1 for all assignees)

### 2.3 Search Implementation

**ILIKE for PostgreSQL** (case-insensitive):

```python
if search:
    search_term = f"%{search}%"
    stmt = stmt.where(Task.title.ilike(search_term))
```

### 2.4 Tag Filtering

**JSONB contains for PostgreSQL**:

```python
if tags:
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    for tag in tag_list:
        # PostgreSQL JSONB contains operator
        stmt = stmt.where(Task.tags.contains([tag]))
```

### 2.5 Sorting

**Priority ordering** (custom sort for non-alphabetic priority):

```python
PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

if sort_by == "priority":
    # Use CASE expression for priority ordering
    priority_case = case(
        (Task.priority == "critical", 0),
        (Task.priority == "high", 1),
        (Task.priority == "medium", 2),
        (Task.priority == "low", 3),
    )
    order_col = priority_case.asc() if sort_order == "asc" else priority_case.desc()
elif sort_by == "due_date":
    # Null due dates last
    order_col = (
        Task.due_date.asc().nullslast() if sort_order == "asc"
        else Task.due_date.desc().nullsfirst()
    )
else:
    order_col = getattr(Task, sort_by)
    order_col = order_col.asc() if sort_order == "asc" else order_col.desc()

stmt = stmt.order_by(order_col)
```

---

## 3. Implementation Plan

### Phase A: Backend API (25 min)

#### Task A.1: Fix N+1 Query (10 min)
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

1. Import `selectinload` from SQLAlchemy
2. Add `.options(selectinload(Task.assignee))` to the select statement
3. Update loop to use `task.assignee` directly (no separate query)
4. Test: Verify only 2 queries in logs

#### Task A.2: Add Search Parameter (5 min)
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

1. Add `search: str | None = Query(default=None, max_length=200)` parameter
2. Add `if search:` clause with ILIKE filter
3. Test: `GET /tasks?search=meeting`

#### Task A.3: Add Tag Filter (5 min)
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

1. Add `tags: str | None` parameter
2. Parse comma-separated tags
3. Add JSONB contains filter
4. Test: `GET /tasks?tags=work`

#### Task A.4: Add Due Date Filter (3 min)
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

1. Add `has_due_date: bool | None` parameter
2. Add filter: `Task.due_date.isnot(None)` or `Task.due_date.is_(None)`
3. Test: `GET /tasks?has_due_date=true`

#### Task A.5: Add Sorting (7 min)
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

1. Add `sort_by` and `sort_order` parameters
2. Import `case` from SQLAlchemy
3. Build dynamic order clause
4. Handle priority special ordering
5. Handle null due_dates with nullslast/nullsfirst
6. Test: `GET /tasks?sort_by=due_date&sort_order=asc`

### Phase B: Frontend (15 min)

#### Task B.1: Update Types (3 min)
**File**: `web-dashboard/src/types/index.ts`

```typescript
export interface TaskFilterParams extends PaginationParams {
  status?: TaskStatus;
  assignee_id?: number;
  priority?: TaskPriority;
  // NEW
  search?: string;
  tags?: string;
  has_due_date?: boolean;
  sort_by?: "created_at" | "due_date" | "priority" | "title";
  sort_order?: "asc" | "desc";
}
```

#### Task B.2: Update API Client (3 min)
**File**: `web-dashboard/src/lib/api.ts`

Update `getProjectTasks` to pass new params:

```typescript
async getProjectTasks(projectId: number, params?: TaskFilterParams): Promise<TaskListItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.assignee_id) searchParams.set("assignee_id", params.assignee_id.toString());
  if (params?.priority) searchParams.set("priority", params.priority);
  // NEW
  if (params?.search) searchParams.set("search", params.search);
  if (params?.tags) searchParams.set("tags", params.tags);
  if (params?.has_due_date !== undefined) searchParams.set("has_due_date", params.has_due_date.toString());
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
  // Pagination
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  const query = searchParams.toString();
  return this.request<TaskListItem[]>(`/projects/${projectId}/tasks${query ? `?${query}` : ""}`);
}
```

#### Task B.3: Update Tasks Page UI (9 min)
**File**: `web-dashboard/src/app/tasks/page.tsx`

1. Add state for sort options
2. Add sort dropdown (Due Date, Priority, Created, Title)
3. Add "Has Due Date" toggle or filter
4. Wire search to use API instead of client-side filter
5. Debounce search input (300ms)
6. Add tag filter dropdown (dynamically populated or input)

### Phase C: MCP Server (5 min)

#### Task C.1: Update list_tasks Tool
**File**: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`

1. Add new params to `ListTasksInput` schema
2. Pass params to API client
3. Update docstring with examples

---

## 4. Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `packages/api/src/taskflow_api/routers/tasks.py` | N+1 fix, search, filter, sort | HIGH |
| `web-dashboard/src/types/index.ts` | Add filter types | HIGH |
| `web-dashboard/src/lib/api.ts` | Pass new params | HIGH |
| `web-dashboard/src/app/tasks/page.tsx` | Sort/filter UI | MEDIUM |
| `packages/mcp-server/src/taskflow_mcp/tools/tasks.py` | Tool params | LOW |
| `packages/mcp-server/src/taskflow_mcp/api_client.py` | API client params | LOW |

---

## 5. Testing Checklist

### API Tests
```bash
# Search
curl "http://localhost:8000/api/projects/1/tasks?search=meeting"

# Tags
curl "http://localhost:8000/api/projects/1/tasks?tags=work,urgent"

# Due date filter
curl "http://localhost:8000/api/projects/1/tasks?has_due_date=true"

# Sort by due date ascending
curl "http://localhost:8000/api/projects/1/tasks?sort_by=due_date&sort_order=asc"

# Sort by priority descending
curl "http://localhost:8000/api/projects/1/tasks?sort_by=priority&sort_order=desc"

# Combined
curl "http://localhost:8000/api/projects/1/tasks?search=review&priority=high&sort_by=due_date"
```

### Performance Test
```python
# Before fix: N+1 queries
# After fix: 2 queries (tasks + assignees batch)
# Verify with SQL logging enabled
```

### Frontend Tests
- [ ] Search input works with debounce
- [ ] Sort dropdown changes task order
- [ ] Combined filters work together
- [ ] No regressions in existing filters

---

## 6. Acceptance Criteria

### Must Have (Demo Blockers)
- [ ] N+1 query fixed - task list loads in 2 queries max
- [ ] Search works on task title
- [ ] Sort by due_date works (nulls handled correctly)
- [ ] Sort by priority works (correct order: critical > high > medium > low)

### Should Have
- [ ] Tags filter works
- [ ] has_due_date filter works
- [ ] Frontend sort UI
- [ ] Frontend debounced search

### Nice to Have
- [ ] Search in description
- [ ] Full-text search (PostgreSQL tsvector)
- [ ] Frontend tag filter with autocomplete

---

## 7. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| SQLAlchemy selectinload | ✅ Available | Part of SQLAlchemy core |
| PostgreSQL JSONB operators | ✅ Available | Already using JSONB for tags |
| PostgreSQL ILIKE | ✅ Available | Native PostgreSQL |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JSONB contains not working | Low | Medium | Test with actual data; fallback to Python filtering |
| Priority sort breaks | Low | High | Write comprehensive test cases |
| Frontend state complexity | Medium | Low | Keep filters in URL params for persistence |

---

## 9. Code Snippets

### Complete list_tasks Implementation

```python
# packages/api/src/taskflow_api/routers/tasks.py

from sqlalchemy import case
from sqlalchemy.orm import selectinload

@router.get("/api/projects/{project_id}/tasks", response_model=list[TaskListItem])
async def list_tasks(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
    # Filters
    status: Literal["pending", "in_progress", "review", "completed", "blocked"] | None = None,
    assignee_id: int | None = None,
    priority: Literal["low", "medium", "high", "critical"] | None = None,
    search: str | None = Query(default=None, max_length=200),
    tags: str | None = Query(default=None, description="Comma-separated tags (AND)"),
    has_due_date: bool | None = Query(default=None),
    # Sorting
    sort_by: Literal["created_at", "due_date", "priority", "title"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    # Pagination
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[TaskListItem]:
    """List tasks with search, filters, and sorting."""
    worker = await ensure_user_setup(session, user)
    worker_id = worker.id

    # Check project exists and user is member
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_membership(session, project_id, worker_id)

    # Build query with eager loading (fixes N+1)
    stmt = (
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.assignee))
    )

    # Apply filters
    if status:
        stmt = stmt.where(Task.status == status)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    
    # Search (case-insensitive)
    if search:
        stmt = stmt.where(Task.title.ilike(f"%{search}%"))
    
    # Tags filter (AND logic)
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        for tag in tag_list:
            stmt = stmt.where(Task.tags.contains([tag]))
    
    # Due date filter
    if has_due_date is not None:
        if has_due_date:
            stmt = stmt.where(Task.due_date.isnot(None))
        else:
            stmt = stmt.where(Task.due_date.is_(None))

    # Sorting
    if sort_by == "priority":
        priority_case = case(
            (Task.priority == "critical", 0),
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 3),
        )
        order_expr = priority_case.asc() if sort_order == "asc" else priority_case.desc()
    elif sort_by == "due_date":
        order_expr = (
            Task.due_date.asc().nullslast() if sort_order == "asc"
            else Task.due_date.desc().nullsfirst()
        )
    else:
        col = getattr(Task, sort_by)
        order_expr = col.asc() if sort_order == "asc" else col.desc()
    
    stmt = stmt.order_by(order_expr).offset(offset).limit(limit)

    result = await session.exec(stmt)
    tasks = result.all()

    # Build response (no N+1 - assignee already loaded)
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

---

## 10. Coordination Notes

### No Conflicts With
- **Agent 2 (Dapr/Events)**: Separate domain - event publishing doesn't touch list_tasks
- **Agent 3 (CI/CD)**: Infrastructure only
- **Agent 4 (Docs/Monitoring)**: Documentation only

### Shared Dependencies
- If Agent 2 adds `is_recurring` or `recurrence_pattern` to Task model, Agent 1 should NOT touch those fields
- Agent 1 owns: `list_tasks` endpoint, `TaskFilterParams`, frontend filters

---

## 11. Rollback Plan

If issues arise:
1. Revert N+1 fix: Remove `selectinload`, restore loop
2. Revert new params: Remove from signature, frontend unchanged (params ignored)
3. All changes are additive - existing API remains backward compatible

---

## 12. Definition of Done

- [ ] PR passes all existing tests
- [ ] N+1 fix verified with SQL logging (2 queries for list)
- [ ] All new filter params work independently
- [ ] All new filter params work combined
- [ ] Frontend sort/filter UI functional
- [ ] No TypeScript/Python lint errors
- [ ] Manual test of demo flow successful

