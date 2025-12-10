# Feature Specification: Task Search, Filter & Sort

**Feature Branch**: `012-task-search-filter-sort`
**Created**: 2025-12-10
**Status**: Approved
**Input**: User description: "Implement search, filter, and sort capabilities for tasks API and frontend, including N+1 query fix"

## Problem Statement

The current TaskFlow task listing has two critical issues:

1. **N+1 Query Performance Bug** (GitHub #14): The `list_tasks` endpoint executes N+1 database queries - one query to fetch tasks, then one additional query per task to fetch assignee information. For 50 tasks, this means 51 database queries instead of 2.

2. **Client-Side Search**: The search bar in the frontend filters tasks in JavaScript after fetching all tasks from the API. This doesn't scale for large datasets and wastes bandwidth.

Additionally, users cannot:
- Search tasks by title via the API
- Filter tasks by tags or due date existence
- Sort tasks by different fields (due date, priority, title)

## Success Evals *(defined first)*

### Eval 1: N+1 Query Performance Fix
**Target**: 100% of task list calls execute ≤2 queries (down from N+1)
**Measurement**: Enable SQL logging, call GET /tasks with 50 tasks, count queries
**Pass Criteria**: Query 1 (SELECT tasks), Query 2 (SELECT workers batch), Total: 2 queries, <200ms
**Failure Modes**: 51 queries (N+1 not fixed), eager loading not applied

### Eval 2: Server-Side Search Performance
**Target**: 95%+ searches respond within 500ms
**Measurement**: Network tab shows API call with ?search= parameter
**Pass Criteria**: API receives search param, response filtered server-side, 300ms debounce applied
**Failure Modes**: Client-side filtering, no debounce, search param not sent

### Eval 3: Sort & Filter Correctness
**Target**: 100% of test matrix cases pass (4 sort fields × 2 orders × 3 filters = 24 cases)
**Pass Criteria**: Due date nulls handled correctly, priority custom order works, tag AND logic applied
**Failure Modes**: Null dates wrong position, alphabetical priority sort, tag OR logic

### Eval 4: Backward Compatibility
**Target**: 100% of existing clients work unchanged
**Measurement**: GET /tasks with no params, verify response matches pre-feature format
**Pass Criteria**: Default sort unchanged (created_at desc), response format identical
**Failure Modes**: Breaking changes to response, default behavior changed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Task List Loading (Priority: P1)

As a project manager with 50+ tasks, I need the task list to load quickly without performance degradation as task count grows.

**Why this priority**: Performance is a demo blocker. N+1 queries cause visible slowdown and are a fundamental scalability issue that affects all users.

**Independent Test**: Load a project with 50 tasks and verify response time is under 200ms (vs current ~500ms+).

**Acceptance Scenarios**:

1. **Given** a project with 50 tasks with assignees, **When** I request the task list, **Then** the API responds in under 200ms with all assignee information pre-loaded
2. **Given** SQL query logging enabled, **When** I request the task list, **Then** only 2 database queries are executed (tasks + assignees batch)

---

### User Story 2 - Search Tasks by Title (Priority: P1)

As a user with many tasks, I need to search tasks by title to quickly find specific work items.

**Why this priority**: Search is a core productivity feature. The UI already has a search bar that doesn't work properly (filters client-side).

**Independent Test**: Type in the search box and verify only matching tasks appear (fetched from API, not client-side filtered).

**Acceptance Scenarios**:

1. **Given** tasks with titles "Weekly Meeting", "Meeting Notes", "Project Setup", **When** I search "meeting", **Then** only "Weekly Meeting" and "Meeting Notes" appear
2. **Given** a search query, **When** 300ms passes after typing stops (debounce), **Then** the API is called with the search parameter
3. **Given** an empty search query, **When** I clear the search box, **Then** all tasks are displayed

---

### User Story 3 - Sort Tasks by Different Fields (Priority: P2)

As a user, I need to sort tasks by due date, priority, creation date, or title to organize my work view.

**Why this priority**: Sorting helps users prioritize work. Currently only creation date (descending) is supported.

**Independent Test**: Select different sort options and verify task order changes correctly.

**Acceptance Scenarios**:

1. **Given** tasks with different due dates, **When** I sort by "Due Date" ascending, **Then** tasks with nearest due dates appear first, tasks without due dates appear last
2. **Given** tasks with different priorities, **When** I sort by "Priority" descending, **Then** critical tasks appear first, then high, medium, low
3. **Given** tasks with different titles, **When** I sort by "Title" ascending, **Then** tasks appear in alphabetical order

---

### User Story 4 - Filter Tasks by Tags (Priority: P3)

As a user who organizes tasks with tags, I need to filter tasks by tag to focus on specific categories.

**Why this priority**: Tags exist in the data model but filtering by them isn't available. Lower priority than core search/sort.

**Independent Test**: Apply tag filter and verify only tasks with that tag appear.

**Acceptance Scenarios**:

1. **Given** tasks tagged "work" and "personal", **When** I filter by tag "work", **Then** only tasks with the "work" tag appear
2. **Given** a comma-separated tag filter "work,urgent", **When** applied, **Then** only tasks containing BOTH tags appear (AND logic)

---

### User Story 5 - Filter Tasks by Due Date Existence (Priority: P3)

As a user, I need to filter tasks that have due dates to focus on time-sensitive work.

**Why this priority**: Nice-to-have filter for users who want to see only scheduled tasks. Lower priority than search/sort.

**Independent Test**: Apply due date filter and verify only tasks with/without due dates appear.

**Acceptance Scenarios**:

1. **Given** tasks with and without due dates, **When** I filter "has due date = true", **Then** only tasks with due dates appear
2. **Given** tasks with and without due dates, **When** I filter "has due date = false", **Then** only tasks without due dates appear

---

### Edge Cases

- What happens when search query contains special characters? **Assumption**: Escape special characters for safe ILIKE query
- What happens when sorting by due_date with null values? **Specification**: Nulls appear last when ascending, first when descending
- What happens when sorting by priority? **Specification**: Use custom ordering (critical=0, high=1, medium=2, low=3)
- What happens when no tasks match the search? **Specification**: Return empty array, frontend shows "No tasks found" message
- What happens with very long search queries? **Specification**: Limit to 200 characters maximum

## Requirements *(mandatory)*

### Functional Requirements

**Backend API (list_tasks endpoint)**:

- **FR-001**: System MUST load assignee information in a single batch query (N+1 fix using eager loading)
- **FR-002**: System MUST accept `search` query parameter (max 200 characters) for case-insensitive title search
- **FR-003**: System MUST accept `tags` query parameter (comma-separated) with AND logic filtering
- **FR-004**: System MUST accept `has_due_date` boolean query parameter
- **FR-005**: System MUST accept `sort_by` parameter with values: "created_at", "due_date", "priority", "title"
- **FR-006**: System MUST accept `sort_order` parameter with values: "asc", "desc" (default: "desc")
- **FR-007**: System MUST handle null due_dates in sorting (nullslast for asc, nullsfirst for desc)
- **FR-008**: System MUST use custom ordering for priority sort (critical > high > medium > low)

**Frontend**:

- **FR-009**: Search input MUST call API instead of filtering client-side
- **FR-010**: Search input MUST debounce API calls by 300ms
- **FR-011**: Frontend MUST provide sort dropdown with options: Created, Due Date, Priority, Title
- **FR-012**: Frontend MUST provide sort order toggle (ascending/descending)
- **FR-013**: Frontend MUST pass new filter parameters to API client
- **FR-014**: Frontend MUST remove client-side filtering code

**Type Definitions**:

- **FR-015**: TaskFilterParams type MUST include: search, tags, has_due_date, sort_by, sort_order

### Key Entities

- **Task**: Existing entity - no schema changes required. Relevant fields: title, tags (JSONB array), due_date, priority, assignee_id
- **Worker**: Existing entity - assignee relationship. Relevant fields: id, handle
- **TaskFilterParams**: Extended filter parameters for API queries

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Task list API responds in under 200ms for 50 tasks with assignees (down from 500ms+)
- **SC-002**: Only 2 database queries executed for task list (verified via SQL logging)
- **SC-003**: Search results appear within 500ms of user stopping typing
- **SC-004**: Sort by any field returns correctly ordered results
- **SC-005**: All existing tests continue to pass
- **SC-006**: No TypeScript or Python lint errors introduced
- **SC-007**: Combined search + filter + sort operations work correctly

## Assumptions

- PostgreSQL ILIKE operator available for case-insensitive search
- SQLAlchemy selectinload available for eager loading relationships
- JSONB contains operator available for tag filtering
- Existing status and priority filters continue to work unchanged
- Frontend uses existing shadcn/ui Select components for dropdowns

## Non-Goals

- Full-text search with ranking (simple ILIKE is sufficient for MVP)
- Search in task description (title only for now)
- Saved/persistent filter preferences
- URL parameter synchronization for filters
- Tag autocomplete/suggestions
- MCP server updates (optional, not blocking)

## Constraints

- Time budget: 45-60 minutes total implementation
- Must not modify Task model schema
- Must not create new API endpoints (extend existing list_tasks)
- Must maintain backward compatibility with existing API clients
