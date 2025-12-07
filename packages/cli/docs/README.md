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

# Update progress
taskflow progress 1 --percent 50 --note "Checking OAuth flow"

# Complete the task
taskflow complete 1
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

Every action creates an audit log entry:

```bash
# View all audit logs
taskflow audit list

# View logs for a specific task
taskflow audit list --task 1

# View a specific audit entry
taskflow audit show 1
```

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
| `taskflow status` | Show current TaskFlow status |

### Task Management

| Command | Description |
|---------|-------------|
| `taskflow add "title"` | Create a new task |
| `taskflow list` | List all tasks |
| `taskflow show <id>` | Show task details |
| `taskflow edit <id>` | Edit task properties |
| `taskflow delete <id>` | Delete a task |

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
| `taskflow review <id>` | Submit task for review |
| `taskflow complete <id>` | Mark task as completed |
| `taskflow block <id>` | Mark task as blocked |
| `taskflow unblock <id>` | Unblock a task |

#### Progress Notes

```bash
# Update progress with a note
taskflow progress 1 --percent 75 --note "Auth flow working, testing edge cases"
```

Progress notes are stored in the audit trail, creating a work journal.

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

| Command | Description |
|---------|-------------|
| `taskflow audit list` | List all audit entries |
| `taskflow audit list --task <id>` | Filter by task |
| `taskflow audit list --actor @id` | Filter by actor |
| `taskflow audit list --project <slug>` | Filter by project |
| `taskflow audit show <id>` | Show audit entry details |

### Interactive Mode

```bash
# Enter interactive REPL
taskflow interactive

# In interactive mode, commands work without 'taskflow' prefix:
taskflow> list
taskflow> add "New task"
taskflow> start 1
taskflow> exit
```

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

### Task Description (persistent)

```bash
# On creation
taskflow add "Implement auth" --description "Need OAuth2 with refresh tokens"

# On edit
taskflow edit 1 --description "Updated requirements"
```

View with `taskflow show <id>`.

### Progress Notes (audit trail)

```bash
taskflow progress 1 --percent 50 --note "Completed initial review"
```

View with `taskflow audit list --task 1`.

## Subtasks (Recursive Tasks)

Tasks can have subtasks for hierarchical decomposition:

```bash
# Create parent task
taskflow add "Build authentication system"

# Create subtasks
taskflow add "Implement login form" --parent 1
taskflow add "Add OAuth provider" --parent 1
taskflow add "Write auth tests" --parent 1
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
└── data.json      # All data (projects, workers, tasks, audit logs)
```

## Examples

### Daily Workflow

```bash
# Morning: check status
taskflow status
taskflow list

# Start a task
taskflow start 1

# Work and update progress
taskflow progress 1 --percent 25 --note "Started code review"
taskflow progress 1 --percent 50 --note "Found issue in auth logic"
taskflow progress 1 --percent 75 --note "Fixed issue, running tests"

# Complete
taskflow complete 1

# Review what was done
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
```
