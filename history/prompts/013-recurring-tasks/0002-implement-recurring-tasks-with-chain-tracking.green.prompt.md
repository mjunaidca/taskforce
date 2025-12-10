---
id: "0002"
title: "Implement Recurring Tasks with Chain Tracking"
stage: green
date: 2025-12-11
surface: agent
model: claude-opus-4-5
feature: recurring-tasks
branch: main
user: agent
command: "continue implementation"
labels: ["recurring-tasks", "refactoring", "subtask-cloning"]
links:
  spec: "specs/013-recurring-tasks/spec.md"
  ticket: null
  adr: null
  pr: null
files:
  - packages/api/src/taskflow_api/models/task.py
  - packages/api/src/taskflow_api/schemas/task.py
  - packages/api/src/taskflow_api/routers/tasks.py
  - web-dashboard/src/types/index.ts
  - web-dashboard/src/app/projects/[id]/tasks/new/page.tsx
  - web-dashboard/src/app/tasks/[id]/page.tsx
tests:
  - "uv run pytest -x (74 passed)"
  - "pnpm build (success)"
---

# Prompt

Continue implementing the recurring tasks feature. During implementation, the original design was refined:

1. **Bug discovered**: The `occurrences_created` counter on each task would reset to 0 when spawning new tasks, breaking the `max_occurrences` limit check.

2. **User insight**: "If we implement Option 2 (recurring_root_id) then do we even need occurrences_created=0?" - Confirmed that with chain tracking, we can remove the counter entirely and use COUNT query.

3. **Design refinement**:
   - Removed: `occurrences_created` (counter), `reminder_sent` (not used yet)
   - Added: `recurring_root_id` (FK to task.id for chain tracking)
   - Spawn count derived via: `COUNT(*) WHERE recurring_root_id = root_id`

4. **Additional features requested**:
   - `clone_subtasks_on_recur`: When enabled, subtasks are recursively cloned to each new occurrence
   - `recurrence_trigger`: "on_complete" | "on_due_date" | "both" (only on_complete implemented, others marked "Coming Soon")

# Response

## Implementation Summary

### Field Design (Final)

| Field | Type | Description |
|-------|------|-------------|
| `is_recurring` | bool | Enables recurring behavior |
| `recurrence_pattern` | str | Pattern: 1m-monthly |
| `max_occurrences` | int | Spawn limit (NULL = unlimited) |
| `recurring_root_id` | int | FK to root task (NULL = this IS the root) |
| `recurrence_trigger` | str | "on_complete", "on_due_date", "both" |
| `clone_subtasks_on_recur` | bool | Clone subtasks when spawning |

### Key Functions

1. `get_spawn_count(session, root_id)` - COUNT query for spawn limit check
2. `clone_subtasks_recursive(session, source, new_parent, ...)` - Deep clone subtasks
3. `create_next_occurrence(session, completed_task, ...)` - Spawn with chain tracking

### SQLAlchemy Fix

Added explicit `foreign_keys` to parent/subtasks relationships because Task now has TWO self-referential FKs:
```python
parent: "Task" = Relationship(
    back_populates="subtasks",
    sa_relationship_kwargs={
        "remote_side": "Task.id",
        "foreign_keys": "[Task.parent_task_id]",
    },
)
```

### Frontend Updates

- Task creation form: Clone subtasks checkbox, recurrence trigger dropdown with "Coming Soon" badges
- Task detail: Shows clone_subtasks_on_recur and recurrence_trigger values

### Test Results

- Backend: 74 passed, 3 skipped
- Frontend: Build successful

# Outcome

Feature complete with improved design. Chain tracking via `recurring_root_id` is cleaner and more reliable than counter-based tracking. Subtask cloning enables complex recurring workflows (e.g., weekly sprint with standard checklist).
