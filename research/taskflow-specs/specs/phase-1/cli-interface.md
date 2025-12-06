# Phase 1: CLI Interface Specification

## Overview

Complete command-line interface for TaskFlow. Built with Typer for clean, typed commands.

## Command Structure

```
taskflow <command> [subcommand] [arguments] [options]
```

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |
| `--project` | `-p` | Override default project |

---

## Initialization Commands

### `taskflow init`

Initialize TaskFlow in current directory.

```bash
taskflow init [--global]
```

| Option | Description |
|--------|-------------|
| `--global` | Initialize in ~/.taskflow instead of ./.taskflow |

**Behavior:**
1. Create `.taskflow/` directory
2. Create `config.yaml` with defaults
3. Create `data.json` with empty collections
4. Set current user from git config or prompt

**Output:**
```
✓ Created .taskflow/config.yaml
✓ Created .taskflow/data.json
✓ Set current user: @muhammad
TaskFlow initialized!

Next steps:
  taskflow project add <name>    Create a project
  taskflow agent add <id>        Register an AI agent
  taskflow add <title>           Create your first task
```

---

## Configuration Commands

### `taskflow config set`

Set configuration value.

```bash
taskflow config set <key> <value>
```

**Keys:**
- `default_project` — Default project for commands
- `current_user` — Current user identity

**Example:**
```bash
$ taskflow config set default_project taskflow
✓ Set default_project = taskflow
```

### `taskflow config get`

Get configuration value.

```bash
taskflow config get <key>
```

### `taskflow config list`

Show all configuration.

```bash
taskflow config list
```

---

## Project Commands

### `taskflow project add`

Create a new project.

```bash
taskflow project add <id> [--name NAME] [--description DESC]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique identifier (slug) |
| `--name` | No | Display name (defaults to id) |
| `--description` | No | Project description |

**Example:**
```bash
$ taskflow project add taskflow --name "TaskFlow Platform" --description "Human-Agent Orchestration"
✓ Created project: taskflow
```

### `taskflow project list`

List all projects.

```bash
taskflow project list
```

**Output:**
```
PROJECTS
────────────────────────────────────
taskflow      TaskFlow Platform
personal      Personal Tasks
panaversity   Panaversity Courses
```

### `taskflow project show`

Show project details.

```bash
taskflow project show <id>
```

### `taskflow project remove`

Remove a project (must be empty).

```bash
taskflow project remove <id> [--force]
```

---

## Worker Commands

### `taskflow worker add`

Register a worker (human or agent).

```bash
taskflow worker add <id> --type TYPE [--name NAME]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique ID starting with @ |
| `--type` | Yes | `human` or `agent` |
| `--name` | No | Display name |

**Example:**
```bash
$ taskflow worker add @muhammad --type human --name "Muhammad"
✓ Added worker @muhammad (human)
```

### `taskflow agent add`

Shorthand for adding an agent.

```bash
taskflow agent add <id> [--type TYPE] [--capabilities CAPS]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique ID starting with @ |
| `--type` | No | Agent type: claude, qwen, gemini (inferred from id) |
| `--capabilities` | No | Comma-separated capabilities |

**Example:**
```bash
$ taskflow agent add @claude-code --capabilities coding,architecture,debugging
✓ Added agent @claude-code (claude)
  Capabilities: coding, architecture, debugging
```

### `taskflow worker list`

List all workers.

```bash
taskflow worker list [--type TYPE]
```

**Output:**
```
WORKERS
────────────────────────────────────────────────────────
👤 @muhammad        Muhammad           human
🤖 @claude-code     Claude Code        claude    coding, architecture
🤖 @qwen            Qwen               qwen      research, analysis
🤖 @gemini          Gemini             gemini    research, summarization
```

### `taskflow worker remove`

Remove a worker (must have no assigned tasks).

```bash
taskflow worker remove <id> [--force]
```

---

## Task Commands

### `taskflow add`

Create a new task.

```bash
taskflow add <title> [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--project` | `-p` | Project (uses default if not set) |
| `--assign` | `-a` | Assign to worker |
| `--description` | `-d` | Task description |
| `--priority` | | low/medium/high/urgent |
| `--tags` | `-t` | Comma-separated tags |
| `--due` | | Due date (YYYY-MM-DD or relative) |
| `--parent` | | Parent task ID (creates subtask) |

**Examples:**
```bash
# Simple task
$ taskflow add "Implement MCP server"
✓ Created task #1 in taskflow (unassigned)

# Full options
$ taskflow add "Fix auth bug" \
    --project taskflow \
    --assign @claude-code \
    --priority urgent \
    --tags bug,security \
    --due tomorrow
✓ Created task #2 in taskflow, assigned to @claude-code

# Subtask
$ taskflow add "Design protocol" --parent 1
✓ Created subtask #3 (1.1) under task #1
```

### `taskflow list`

List tasks.

```bash
taskflow list [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--project` | `-p` | Filter by project |
| `--all` | `-a` | Show all projects |
| `--status` | `-s` | Filter: pending/in_progress/review/completed/blocked |
| `--assignee` | | Filter by worker |
| `--tag` | | Filter by tag |
| `--priority` | | Filter by priority |
| `--search` | `-q` | Search in title/description |
| `--sort` | | Sort: created/updated/priority/due_date/title |
| `--desc` | | Sort descending |

**Output (default):**
```
PROJECT: taskflow (default)
────────────────────────────────────────────────────────
#1  [🤖 @claude-code] Implement MCP server       in_progress  60%  high
    ├── #3  [✓] Design protocol                  completed
    ├── #4  [~] Implement handlers               in_progress  @qwen
    └── #5  [ ] Add authentication               pending
#2  [🤖 @claude-code] Fix auth bug               pending      urgent

PROJECT: personal
────────────────────────────────────────────────────────
#6  [👤 @muhammad] Message Ahmad about RTJ       pending
```

**Output (--all --status pending):**
```
PENDING TASKS (all projects)
────────────────────────────────────────────────────────
#2  taskflow    Fix auth bug              @claude-code  urgent
#5  taskflow    Add authentication        @claude-code
#6  personal    Message Ahmad about RTJ   @muhammad
```

### `taskflow show`

Show task details.

```bash
taskflow show <task_id>
```

**Output:**
```
TASK #1: Implement MCP server
════════════════════════════════════════════════════════
Project:     taskflow
Status:      in_progress (60%)
Priority:    high
Assignee:    @claude-code
Created:     2025-12-06 10:00 by @muhammad
Updated:     2025-12-06 14:30
Due:         2025-12-21
Tags:        backend, mcp

DESCRIPTION:
Build MCP server for agent connections using Official MCP SDK.

SUBTASKS:
  #3  [✓] Design protocol              @claude-code    completed
  #4  [~] Implement handlers           @qwen           in_progress (40%)
  #5  [ ] Add authentication           @claude-code    pending

LINKS:
  [spec] MCP Server Spec → ./specs/mcp-server.md (read)
  [doc]  MCP SDK Docs → https://github.com/modelcontextprotocol (read)
```

### `taskflow edit`

Edit task details.

```bash
taskflow edit <task_id> [options]
```

| Option | Description |
|--------|-------------|
| `--title` | New title |
| `--description` | New description |
| `--priority` | New priority |
| `--tags` | Replace tags |
| `--add-tag` | Add tag |
| `--remove-tag` | Remove tag |
| `--due` | New due date |
| `--clear-due` | Remove due date |

**Example:**
```bash
$ taskflow edit 1 --priority urgent --add-tag critical
✓ Updated task #1
  priority: high → urgent
  tags: +critical
```

### `taskflow delete`

Delete a task.

```bash
taskflow delete <task_id> [--force]
```

- Asks for confirmation unless `--force`
- Deletes subtasks if any
- Creates audit log entry

### `taskflow assign`

Assign task to worker.

```bash
taskflow assign <task_id> <worker_id>
```

**Example:**
```bash
$ taskflow assign 1 @claude-code
✓ Task #1 assigned to @claude-code
```

### `taskflow unassign`

Remove assignment.

```bash
taskflow unassign <task_id>
```

---

## Workflow Commands

### `taskflow start`

Start working on a task.

```bash
taskflow start <task_id>
```

**Behavior:**
1. Set status to `in_progress`
2. Set `started_at` timestamp
3. Prompt for subtask decomposition (optional)
4. Create audit log

**Interactive Flow:**
```
$ taskflow start 1
Starting task #1: Implement MCP server

Break down into subtasks? (Enter titles, empty line to finish)
> Design protocol
> Implement handlers
> Add authentication
>

✓ Task #1 started
✓ Created 3 subtasks:
  #3 (1.1) Design protocol
  #4 (1.2) Implement handlers
  #5 (1.3) Add authentication
```

**Non-interactive:**
```bash
$ taskflow start 1 --no-subtasks
✓ Task #1 started
```

### `taskflow progress`

Update task progress.

```bash
taskflow progress <task_id> --percent N [--note TEXT]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--percent` | Yes | Progress 0-100 |
| `--note` | No | Progress note |

**Example:**
```bash
$ taskflow progress 1 --percent 60 --note "Handlers implemented, testing"
✓ Task #1: 60% complete
  Note: Handlers implemented, testing
```

### `taskflow complete`

Mark task as complete.

```bash
taskflow complete <task_id> [--note TEXT]
```

**Behavior:**
1. Set status to `completed`
2. Set progress to 100
3. Set `completed_at` timestamp
4. Create audit log

**Example:**
```bash
$ taskflow complete 3
✓ Task #3 completed
```

### `taskflow block`

Mark task as blocked.

```bash
taskflow block <task_id> [--reason TEXT]
```

### `taskflow unblock`

Unblock a task.

```bash
taskflow unblock <task_id>
```

### `taskflow delegate`

Delegate subtask to another worker.

```bash
taskflow delegate <task_id> <worker_id> [--note TEXT]
```

**Example:**
```bash
$ taskflow delegate 4 @qwen --note "Need research expertise"
✓ Task #4 delegated from @claude-code to @qwen
  Note: Need research expertise
```

### `taskflow review`

Request review (for human approval).

```bash
taskflow review <task_id>
```

**Behavior:**
1. Set status to `review`
2. Create audit log

### `taskflow approve`

Approve a task in review.

```bash
taskflow approve <task_id> [--note TEXT]
```

**Behavior:**
1. Set status to `completed`
2. Create audit log with approval

### `taskflow reject`

Reject a task in review.

```bash
taskflow reject <task_id> [--reason TEXT]
```

**Behavior:**
1. Set status to `in_progress`
2. Create audit log with rejection reason

---

## Subtask Commands

### `taskflow subtask add`

Add subtask to existing task.

```bash
taskflow subtask add <parent_id> <title> [--assign WORKER]
```

**Example:**
```bash
$ taskflow subtask add 1 "Write documentation" --assign @claude-code
✓ Created subtask #6 (1.4) under task #1
```

### `taskflow subtask complete`

Complete a subtask.

```bash
taskflow subtask complete <task_id>
```

Alias for `taskflow complete` — works on any task.

---

## Link Commands

### `taskflow link`

Link resource to task.

```bash
taskflow link <task_id> --type TYPE --uri URI --name NAME [--description DESC] [--access ACCESS]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--type` | Yes | repo/spec/doc/url/task |
| `--uri` | Yes | Resource location |
| `--name` | Yes | Display name |
| `--description` | No | Description |
| `--access` | No | read (default) or write |

**Example:**
```bash
$ taskflow link 1 --type spec --uri "./specs/mcp.md" --name "MCP Spec"
✓ Linked "MCP Spec" to task #1 (read-only)
```

### `taskflow links`

Show links for a task.

```bash
taskflow links <task_id>
```

**Output:**
```
LINKS for Task #1
────────────────────────────────────────────────────────
[spec] MCP Spec        → ./specs/mcp.md (read)
[doc]  MCP SDK Docs    → https://github.com/... (read)
[task] Depends on      → Task #3 (read)
```

### `taskflow unlink`

Remove a link.

```bash
taskflow unlink <task_id> <link_id>
```

---

## Audit Commands

### `taskflow audit`

Show audit trail.

```bash
taskflow audit <task_id>
taskflow audit --project PROJECT
taskflow audit --worker WORKER
taskflow audit --today
taskflow audit --since DATE
```

**Output (task):**
```
AUDIT TRAIL: Task #1 — Implement MCP server
════════════════════════════════════════════════════════
[2025-12-06 10:00:00] created by @muhammad
                      title: "Implement MCP server"
                      project: taskflow

[2025-12-06 10:00:15] assigned by @muhammad
                      assignee: @claude-code

[2025-12-06 10:05:00] started by @claude-code

[2025-12-06 10:05:30] subtask_added by @claude-code
                      subtask: #3 "Design protocol"

[2025-12-06 10:05:31] subtask_added by @claude-code
                      subtask: #4 "Implement handlers"

[2025-12-06 10:05:32] subtask_added by @claude-code
                      subtask: #5 "Add authentication"

[2025-12-06 12:00:00] progress_updated by @claude-code
                      progress: 0% → 30%
                      note: "Protocol designed"

[2025-12-06 13:00:00] delegated by @claude-code
                      subtask: #4
                      from: @claude-code → @qwen
                      note: "Need research expertise"

[2025-12-06 14:30:00] progress_updated by @claude-code
                      progress: 30% → 60%
                      note: "Handlers implemented"
```

---

## Blueprint Commands (Bonus)

### `taskflow blueprint add`

Create a blueprint.

```bash
taskflow blueprint add <id> --name NAME [--description DESC]
```

### `taskflow blueprint tasks`

Define blueprint tasks interactively.

```bash
taskflow blueprint tasks <blueprint_id>
```

**Interactive Flow:**
```
$ taskflow blueprint tasks feature-dev
Define tasks for blueprint "feature-dev"
(Enter: title [@worker_type] or empty to finish)

> Research existing solutions [@agent:gemini]
> Write specification [@human]
> Implement backend [@agent:claude]
> Implement frontend [@agent:claude]
> Write tests [@agent:claude]
>

✓ Blueprint "feature-dev" has 5 tasks
```

### `taskflow blueprint list`

List all blueprints.

```bash
taskflow blueprint list
```

### `taskflow blueprint show`

Show blueprint details.

```bash
taskflow blueprint show <id>
```

### `taskflow apply`

Create tasks from blueprint.

```bash
taskflow apply <blueprint_id> [--project PROJECT] [--prefix PREFIX]
```

**Example:**
```bash
$ taskflow apply feature-dev --project taskflow --prefix "Recurring tasks: "
✓ Created 5 tasks from blueprint "feature-dev":
  #10 Recurring tasks: Research existing solutions → @gemini
  #11 Recurring tasks: Write specification → (unassigned, human)
  #12 Recurring tasks: Implement backend → @claude-code
  #13 Recurring tasks: Implement frontend → @claude-code
  #14 Recurring tasks: Write tests → @claude-code
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Entity not found |
| 4 | Validation error |
| 5 | Permission denied |

---

## Color Coding

| Element | Color |
|---------|-------|
| Human worker | Blue |
| Agent worker | Green |
| Completed | Gray/strikethrough |
| In progress | Yellow |
| Blocked | Red |
| Urgent priority | Red background |
| High priority | Red text |
| Success messages | Green |
| Error messages | Red |
| Warnings | Yellow |
