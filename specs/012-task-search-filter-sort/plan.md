# Implementation Plan: Task Search, Filter & Sort

**Feature Branch**: `012-task-search-filter-sort`
**Created**: 2025-12-10
**Time Budget**: 45-60 minutes
**Complexity**: Medium (backend query optimization + frontend integration)

---

## Executive Summary

This plan implements search, filter, and sort capabilities for the task listing API while fixing a critical N+1 query performance issue. The implementation follows a backend-first approach to enable server-side filtering and improve performance before updating the frontend to use these new capabilities.

### Key Goals
1. **Performance**: Fix N+1 query bug (51 queries → 2 queries for 50 tasks)
2. **Search**: Case-insensitive title search via API (not client-side)
3. **Sort**: Multiple sort fields with proper null handling
4. **Filter**: Tag filtering and due date existence filters
5. **Backward Compatibility**: Existing clients continue to work unchanged

---

## Architecture Decisions

### AD-001: SQLAlchemy selectinload for N+1 Fix

**Decision**: Use SQLAlchemy's `selectinload()` to eagerly load assignee relationships in a single batch query.

**Rationale**:
- Current code fetches assignees one-by-one in a Python loop (lines 165-169 of tasks.py)
- `selectinload()` generates a single `WHERE worker_id IN (...)` query for all assignees
- Proven pattern from constitution's Technical Implementation Patterns (section III)

**Implementation**:
```python
from sqlalchemy.orm import selectinload

stmt = select(Task).options(selectinload(Task.assignee)).where(...)
```

**Trade-offs**:
- Slightly more memory usage (preloads all assignees)
- Eliminates N database round-trips
- **Net win**: 200ms → <100ms for 50 tasks

---

### AD-002: PostgreSQL ILIKE for Case-Insensitive Search

**Decision**: Use PostgreSQL's `ILIKE` operator for case-insensitive title search.

**Rationale**:
- Native PostgreSQL operator, no external dependencies
- Sufficient for MVP (title-only search)
- Escapes special characters via SQLAlchemy parameterization

**SQL Generated**:
```sql
WHERE LOWER(tasks.title) ILIKE '%search query%'
```

**Non-Goals** (explicitly deferred):
- Full-text search with ranking
- Search in description field
- Multi-field search

---

### AD-003: Custom CASE for Priority Sorting

**Decision**: Use SQLAlchemy `case()` to define custom priority ordering (critical=0, high=1, medium=2, low=3).

**Rationale**:
- Default alphabetical sort is wrong (critical < high < low < medium)
- CASE expression translates priority to numeric ranking
- Database-side sorting (efficient)

**Implementation**:
```python
from sqlalchemy import case

priority_order = case(
    (Task.priority == "critical", 0),
    (Task.priority == "high", 1),
    (Task.priority == "medium", 2),
    (Task.priority == "low", 3),
    else_=4
)
stmt = stmt.order_by(priority_order.desc())
```

---

### AD-004: NULLSLAST/NULLSFIRST for Due Date Sorting

**Decision**: Use SQLAlchemy's `nullslast()` and `nullsfirst()` for consistent null handling in due_date sorting.

**Rationale**:
- Many tasks have no due date (null values)
- Ascending: nulls last (nearest dates first, no-due-date last)
- Descending: nulls first (furthest dates first, no-due-date first)
- Matches user expectations for due date lists

**Implementation**:
```python
if sort_order == "asc":
    stmt = stmt.order_by(Task.due_date.asc().nullslast())
else:
    stmt = stmt.order_by(Task.due_date.desc().nullsfirst())
```

---

### AD-005: 300ms Debounce for Search Input

**Decision**: Use React `useDeferredValue` or custom debounce hook to delay API calls by 300ms after user stops typing.

**Rationale**:
- Prevents API spam during typing (typing "meeting" = 7 API calls → 1 API call)
- 300ms feels responsive (not laggy)
- Standard UX pattern for search inputs

**Implementation**:
```typescript
import { useDeferredValue } from "react"

const deferredSearch = useDeferredValue(searchQuery, { timeoutMs: 300 })

useEffect(() => {
  fetchTasks({ search: deferredSearch })
}, [deferredSearch, ...])
```

**Alternative Considered**: `lodash.debounce` (rejected: adds dependency, built-in React hook sufficient)

---

## Component Breakdown

### Backend Components (packages/api/src/taskflow_api/)

#### Component 1: Query Builder Enhancement (`routers/tasks.py`)

**Location**: `packages/api/src/taskflow_api/routers/tasks.py`
**Lines to Modify**: 127-186 (entire `list_tasks` function)
**Dependencies**: None (isolated change)

**Changes**:
1. Add new query parameters (search, tags, has_due_date, sort_by, sort_order)
2. Add `selectinload(Task.assignee)` to base query
3. Add search filter with ILIKE
4. Add tags filter with JSONB contains
5. Add has_due_date filter
6. Replace hardcoded `order_by(Task.created_at.desc())` with dynamic sorting logic
7. Remove Python loop for assignee fetching (now preloaded)

**Code Skeleton**:
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
    # NEW FILTERS
    search: str | None = Query(None, max_length=200),
    tags: str | None = None,  # comma-separated
    has_due_date: bool | None = None,
    sort_by: Literal["created_at", "due_date", "priority", "title"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    # Pagination
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[TaskListItem]:
    """List tasks with search, filter, and sort."""
    # 1. Auth and project checks (unchanged)
    worker = await ensure_user_setup(session, user)
    project = await session.get(Project, project_id)
    await check_project_membership(session, project_id, worker.id)

    # 2. Build query with EAGER LOADING (N+1 fix)
    stmt = select(Task).options(selectinload(Task.assignee)).where(Task.project_id == project_id)

    # 3. Apply existing filters (status, assignee_id, priority) - UNCHANGED

    # 4. Apply NEW filters
    if search:
        stmt = stmt.where(Task.title.ilike(f"%{search}%"))
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            stmt = stmt.where(Task.tags.contains([tag]))
    if has_due_date is not None:
        if has_due_date:
            stmt = stmt.where(Task.due_date.is_not(None))
        else:
            stmt = stmt.where(Task.due_date.is_(None))

    # 5. Apply sorting
    if sort_by == "priority":
        priority_order = case(
            (Task.priority == "critical", 0),
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 3),
            else_=4
        )
        stmt = stmt.order_by(
            priority_order.desc() if sort_order == "desc" else priority_order.asc()
        )
    elif sort_by == "due_date":
        if sort_order == "asc":
            stmt = stmt.order_by(Task.due_date.asc().nullslast())
        else:
            stmt = stmt.order_by(Task.due_date.desc().nullsfirst())
    elif sort_by == "title":
        stmt = stmt.order_by(
            Task.title.desc() if sort_order == "desc" else Task.title.asc()
        )
    else:  # created_at (default)
        stmt = stmt.order_by(
            Task.created_at.desc() if sort_order == "desc" else Task.created_at.asc()
        )

    # 6. Pagination
    stmt = stmt.offset(offset).limit(limit)

    # 7. Execute query (single DB call, assignees preloaded)
    result = await session.exec(stmt)
    tasks = result.unique().all()  # unique() needed for selectinload

    # 8. Map to response (assignee already loaded)
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

**Testing**:
```bash
# Test N+1 fix (enable SQL logging)
SQLALCHEMY_ECHO=1 curl "http://localhost:8000/api/projects/1/tasks" | grep SELECT

# Test search
curl "http://localhost:8000/api/projects/1/tasks?search=meeting"

# Test tags (AND logic)
curl "http://localhost:8000/api/projects/1/tasks?tags=work,urgent"

# Test due date filter
curl "http://localhost:8000/api/projects/1/tasks?has_due_date=true"

# Test sort by priority descending
curl "http://localhost:8000/api/projects/1/tasks?sort_by=priority&sort_order=desc"

# Test sort by due date ascending (nulls last)
curl "http://localhost:8000/api/projects/1/tasks?sort_by=due_date&sort_order=asc"

# Test combined: search + filter + sort
curl "http://localhost:8000/api/projects/1/tasks?search=report&tags=work&sort_by=due_date&sort_order=asc"
```

**Audit Compliance**: No audit log changes needed (list endpoint doesn't modify state)

---

### Frontend Components (web-dashboard/src/)

#### Component 2: Type Definitions (`types/index.ts`)

**Location**: `web-dashboard/src/types/index.ts`
**Lines to Modify**: 188-193 (TaskFilterParams interface)
**Dependencies**: None

**Changes**:
```typescript
// Task Filter Params (EXTENDED)
export interface TaskFilterParams extends PaginationParams {
  // Existing filters
  status?: TaskStatus;
  assignee_id?: number;
  priority?: TaskPriority;
  // NEW FILTERS
  search?: string;
  tags?: string;  // comma-separated
  has_due_date?: boolean;
  sort_by?: "created_at" | "due_date" | "priority" | "title";
  sort_order?: "asc" | "desc";
}
```

**Testing**: TypeScript compilation (`pnpm build`)

---

#### Component 3: API Client Update (`lib/api.ts`)

**Location**: `web-dashboard/src/lib/api.ts`
**Lines to Modify**: 162-171 (getProjectTasks method)
**Dependencies**: Component 2 (type definitions)

**Changes**:
```typescript
async getProjectTasks(projectId: number, params?: TaskFilterParams): Promise<TaskListItem[]> {
  const searchParams = new URLSearchParams();

  // Existing filters
  if (params?.status) searchParams.set("status", params.status);
  if (params?.assignee_id) searchParams.set("assignee_id", params.assignee_id.toString());
  if (params?.priority) searchParams.set("priority", params.priority);

  // NEW FILTERS
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

**Testing**: Browser network tab shows new query params in API calls

---

#### Component 4: Tasks Page UI (`app/tasks/page.tsx`)

**Location**: `web-dashboard/src/app/tasks/page.tsx`
**Lines to Modify**: 55-123 (state management + useEffect)
**Dependencies**: Component 2, Component 3

**Changes**:
1. Add state for sort_by and sort_order
2. Add debounced search (useDeferredValue)
3. **REMOVE** client-side filtering (line 121-123)
4. Pass all filters to API instead
5. Add sort dropdown UI

**Code Changes**:
```typescript
function TasksContent() {
  // ... existing state ...

  // NEW STATE for sort
  const [sortBy, setSortBy] = useState<"created_at" | "due_date" | "priority" | "title">("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Debounce search (300ms delay)
  const deferredSearch = useDeferredValue(searchQuery, { timeoutMs: 300 })

  useEffect(() => {
    async function fetchTasks(projectsData: ProjectRead[]) {
      try {
        setLoading(true)
        const projectsToFetch = selectedProject === "all"
          ? projectsData
          : projectsData.filter((p) => p.id === Number(selectedProject))

        const allTasks: TaskListItem[] = []
        for (const project of projectsToFetch) {
          const projectTasks = await api.getProjectTasks(project.id, {
            status: statusFilter !== "all" ? (statusFilter as TaskStatus) : undefined,
            priority: priorityFilter !== "all" ? (priorityFilter as TaskPriority) : undefined,
            // NEW FILTERS
            search: deferredSearch || undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
          })
          allTasks.push(...projectTasks)
        }
        setTasks(allTasks)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks")
      } finally {
        setLoading(false)
      }
    }
    // ...
  }, [selectedProject, statusFilter, priorityFilter, deferredSearch, sortBy, sortOrder])

  // REMOVE: const filteredTasks = tasks.filter(...)
  // USE: const filteredTasks = tasks (already filtered server-side)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Existing filters: search input, project select, status select, priority select */}

        {/* NEW: Sort By Dropdown */}
        <Select value={sortBy} onValueChange={(val) => setSortBy(val as typeof sortBy)}>
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

        {/* NEW: Sort Order Toggle */}
        <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as typeof sortOrder)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table renders tasks (already sorted and filtered by API) */}
      <Table>
        {/* ... */}
        {tasks.map((task) => (
          <TableRow key={task.id}>
            {/* ... */}
          </TableRow>
        ))}
      </Table>
    </div>
  )
}
```

**Testing**:
- Type in search box → wait 300ms → network request with ?search=
- Select "Due Date" sort → network request with ?sort_by=due_date
- Toggle "Ascending" → network request with ?sort_order=asc
- Verify no client-side filtering code runs (remove line 121-123)

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: Backend (Can ship independently)           │
├─────────────────────────────────────────────────────┤
│ Component 1: routers/tasks.py                       │
│   - Add query params                                │
│   - Fix N+1 with selectinload                       │
│   - Add search/filter/sort logic                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 2: Frontend Types (Required for API client)   │
├─────────────────────────────────────────────────────┤
│ Component 2: types/index.ts                         │
│   - Extend TaskFilterParams                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3: Frontend API Client                        │
├─────────────────────────────────────────────────────┤
│ Component 3: lib/api.ts                             │
│   - Update getProjectTasks to pass new params       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 4: Frontend UI                                │
├─────────────────────────────────────────────────────┤
│ Component 4: app/tasks/page.tsx                     │
│   - Add sort state and UI                           │
│   - Add debounced search                            │
│   - Remove client-side filtering                    │
└─────────────────────────────────────────────────────┘
```

**Critical Path**: Backend → Types → API Client → UI (must be sequential)
**Parallelizable**: None (each step depends on previous)
**Estimated Time**:
- Backend (20 min) → Types (5 min) → API Client (5 min) → UI (15 min) = **45 minutes total**

---

## Implementation Sequence

### Step 1: Backend API Enhancement (20 min)

**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Sub-steps**:
1. Add imports: `from sqlalchemy import case`, `from sqlalchemy.orm import selectinload`
2. Add new query parameters to `list_tasks` signature
3. Add `selectinload(Task.assignee)` to query (line ~149)
4. Add search filter with ILIKE (after line 156)
5. Add tags filter with JSONB contains (after search)
6. Add has_due_date filter (after tags)
7. Replace hardcoded order_by with conditional sorting logic (replace line 158)
8. Remove Python loop for assignee fetching (lines 164-169)
9. Update TaskListItem construction to use preloaded assignee

**Validation**:
```bash
# Start backend
cd packages/api
uv run uvicorn main:app --reload

# Test N+1 fix (should see 2 queries)
SQLALCHEMY_ECHO=1 curl "http://localhost:8000/api/projects/1/tasks"

# Test new filters
curl "http://localhost:8000/api/projects/1/tasks?search=test&sort_by=priority&sort_order=desc"
```

**Checkpoint**: Backend tests pass, manual curl tests work

---

### Step 2: Frontend Type Updates (5 min)

**File**: `web-dashboard/src/types/index.ts`

**Sub-steps**:
1. Locate TaskFilterParams interface (line 189)
2. Add new optional properties: search, tags, has_due_date, sort_by, sort_order
3. Run TypeScript compiler to verify

**Validation**:
```bash
cd web-dashboard
pnpm build  # Should compile with no errors
```

**Checkpoint**: TypeScript compilation successful

---

### Step 3: API Client Update (5 min)

**File**: `web-dashboard/src/lib/api.ts`

**Sub-steps**:
1. Locate getProjectTasks method (line 162)
2. Add conditional URLSearchParams.set() calls for new filters
3. Verify types align with TaskFilterParams

**Validation**:
```bash
pnpm build  # TypeScript check
```

**Checkpoint**: TypeScript compilation successful, no type errors

---

### Step 4: Frontend UI Integration (15 min)

**File**: `web-dashboard/src/app/tasks/page.tsx`

**Sub-steps**:
1. Add state for sortBy and sortOrder (after line 67)
2. Add `useDeferredValue` for searchQuery debouncing
3. Update useEffect dependencies to include deferredSearch, sortBy, sortOrder
4. Pass new filters to api.getProjectTasks (line 97-100)
5. **Remove** client-side filtering (delete line 121-123, use `tasks` directly)
6. Add sort dropdown UI in filters section (after line 254)
7. Add sort order toggle UI

**Validation**:
```bash
pnpm dev  # Start dev server
# Open browser to http://localhost:3000/tasks
# Test search (type and wait 300ms)
# Test sort dropdown
# Verify network tab shows correct query params
```

**Checkpoint**: Frontend functional, no console errors, network requests show new params

---

## Test Strategy

### Manual Testing (Required for sign-off)

#### Test Case 1: N+1 Query Fix (P1)
```bash
# Enable SQL logging
export SQLALCHEMY_ECHO=1

# Fetch tasks with 50 records
curl "http://localhost:8000/api/projects/1/tasks?limit=50"

# PASS CRITERIA: Only 2 SELECT queries appear (tasks + assignees batch)
# FAIL CRITERIA: 51 queries (1 for tasks + 50 for assignees)
```

#### Test Case 2: Search Functionality (P1)
```bash
# Search for "meeting"
curl "http://localhost:8000/api/projects/1/tasks?search=meeting"

# PASS CRITERIA: Only tasks with "meeting" in title returned (case-insensitive)
# FAIL CRITERIA: All tasks returned, or case-sensitive match
```

#### Test Case 3: Sort by Priority (P2)
```bash
# Sort by priority descending
curl "http://localhost:8000/api/projects/1/tasks?sort_by=priority&sort_order=desc"

# PASS CRITERIA: critical → high → medium → low order
# FAIL CRITERIA: alphabetical order (critical, high, low, medium)
```

#### Test Case 4: Sort by Due Date with Nulls (P2)
```bash
# Sort ascending (nulls last)
curl "http://localhost:8000/api/projects/1/tasks?sort_by=due_date&sort_order=asc"

# PASS CRITERIA: Nearest dates first, null dates last
# FAIL CRITERIA: Null dates appear first
```

#### Test Case 5: Combined Filters (P2)
```bash
# Search + sort + filter
curl "http://localhost:8000/api/projects/1/tasks?search=report&tags=work&sort_by=due_date&sort_order=asc&has_due_date=true"

# PASS CRITERIA: Only tasks matching ALL filters, sorted correctly
# FAIL CRITERIA: OR logic instead of AND, or sort not applied
```

#### Test Case 6: Backward Compatibility (P1)
```bash
# No parameters
curl "http://localhost:8000/api/projects/1/tasks"

# PASS CRITERIA: Default sort (created_at desc), same response format as before
# FAIL CRITERIA: Different default behavior or response schema changes
```

#### Test Case 7: Frontend Debounced Search (P1)
1. Open browser to `/tasks`
2. Type "meeting" in search box
3. **Wait 300ms**
4. Open network tab

**PASS CRITERIA**: Single API request after 300ms delay
**FAIL CRITERIA**: 7 API requests (one per letter)

#### Test Case 8: Frontend Sort Dropdown (P2)
1. Open browser to `/tasks`
2. Select "Priority" from sort dropdown
3. Select "Ascending" from order dropdown

**PASS CRITERIA**: Network request with `?sort_by=priority&sort_order=asc`, tasks reorder in UI
**FAIL CRITERIA**: No API request, or client-side sorting still happening

---

## Integration Points

### Existing Systems Affected

1. **Task List API** (`GET /api/projects/{project_id}/tasks`)
   - **Impact**: New query parameters added (backward compatible)
   - **Backward Compatibility**: YES - all new params are optional
   - **Breaking Changes**: NONE

2. **Frontend Tasks Page** (`web-dashboard/src/app/tasks/page.tsx`)
   - **Impact**: Client-side filtering removed, replaced with API filtering
   - **Backward Compatibility**: N/A (internal change)
   - **Breaking Changes**: NONE (user-facing behavior improves)

3. **TypeScript Types** (`web-dashboard/src/types/index.ts`)
   - **Impact**: TaskFilterParams extended with new properties
   - **Backward Compatibility**: YES - new properties are optional
   - **Breaking Changes**: NONE

### Database Schema Changes

**NONE** - This feature uses existing Task model fields (title, tags, due_date, priority) without schema modifications.

### Audit Log Impact

**NONE** - List endpoint is read-only; no state changes to audit.

---

## Error Handling

### Backend Error Scenarios

1. **Invalid sort_by value**
   - **Handling**: FastAPI Pydantic validation rejects invalid literal values
   - **Response**: 422 Unprocessable Entity with validation error details

2. **Search query exceeds 200 characters**
   - **Handling**: FastAPI Query parameter with max_length=200
   - **Response**: 422 Unprocessable Entity

3. **Tags filter with invalid JSON**
   - **Handling**: JSONB contains operator handles safely (no match = empty result)
   - **Response**: Empty array (not an error)

4. **Database connection failure**
   - **Handling**: Existing error middleware catches and returns 500
   - **Response**: 500 Internal Server Error with generic message

### Frontend Error Scenarios

1. **API request fails (network error)**
   - **Handling**: Catch in try/catch, display error message in UI
   - **Response**: "Failed to load tasks" message with retry button

2. **Search query too long (>200 chars)**
   - **Handling**: Frontend maxLength on input (prevent submission)
   - **Response**: Input truncated at 200 chars

3. **Debounce during component unmount**
   - **Handling**: React's useDeferredValue handles cleanup automatically
   - **Response**: No memory leaks

---

## Performance Considerations

### Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Query Count (50 tasks)** | 51 queries | 2 queries | **96% reduction** |
| **Response Time (50 tasks)** | 500ms+ | <200ms | **60%+ faster** |
| **Network Bandwidth (search)** | All tasks fetched | Filtered subset | **Variable savings** |
| **Database Load** | N+1 selects | Batch select | **Massively reduced** |

### Scalability Limits

1. **Search with % wildcards**: ILIKE with leading % prevents index usage
   - **Mitigation**: Acceptable for MVP; future: full-text search with GIN index

2. **Tag filtering (JSONB contains)**: GIN index recommended for production
   - **Mitigation**: Create GIN index on Task.tags column if slow

3. **Cross-project queries**: Frontend fetches each project separately
   - **Mitigation**: Acceptable for MVP; future: single multi-project API endpoint

---

## Rollback Plan

### If Backend Fails

**Scenario**: N+1 fix introduces bugs or performance regression

**Rollback Steps**:
1. Revert `packages/api/src/taskflow_api/routers/tasks.py` to previous version
2. Restart API server
3. Frontend continues to work (backward compatible)

**Validation**:
```bash
git diff HEAD^ HEAD -- packages/api/src/taskflow_api/routers/tasks.py
git revert <commit-hash>
```

### If Frontend Fails

**Scenario**: Sort dropdown breaks UI or API integration fails

**Rollback Steps**:
1. Revert `web-dashboard/src/app/tasks/page.tsx` to previous version
2. Revert `web-dashboard/src/lib/api.ts` if needed
3. Revert `web-dashboard/src/types/index.ts` if needed
4. Rebuild frontend: `pnpm build`

**Validation**:
```bash
git revert <commit-hash>
pnpm dev  # Test locally
```

### Partial Rollback

**Scenario**: Backend works, frontend fails

**Strategy**: Keep backend changes (N+1 fix is net positive), rollback frontend only

---

## Acceptance Criteria Checklist

### Backend API

- [ ] `GET /api/projects/{project_id}/tasks` accepts `search` parameter
- [ ] `GET /api/projects/{project_id}/tasks` accepts `tags` parameter
- [ ] `GET /api/projects/{project_id}/tasks` accepts `has_due_date` parameter
- [ ] `GET /api/projects/{project_id}/tasks` accepts `sort_by` parameter with 4 values
- [ ] `GET /api/projects/{project_id}/tasks` accepts `sort_order` parameter (asc/desc)
- [ ] Search filter uses case-insensitive ILIKE
- [ ] Tags filter uses AND logic (all tags must match)
- [ ] Priority sort uses custom ordering (critical > high > medium > low)
- [ ] Due date sort handles nulls correctly (nullslast/nullsfirst)
- [ ] Assignee relationship eager loaded via selectinload (N+1 fix)
- [ ] Only 2 database queries executed for task list (verified via SQL logging)
- [ ] Response time under 200ms for 50 tasks with assignees
- [ ] All existing tests continue to pass
- [ ] No new lint errors (ruff check passes)

### Frontend

- [ ] TaskFilterParams type includes new properties (search, tags, has_due_date, sort_by, sort_order)
- [ ] API client getProjectTasks passes new parameters to backend
- [ ] Search input triggers API call (not client-side filtering)
- [ ] Search input debounced by 300ms (useDeferredValue)
- [ ] Sort dropdown renders with 4 options (Created, Due Date, Priority, Title)
- [ ] Sort order toggle renders (Ascending/Descending)
- [ ] Changing sort options triggers API call with correct params
- [ ] Client-side filtering code removed (line 121-123 deleted)
- [ ] Tasks display correctly after API filtering/sorting
- [ ] No TypeScript errors (pnpm build succeeds)
- [ ] No console errors in browser

### Integration

- [ ] Combined filters work (search + tags + sort + status + priority)
- [ ] Backward compatibility maintained (no params = default behavior)
- [ ] Response format unchanged (TaskListItem schema matches)
- [ ] All existing functionality works (project filter, status filter, priority filter)

---

## Follow-up Tasks (Out of Scope)

### Phase 2 Enhancements (Future)

1. **Full-Text Search**: Replace ILIKE with PostgreSQL full-text search (tsvector)
   - **Rationale**: Better performance for large datasets, ranking support
   - **Effort**: Medium (requires GIN index, search configuration)

2. **Tag Autocomplete**: Frontend suggests existing tags while typing
   - **Rationale**: Improves UX for tag filtering
   - **Effort**: Small (frontend only, fetch unique tags from API)

3. **Persistent Filters**: Save user's filter preferences in localStorage
   - **Rationale**: Restore filters on page reload
   - **Effort**: Small (frontend only)

4. **URL Parameter Sync**: Sync filters to URL query params (shareable links)
   - **Rationale**: Enable link sharing with specific filters
   - **Effort**: Medium (requires Next.js router integration)

5. **Multi-Project API Endpoint**: Single endpoint for cross-project queries
   - **Rationale**: Avoid multiple API calls when "All Projects" selected
   - **Effort**: Medium (backend endpoint + frontend integration)

6. **Search in Description**: Expand search to include task description field
   - **Rationale**: More comprehensive search
   - **Effort**: Small (add OR condition to ILIKE filter)

7. **MCP Server Updates**: Expose new filters via MCP tools for agents
   - **Rationale**: Agent parity (agents should be able to search/filter tasks)
   - **Effort**: Medium (update MCP tool schemas + CLI)

---

## Code References

### Files Modified

1. **Backend**: `packages/api/src/taskflow_api/routers/tasks.py`
   - Lines 127-186: `list_tasks` function (complete rewrite)

2. **Frontend Types**: `web-dashboard/src/types/index.ts`
   - Lines 188-193: TaskFilterParams interface (extend)

3. **Frontend API**: `web-dashboard/src/lib/api.ts`
   - Lines 162-171: getProjectTasks method (add params)

4. **Frontend UI**: `web-dashboard/src/app/tasks/page.tsx`
   - Lines 55-67: Add sort state
   - Lines 74-119: Update useEffect with new filters
   - Line 121-123: **DELETE** client-side filtering
   - Lines 204-254: Add sort dropdown UI

### Files Unchanged

- **Database Models**: `packages/api/src/taskflow_api/models/task.py` (no schema changes)
- **Task Schemas**: `packages/api/src/taskflow_api/schemas/task.py` (TaskListItem unchanged)
- **Other Routers**: All other API endpoints unchanged
- **Other Frontend Pages**: `/projects`, `/agents`, `/tasks/[id]` unchanged

---

## Success Metrics

### Quantitative

- **Query Reduction**: 96% fewer database queries (51 → 2 for 50 tasks)
- **Response Time**: 60%+ improvement (500ms → <200ms)
- **API Coverage**: 100% of new parameters tested manually
- **Type Safety**: 0 TypeScript errors
- **Test Pass Rate**: 100% of existing tests pass

### Qualitative

- **User Experience**: Search feels responsive (300ms debounce)
- **Developer Experience**: Clear API documentation for new parameters
- **Maintainability**: Clean separation of concerns (backend filtering, frontend display)
- **Backward Compatibility**: Zero breaking changes for existing clients

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Backend Implementation | 20 min | 20 min |
| Frontend Types | 5 min | 25 min |
| Frontend API Client | 5 min | 30 min |
| Frontend UI | 15 min | 45 min |
| **Total Implementation** | **45 min** | **45 min** |
| Manual Testing | 10 min | 55 min |
| Documentation | 5 min | 60 min |
| **Grand Total** | **60 min** | **60 min** |

**Confidence Level**: High (85%)
- Backend changes are straightforward (SQLAlchemy patterns from constitution)
- Frontend changes are isolated (no cross-component dependencies)
- All patterns are proven (selectinload, ILIKE, case expressions)

**Risk Buffer**: 10-15 minutes for unexpected issues (total: 70-75 min max)

---

## Constitutional Compliance

### Principle 1: Auditability
✅ **Compliant** - List endpoint is read-only; no state changes to audit

### Principle 2: Agent Parity
⚠️ **Partial** - New filters available via API (agents can call endpoint), but MCP tools not updated
**Follow-up**: Update MCP `list_tasks` tool to expose new parameters (future enhancement)

### Principle 3: Recursive Tasks
✅ **Compliant** - No impact on task decomposition; parent-child relationships unaffected

### Principle 4: Spec-Driven Development
✅ **Compliant** - Implementation follows spec (specs/012-task-search-filter-sort/spec.md)

### Principle 5: Phase Continuity
✅ **Compliant** - No data model changes; API patterns consistent with existing code

---

**This plan is ready for implementation. Proceed sequentially: Backend → Types → API Client → UI.**
