# PRD: Agent 2A - Recurring Tasks

**Phase**: V (Advanced Cloud Deployment)  
**Owner**: Agent 2A  
**Estimated Time**: 45 minutes  
**Priority**: HIGH (Hackathon requirement)  
**Dependency**: Agent 1 completed (search/filter/sort)

---

## Executive Summary

Agent 2A implements **Recurring Tasks** - tasks that auto-create their next occurrence when completed. This is a core hackathon requirement that works independently of the notification system.

### Success Criteria

- [ ] Task model has `is_recurring`, `recurrence_pattern`, `reminder_sent` fields
- [ ] Migration applied successfully
- [ ] Task create/edit forms show "Make recurring" option
- [ ] Completing a recurring task creates next occurrence automatically
- [ ] Recurrence patterns supported: minutes (5, 10, 15, 30, 60), daily, weekly, monthly
- [ ] Demo: Complete recurring task → next one appears

---

## 1. What We're Building

### User Flow

```
1. User creates task "Daily standup"
   - Sets due_date: Tomorrow 9am
   - Toggles: ☑ Make recurring
   - Selects: Pattern = "daily"
   
2. User completes the task
   
3. System automatically:
   - Marks original as completed
   - Creates NEW task "Daily standup" 
   - New task due_date = original + 1 day
   - New task inherits: assignee, project, tags, priority
   
4. User sees new task in their list
```

### No Notifications Yet

This phase does NOT include:
- ❌ Reminder notifications ("task due soon")
- ❌ Event publishing via Dapr
- ❌ Notification bell UI

Those are handled in **Phase 2B**.

---

## 2. Data Model

### Task Model Additions

**File**: `packages/api/src/taskflow_api/models/task.py`

```python
# Add after existing due_date field:

is_recurring: bool = Field(
    default=False,
    description="Whether this task repeats when completed",
)

recurrence_pattern: str | None = Field(
    default=None,
    description="Pattern: '5m', '10m', '15m', '30m', '1h', 'daily', 'weekly', 'monthly'",
)

reminder_sent: bool = Field(
    default=False,
    description="Whether reminder was sent for current due date (used by 2B)",
)
```

### Recurrence Patterns

| Pattern | Display | Calculation |
|---------|---------|-------------|
| `5m` | Every 5 minutes | +5 minutes |
| `10m` | Every 10 minutes | +10 minutes |
| `15m` | Every 15 minutes | +15 minutes |
| `30m` | Every 30 minutes | +30 minutes |
| `1h` | Every hour | +1 hour |
| `daily` | Daily | +1 day |
| `weekly` | Weekly | +7 days |
| `monthly` | Monthly | +30 days |

---

## 3. Schema Updates

### TaskCreate Schema

**File**: `packages/api/src/taskflow_api/schemas/task.py`

```python
class TaskCreate(BaseModel):
    # ... existing fields ...
    
    # ADD:
    is_recurring: bool = False
    recurrence_pattern: Literal["5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"] | None = None
    
    @model_validator(mode="after")
    def validate_recurring(self) -> "TaskCreate":
        """Ensure recurrence_pattern is set if is_recurring is True."""
        if self.is_recurring and not self.recurrence_pattern:
            raise ValueError("recurrence_pattern required when is_recurring is True")
        if not self.is_recurring and self.recurrence_pattern:
            # Auto-enable recurring if pattern provided
            self.is_recurring = True
        return self
```

### TaskUpdate Schema

```python
class TaskUpdate(BaseModel):
    # ... existing fields ...
    
    # ADD:
    is_recurring: bool | None = None
    recurrence_pattern: Literal["5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"] | None = None
```

### TaskRead & TaskListItem Schemas

```python
class TaskRead(BaseModel):
    # ... existing fields ...
    
    # ADD:
    is_recurring: bool
    recurrence_pattern: str | None

class TaskListItem(BaseModel):
    # ... existing fields ...
    
    # ADD:
    is_recurring: bool
```

---

## 4. Recurring Task Logic

### When Task is Completed

**File**: `packages/api/src/taskflow_api/routers/tasks.py`

Modify the `update_status` endpoint:

```python
@router.patch("/api/tasks/{task_id}/status", response_model=TaskRead)
async def update_status(
    task_id: int,
    data: StatusUpdate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> TaskRead:
    # ... existing validation code ...
    
    # Set timestamps based on status
    if data.status == "in_progress" and not task.started_at:
        task.started_at = datetime.utcnow()
    elif data.status == "completed":
        task.completed_at = datetime.utcnow()
        task.progress_percent = 100
        
        # NEW: Handle recurring task
        if task.is_recurring and task.recurrence_pattern:
            await create_next_occurrence(session, task, worker_id, worker_type)
    
    # ... rest of existing code ...


async def create_next_occurrence(
    session: AsyncSession, 
    completed_task: Task,
    creator_id: int,
    creator_type: str,
) -> Task:
    """Create next occurrence of a recurring task."""
    
    # Calculate next due date
    next_due = calculate_next_due(
        completed_task.recurrence_pattern,
        completed_task.due_date or datetime.utcnow()
    )
    
    # Create new task
    new_task = Task(
        title=completed_task.title,
        description=completed_task.description,
        project_id=completed_task.project_id,
        assignee_id=completed_task.assignee_id,
        created_by_id=creator_id,
        priority=completed_task.priority,
        tags=completed_task.tags.copy() if completed_task.tags else [],
        due_date=next_due,
        is_recurring=True,
        recurrence_pattern=completed_task.recurrence_pattern,
        reminder_sent=False,  # Reset for new occurrence
        status="pending",
        progress_percent=0,
    )
    
    session.add(new_task)
    await session.flush()
    
    # Audit log
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
        },
    )
    
    return new_task


def calculate_next_due(pattern: str, from_time: datetime) -> datetime:
    """Calculate next due date based on recurrence pattern."""
    if pattern == "5m":
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
        return from_time + timedelta(days=30)
    else:
        # Default to daily if unknown
        return from_time + timedelta(days=1)
```

---

## 5. Frontend Updates

### TypeScript Types

**File**: `web-dashboard/src/types/index.ts`

```typescript
// Update TaskRead
export interface TaskRead {
  // ... existing fields ...
  is_recurring: boolean;
  recurrence_pattern: string | null;
}

// Update TaskListItem
export interface TaskListItem {
  // ... existing fields ...
  is_recurring: boolean;
}

// Update TaskCreate
export interface TaskCreate {
  // ... existing fields ...
  is_recurring?: boolean;
  recurrence_pattern?: "5m" | "10m" | "15m" | "30m" | "1h" | "daily" | "weekly" | "monthly";
}

// Update TaskUpdate
export interface TaskUpdate {
  // ... existing fields ...
  is_recurring?: boolean;
  recurrence_pattern?: "5m" | "10m" | "15m" | "30m" | "1h" | "daily" | "weekly" | "monthly";
}

// Recurrence pattern options for UI
export const RECURRENCE_PATTERNS = [
  { value: "5m", label: "Every 5 minutes" },
  { value: "10m", label: "Every 10 minutes" },
  { value: "15m", label: "Every 15 minutes" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every hour" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;
```

### Task Form Updates

**File**: `web-dashboard/src/app/projects/[projectId]/tasks/new/page.tsx` (or wherever task form is)

Add recurring toggle and pattern selector:

```tsx
import { RECURRENCE_PATTERNS } from "@/types";

// In form state:
const [isRecurring, setIsRecurring] = useState(false);
const [recurrencePattern, setRecurrencePattern] = useState<string>("");

// In form JSX:
<div className="space-y-4">
  {/* Existing fields... */}
  
  {/* Recurring Task Section */}
  <div className="flex items-center space-x-2">
    <Checkbox
      id="is-recurring"
      checked={isRecurring}
      onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
    />
    <Label htmlFor="is-recurring">Make this a recurring task</Label>
  </div>
  
  {isRecurring && (
    <div className="ml-6">
      <Label>Repeat</Label>
      <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
        <SelectTrigger className="w-[200px]">
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
  )}
</div>

// In form submission:
const taskData: TaskCreate = {
  // ... existing fields ...
  is_recurring: isRecurring,
  recurrence_pattern: isRecurring ? recurrencePattern : undefined,
};
```

### Task List Indicator

**File**: `web-dashboard/src/app/tasks/page.tsx`

Add recurring indicator to task list:

```tsx
// In table row, after title:
<TableCell>
  <div className="flex items-center gap-2">
    <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary">
      {task.title}
    </Link>
    {task.is_recurring && (
      <Badge variant="outline" className="text-xs">
        🔄 Recurring
      </Badge>
    )}
  </div>
</TableCell>
```

---

## 6. Implementation Checklist

### Phase 1: Backend Model (15 min)

- [ ] **6.1** Add 3 fields to Task model in `models/task.py`
- [ ] **6.2** Update TaskCreate schema with validation
- [ ] **6.3** Update TaskUpdate schema
- [ ] **6.4** Update TaskRead and TaskListItem schemas
- [ ] **6.5** Create Alembic migration
- [ ] **6.6** Apply migration

### Phase 2: Backend Logic (15 min)

- [ ] **6.7** Add `calculate_next_due()` function in `routers/tasks.py`
- [ ] **6.8** Add `create_next_occurrence()` function
- [ ] **6.9** Modify `update_status()` to call create_next_occurrence when completing recurring task
- [ ] **6.10** Add audit log for auto-created tasks

### Phase 3: Frontend (15 min)

- [ ] **6.11** Update TypeScript types in `types/index.ts`
- [ ] **6.12** Add RECURRENCE_PATTERNS constant
- [ ] **6.13** Add recurring toggle to task create form
- [ ] **6.14** Add recurring toggle to task edit form
- [ ] **6.15** Add recurring indicator to task list
- [ ] **6.16** Add recurring badge to task detail view

---

## 7. Testing

### Manual Tests

```bash
# 1. Create recurring task
curl -X POST "http://localhost:8000/api/projects/1/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily standup",
    "is_recurring": true,
    "recurrence_pattern": "daily",
    "due_date": "2025-12-11T09:00:00"
  }'

# 2. Complete the task
curl -X PATCH "http://localhost:8000/api/tasks/1/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# 3. Verify new task created
curl "http://localhost:8000/api/projects/1/tasks"
# Should show TWO tasks:
# - Original (completed)
# - New one (pending, due_date = original + 1 day)
```

### Automated Test

```python
# packages/api/src/taskflow_api/tests/test_recurring.py

async def test_completing_recurring_task_creates_next_occurrence(client, session):
    """When a recurring task is completed, a new occurrence is created."""
    # Create recurring task
    response = await client.post("/api/projects/1/tasks", json={
        "title": "Daily standup",
        "is_recurring": True,
        "recurrence_pattern": "daily",
        "due_date": "2025-12-11T09:00:00",
    })
    task_id = response.json()["id"]
    
    # Complete it
    await client.patch(f"/api/tasks/{task_id}/status", json={"status": "completed"})
    
    # Check new task exists
    tasks = await client.get("/api/projects/1/tasks")
    task_list = tasks.json()
    
    pending_tasks = [t for t in task_list if t["status"] == "pending"]
    assert len(pending_tasks) == 1
    assert pending_tasks[0]["title"] == "Daily standup"
    assert pending_tasks[0]["is_recurring"] == True
```

---

## 8. Files Summary

| File | Action | Changes |
|------|--------|---------|
| `packages/api/src/taskflow_api/models/task.py` | MODIFY | Add 3 fields |
| `packages/api/src/taskflow_api/schemas/task.py` | MODIFY | Add to Create/Update/Read schemas |
| `packages/api/src/taskflow_api/routers/tasks.py` | MODIFY | Add recurring logic to update_status |
| `web-dashboard/src/types/index.ts` | MODIFY | Add recurring types |
| `web-dashboard/src/app/projects/[projectId]/tasks/new/page.tsx` | MODIFY | Add recurring UI |
| `web-dashboard/src/app/tasks/page.tsx` | MODIFY | Add recurring indicator |

---

## 9. Definition of Done

- [ ] 3 new fields on Task model
- [ ] Migration applied successfully
- [ ] Schema validation works (pattern required if recurring)
- [ ] Completing recurring task creates new occurrence
- [ ] New task has correct due_date (calculated from pattern)
- [ ] New task inherits: title, description, assignee, priority, tags
- [ ] Frontend shows recurring toggle in forms
- [ ] Frontend shows recurring indicator in lists
- [ ] All existing tests pass
- [ ] Demo: Create recurring → Complete → New one appears

---

## 10. What's Next (Phase 2B)

After 2A is complete, **Phase 2B** will add:
- Event publishing via Dapr
- Notification service
- Reminder notifications ("task due soon")
- Notification bell in UI

The `reminder_sent` field added in 2A will be used by 2B.

