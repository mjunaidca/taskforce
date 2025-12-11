# Feature Specification: Notifications, Reminders & Dapr Integration

**Feature Branch**: `012-notifications-dapr-triggers`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "Implement notifications system with Dapr integration, cron handlers for on_due_date trigger, reminders, event publishing, and frontend bell"

## Context

This feature completes the recurring tasks implementation started by Agent 2A. Agent 2A built 7 database fields for recurring tasks, but the `recurrence_trigger` field accepts values (`on_due_date`, `both`) that silently fail - they don't trigger any action. This feature fixes that bug and adds a complete notification system.

### Pre-existing Implementation (Agent 2A)

- `on_complete` trigger: Works - spawns next task when current is completed
- `on_due_date` trigger: Silently fails - users can set it but nothing happens
- `both` trigger: Silently fails - same issue

### Critical Bug to Fix

Users can currently set `recurrence_trigger=on_due_date` and the task will never spawn. This is a silent failure that violates user expectations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recurring Task Spawns on Due Date (Priority: P1)

A project manager creates a weekly standup task that should automatically create the next occurrence when the due date passes, even if the current task isn't completed yet.

**Why this priority**: This is the core bug fix - without it, the `on_due_date` and `both` triggers are broken, violating user expectations when they set these values.

**Independent Test**: Can be fully tested by creating a recurring task with `recurrence_trigger=on_due_date`, waiting for the due date to pass, and verifying a new task is automatically created.

**Acceptance Scenarios**:

1. **Given** a recurring task with `recurrence_trigger=on_due_date` and `due_date` set to a time in the past, **When** the cron job runs, **Then** a new task occurrence is created with the next due date calculated from the recurrence pattern.
2. **Given** a recurring task with `recurrence_trigger=both` and `due_date` in the past but status is not completed, **When** the cron job runs, **Then** a new task occurrence is created (triggered by due date, not completion).
3. **Given** a recurring task with `max_occurrences=3` and 3 tasks already spawned, **When** the due date passes, **Then** no new task is created (limit reached).
4. **Given** a recurring task that has already spawned via `on_due_date`, **When** the user later completes the original task, **Then** no duplicate spawn occurs (idempotency).

---

### User Story 2 - Task Assignment Notification (Priority: P2)

A team member is assigned a task by their manager. They immediately receive a notification so they know they have new work.

**Why this priority**: Task assignment is a high-frequency event that directly affects team productivity. Users need timely awareness of new responsibilities.

**Independent Test**: Can be fully tested by assigning a task to a user and verifying a notification appears in their notification list.

**Acceptance Scenarios**:

1. **Given** a task exists in a project, **When** a manager assigns the task to a team member, **Then** the assignee receives a notification titled "Task assigned to you" within 5 seconds.
2. **Given** a task is assigned to a user, **When** the user views the notification bell, **Then** they see an unread count badge.
3. **Given** a user has unread notifications, **When** they click on a notification, **Then** it is marked as read and the unread count decreases.

---

### User Story 3 - Due Date Reminder (Priority: P2)

A worker has a task due tomorrow. They receive a reminder notification so they can prioritize their work accordingly.

**Why this priority**: Reminders prevent missed deadlines - a core productivity feature. Equal priority with assignment as both serve immediate user needs.

**Independent Test**: Can be fully tested by creating a task due within 24 hours and verifying a reminder notification is sent to the assignee.

**Acceptance Scenarios**:

1. **Given** a task with `due_date` within 24 hours and `reminder_sent=False`, **When** the cron job runs, **Then** the assignee receives a "Task due in X hours" notification.
2. **Given** a task already sent a reminder (`reminder_sent=True`), **When** the cron job runs again, **Then** no duplicate reminder is sent.
3. **Given** a completed task with a due date within 24 hours, **When** the cron job runs, **Then** no reminder is sent (completed tasks don't need reminders).

---

### User Story 4 - Notification Bell in UI (Priority: P3)

A user can see all their notifications in a dropdown from the header, with an unread count badge that updates in real-time.

**Why this priority**: The frontend display is the delivery mechanism for all notifications. Without it, notifications exist but aren't visible to users.

**Independent Test**: Can be fully tested by generating notifications for a user and verifying the bell icon displays them with correct unread counts.

**Acceptance Scenarios**:

1. **Given** a user has 3 unread notifications, **When** they view the header, **Then** the bell icon shows a "3" badge.
2. **Given** a user has more than 9 unread notifications, **When** they view the header, **Then** the badge shows "9+".
3. **Given** a user clicks the bell icon, **When** the dropdown opens, **Then** they see their 10 most recent notifications with type icons.
4. **Given** a notification links to a task, **When** the user clicks "View", **Then** they navigate to the task detail page.

---

### User Story 5 - Task Completion Notification (Priority: P3)

When a team member completes a task that was assigned by someone else, the task creator is notified that their requested work is done.

**Why this priority**: Completion notifications close the feedback loop for task creators but are lower priority than assignment/reminder which affect active work.

**Independent Test**: Can be fully tested by having user B complete a task created by user A, and verifying user A receives a notification.

**Acceptance Scenarios**:

1. **Given** user A created a task assigned to user B, **When** user B marks the task as completed, **Then** user A receives a "Task completed" notification.
2. **Given** a user completes their own task (creator and completer are the same), **When** the task is completed, **Then** no notification is sent (avoid self-notifications).

---

### User Story 6 - Recurring Task Spawn Notification (Priority: P3)

When a recurring task automatically spawns its next occurrence, the assignee is notified that new work is ready.

**Why this priority**: This keeps users aware of recurring work being added to their queue, but is lower priority than the spawn logic itself.

**Independent Test**: Can be fully tested by completing a recurring task and verifying the assignee of the new occurrence receives a notification.

**Acceptance Scenarios**:

1. **Given** a recurring task is completed (on_complete trigger), **When** the next occurrence is created, **Then** the assignee receives a "Recurring task created" notification.
2. **Given** a recurring task's due date passes (on_due_date trigger), **When** the next occurrence is created by cron, **Then** the assignee receives a "Recurring task created" notification.

---

### Edge Cases

- What happens when the notification service is unavailable?
  - The API continues to function; event publishing is non-blocking with graceful failure logging.
- How does the system handle time zones?
  - All times are stored and compared in UTC. Frontend displays in user's local timezone (separate concern).
- What happens if a task is assigned to a user without a user_id (e.g., placeholder worker)?
  - No notification is sent; the event is skipped with a warning log.
- What if due_date is null for a task with on_due_date trigger?
  - The task is skipped by the cron query (due_date IS NOT NULL filter).
- What if the cron job fails mid-execution?
  - Each task is processed independently; failures don't block other tasks. Failed tasks are logged and retried on next cron run.

## Requirements *(mandatory)*

### Functional Requirements

**Cron & Triggers**
- **FR-001**: System MUST spawn next recurring task occurrence when `recurrence_trigger` is `on_due_date` or `both` and the `due_date` has passed. Spawn operation (new task creation + has_spawned_next=True update) MUST execute within a single database transaction to prevent duplicate spawns on failure.
- **FR-002**: System MUST NOT spawn duplicate tasks - once `has_spawned_next=True`, no further spawns occur for that task.
- **FR-003**: System MUST respect `max_occurrences` limit before spawning new tasks.
- **FR-004**: System MUST run cron job at least every 1 minute to support 1-minute recurrence patterns.
- **FR-005**: System MUST calculate next due date using the task's `recurrence_pattern` from the original due date (not current time).

**Reminders**
- **FR-006**: System MUST send reminder notifications for tasks due within 24 hours.
- **FR-007**: System MUST mark `reminder_sent=True` after sending to prevent duplicate reminders.
- **FR-008**: System MUST NOT send reminders for completed, cancelled, or unassigned tasks.

**Notifications**
- **FR-009**: System MUST store notifications with: user_id, type, title, body, task_id, project_id, read status, timestamp.
- **FR-010**: System MUST provide an API to list notifications filtered by user_id.
- **FR-011**: System MUST provide an API to get unread notification count for a user.
- **FR-012**: System MUST provide an API to mark a notification as read.

**Events**
- **FR-013**: System MUST publish `task.assigned` event when a task is assigned to a user.
- **FR-014**: System MUST publish `task.completed` event to task creator when someone else completes their task.
- **FR-015**: System MUST publish `task.spawned` event when a recurring task creates its next occurrence.
- **FR-016**: System MUST publish `task.reminder` event when a due date reminder is triggered.

**Frontend**
- **FR-017**: Frontend MUST display a notification bell icon in the header.
- **FR-018**: Frontend MUST display unread notification count as a badge on the bell icon.
- **FR-019**: Frontend MUST display notification list in a dropdown when bell is clicked.
- **FR-020**: Frontend MUST poll for new notifications at a reasonable interval (30 seconds).

**Resilience**
- **FR-021**: API MUST continue functioning if notification service or event bus is unavailable (non-blocking operations).
- **FR-022**: Failed event publishes MUST be logged but not throw exceptions.

### Key Entities

- **Notification**: Represents a notification to a user. Contains: id, user_id, type, title, body, task_id (optional), project_id (optional), read (boolean), created_at.
- **Task (extended)**: Existing Task entity gains `reminder_sent` field to track reminder state.

### Constraints

**Atomicity**:
- Recurring task spawn (new task creation + has_spawned_next=True) MUST execute in a single database transaction (enforced by FR-001)
- Reminder flag update (reminder_sent=True) MUST be atomic with notification creation

**Concurrency Control**:
- Cron job MUST use row-level locking (`SELECT FOR UPDATE SKIP LOCKED`) when querying tasks to prevent race conditions
- Cron execution MUST complete within 60 seconds OR use distributed locking to prevent overlapping runs
- If cron job takes >60 seconds, next scheduled run MUST wait until current execution completes

**Data Retention**:
- Notifications older than 90 days are automatically deleted (configurable via NOTIFICATION_RETENTION_DAYS environment variable)

**Notification Architecture (Direct Creation - Option A)**:
- API creates notification rows directly in the main database (same PostgreSQL instance, separate table)
- Dapr events (`task.assigned`, `task.completed`, `task.spawned`, `task.reminder`) are published as an observability/audit trail, NOT the critical path for notification creation
- This ensures SC-005 is achievable: notifications are created even if Dapr/event bus is unavailable
- Notification API endpoints (list, unread count, mark read) are part of the main FastAPI application
- No separate notification service deployment required for MVP

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `on_due_date` and `both` recurrence triggers function correctly - 100% of recurring tasks spawn their next occurrence when due date passes.
- **SC-002**: Reminder notifications are sent within 5 minutes of a task entering the 24-hour-before-due window.
- **SC-003**: Assignment notifications are delivered within 5 seconds of task assignment.
- **SC-004**: Notification bell updates within 30 seconds of new notifications being created.
- **SC-005**: System remains fully operational (task CRUD, assignment, completion) when notification service is unavailable.
- **SC-006**: Users can view, click, and mark notifications as read with < 1 second response time.
- **SC-007**: No duplicate notifications are created for the same event (idempotency).

## Assumptions

1. **Dapr for local development**: For local development without Kubernetes, events will be logged rather than published. A `dapr_enabled` config flag controls this.
2. **Direct notification creation**: Notifications are created directly by the main API (not via event-driven pattern). This simplifies architecture and ensures SC-005 (operational without event bus). A separate notification service is NOT required for MVP.
3. **Notification database**: Notifications are stored in the same PostgreSQL instance as the main API (separate table: `notification`).
4. **Authentication**: Notification API uses the same SSO/JWT authentication as the main API.
5. **Polling vs WebSocket**: Initial implementation uses polling (30s interval). WebSocket real-time updates are a future enhancement.
6. **Monthly recurrence**: "monthly" pattern means 30 days, not calendar month (consistent with Agent 2A implementation).
7. **Reminder window**: 24 hours is the default reminder window; making it configurable is a future enhancement.

## Non-Goals

- Real-time WebSocket notifications (polling is sufficient for MVP)
- Email/SMS notifications (in-app only for this phase)
- Notification preferences/settings per user
- Notification grouping/batching
- Mobile push notifications
- Custom reminder times per task
- Audit trail for notification delivery (separate from task audit)
