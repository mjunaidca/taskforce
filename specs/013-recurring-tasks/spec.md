# Feature Specification: Recurring Tasks

**Feature Branch**: `013-recurring-tasks`
**Created**: 2025-12-10
**Status**: Implemented
**Input**: User description: "Implement Recurring Tasks - tasks that auto-create their next occurrence when completed. Support minute-level recurrence (1m, 5m, etc.), daily, weekly, monthly patterns. Include max occurrences limit."

## Overview

Recurring tasks are tasks that automatically create their next occurrence when completed. This enables users to set up repeating work items (daily standups, weekly reports, monthly reviews) without manual recreation. The system supports both time-based patterns (minutes, hours) for high-frequency tasks and calendar-based patterns (daily, weekly, monthly) for standard business workflows.

### Assumptions

1. **Recurrence triggers on completion**: Next occurrence is created only when the current task is marked "completed" (default trigger, "on_due_date" and "both" triggers coming in Phase 2B)
2. **Due date calculation**: Next due date is calculated from the original task's due date (if set) or from completion timestamp (if no due date)
3. **Infinite recurrence by default**: Unless max_occurrences is specified, tasks recur indefinitely
4. **Inheritance**: New occurrences inherit title, description, priority, tags, assignee, and project from completed task
5. **Independent tasks**: Each occurrence is an independent task (not subtasks of a parent)
6. **Chain tracking**: All spawned tasks link back to the root task via `recurring_root_id`; spawn counts derived from COUNT query (no stored counter)
7. **Subtask cloning**: Optional - when `clone_subtasks_on_recur=true`, subtasks are recursively cloned to each new occurrence

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Recurring Task Creates Next Occurrence (Priority: P1)

A user completes a recurring task and the system automatically creates the next occurrence with the correct due date.

**Why this priority**: This is the core functionality - without automatic task creation, the feature has no value.

**Independent Test**: Create a task marked as recurring with "daily" pattern, complete it, verify a new pending task appears with due date +1 day from original.

**Acceptance Scenarios**:

1. **Given** a recurring task with pattern "daily" and due date "Dec 11, 9am", **When** user marks it completed, **Then** a new task is created with status "pending" and due date "Dec 12, 9am"
2. **Given** a recurring task with pattern "weekly" and no due date, **When** user marks it completed, **Then** a new task is created with due date = completion time + 7 days
3. **Given** a recurring task with pattern "5m" and due date "10:00am", **When** user marks it completed at 10:03am, **Then** a new task is created with due date "10:05am" (based on original due, not completion time)

---

### User Story 2 - Create Recurring Task via Form (Priority: P1)

A user creates a new task and marks it as recurring with a selected pattern.

**Why this priority**: Users must be able to create recurring tasks through the UI - essential for feature usability.

**Independent Test**: Open task creation form, toggle "Make recurring", select "daily" pattern, save task, verify task is created with is_recurring=true and recurrence_pattern="daily".

**Acceptance Scenarios**:

1. **Given** user is on task creation form, **When** user toggles "Make recurring" and selects "daily" pattern, **Then** task is created with is_recurring=true and recurrence_pattern="daily"
2. **Given** user toggles "Make recurring" ON, **When** user does not select a pattern and tries to save, **Then** validation error "Recurrence pattern required when recurring is enabled"
3. **Given** user selects pattern "weekly" but leaves recurring toggle OFF, **When** user saves, **Then** is_recurring is auto-enabled to true

---

### User Story 3 - View Recurring Task Indicator (Priority: P2)

Users can identify which tasks are recurring from task lists and detail views.

**Why this priority**: Visual feedback helps users understand task behavior but isn't blocking for core functionality.

**Independent Test**: Create a recurring task, navigate to task list, verify recurring indicator (badge/icon) appears next to task title.

**Acceptance Scenarios**:

1. **Given** a task list containing recurring and non-recurring tasks, **When** user views the list, **Then** recurring tasks display a visual indicator (badge "Recurring" or repeat icon)
2. **Given** user opens a recurring task detail view, **When** viewing task details, **Then** recurrence pattern is displayed (e.g., "Repeats: Daily")

---

### User Story 4 - Edit Task Recurrence Settings (Priority: P2)

Users can modify recurrence settings on existing tasks.

**Why this priority**: Allows users to adjust frequency without recreating tasks, but initial setup (P1) is more critical.

**Independent Test**: Open existing non-recurring task, enable recurring with "weekly" pattern, save, verify task now has is_recurring=true.

**Acceptance Scenarios**:

1. **Given** a non-recurring task, **When** user enables recurring and selects "monthly" pattern, **Then** task is updated with is_recurring=true and recurrence_pattern="monthly"
2. **Given** a recurring task with "daily" pattern, **When** user disables recurring, **Then** task is updated with is_recurring=false (pattern retained for potential re-enable)

---

### User Story 5 - Max Occurrences Limit (Priority: P3)

Users can limit how many times a recurring task repeats.

**Why this priority**: Advanced feature for specific use cases (e.g., "remind me weekly for 4 weeks"), not essential for MVP.

**Independent Test**: Create recurring task with max_occurrences=3, complete it 3 times, verify 4th completion does NOT create new task.

**Acceptance Scenarios**:

1. **Given** a recurring task with max_occurrences=2 and occurrences_created=1, **When** user completes the task, **Then** new task is created and occurrences_created becomes 2
2. **Given** a recurring task with max_occurrences=2 and occurrences_created=2, **When** user completes the task, **Then** NO new task is created (limit reached)
3. **Given** a recurring task with max_occurrences=null (unlimited), **When** user completes the task, **Then** new task is always created

---

### Edge Cases

- **What happens when** recurring task has no due_date? → Next occurrence due date = completion timestamp + pattern interval
- **What happens when** recurring task is deleted? → No new occurrence created (deletion is not completion)
- **What happens when** task status changes to "completed" via approve workflow (from "review")? → Still triggers recurrence creation
- **What happens when** completed task is reopened (status changed back from "completed")? → New occurrence already created; no reversal (audit log shows creation)
- **What happens when** max_occurrences is set to 0? → Task never recurs (effectively disabled)
- **What happens when** same task is completed twice rapidly? → First completion creates occurrence; second completion is on new task (race condition handled by transaction)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add fields to Task: `is_recurring` (boolean), `recurrence_pattern` (string), `max_occurrences` (integer, nullable), `recurring_root_id` (FK to task.id, nullable), `recurrence_trigger` (string, default "on_complete"), `clone_subtasks_on_recur` (boolean, default false)
- **FR-002**: System MUST support recurrence patterns: "1m", "5m", "10m", "15m", "30m", "1h", "daily", "weekly", "monthly"
- **FR-003**: System MUST validate that recurrence_pattern is required when is_recurring is true
- **FR-004**: System MUST automatically create next task occurrence when a recurring task status changes to "completed" (when recurrence_trigger="on_complete")
- **FR-005**: System MUST calculate next due date based on recurrence pattern and original due date (or completion time if no due date)
- **FR-006**: System MUST inherit title, description, priority, tags, assignee_id, project_id, and recurring settings to new occurrence
- **FR-007**: System MUST reset status to "pending" and progress_percent to 0 on new occurrence
- **FR-008**: System MUST create audit log entry for auto-created tasks with reference to source task and root task
- **FR-009**: System MUST NOT create new occurrence when max_occurrences is set and COUNT(tasks WHERE recurring_root_id = root_id) >= max_occurrences
- **FR-010**: System MUST set recurring_root_id on spawned tasks to point to the original root task
- **FR-011**: Frontend MUST display recurring toggle, pattern selector, clone subtasks checkbox, and recurrence trigger dropdown in task create forms
- **FR-012**: Frontend MUST display recurring indicator (badge/icon) in task lists and detail views
- **FR-013**: API schemas (TaskCreate, TaskUpdate, TaskRead, TaskListItem) MUST include recurring-related fields
- **FR-014**: System MUST recursively clone subtasks when clone_subtasks_on_recur=true, creating audit entries for each
- **FR-015**: Frontend MUST display "Coming Soon" badge for recurrence_trigger options "on_due_date" and "both"

### Key Entities

- **Task** (extended): Core entity with new recurring attributes
  - `is_recurring`: Whether task repeats when completed
  - `recurrence_pattern`: Interval pattern (e.g., "daily", "5m")
  - `max_occurrences`: Optional limit on total recurrences (null = unlimited)
  - `recurring_root_id`: FK to original root task (null = this IS the root)
  - `recurrence_trigger`: When to spawn next: "on_complete" (implemented), "on_due_date" (Phase 2B), "both" (Phase 2B)
  - `clone_subtasks_on_recur`: Whether to recursively clone subtasks to each occurrence

- **Recurrence Pattern**: Value object defining supported intervals
  - Minute patterns: 1m, 5m, 10m, 15m, 30m
  - Hour pattern: 1h
  - Calendar patterns: daily, weekly, monthly

- **Spawn Count**: Computed value (not stored)
  - Derived via: `COUNT(*) FROM task WHERE recurring_root_id = :root_id`

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a recurring task and see the next occurrence appear within 2 seconds of completing the original
- **SC-002**: 100% of recurring task completions create exactly one new occurrence (no duplicates, no missed occurrences)
- **SC-003**: Recurring task indicator is visible in task list without requiring user interaction (hover, click)
- **SC-004**: New occurrences have correct due dates calculated per pattern (verified by automated tests)
- **SC-005**: All recurring task operations create audit log entries with traceable lineage (original task → spawned tasks)
- **SC-006**: Max occurrences limit correctly prevents further task creation when reached (100% accuracy)

### Demo Acceptance

**Demo Flow** (45 second demo):
1. Create task "Weekly Standup" with due date tomorrow, enable recurring with "weekly" pattern
2. Complete the task
3. Show new "Weekly Standup" task appears with due date = original + 7 days
4. Show audit log entry recording auto-creation

---

## Constraints & Non-Goals

### Constraints

- Must work with existing Task model (additive fields only)
- Must maintain backward compatibility (existing non-recurring tasks unaffected)
- Must work with existing status transition workflow (pending → in_progress → review → completed)

### Non-Goals (Explicitly Out of Scope)

- **Notification/reminders**: Phase 2B will handle "task due soon" notifications using reminder_sent field
- **Custom recurrence patterns**: No "every 3rd Tuesday" or complex cron expressions
- **Recurrence editing after creation**: Pattern is set at creation, can be modified but no "edit this occurrence only" feature
- **Batch completion**: No "complete all occurrences" action
- **Recurrence visualization**: No calendar view showing future occurrences
- **Time-zone handling**: All dates stored as naive UTC (existing behavior)
