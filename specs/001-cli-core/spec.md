# Feature Specification: TaskFlow CLI Core

**Feature Branch**: `001-cli-core`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "TaskFlow CLI Core Product - Complete command-line interface with Typer for human-agent task management platform"

---

## Executive Summary

TaskFlow CLI is a command-line interface that proves **human-agent parity**: humans and AI agents can be managed through the same interface. The CLI enables project initialization, worker registration (both human and agent), task lifecycle management, and comprehensive audit trails.

**Core Innovation**: `taskflow worker add @claude-code --type agent` works identically to `taskflow worker add @sarah --type human`. Both are first-class citizens.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize Project and Register Workers (Priority: P1)

A team lead wants to set up TaskFlow for their project and register both human team members and AI agents as workers who can be assigned tasks.

**Why this priority**: Foundation - nothing else works without project initialization and worker registration. This proves the human-agent parity concept.

**Independent Test**: Can be fully tested by running `taskflow init`, `taskflow project add`, and `taskflow worker add` commands and verifying workers appear in `taskflow worker list`.

**Acceptance Scenarios**:

1. **Given** no `.taskflow/` directory exists, **When** user runs `taskflow init`, **Then** a `.taskflow/` directory is created with `config.json` and `data.json` files
2. **Given** TaskFlow is initialized, **When** user runs `taskflow project add taskflow --name "TaskFlow Platform"`, **Then** the project is created and appears in `taskflow project list`
3. **Given** a project exists, **When** user runs `taskflow worker add @sarah --type human`, **Then** a human worker is registered
4. **Given** a project exists, **When** user runs `taskflow worker add @claude-code --type agent --capabilities coding,architecture`, **Then** an agent worker is registered with capabilities
5. **Given** workers exist, **When** user runs `taskflow worker list`, **Then** all workers (human and agent) appear in a unified list with type indicators

---

### User Story 2 - Create and Manage Tasks (Priority: P1)

A user wants to create tasks with titles, descriptions, priorities, and tags, then view, update, and delete them.

**Why this priority**: Core CRUD operations - the essential todo functionality that all other features build upon.

**Independent Test**: Can be fully tested by creating tasks with various options, listing them, viewing details, updating, and deleting.

**Acceptance Scenarios**:

1. **Given** a project exists, **When** user runs `taskflow add "Implement auth" --assign @claude-code --priority high --tags api,security`, **Then** a task is created with ID, assigned to the agent, with priority and tags
2. **Given** tasks exist, **When** user runs `taskflow list`, **Then** all tasks are displayed with ID, title, status, assignee, and priority
3. **Given** tasks exist, **When** user runs `taskflow list --status pending --assignee @claude-code`, **Then** only matching tasks are displayed
4. **Given** a task exists, **When** user runs `taskflow show 1`, **Then** full task details are displayed including subtasks and audit history
5. **Given** a task exists, **When** user runs `taskflow edit 1 --title "New title" --priority low`, **Then** the task is updated and changes are audited
6. **Given** a task exists, **When** user runs `taskflow delete 1`, **Then** the task is removed (with confirmation prompt)

---

### User Story 3 - Execute Task Workflow (Priority: P1)

A worker (human or agent) wants to start working on a task, report progress, and complete it through a defined workflow with optional review/approval gates.

**Why this priority**: The "magic loop" - proves the platform can track work execution and handoffs between humans and agents.

**Independent Test**: Can be fully tested by walking a single task through start -> progress -> complete -> (optional) review -> approve flow.

**Acceptance Scenarios**:

1. **Given** a pending task assigned to a worker, **When** worker runs `taskflow start 1`, **Then** task status changes to "in_progress" and an audit entry is created
2. **Given** an in-progress task, **When** worker runs `taskflow progress 1 --percent 50 --note "Halfway done"`, **Then** progress is updated and audited
3. **Given** an in-progress task, **When** worker runs `taskflow complete 1`, **Then** task status changes to "completed" and audited
4. **Given** an in-progress task, **When** worker runs `taskflow review 1`, **Then** task status changes to "review" (awaiting human approval)
5. **Given** a task in review status, **When** reviewer runs `taskflow approve 1`, **Then** task status changes to "completed"
6. **Given** a task in review status, **When** reviewer runs `taskflow reject 1 --reason "Needs more tests"`, **Then** task status changes to "in_progress" with rejection reason

---

### User Story 4 - Create and Manage Subtasks (Priority: P2)

An agent or human wants to decompose a large task into smaller subtasks, which can be tracked independently but roll up to the parent.

**Why this priority**: Enables recursive task decomposition - agents can autonomously break down work.

**Independent Test**: Can be fully tested by creating a parent task, adding subtasks, and verifying progress rollup.

**Acceptance Scenarios**:

1. **Given** a task exists, **When** user runs `taskflow add "Research OAuth" --parent 1`, **Then** a subtask is created linked to parent
2. **Given** a parent task with subtasks, **When** user runs `taskflow show 1`, **Then** subtasks are displayed in hierarchy
3. **Given** subtasks complete, **When** all subtasks are marked complete, **Then** parent task progress reflects aggregate completion
4. **Given** an in-progress task, **When** agent calls subtask creation via CLI, **Then** subtasks are created with same audit trail as human-created subtasks

---

### User Story 5 - View Audit Trail (Priority: P2)

A project manager wants to see the complete history of who did what, when, and why for any task or across the project.

**Why this priority**: Proves accountability - the audit trail is evidence that humans and agents collaborate with full transparency.

**Independent Test**: Can be fully tested by performing various actions on tasks and viewing the audit log.

**Acceptance Scenarios**:

1. **Given** actions have been performed on a task, **When** user runs `taskflow audit 1`, **Then** full chronological history is displayed showing actor, action, timestamp, and details
2. **Given** actions have been performed, **When** user runs `taskflow audit --project taskflow`, **Then** all audited actions for the project are displayed
3. **Given** an agent completes work, **When** viewing audit, **Then** agent actions are displayed identically to human actions (actor type indicator only difference)

---

### User Story 6 - Search, Filter, and Sort Tasks (Priority: P2)

A user wants to find tasks quickly by searching keywords, filtering by various criteria, and sorting the results.

**Why this priority**: Organization and usability - makes the CLI practical for real project management.

**Independent Test**: Can be fully tested by creating diverse tasks and using search/filter/sort options.

**Acceptance Scenarios**:

1. **Given** multiple tasks exist, **When** user runs `taskflow list --search "auth"`, **Then** only tasks containing "auth" in title or description are shown
2. **Given** tasks with different priorities, **When** user runs `taskflow list --sort priority`, **Then** tasks are ordered by priority (urgent -> high -> medium -> low)
3. **Given** tasks with due dates, **When** user runs `taskflow list --sort due_date`, **Then** tasks are ordered by due date (soonest first)
4. **Given** tasks with tags, **When** user runs `taskflow list --tag api`, **Then** only tasks with "api" tag are shown

---

### User Story 7 - Due Dates and Task Scheduling (Priority: P3)

A user wants to set due dates on tasks and optionally configure recurring tasks that auto-reschedule.

**Why this priority**: Advanced scheduling features - important but not essential for MVP.

**Independent Test**: Can be fully tested by creating tasks with due dates and recurring schedules.

**Acceptance Scenarios**:

1. **Given** creating a task, **When** user runs `taskflow add "Weekly standup" --due "2025-12-10"`, **Then** task is created with due date
2. **Given** tasks with due dates, **When** user runs `taskflow list --overdue`, **Then** only past-due tasks are shown
3. **Given** creating a recurring task, **When** user runs `taskflow add "Weekly report" --recurrence weekly`, **Then** task is created with recurrence pattern
4. **Given** a recurring task is completed, **When** marked complete, **Then** a new instance is automatically created for the next occurrence

---

### User Story 8 - Interactive Mode (Priority: P3)

A user wants to use TaskFlow in an interactive REPL mode for rapid task management without typing the full command each time.

**Why this priority**: Developer experience enhancement - nice to have but not required for core functionality.

**Independent Test**: Can be fully tested by entering interactive mode and executing multiple commands.

**Acceptance Scenarios**:

1. **Given** TaskFlow is installed, **When** user runs `taskflow interactive` or `taskflow -i`, **Then** an interactive prompt appears
2. **Given** interactive mode is active, **When** user types `add "Task title"`, **Then** task is created without typing `taskflow` prefix
3. **Given** interactive mode is active, **When** user types `exit` or `quit`, **Then** interactive mode ends gracefully

---

### Edge Cases

- What happens when assigning a task to a non-existent worker? -> Error with helpful message suggesting `worker add`
- What happens when delegating to a non-existent worker? -> Error: "@worker-id not found. Use 'taskflow worker list' to see available workers"
- What happens when starting an already in-progress task? -> Error: "Task is already in progress"
- What happens when completing a task that's not in progress? -> Error with valid status transitions listed
- What happens when creating a subtask of a completed task? -> Warning but allow (task is reopened to in_progress)
- What happens with circular parent-child references? -> Error: "Circular reference detected"
- What happens when filtering returns no results? -> Display "No tasks match the specified criteria"
- What happens when deleting a task with subtasks? -> Prompt: "Task has N subtasks. Delete all? [y/N]"
- What happens when due date is in the past? -> Warning but allow creation
- How does the CLI handle concurrent writes (multiple CLI instances)? -> File locking for data.json operations

---

## Requirements *(mandatory)*

### Functional Requirements

#### Project & Initialization
- **FR-001**: System MUST create a `.taskflow/` directory with `config.json` and `data.json` on `init`, and automatically create a "default" project
- **FR-002**: System MUST support multiple projects within a single TaskFlow instance
- **FR-003**: System MUST store configuration (default_project, current_user, storage_mode) in `config.json`
- **FR-036**: System MUST allow setting current user via `taskflow config set user @handle`
- **FR-037**: Tasks created without `--project` flag MUST use the configured default_project

#### Workers (Human-Agent Parity)
- **FR-004**: System MUST support two worker types: `human` and `agent`
- **FR-005**: System MUST accept worker IDs in `@handle` format (e.g., `@sarah`, `@claude-code`)
- **FR-006**: System MUST require agents to have `agent_type` (one of: claude, qwen, gemini, custom) and optional `capabilities` (list of strings)
- **FR-007**: System MUST treat human and agent workers identically in all task operations

#### Tasks - Basic CRUD
- **FR-008**: System MUST auto-generate sequential integer IDs for tasks
- **FR-009**: System MUST require `title` for task creation; `description` is optional
- **FR-010**: System MUST support optional task assignment to any registered worker (human or agent); unassigned tasks are allowed
- **FR-011**: System MUST support task update (title, description, priority, tags, due_date, assignee)
- **FR-012**: System MUST support task deletion with confirmation for tasks with subtasks

#### Tasks - Organization
- **FR-013**: System MUST support priorities: `low`, `medium`, `high`, `urgent` (default: `medium`)
- **FR-014**: System MUST support multiple tags per task (list of strings)
- **FR-015**: System MUST support due dates in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
- **FR-016**: System MUST support recurrence patterns: `daily`, `weekly`, `monthly`, `yearly`

#### Tasks - Hierarchy
- **FR-017**: System MUST support parent-child task relationships via `parent_id`
- **FR-018**: System MUST allow unlimited nesting depth for subtasks
- **FR-019**: System MUST prevent circular parent-child references
- **FR-020**: System MUST display subtasks when showing parent task details

#### Workflow & Status
- **FR-021**: System MUST enforce valid status transitions:
  - `pending` -> `in_progress`
  - `in_progress` -> `review` | `completed` | `blocked`
  - `review` -> `completed` | `in_progress` (rejected)
  - `blocked` -> `in_progress` | `pending`
  - `completed` -> (terminal, unless reopened by subtask creation)
- **FR-022**: System MUST track progress as integer percentage (0-100)
- **FR-023**: System MUST support delegation: reassigning a task to another worker

#### Audit Trail
- **FR-024**: System MUST create an audit log entry for every state-changing operation
- **FR-025**: Audit entries MUST include: task_id, actor_id, actor_type, action, timestamp, details
- **FR-026**: System MUST support viewing audit by task ID or by project
- **FR-027**: Audit log MUST be append-only (no edits or deletions)

#### Search, Filter, Sort
- **FR-028**: System MUST support text search across task titles and descriptions
- **FR-029**: System MUST support filtering by: status, assignee, priority, tag, project, due date range
- **FR-030**: System MUST support sorting by: created_at, updated_at, priority, due_date, title (alpha)

#### Storage
- **FR-031**: System MUST support JSON file storage (default for Phase I)
- **FR-032**: System MUST read storage configuration from project config (enabling future DB backends)
- **FR-033**: System MUST implement file locking for concurrent access safety

#### Interactive Mode
- **FR-034**: System MUST provide an interactive REPL mode via `--interactive` or `-i` flag
- **FR-035**: Interactive mode MUST support all commands without `taskflow` prefix

#### Demo Mode
- **FR-038**: System MUST provide `taskflow demo` command that runs a scripted demonstration showing full workflow (init → register → assign → work → complete → audit)
- **FR-039**: System MUST provide `taskflow demo -i` for interactive step-by-step demo with pauses between commands
- **FR-040**: Demo MUST complete in under 90 seconds (non-interactive mode)

---

### Key Entities

- **Project**: Container for tasks and workers. Has id (slug), name, description, owner_id, created_at.

- **Worker**: A human or AI agent that can be assigned tasks. Has id (@handle format), type (human|agent), name, agent_type (for agents: claude, qwen, gemini), capabilities (list), created_at.

- **Task**: A unit of work. Has id (auto-int), title, description, project_id, assignee_id, created_by_id, parent_task_id, status, progress (0-100), priority, tags (list), due_date, recurrence, created_at, updated_at.

- **AuditLog**: Immutable record of every action. Has id, entity_type, entity_id, action, actor_id, actor_type (human|agent), details (dict), created_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initialize a project and register workers in under 1 minute
- **SC-002**: Users can create a task with full metadata (title, priority, tags, assignee) in a single command
- **SC-003**: Users can view task status and assignment at a glance in the list view
- **SC-004**: Human and agent workers appear in the same unified worker list with type indicators
- **SC-005**: Task assignment to `@claude-code` uses identical syntax as assignment to `@sarah`
- **SC-006**: Audit trail for any task shows complete history with actor identification
- **SC-007**: Demo script (init -> register -> assign -> work -> complete -> audit) executes in under 2 minutes
- **SC-008**: 100% of state-changing operations produce audit log entries
- **SC-009**: Search and filter operations return results instantly (< 1 second for 1000 tasks)
- **SC-010**: All commands provide helpful error messages with suggested fixes

---

## Constraints & Non-Goals

### Constraints

- **Phase I Only**: This spec covers CLI only. Web UI, API, and MCP server are future phases.
- **Local Storage**: JSON file storage only. Database support is Phase II.
- **Single User**: No authentication or multi-tenancy. Multi-user is Phase II.
- **No Notifications**: No reminders, alerts, or notifications. These are Phase V features.

### Non-Goals (Explicitly Out of Scope)

- Web interface or REST API
- Database persistence (PostgreSQL, etc.)
- Real-time collaboration
- User authentication/authorization
- Email or push notifications
- Calendar integration
- File attachments to tasks
- Time tracking or billing
- Kanban or board views

---

## Assumptions

- Python 3.13+ is available on the target system
- UV package manager is used for dependency management
- Typer library is used for CLI framework
- Users are comfortable with command-line interfaces
- Tasks and workers are identified by simple IDs (not UUIDs)
- All dates/times are stored in UTC, displayed in local time
- File system is available and writable in the current directory

---

## Monorepo Structure (Future-Proofing)

This CLI will later become part of a monorepo. Structure anticipates:

```
taskforce/
├── src/
│   └── taskflow/           # CLI package (Phase I)
│       ├── __init__.py
│       ├── main.py         # Typer app entry point
│       ├── models.py       # Pydantic models (-> SQLModel in Phase II)
│       ├── storage.py      # JSON storage (-> DB adapter in Phase II)
│       ├── audit.py        # Audit logging
│       └── commands/       # CLI command modules
│           ├── init.py
│           ├── project.py
│           ├── worker.py
│           ├── task.py
│           ├── workflow.py
│           └── audit.py
├── tests/
│   └── test_cli.py
├── frontend/               # (Phase II - Next.js)
├── backend/                # (Phase II - FastAPI)
├── mcp-server/             # (Phase III - MCP)
├── helm/                   # (Phase IV - Kubernetes)
└── specs/                  # Specifications
```

---

## Command Reference (Summary)

| Command | Description |
|---------|-------------|
| `taskflow init` | Initialize TaskFlow in current directory |
| `taskflow project add <id>` | Create a new project |
| `taskflow project list` | List all projects |
| `taskflow worker add <@id> --type human\|agent` | Register a worker |
| `taskflow worker list` | List all workers |
| `taskflow add "<title>"` | Create a new task |
| `taskflow list` | List tasks (with filters) |
| `taskflow show <id>` | Show task details |
| `taskflow edit <id>` | Update task |
| `taskflow delete <id>` | Delete task |
| `taskflow start <id>` | Start working on task |
| `taskflow progress <id> --percent N` | Update progress |
| `taskflow complete <id>` | Mark task complete |
| `taskflow review <id>` | Request review |
| `taskflow approve <id>` | Approve reviewed task |
| `taskflow reject <id>` | Reject reviewed task |
| `taskflow delegate <id> <@worker>` | Reassign task |
| `taskflow audit <id>` | View task audit trail |
| `taskflow -i` / `taskflow interactive` | Enter interactive mode |
| `taskflow demo` | Run automated demo script |
| `taskflow demo -i` | Run interactive step-by-step demo |
| `taskflow config set <key> <value>` | Set configuration (user, default_project) |

---

## Phase Continuity Notes

The data models defined here MUST persist through all 5 phases:

| Phase | Storage | Notes |
|-------|---------|-------|
| I (CLI) | JSON files | Pydantic models |
| II (Web) | PostgreSQL | SQLModel (same schema) |
| III (MCP) | PostgreSQL | MCP tools expose same operations |
| IV (K8s) | PostgreSQL | Same APIs, containerized |
| V (Prod) | PostgreSQL + Kafka | Events for audit stream |

**Critical**: Task, Worker, Project, AuditLog schemas defined now must not require breaking changes in later phases.
