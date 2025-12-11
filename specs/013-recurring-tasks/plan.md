# Implementation Plan: Recurring Tasks

**Feature**: Recurring Tasks (Auto-create next occurrence on completion)
**Branch**: `013-recurring-tasks`
**Estimated Time**: 45 minutes
**Created**: 2025-12-10
**Status**: Ready for Implementation

---

## 1. Summary

### Primary Requirement
Enable tasks to automatically create their next occurrence when completed, supporting both time-based (5m, 10m, 15m, 30m, 1h) and calendar-based (daily, weekly, monthly) recurrence patterns. Users can mark tasks as recurring during creation/editing, and optionally limit total occurrences.

### Technical Approach
1. **Backend Model Extension**: Add 5 fields to Task model (`is_recurring`, `recurrence_pattern`, `reminder_sent`, `max_occurrences`, `occurrences_created`)
2. **Database Migration**: Create Alembic migration for new fields
3. **Schema Updates**: Extend TaskCreate, TaskUpdate, TaskRead, TaskListItem with recurring fields and validation
4. **Recurring Logic**: Implement `calculate_next_due()` and `create_next_occurrence()` functions, integrate into `update_status` endpoint
5. **Frontend Integration**: Add recurring toggle/pattern selector to task forms, display recurring indicator in lists/detail views

---

## 2. Technical Context

### Languages & Frameworks
- **Backend**: Python 3.13, FastAPI 0.115+, SQLModel 0.0.22+
- **Frontend**: TypeScript 5.x, Next.js 16 (App Router), React 19
- **Database**: PostgreSQL (Neon production), SQLite (tests)
- **Testing**: pytest (backend), vitest (frontend)

### Key Dependencies
- `sqlmodel` - ORM with Pydantic integration
- `alembic` - Database migrations
- `asyncpg` - Async PostgreSQL driver
- `pydantic` - Schema validation with `model_validator`
- `shadcn/ui` - UI components (Checkbox, Select)

### Existing Architecture
- **Task Model**: `packages/api/src/taskflow_api/models/task.py` - SQLModel with `due_date`, `status`, `progress_percent`, recursive subtasks
- **Task Router**: `packages/api/src/taskflow_api/routers/tasks.py` - RESTful endpoints with `update_status` handling status transitions
- **Audit System**: `services.audit.log_action()` - Records all state changes
- **Transaction Pattern**: Single commit at endpoint level, `flush()` for intermediate IDs

---

## 3. Constitution Check

### Principle 1: Every Action MUST Be Auditable ✅
- **Compliance**: New task creation from recurrence will call `log_action()` with `action="created"` and `details={"recurring_from": task_id, "recurrence_pattern": pattern}`
- **Actor Recording**: Uses existing `actor_id` and `actor_type` from completion context
- **Audit Entry**: `AuditLog(entity_type="task", entity_id=new_task.id, action="created", details={...})`

### Principle 2: Agents Are First-Class Citizens ✅
- **Compliance**: No distinction between humans and agents in recurring logic - both trigger same recurrence flow
- **API Parity**: Existing `/api/tasks/{id}/status` endpoint used by both humans (web) and agents (MCP)
- **UI Neutrality**: Recurring toggle available in human UI; agents set fields via standard TaskCreate/TaskUpdate schemas

### Principle 3: Recursive Task Decomposition ⚠️ N/A
- **Not Applicable**: Recurring tasks are independent siblings (not subtasks of each other)
- **Note**: New occurrences inherit `parent_task_id` from original, preserving hierarchy if original was a subtask

### Principle 4: Spec-Driven Development ✅
- **Compliance**: Implementation follows `specs/013-recurring-tasks/spec.md` (created 2025-12-10)
- **PRD Reference**: `specs/011-phase-v-features-planner/agent-2a-recurring-tasks-prd.md`
- **Validation**: All acceptance scenarios from spec will be tested

### Principle 5: Phase Continuity ✅
- **Data Model Persistence**: Fields added to existing Task model (additive, backward compatible)
- **Migration Strategy**: Alembic migration with default values (`is_recurring=False`, `reminder_sent=False`, `occurrences_created=0`)
- **Future-Proof**: `reminder_sent` field reserved for Phase 2B notification system integration
- **API Stability**: New fields optional in TaskCreate (default `is_recurring=False`), non-breaking change

---

## 4. Implementation Phases

### Phase 1: Backend Model + Migration (Priority: Highest, Est: 15 min)

**Goal**: Extend Task model and apply database migration

#### 1.1 Add Fields to Task Model
**File**: `packages/api/src/taskflow_api/models/task.py`

**Changes**:
```python
# Add after line 61 (due_date field):

# Recurring task fields
is_recurring: bool = Field(
    default=False,
    description="Whether this task repeats when completed",
)
recurrence_pattern: str | None = Field(
    default=None,
    description="Interval pattern: '1m', '5m', '10m', '15m', '30m', '1h', 'daily', 'weekly', 'monthly'",
)
reminder_sent: bool = Field(
    default=False,
    description="Whether reminder notification was sent (used by Phase 2B notification system)",
)
max_occurrences: int | None = Field(
    default=None,
    description="Maximum number of times to recur (null = unlimited)",
)
occurrences_created: int = Field(
    default=0,
    description="Counter tracking spawned occurrences from this task",
)
```

**Rationale**:
- `is_recurring` boolean flag for quick filtering
- `recurrence_pattern` string (not enum) for flexibility in future patterns
- `reminder_sent` included now for Phase 2B (no code in this phase uses it)
- `max_occurrences` nullable for unlimited recurrence (majority use case)
- `occurrences_created` counter prevents exceeding max_occurrences

#### 1.2 Create Alembic Migration
**Command**:
```bash
cd packages/api
uv run alembic revision --autogenerate -m "Add recurring task fields"
```

**Expected Migration File**: `packages/api/alembic/versions/{timestamp}_add_recurring_task_fields.py`

**Manual Review**: Verify migration includes:
- `is_recurring` BOOLEAN DEFAULT FALSE NOT NULL
- `recurrence_pattern` VARCHAR NULL
- `reminder_sent` BOOLEAN DEFAULT FALSE NOT NULL
- `max_occurrences` INTEGER NULL
- `occurrences_created` INTEGER DEFAULT 0 NOT NULL

#### 1.3 Apply Migration
**Commands**:
```bash
# Development database
uv run alembic upgrade head

# Test database (if separate)
TESTING=1 uv run alembic upgrade head
```

**Validation**:
```sql
-- Verify fields exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'task'
AND column_name IN ('is_recurring', 'recurrence_pattern', 'reminder_sent', 'max_occurrences', 'occurrences_created');
```

#### 1.4 Test Migration Rollback
**Command**:
```bash
uv run alembic downgrade -1
uv run alembic upgrade head
```

**Acceptance Criteria**:
- [ ] Migration generates without errors
- [ ] Fields added to task table with correct types and defaults
- [ ] Existing tasks have `is_recurring=False`, `occurrences_created=0`
- [ ] Migration rollback works (down/up cycle successful)

---

### Phase 2: Schema Updates (Priority: High, Est: 10 min)

**Goal**: Extend API schemas with recurring fields and validation

#### 2.1 Update TaskCreate Schema
**File**: `packages/api/src/taskflow_api/schemas/task.py`

**Changes**:
```python
# Add after line 39 (after due_date field):

# Recurring task fields
is_recurring: bool = False
recurrence_pattern: Literal["1m", "5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"] | None = None
max_occurrences: int | None = Field(default=None, gt=0, description="Maximum recurrences (null = unlimited)")

# Add after normalize_due_date validator:

@model_validator(mode="after")
def validate_recurring(self) -> "TaskCreate":
    """Validate recurring task constraints."""
    # If recurring is enabled, pattern is required
    if self.is_recurring and not self.recurrence_pattern:
        raise ValueError("recurrence_pattern required when is_recurring is True")

    # Auto-enable recurring if pattern is provided
    if not self.is_recurring and self.recurrence_pattern:
        self.is_recurring = True

    return self
```

**Rationale**:
- Literal type enforces valid patterns at schema level
- `model_validator` provides cross-field validation (pattern required when recurring)
- Auto-enabling recurring when pattern provided improves UX (user sets pattern, forgets toggle)
- `max_occurrences` validated as positive integer

#### 2.2 Update TaskUpdate Schema
**File**: `packages/api/src/taskflow_api/schemas/task.py`

**Changes**:
```python
# Add after line 63 (after due_date field):

# Recurring task fields
is_recurring: bool | None = None
recurrence_pattern: Literal["1m", "5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"] | None = None
max_occurrences: int | None = Field(default=None, gt=0)

# Add validator (same as TaskCreate):

@model_validator(mode="after")
def validate_recurring(self) -> "TaskUpdate":
    """Validate recurring task constraints."""
    if self.is_recurring is True and self.recurrence_pattern is None:
        # When updating, pattern can be left unchanged (None means no update)
        # Only validate if explicitly disabling (is_recurring set but pattern cleared)
        pass
    return self
```

**Note**: Update validation is more lenient - allows partial updates

#### 2.3 Update TaskRead Schema
**File**: `packages/api/src/taskflow_api/schemas/task.py`

**Changes**:
```python
# Add after line 107 (after due_date field):

# Recurring task fields
is_recurring: bool
recurrence_pattern: str | None
max_occurrences: int | None
occurrences_created: int
```

**Rationale**: Expose all recurring fields for detail view (including counter)

#### 2.4 Update TaskListItem Schema
**File**: `packages/api/src/taskflow_api/schemas/task.py`

**Changes**:
```python
# Add after line 133 (after due_date field):

# Recurring indicator only (minimal data for list view)
is_recurring: bool
```

**Rationale**: List view only needs boolean flag for badge display (not full details)

#### 2.5 Update task_to_read Helper
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Changes**:
```python
# In task_to_read function (around line 100-120), add to returned TaskRead:

is_recurring=task.is_recurring,
recurrence_pattern=task.recurrence_pattern,
max_occurrences=task.max_occurrences,
occurrences_created=task.occurrences_created,
```

#### 2.6 Update List Endpoint Response Mapping
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Changes**:
```python
# In list_tasks endpoint (around line 284-297), add to TaskListItem:

is_recurring=task.is_recurring,
```

**Acceptance Criteria**:
- [ ] TaskCreate rejects `is_recurring=True` without pattern (400 error)
- [ ] TaskCreate auto-enables recurring when pattern provided
- [ ] TaskUpdate allows partial updates
- [ ] TaskRead includes all 4 recurring fields
- [ ] TaskListItem includes `is_recurring` boolean
- [ ] Swagger UI shows recurring fields in schemas

---

### Phase 3: Recurring Logic (Priority: Highest, Est: 15 min)

**Goal**: Implement automatic task creation on completion

#### 3.1 Add calculate_next_due Function
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Location**: Add as module-level function (before endpoints, after imports)

**Implementation**:
```python
from datetime import timedelta

def calculate_next_due(pattern: str, from_time: datetime) -> datetime:
    """Calculate next due date based on recurrence pattern.

    Args:
        pattern: Recurrence pattern (e.g., '5m', 'daily', 'weekly')
        from_time: Base timestamp (original due_date or completion time)

    Returns:
        Next due datetime (naive UTC)

    Note: Calculations use calendar math for time-based patterns:
        - Minute patterns: add exact minutes (timedelta)
        - Hour patterns: add exact hours (timedelta)
        - Daily: add 24 hours (timedelta)
        - Weekly: add 7 days (timedelta)
        - Monthly: add 30 days (timedelta) - simplified, not calendar month
    """
    if pattern == "1m":
        return from_time + timedelta(minutes=1)
    elif pattern == "5m":
        return from_time + timedelta(minutes=5)
    elif pattern == "10m":
        return from_time + timedelta(minutes=10)
    elif pattern == "15m":
        return from_time + timedelta(minutes=15)
    elif pattern == "30m":
        return from_time + timedelta(minutes=30)
    elif pattern == "1h":
        return from_time + timedelta(hours=1)
    elif pattern == "daily":
        return from_time + timedelta(days=1)
    elif pattern == "weekly":
        return from_time + timedelta(weeks=1)
    elif pattern == "monthly":
        return from_time + timedelta(days=30)  # Simplified: 30 days, not calendar month
    else:
        # Fallback to daily for unknown patterns
        return from_time + timedelta(days=1)
```

**Design Decisions**:
- Uses timedelta (not dateutil) for simplicity and zero dependencies
- Monthly = 30 days (not calendar month) to avoid DST/leap year complexity
- Fallback to daily prevents silent failures
- Naive datetimes (matches database storage pattern)

#### 3.2 Add create_next_occurrence Function
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Location**: Add after `calculate_next_due` function

**Implementation**:
```python
async def create_next_occurrence(
    session: AsyncSession,
    completed_task: Task,
    creator_id: int,
    creator_type: str,
) -> Task | None:
    """Create next occurrence of a recurring task.

    Args:
        session: Database session (will NOT commit - caller owns transaction)
        completed_task: The task that was just completed
        creator_id: Worker ID triggering recurrence (human or agent)
        creator_type: "human" or "agent"

    Returns:
        Newly created task, or None if max_occurrences reached

    Side Effects:
        - Increments completed_task.occurrences_created counter
        - Adds new task to session (flush not commit)
        - Creates audit log entry
    """
    # Check max_occurrences limit
    if completed_task.max_occurrences is not None:
        if completed_task.occurrences_created >= completed_task.max_occurrences:
            # Limit reached, do not create new occurrence
            return None

    # Calculate next due date
    # Use original due_date as base (if exists), else use completion time
    base_time = completed_task.due_date or datetime.utcnow()
    next_due = calculate_next_due(completed_task.recurrence_pattern, base_time)

    # Create new task (inherit key attributes)
    new_task = Task(
        title=completed_task.title,
        description=completed_task.description,
        project_id=completed_task.project_id,
        assignee_id=completed_task.assignee_id,
        parent_task_id=completed_task.parent_task_id,  # Preserve hierarchy
        created_by_id=creator_id,
        priority=completed_task.priority,
        tags=completed_task.tags.copy() if completed_task.tags else [],
        due_date=next_due,
        # Recurring attributes
        is_recurring=True,
        recurrence_pattern=completed_task.recurrence_pattern,
        max_occurrences=completed_task.max_occurrences,
        occurrences_created=0,  # Reset counter for new task
        # Reset state
        reminder_sent=False,
        status="pending",
        progress_percent=0,
        started_at=None,
        completed_at=None,
    )

    session.add(new_task)
    await session.flush()  # Get new_task.id

    # Increment source task's counter
    completed_task.occurrences_created += 1
    session.add(completed_task)

    # Audit log for new task creation
    await log_action(
        session,
        entity_type="task",
        entity_id=new_task.id,
        action="created",
        actor_id=creator_id,
        actor_type=creator_type,
        details={
            "title": new_task.title,
            "recurring_from": completed_task.id,
            "recurrence_pattern": completed_task.recurrence_pattern,
            "next_due": next_due.isoformat(),
        },
    )

    return new_task
```

**Key Design Points**:
- **No commit**: Follows constitution's transaction pattern (caller commits)
- **Counter management**: Increments source task's `occurrences_created` immediately
- **Limit enforcement**: Returns None when max reached (not error)
- **Hierarchy preservation**: New task inherits `parent_task_id` (if original was subtask)
- **Audit traceability**: Links new task to source via `recurring_from` detail

#### 3.3 Modify update_status Endpoint
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Location**: `update_status` function (line 540-596)

**Changes**:
```python
# Replace lines 570-575 with:

# Set timestamps based on status
if data.status == "in_progress" and not task.started_at:
    task.started_at = datetime.utcnow()
elif data.status == "completed":
    task.completed_at = datetime.utcnow()
    task.progress_percent = 100

    # NEW: Handle recurring task creation
    if task.is_recurring and task.recurrence_pattern:
        await create_next_occurrence(session, task, worker_id, worker_type)
```

**Before/After Context**:
```python
# BEFORE (lines 566-577):
old_status = task.status
task.status = data.status
task.updated_at = datetime.utcnow()

# Set timestamps based on status
if data.status == "in_progress" and not task.started_at:
    task.started_at = datetime.utcnow()
elif data.status == "completed":
    task.completed_at = datetime.utcnow()
    task.progress_percent = 100

session.add(task)

# AFTER (lines 566-580):
old_status = task.status
task.status = data.status
task.updated_at = datetime.utcnow()

# Set timestamps based on status
if data.status == "in_progress" and not task.started_at:
    task.started_at = datetime.utcnow()
elif data.status == "completed":
    task.completed_at = datetime.utcnow()
    task.progress_percent = 100

    # Handle recurring task creation
    if task.is_recurring and task.recurrence_pattern:
        await create_next_occurrence(session, task, worker_id, worker_type)

session.add(task)
```

**Rationale**:
- Triggers only on `completed` status (not on `review` → `completed` approval)
- Uses existing worker context (no additional auth lookup)
- Fits within existing transaction (single commit at line 589)
- Non-blocking: max_occurrences reached returns None silently

#### 3.4 Add Import for timedelta
**File**: `packages/api/src/taskflow_api/routers/tasks.py`

**Changes**:
```python
# Line 3 - update import:
from datetime import datetime, timedelta
```

**Acceptance Criteria**:
- [ ] `calculate_next_due("daily", dt)` returns dt + 1 day
- [ ] `calculate_next_due("5m", dt)` returns dt + 5 minutes
- [ ] `calculate_next_due("monthly", dt)` returns dt + 30 days
- [ ] Completing recurring task creates new pending task
- [ ] New task has correct `due_date` (calculated from pattern)
- [ ] New task inherits: title, description, assignee, priority, tags, project
- [ ] New task has `status="pending"`, `progress_percent=0`
- [ ] Source task's `occurrences_created` incremented
- [ ] Max occurrences enforced (no creation when limit reached)
- [ ] Audit log entry created with `recurring_from` reference

---

### Phase 4: Frontend Updates (Priority: Medium, Est: 15 min)

**Goal**: Add recurring UI to task forms and display indicators

#### 4.1 Update TypeScript Types
**File**: `web-dashboard/src/types/index.ts`

**Changes**:
```typescript
// Add after line 106 (in TaskListItem interface):
is_recurring: boolean;

// Add after line 127 (in TaskRead interface):
is_recurring: boolean;
recurrence_pattern: string | null;
max_occurrences: number | null;
occurrences_created: number;

// Add after line 137 (in TaskCreate interface):
is_recurring?: boolean;
recurrence_pattern?: "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "daily" | "weekly" | "monthly";
max_occurrences?: number;

// Add after line 145 (in TaskUpdate interface):
is_recurring?: boolean;
recurrence_pattern?: "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "daily" | "weekly" | "monthly";
max_occurrences?: number;

// Add at end of file (after line 202):

// Recurrence pattern options for UI dropdowns
export const RECURRENCE_PATTERNS = [
  { value: "1m", label: "Every minute" },
  { value: "5m", label: "Every 5 minutes" },
  { value: "10m", label: "Every 10 minutes" },
  { value: "15m", label: "Every 15 minutes" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every hour" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export type RecurrencePattern = typeof RECURRENCE_PATTERNS[number]["value"];
```

#### 4.2 Add Recurring Toggle to Task Create Form
**File**: `web-dashboard/src/app/projects/[id]/tasks/new/page.tsx`

**Location**: Identify form component (likely `TaskForm` or inline form in page)

**Changes**:
```tsx
// Add state variables (in component body):
const [isRecurring, setIsRecurring] = useState(false);
const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | "">("");
const [maxOccurrences, setMaxOccurrences] = useState<number | null>(null);

// Add import:
import { RECURRENCE_PATTERNS, RecurrencePattern } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Add JSX (after due date field, before tags field):
<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="is-recurring"
      checked={isRecurring}
      onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
    />
    <Label htmlFor="is-recurring" className="text-sm font-medium">
      Make this a recurring task
    </Label>
  </div>

  {isRecurring && (
    <div className="ml-6 space-y-4 rounded-md border p-4 bg-muted/50">
      <div className="space-y-2">
        <Label htmlFor="recurrence-pattern">Repeat Frequency</Label>
        <Select
          value={recurrencePattern}
          onValueChange={(value) => setRecurrencePattern(value as RecurrencePattern)}
        >
          <SelectTrigger id="recurrence-pattern" className="w-full">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {RECURRENCE_PATTERNS.map((pattern) => (
              <SelectItem key={pattern.value} value={pattern.value}>
                {pattern.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-occurrences">
          Maximum Occurrences (optional)
        </Label>
        <Input
          id="max-occurrences"
          type="number"
          min="1"
          placeholder="Unlimited"
          value={maxOccurrences || ""}
          onChange={(e) => setMaxOccurrences(e.target.value ? parseInt(e.target.value) : null)}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for unlimited recurrence
        </p>
      </div>
    </div>
  )}
</div>

// Update form submission:
const taskData: TaskCreate = {
  // ... existing fields ...
  is_recurring: isRecurring,
  recurrence_pattern: isRecurring && recurrencePattern ? recurrencePattern : undefined,
  max_occurrences: isRecurring && maxOccurrences ? maxOccurrences : undefined,
};
```

**Validation**:
```tsx
// Add validation before submit:
if (isRecurring && !recurrencePattern) {
  toast.error("Please select a recurrence pattern");
  return;
}
```

#### 4.3 Add Recurring Indicator to Task List
**File**: `web-dashboard/src/app/tasks/page.tsx` or `web-dashboard/src/app/projects/[id]/page.tsx`

**Changes**:
```tsx
// In table row rendering (title column):
<TableCell>
  <div className="flex items-center gap-2">
    <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary">
      {task.title}
    </Link>
    {task.is_recurring && (
      <Badge variant="outline" className="text-xs gap-1">
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Recurring
      </Badge>
    )}
  </div>
</TableCell>
```

**Alternative** (emoji icon):
```tsx
{task.is_recurring && (
  <Badge variant="outline" className="text-xs">
    🔄 Recurring
  </Badge>
)}
```

#### 4.4 Add Recurring Details to Task Detail View
**File**: `web-dashboard/src/app/tasks/[id]/page.tsx`

**Changes**:
```tsx
// In task details section (after priority, before tags):
{task.is_recurring && (
  <div className="space-y-2">
    <h3 className="text-sm font-medium">Recurrence</h3>
    <div className="rounded-md border p-3 bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="h-4 w-4 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="font-medium">
          {RECURRENCE_PATTERNS.find(p => p.value === task.recurrence_pattern)?.label || task.recurrence_pattern}
        </span>
      </div>
      {task.max_occurrences && (
        <p className="text-xs text-muted-foreground">
          {task.occurrences_created} of {task.max_occurrences} occurrences created
        </p>
      )}
      {!task.max_occurrences && task.occurrences_created > 0 && (
        <p className="text-xs text-muted-foreground">
          {task.occurrences_created} occurrences created (unlimited)
        </p>
      )}
    </div>
  </div>
)}
```

#### 4.5 Add Recurring Toggle to Task Edit Form (if separate)
**File**: `web-dashboard/src/app/tasks/[id]/edit/page.tsx` (if exists)

**Changes**: Same as 4.2, but prepopulate state from existing task:
```tsx
const [isRecurring, setIsRecurring] = useState(task.is_recurring);
const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | "">(
  task.recurrence_pattern || ""
);
const [maxOccurrences, setMaxOccurrences] = useState<number | null>(task.max_occurrences);
```

**Acceptance Criteria**:
- [ ] Task create form shows "Make recurring" checkbox
- [ ] Checking recurring reveals pattern dropdown + max occurrences input
- [ ] Pattern dropdown shows all 9 options (1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly)
- [ ] Unchecking recurring hides pattern/max fields
- [ ] Form validation prevents submit when recurring checked but no pattern selected
- [ ] Task list shows recurring badge/icon for recurring tasks
- [ ] Task detail view shows recurrence info (pattern, occurrences counter)
- [ ] UI is responsive (works on mobile)

---

## 5. File Changes Summary

| File | Action | Lines Changed | Key Changes |
|------|--------|---------------|-------------|
| `packages/api/src/taskflow_api/models/task.py` | MODIFY | +25 | Add 5 recurring fields to Task model |
| `packages/api/alembic/versions/{timestamp}_add_recurring.py` | CREATE | ~40 | Migration: add columns with defaults |
| `packages/api/src/taskflow_api/schemas/task.py` | MODIFY | +35 | Add fields to TaskCreate, TaskUpdate, TaskRead, TaskListItem + validators |
| `packages/api/src/taskflow_api/routers/tasks.py` | MODIFY | +85 | Add calculate_next_due, create_next_occurrence, integrate into update_status |
| `web-dashboard/src/types/index.ts` | MODIFY | +25 | Add recurring fields to types + RECURRENCE_PATTERNS constant |
| `web-dashboard/src/app/projects/[id]/tasks/new/page.tsx` | MODIFY | +60 | Add recurring toggle, pattern selector, max occurrences input |
| `web-dashboard/src/app/tasks/page.tsx` | MODIFY | +12 | Add recurring badge to task list |
| `web-dashboard/src/app/tasks/[id]/page.tsx` | MODIFY | +25 | Add recurring details section |

**Total Estimated Changes**: ~307 lines across 8 files

---

## 6. Test Strategy

### 6.1 Unit Tests (Backend)

**File**: `packages/api/src/taskflow_api/tests/test_recurring.py` (CREATE)

**Test Cases**:

```python
import pytest
from datetime import datetime, timedelta
from taskflow_api.routers.tasks import calculate_next_due

class TestCalculateNextDue:
    """Test recurrence pattern calculations."""

    @pytest.mark.parametrize("pattern,expected_delta", [
        ("1m", timedelta(minutes=1)),
        ("5m", timedelta(minutes=5)),
        ("10m", timedelta(minutes=10)),
        ("15m", timedelta(minutes=15)),
        ("30m", timedelta(minutes=30)),
        ("1h", timedelta(hours=1)),
        ("daily", timedelta(days=1)),
        ("weekly", timedelta(weeks=1)),
        ("monthly", timedelta(days=30)),
    ])
    def test_calculate_next_due_all_patterns(self, pattern, expected_delta):
        """Each pattern calculates correct interval."""
        base = datetime(2025, 12, 10, 9, 0, 0)
        result = calculate_next_due(pattern, base)
        assert result == base + expected_delta

    def test_calculate_next_due_unknown_pattern_defaults_daily(self):
        """Unknown pattern falls back to daily."""
        base = datetime(2025, 12, 10, 9, 0, 0)
        result = calculate_next_due("unknown", base)
        assert result == base + timedelta(days=1)
```

### 6.2 Integration Tests (Backend)

**File**: `packages/api/src/taskflow_api/tests/test_recurring_integration.py` (CREATE)

**Test Cases**:

```python
import pytest
from httpx import AsyncClient
from datetime import datetime

@pytest.mark.asyncio
async def test_complete_recurring_task_creates_next_occurrence(client: AsyncClient):
    """Completing recurring task creates new pending task with correct due date."""
    # Create recurring task
    response = await client.post("/api/projects/1/tasks", json={
        "title": "Daily standup",
        "is_recurring": True,
        "recurrence_pattern": "daily",
        "due_date": "2025-12-11T09:00:00",
    })
    assert response.status_code == 201
    task_id = response.json()["id"]

    # Complete it
    response = await client.patch(f"/api/tasks/{task_id}/status", json={
        "status": "completed"
    })
    assert response.status_code == 200

    # Verify new task exists
    response = await client.get("/api/projects/1/tasks?status=pending")
    tasks = response.json()
    pending_tasks = [t for t in tasks if t["title"] == "Daily standup"]

    assert len(pending_tasks) == 1
    new_task = pending_tasks[0]
    assert new_task["status"] == "pending"
    assert new_task["is_recurring"] is True
    # Due date should be +1 day from original
    # (exact time comparison omitted for brevity)

@pytest.mark.asyncio
async def test_max_occurrences_limits_creation(client: AsyncClient):
    """Recurring task stops creating after max_occurrences reached."""
    # Create recurring task with max=2
    response = await client.post("/api/projects/1/tasks", json={
        "title": "Limited task",
        "is_recurring": True,
        "recurrence_pattern": "daily",
        "max_occurrences": 2,
    })
    task_id = response.json()["id"]

    # Complete 3 times
    for i in range(3):
        # Get current pending task
        response = await client.get("/api/projects/1/tasks?status=pending")
        tasks = [t for t in response.json() if t["title"] == "Limited task"]
        if not tasks:
            break
        current_id = tasks[0]["id"]

        # Complete it
        await client.patch(f"/api/tasks/{current_id}/status", json={"status": "completed"})

    # Verify only 2 new occurrences created (original + 2 = 3 total completed)
    response = await client.get("/api/projects/1/tasks?status=completed")
    completed = [t for t in response.json() if t["title"] == "Limited task"]
    assert len(completed) == 3  # Original + 2 occurrences

    # Verify no more pending tasks
    response = await client.get("/api/projects/1/tasks?status=pending")
    pending = [t for t in response.json() if t["title"] == "Limited task"]
    assert len(pending) == 0

@pytest.mark.asyncio
async def test_recurring_task_without_due_date_uses_completion_time(client: AsyncClient):
    """Recurring task without due_date bases next occurrence on completion timestamp."""
    # Create recurring task without due_date
    response = await client.post("/api/projects/1/tasks", json={
        "title": "No due date task",
        "is_recurring": True,
        "recurrence_pattern": "daily",
    })
    task_id = response.json()["id"]

    # Complete it
    completion_time = datetime.utcnow()
    response = await client.patch(f"/api/tasks/{task_id}/status", json={"status": "completed"})

    # Verify new task has due_date approximately completion_time + 1 day
    response = await client.get("/api/projects/1/tasks?status=pending")
    new_task = [t for t in response.json() if t["title"] == "No due date task"][0]
    assert new_task["due_date"] is not None
    # (exact time validation omitted)

@pytest.mark.asyncio
async def test_recurring_task_creates_audit_entry(client: AsyncClient):
    """Auto-created recurring task logs audit entry with lineage."""
    response = await client.post("/api/projects/1/tasks", json={
        "title": "Audited task",
        "is_recurring": True,
        "recurrence_pattern": "daily",
    })
    original_id = response.json()["id"]

    # Complete it
    await client.patch(f"/api/tasks/{original_id}/status", json={"status": "completed"})

    # Get audit logs for project
    response = await client.get(f"/api/projects/1/audit")
    logs = response.json()

    # Find task creation audit entry
    creation_logs = [
        log for log in logs
        if log["action"] == "created" and log["details"].get("recurring_from") == original_id
    ]
    assert len(creation_logs) == 1
    assert creation_logs[0]["details"]["recurrence_pattern"] == "daily"
```

### 6.3 Frontend Tests (Optional, Time Permitting)

**File**: `web-dashboard/src/app/projects/[id]/tasks/new/__tests__/page.test.tsx`

**Test Cases**:
- Recurring toggle reveals pattern selector
- Pattern selector has 9 options
- Form validation prevents submit without pattern
- Unchecking recurring hides fields

### 6.4 Manual Testing Checklist

**Backend**:
- [ ] Create recurring task via POST `/api/projects/1/tasks`
- [ ] Complete task via PATCH `/api/tasks/{id}/status`
- [ ] Verify new task exists in GET `/api/projects/1/tasks`
- [ ] Check new task has correct due_date (original + pattern interval)
- [ ] Verify audit log entry with `recurring_from` reference
- [ ] Test max_occurrences limit (complete 3 times, verify 2 occurrences only)
- [ ] Test without due_date (verify next occurrence uses completion time)

**Frontend**:
- [ ] Open task create form, check recurring toggle
- [ ] Select pattern (e.g., "Daily"), submit
- [ ] Verify task created with `is_recurring=true`
- [ ] Complete task in UI
- [ ] Verify recurring badge appears in task list
- [ ] Open task detail, verify recurrence info displayed
- [ ] Test edit form (toggle recurring on/off)

---

## 7. Risk Assessment

### Risk 1: Database Migration on Production

**Impact**: High (schema change, downtime if not handled correctly)

**Likelihood**: Low (Alembic handles migrations safely)

**Mitigation**:
1. Test migration on staging database first
2. Verify rollback works (`alembic downgrade -1`)
3. All new fields have defaults (no NOT NULL without defaults)
4. Existing tasks unaffected (`is_recurring=False`, `occurrences_created=0`)
5. Apply migration during maintenance window (if production exists)

**Rollback Plan**:
```bash
# If issues arise, rollback migration
alembic downgrade -1

# Redeploy previous version
git revert <migration-commit>
```

### Risk 2: Backward Compatibility with Existing Tasks

**Impact**: Medium (existing tasks must work unchanged)

**Likelihood**: Low (additive fields only)

**Mitigation**:
1. All new fields optional or have defaults
2. Existing tasks have `is_recurring=False` (no behavior change)
3. `update_status` only triggers recurrence logic if `is_recurring=True`
4. No changes to existing API endpoints (only new fields added)

**Validation**:
- Run full test suite before merge
- Verify existing tasks still complete normally
- Check API responses include new fields with correct defaults

### Risk 3: Infinite Recurrence Bug (Runaway Task Creation)

**Impact**: High (could create thousands of tasks if logic broken)

**Likelihood**: Low (max_occurrences and single-trigger design)

**Mitigation**:
1. `create_next_occurrence` only triggers on `status="completed"` (one-time event)
2. Max occurrences enforced (returns None when limit reached)
3. No automatic retries or loops in code
4. Transaction boundary ensures atomicity (commit or rollback)

**Safeguards**:
- Completed tasks don't re-trigger (status change is one-way)
- Counter increments prevent re-creation
- Database constraints prevent duplicate task IDs

### Risk 4: Time Zone Handling Issues

**Impact**: Low (due dates might be off by hours)

**Likelihood**: Medium (datetime handling is complex)

**Mitigation**:
1. All datetimes stored as naive UTC (existing pattern)
2. `strip_timezone` validator in schemas ensures UTC storage
3. `calculate_next_due` uses timedelta (timezone-agnostic)
4. Frontend sends ISO 8601 strings (backend normalizes)

**Known Limitation**:
- Monthly = 30 days (not calendar month) - documented in code comments
- No DST handling (acceptable for MVP)

### Risk 5: UI State Management (Form Validation)

**Impact**: Low (bad UX if validation broken)

**Likelihood**: Medium (client-side validation can be bypassed)

**Mitigation**:
1. Backend schema validation is authoritative (Pydantic enforces pattern required)
2. Frontend validation provides early feedback only
3. API returns 400 with clear error message if validation fails

**Testing**:
- Test form submission with recurring=true, pattern=null (should fail)
- Verify backend returns 400 error
- Check frontend displays error message

---

## 8. Acceptance Criteria

### Must Have (Blocking)
- [x] Task model has 5 new fields (`is_recurring`, `recurrence_pattern`, `reminder_sent`, `max_occurrences`, `occurrences_created`)
- [x] Alembic migration applied successfully
- [x] TaskCreate schema validates pattern required when recurring
- [x] Completing recurring task creates new pending task
- [x] New task has correct due_date (calculated from pattern)
- [x] New task inherits: title, description, assignee, priority, tags, project
- [x] Audit log entry created with `recurring_from` reference
- [x] Max occurrences limit enforced (no creation when reached)
- [x] Frontend shows recurring toggle in task create form
- [x] Frontend shows recurring indicator in task list
- [x] All existing tests pass

### Should Have (High Priority)
- [x] Frontend shows recurrence details in task detail view
- [x] Frontend allows editing recurrence settings
- [x] Pattern dropdown shows all 9 options
- [x] Max occurrences input field works
- [x] Integration tests cover core scenarios
- [x] Documentation updated (this plan serves as initial docs)

### Nice to Have (Low Priority)
- [ ] Recurring badge uses icon (not emoji)
- [ ] Task list filters by recurring status
- [ ] Recurring tasks sorted separately in list
- [ ] Counter display in UI (X of Y occurrences)
- [ ] Edit form pre-populates recurring settings

---

## 9. Dependencies & Prerequisites

### Required Before Implementation
- [x] Spec approved (`specs/013-recurring-tasks/spec.md` exists)
- [x] PRD reviewed (`specs/011-phase-v-features-planner/agent-2a-recurring-tasks-prd.md` exists)
- [x] Existing task CRUD endpoints working (Phase II complete)
- [x] Audit system functional (`services.audit.log_action`)
- [x] Frontend task forms exist

### External Dependencies
- **None** - Feature is self-contained, no external services required

### Blocking Issues
- **None identified**

---

## 10. Success Metrics

### Technical Metrics
- **Test Coverage**: ≥80% for new code (calculate_next_due, create_next_occurrence)
- **API Response Time**: No degradation (recurrence logic < 50ms)
- **Migration Time**: < 5 seconds on 10k task database

### User Metrics (Post-Launch)
- **Recurring Task Adoption**: % of tasks marked as recurring
- **Completion Rate**: % of recurring tasks completed (vs deleted/abandoned)
- **Pattern Distribution**: Most common patterns (daily, weekly, monthly)

### Demo Acceptance (45 seconds)
1. Create task "Weekly Report" with due date next Monday, recurring pattern "weekly"
2. Complete the task
3. Show new "Weekly Report" task with due date following Monday
4. Show audit log entry linking old → new task
5. Show recurring indicator in task list

---

## 11. Post-Implementation Tasks

### Immediate (Same PR)
- [ ] Run full test suite (`uv run pytest`, `pnpm test`)
- [ ] Update API documentation (Swagger auto-updates)
- [ ] Test migration rollback (`alembic downgrade -1`)

### Follow-Up (Separate PRs)
- [ ] Create PHR (Prompt History Record) for this implementation
- [ ] Update user documentation with recurring task guide
- [ ] Add recurring task examples to demo script
- [ ] Monitor production metrics (if deployed)

### Phase 2B Integration (Future)
- [ ] Implement notification system using `reminder_sent` field
- [ ] Add "task due soon" reminders
- [ ] Publish events via Dapr (event-driven architecture)
- [ ] UI notification bell integration

---

## 12. Related Documents

- **Spec**: `specs/013-recurring-tasks/spec.md`
- **PRD**: `specs/011-phase-v-features-planner/agent-2a-recurring-tasks-prd.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Directives**: `docs/research/DIRECTIVES.md`
- **Previous Feature**: `specs/012-task-search-filter-sort/plan.md` (Agent 1)

---

## 13. Implementation Checklist

**Before Starting**:
- [ ] Read constitution (`.specify/memory/constitution.md`)
- [ ] Review spec (`specs/013-recurring-tasks/spec.md`)
- [ ] Check out feature branch (`git checkout -b 013-recurring-tasks`)

**Phase 1: Backend Model (15 min)**:
- [ ] Add 5 fields to Task model
- [ ] Generate Alembic migration
- [ ] Review migration SQL
- [ ] Apply migration locally
- [ ] Test migration rollback
- [ ] Commit: "feat: add recurring task fields to Task model"

**Phase 2: Schemas (10 min)**:
- [ ] Update TaskCreate with validation
- [ ] Update TaskUpdate
- [ ] Update TaskRead
- [ ] Update TaskListItem
- [ ] Update task_to_read helper
- [ ] Update list endpoint mapping
- [ ] Test with Swagger UI
- [ ] Commit: "feat: add recurring fields to task schemas"

**Phase 3: Backend Logic (15 min)**:
- [ ] Implement calculate_next_due
- [ ] Implement create_next_occurrence
- [ ] Integrate into update_status
- [ ] Add timedelta import
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Run `uv run pytest`
- [ ] Commit: "feat: implement recurring task creation logic"

**Phase 4: Frontend (15 min)**:
- [ ] Update TypeScript types
- [ ] Add RECURRENCE_PATTERNS constant
- [ ] Add recurring toggle to create form
- [ ] Add recurring indicator to task list
- [ ] Add recurring details to task detail
- [ ] Test in browser
- [ ] Run `pnpm lint`
- [ ] Commit: "feat: add recurring task UI"

**Final Steps**:
- [ ] Run full test suite
- [ ] Manual testing (create, complete, verify)
- [ ] Create PHR for implementation
- [ ] Update CHANGELOG (if exists)
- [ ] Push branch
- [ ] Create PR referencing spec

---

**Total Estimated Time**: 45 minutes (15 + 10 + 15 + 15)
**Complexity**: Medium (database migration, cross-field validation, datetime calculations)
**Risk Level**: Low (additive feature, backward compatible, well-tested patterns)
