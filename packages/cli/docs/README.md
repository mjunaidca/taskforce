# TaskFlow CLI Documentation

TaskFlow is a task management CLI that treats humans and AI agents as equal workers. Every action is audited, creating full accountability for both human and agent work.

## Quick Start

```bash
# Initialize TaskFlow in current directory
taskflow init

# Add your first task
taskflow add "Review authentication module"

# Start working on it
taskflow start 1

# Update progress with a note
taskflow progress 1 --percent 50 --note "Checking OAuth flow"

# Complete the task
taskflow complete 1

# View the audit trail for this task
taskflow audit list --task 1
```

## Core Concepts

### Human-Agent Parity

TaskFlow treats humans and AI agents identically:
- Both can be assigned tasks
- Both can create, start, and complete tasks
- Both are fully audited

```bash
# Register a human worker
taskflow worker add @sarah --type human --name "Sarah Chen"

# Register an AI agent
taskflow worker add @claude-code --type agent --name "Claude Code" --agent-type claude
```

### Audit Trail

Every action creates an audit log entry. The audit system tracks WHO did WHAT, WHEN, and WHY.

```bash
# View all audit logs
taskflow audit list

# View audit entries for a specific TASK (most common use case)
taskflow audit list --task 1

# View a specific audit entry by its ID (to see full details including notes)
taskflow audit show 12
```

**Important:** `audit show <id>` shows an audit entry by **audit log ID**, not task ID. To find audit entries for a task, first run `audit list --task <id>` to see the audit IDs, then use `audit show <audit-id>` to see details.

### Projects

Tasks belong to projects for organization:

```bash
# Create a project
taskflow project add myproject --name "My Project"

# List projects
taskflow project list

# Add task to specific project
taskflow add "New feature" --project myproject
```

## Commands Reference

### Initialization

| Command | Description |
|---------|-------------|
| `taskflow init` | Initialize TaskFlow in current directory |
| `taskflow init --user @myname` | Initialize with custom default user |
| `taskflow init --path /custom/path` | Initialize in specific directory |
| `taskflow demo` | Run interactive demo showcasing human-agent parity |
| `taskflow demo --no-cleanup` | Run demo and keep the data for exploration |
| `taskflow status` | Show current TaskFlow status |

### Task Management

| Command | Description |
|---------|-------------|
| `taskflow add "title"` | Create a new task |
| `taskflow list` | List all tasks |
| `taskflow show <id>` | Show task details |
| `taskflow edit <id>` | Edit task properties |
| `taskflow delete <id>` | Delete a task |
| `taskflow search <keyword>` | Search tasks by keyword |

#### Task Options

```bash
# Create task with options
taskflow add "Task title" \
  --description "Detailed notes" \
  --priority high \
  --project myproject \
  --assign @sarah \
  --parent 1

# Edit task
taskflow edit 1 \
  --title "New title" \
  --description "Updated notes" \
  --priority critical \
  --assign @claude-code
```

### Task Workflow

| Command | Description |
|---------|-------------|
| `taskflow start <id>` | Start working on a task (pending → in_progress) |
| `taskflow progress <id> --percent N` | Update task progress (0-100) |
| `taskflow progress <id> --percent N --note "..."` | Update progress with a note |
| `taskflow review <id>` | Submit task for review |
| `taskflow complete <id>` | Mark task as completed |
| `taskflow block <id>` | Mark task as blocked |
| `taskflow unblock <id>` | Unblock a task |
| `taskflow delegate <id> --to @worker` | Reassign task to another worker |

#### Progress Notes

Progress notes are stored in the audit trail, creating a work journal:

```bash
# Update progress with a note
taskflow progress 1 --percent 25 --note "Started code review"
taskflow progress 1 --percent 50 --note "Found issue in auth logic"
taskflow progress 1 --percent 75 --note "Fixed issue, running tests"

# View all progress notes for a task
taskflow audit list --task 1

# View full details of a specific audit entry (including the note)
taskflow audit show 12
```

### Worker Management

| Command | Description |
|---------|-------------|
| `taskflow worker add @id` | Register a new worker |
| `taskflow worker list` | List all workers |
| `taskflow worker show @id` | Show worker details |
| `taskflow worker delete @id` | Remove a worker |

#### Worker Types

```bash
# Human worker
taskflow worker add @sarah --type human --name "Sarah Chen"

# AI agent with capabilities
taskflow worker add @claude-code \
  --type agent \
  --name "Claude Code" \
  --agent-type claude \
  --capabilities coding,architecture,debugging
```

### Project Management

| Command | Description |
|---------|-------------|
| `taskflow project add <slug>` | Create a new project |
| `taskflow project list` | List all projects |
| `taskflow project show <slug>` | Show project details |
| `taskflow project delete <slug>` | Delete a project |

### Audit Trail

The audit trail records every action taken in TaskFlow.

| Command | Description |
|---------|-------------|
| `taskflow audit list` | List all audit entries |
| `taskflow audit list --task <id>` | Show audit entries for a specific task |
| `taskflow audit list --actor @id` | Filter by who performed the action |
| `taskflow audit list --project <slug>` | Filter by project |
| `taskflow audit show <audit-id>` | Show full details of an audit entry |

#### Understanding Audit IDs vs Task IDs

```bash
# Step 1: Find audit entries for task #3
taskflow audit list --task 3
# Output shows audit IDs: 9, 10, 11, 12

# Step 2: View details of a specific audit entry
taskflow audit show 12
# Shows full context including notes, status changes, etc.
```

### Interactive Mode

Interactive mode provides a REPL for faster command entry:

```bash
# Enter interactive mode
taskflow interactive
# Or use the shorthand
taskflow i

# In interactive mode, commands work without 'taskflow' prefix:
taskflow> list
taskflow> add "New task"
taskflow> start 1
taskflow> progress 1 --percent 50 --note "Working on it"
taskflow> audit list --task 1
taskflow> exit
```

Special interactive commands:
- `use <project>` - Set current project context
- `whoami` - Show current worker
- `whoami @worker` - Set current worker context
- `help` - Show available commands
- `exit` / `quit` / `q` - Exit interactive mode

### Due Dates

| Command | Description |
|---------|-------------|
| `taskflow add "title" --due 2025-12-31` | Create task with due date |
| `taskflow due <id> --date 2025-12-31` | Set due date on existing task |
| `taskflow due <id> --clear` | Remove due date |
| `taskflow upcoming` | Show tasks with upcoming due dates |
| `taskflow overdue` | Show overdue tasks |

## Task Status Flow

```
pending → in_progress → review → completed
    ↓         ↓           ↓
  blocked   blocked    in_progress (corrections)
```

Valid transitions:
- `pending` → `in_progress`, `blocked`
- `in_progress` → `review`, `completed`, `blocked`
- `review` → `in_progress`, `completed`
- `completed` → `review` (reopen for corrections)
- `blocked` → `pending`, `in_progress`

## Adding Notes to Tasks

TaskFlow supports two types of notes:

### 1. Task Description (persistent, editable)

The description is attached to the task itself:

```bash
# Set description on creation
taskflow add "Implement auth" --description "Need OAuth2 with refresh tokens"

# Update description later
taskflow edit 1 --description "Updated: Also need PKCE support"

# View description
taskflow show 1
```

### 2. Progress Notes (audit trail, timestamped history)

Progress notes create a work journal in the audit trail:

```bash
# Add notes as you work
taskflow progress 1 --percent 25 --note "Started implementation"
taskflow progress 1 --percent 50 --note "OAuth flow working"
taskflow progress 1 --percent 75 --note "Adding PKCE, found edge case"
taskflow progress 1 --percent 100 --note "All tests passing"

# View the work journal
taskflow audit list --task 1

# See full details of any entry
taskflow audit show 15
```

**When to use which:**
- **Description**: Requirements, acceptance criteria, context that may change
- **Progress notes**: Work log, decisions made, issues found, timestamps

## Subtasks (Recursive Tasks)

Tasks can have subtasks for hierarchical decomposition:

```bash
# Create parent task
taskflow add "Build authentication system"

# Create subtasks using --parent flag
taskflow add "Implement login form" --parent 1
taskflow add "Add OAuth provider" --parent 1
taskflow add "Write auth tests" --parent 1

# Or use the subtask command
taskflow subtask 1 "Implement logout"

# View task with its subtasks
taskflow show 1

# View as a tree
taskflow show 1 --tree
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TASKFLOW_HOME` | Directory containing `.taskflow/` | Current directory |

## Files

TaskFlow stores data in `.taskflow/` directory:

```
.taskflow/
├── config.json    # Configuration (current user, default project)
├── data.json      # All data (projects, workers, tasks, audit logs)
└── history.txt    # Interactive mode command history
```

## Examples

### Daily Workflow

```bash
# Morning: check status
taskflow status
taskflow list

# Start a task
taskflow start 1

# Work and update progress with notes
taskflow progress 1 --percent 25 --note "Started code review"
taskflow progress 1 --percent 50 --note "Found issue in auth logic"
taskflow progress 1 --percent 75 --note "Fixed issue, running tests"

# Complete
taskflow complete 1

# Review what was done (view the work journal)
taskflow audit list --task 1
```

### Team Collaboration

```bash
# Add team members
taskflow worker add @sarah --type human --name "Sarah Chen"
taskflow worker add @alex --type human --name "Alex Kim"
taskflow worker add @claude-code --type agent --name "Claude Code" --agent-type claude

# Create and assign tasks
taskflow add "Review PR #42" --assign @sarah
taskflow add "Write unit tests" --assign @claude-code
taskflow add "Update docs" --assign @alex

# Check who's doing what
taskflow list

# See what a specific person has done
taskflow audit list --actor @sarah
```

### Project Organization

```bash
# Create projects
taskflow project add auth --name "Authentication"
taskflow project add api --name "API Development"

# Add tasks to projects
taskflow add "Implement JWT" --project auth
taskflow add "Add rate limiting" --project api

# List tasks by project
taskflow list --project auth

# See all activity in a project
taskflow audit list --project auth
```

### Running the Demo

The demo showcases human-agent parity:

```bash
# Run demo (cleans up after)
taskflow demo

# Run demo and keep data for exploration
taskflow demo --no-cleanup

# After demo, explore the data
taskflow list
taskflow audit list
taskflow show 1
```
