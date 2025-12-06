# Phase 1: Local CLI with File Storage

## Overview

Phase 1 delivers a command-line TaskFlow that proves the human-agent task management concept works. All data stored in local files for portability and inspection.

## Objectives

1. **Prove the concept** — Human-agent unified task model works
2. **Complete CLI** — All task operations via command line
3. **Local-first** — No external dependencies, works offline
4. **Audit everything** — Full trail of all actions
5. **Prepare for evolution** — Data model ready for database migration

## Technology Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Language | Python 3.13+ | Modern, typed, fast |
| Package Manager | UV | Fast, reliable |
| CLI Framework | Typer | Clean, typed CLI |
| Data Validation | Pydantic | Type-safe models |
| Storage | JSON files | Simple, inspectable |
| Development | Claude Code + Spec-Kit Plus | Spec-driven |

## Storage Structure

```
.taskflow/
├── config.yaml      # Configuration and registered entities
├── data.json        # Tasks, audit logs, links, blueprints
└── .env             # Secrets (gitignored)
```

### config.yaml Schema

```yaml
version: "1.0"

# Current user identity
current_user: "@muhammad"

# Default project for commands
default_project: "taskflow"

# Registered projects
projects:
  - id: "taskflow"
    name: "TaskFlow Platform"
    description: "Human-Agent Task Orchestration"
    created_at: "2025-12-06T10:00:00Z"

# Registered workers
workers:
  - id: "@muhammad"
    type: "human"
    name: "Muhammad"
    created_at: "2025-12-06T10:00:00Z"
  - id: "@claude-code"
    type: "agent"
    agent_type: "claude"
    capabilities: ["coding", "architecture", "debugging"]
    created_at: "2025-12-06T10:00:00Z"
```

### data.json Schema

```json
{
  "tasks": [],
  "audit_logs": [],
  "linked_resources": [],
  "blueprints": []
}
```

## Features by Category

### Basic Level (Required)

| Feature | Command | Description |
|---------|---------|-------------|
| Add Task | `taskflow add` | Create new task |
| Delete Task | `taskflow delete` | Remove task |
| Update Task | `taskflow edit` | Modify task details |
| View Task List | `taskflow list` | Display tasks |
| Mark Complete | `taskflow complete` | Toggle completion |

### Intermediate Level (Required)

| Feature | Command | Description |
|---------|---------|-------------|
| Priorities | `--priority` flag | low/medium/high/urgent |
| Tags | `--tags` flag | Categorize tasks |
| Search | `--search` flag | Find by keyword |
| Filter | `--status`, `--assignee`, `--tag` | Filter results |
| Sort | `--sort` flag | Order by field |

### Human-Agent Features (Core Innovation)

| Feature | Command | Description |
|---------|---------|-------------|
| Worker Registration | `taskflow worker add` | Register human/agent |
| Agent Registration | `taskflow agent add` | Shorthand for agents |
| Assignment | `--assign` flag | Assign to worker |
| Start Task | `taskflow start` | Begin work, create subtasks |
| Progress Update | `taskflow progress` | Report % complete |
| Delegation | `taskflow delegate` | Reassign subtask |
| Review Request | `taskflow review` | Flag for approval |
| Approve/Reject | `taskflow approve/reject` | Human decision |

### Audit Features

| Feature | Command | Description |
|---------|---------|-------------|
| Task Audit | `taskflow audit <id>` | Show task history |
| Project Audit | `taskflow audit --project` | Show project history |
| Worker Audit | `taskflow audit --worker` | Show worker history |

### Resource Linking

| Feature | Command | Description |
|---------|---------|-------------|
| Link Resource | `taskflow link` | Attach reference |
| View Links | `taskflow links` | Show task links |
| Unlink | `taskflow unlink` | Remove link |

## Deliverables

1. **GitHub Repository** with:
   - `specs/constitution.md`
   - `specs/phase-1/` folder with all specs
   - `cli/src/taskflow/` Python source
   - `README.md` with setup instructions
   - `CLAUDE.md` with development instructions

2. **Working CLI** demonstrating:
   - All basic task operations
   - Human and agent worker management
   - Task assignment to either type
   - Subtask creation and delegation
   - Progress tracking
   - Complete audit trail

3. **Demo Video** (90 seconds max) showing:
   - Initialize TaskFlow
   - Register workers (human + agents)
   - Create and assign tasks
   - Agent workflow (start → subtasks → delegate → progress)
   - Audit trail

## Success Criteria

- [ ] `taskflow init` creates config and data files
- [ ] Can register humans and agents as workers
- [ ] Can create tasks in projects
- [ ] Can assign tasks to any worker type
- [ ] Can start task and add subtasks
- [ ] Can delegate subtasks between workers
- [ ] Can track progress with notes
- [ ] Can request and approve/reject reviews
- [ ] Full audit trail for all actions
- [ ] Filter/sort/search working
- [ ] Priorities and tags working
