# TaskFlow - Claude Code Instructions

## Project Overview

TaskFlow is a Human-Agent Task Orchestration Platform. This is Phase 1: a CLI application with local file storage.

**Key Concept:** Humans and AI agents are equal "workers" who can be assigned tasks, create subtasks, delegate work, and report progress. Everything is tracked in an audit log.

## Spec-Driven Development

**IMPORTANT:** Always read the relevant spec before implementing. Specs are the source of truth.

```
specs/
├── constitution.md          # Core principles (READ FIRST)
├── phase-1/
│   ├── overview.md          # Phase 1 objectives
│   ├── data-model.md        # All data structures
│   ├── cli-interface.md     # All CLI commands
│   └── storage.md           # File storage details
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.13+ |
| Package Manager | UV |
| CLI Framework | Typer |
| Data Validation | Pydantic |
| Storage | YAML + JSON files |

## Project Structure

```
taskflow/
├── specs/                   # Specifications (READ ONLY)
├── cli/
│   ├── pyproject.toml       # UV/pip configuration
│   ├── src/
│   │   └── taskflow/
│   │       ├── __init__.py
│   │       ├── main.py      # CLI entry point (Typer app)
│   │       ├── models.py    # Pydantic models
│   │       ├── storage.py   # File I/O operations
│   │       ├── services.py  # Business logic
│   │       ├── display.py   # Output formatting
│   │       └── commands/    # Command implementations
│   │           ├── __init__.py
│   │           ├── init.py
│   │           ├── config.py
│   │           ├── project.py
│   │           ├── worker.py
│   │           ├── task.py
│   │           ├── workflow.py  # start, progress, complete, etc.
│   │           ├── link.py
│   │           ├── audit.py
│   │           └── blueprint.py
│   └── tests/
├── CLAUDE.md                # This file
└── README.md
```

## Implementation Order

1. **Models** (`models.py`) - Implement all Pydantic models from `specs/phase-1/data-model.md`
2. **Storage** (`storage.py`) - Implement file I/O from `specs/phase-1/storage.md`
3. **Services** (`services.py`) - Business logic (CRUD, validation, audit logging)
4. **Display** (`display.py`) - Rich terminal output formatting
5. **Commands** - One file per command group, following `specs/phase-1/cli-interface.md`

## Key Implementation Notes

### Models

Use Pydantic v2 with strict validation:

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class Task(BaseModel):
    id: int
    title: str = Field(..., min_length=1, max_length=200)
    # ... see data-model.md for full schema
```

### Storage

- Config in YAML (human-readable for editing)
- Data in JSON (structured for programmatic access)
- Use atomic writes (temp file + rename)
- Create backup before modifying

```python
def save_data(data: dict) -> None:
    data["last_updated"] = datetime.now().isoformat()
    content = json.dumps(data, indent=2, default=str)
    atomic_save(find_data_path(), content)
```

### Audit Logging

**EVERY action must create an audit log.** This is core to TaskFlow.

```python
def create_audit_log(
    data: dict,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str,
    actor_type: str,
    details: dict | None = None
) -> dict:
    log = {
        "id": get_next_id(data, "audit"),
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "action": action,
        "actor_id": actor_id,
        "actor_type": actor_type,
        "details": details,
        "created_at": datetime.now().isoformat()
    }
    data["audit_logs"].append(log)
    return log
```

### CLI with Typer

```python
import typer
from rich.console import Console

app = typer.Typer(help="TaskFlow - Human-Agent Task Orchestration")
console = Console()

@app.command()
def init(
    global_: bool = typer.Option(False, "--global", help="Initialize in home directory")
):
    """Initialize TaskFlow in current directory."""
    # Implementation
    console.print("✓ TaskFlow initialized!", style="green")
```

### Display Formatting

Use Rich for beautiful output:

```python
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

def display_task_list(tasks: list[dict], config: dict):
    table = Table(title="Tasks")
    table.add_column("#", style="cyan")
    table.add_column("Assignee")
    table.add_column("Title")
    table.add_column("Status")
    table.add_column("Progress")
    
    for task in tasks:
        # Format row based on status, worker type, etc.
        table.add_row(...)
    
    console.print(table)
```

### Current User Context

Always get current user from config for audit logging:

```python
def get_current_user() -> str:
    config = load_config()
    return config["current_user"]
```

### Error Handling

Use custom exceptions and display friendly errors:

```python
class TaskFlowError(Exception):
    """Base exception for TaskFlow"""
    pass

class NotFoundError(TaskFlowError):
    """Entity not found"""
    pass

# In commands:
try:
    # operation
except TaskFlowError as e:
    console.print(f"Error: {e}", style="red")
    raise typer.Exit(1)
```

## Common Patterns

### Adding a Task

```python
def add_task(data: dict, config: dict, **kwargs) -> dict:
    # 1. Validate project exists
    # 2. Validate assignee exists (if provided)
    # 3. Create task
    task = {
        "id": get_next_id(data, "task"),
        "created_by_id": get_current_user(),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        **kwargs
    }
    data["tasks"].append(task)
    
    # 4. Create audit log
    create_audit_log(
        data,
        entity_type="task",
        entity_id=str(task["id"]),
        action="created",
        actor_id=get_current_user(),
        actor_type="human",  # CLI always human
        details={"title": task["title"], "project": task["project_id"]}
    )
    
    # 5. Save
    save_data(data)
    
    return task
```

### Starting a Task (with subtask creation)

```python
def start_task(data: dict, task_id: int, subtask_titles: list[str] | None = None) -> dict:
    task = find_task(data, task_id)
    
    # Update task
    task["status"] = "in_progress"
    task["started_at"] = datetime.now().isoformat()
    task["updated_at"] = datetime.now().isoformat()
    
    # Audit
    create_audit_log(data, "task", str(task_id), "started", ...)
    
    # Create subtasks if provided
    if subtask_titles:
        for title in subtask_titles:
            subtask = add_task(
                data,
                title=title,
                project_id=task["project_id"],
                parent_task_id=task_id,
                assignee_id=task["assignee_id"],
                created_by_id=task["assignee_id"]  # Worker creates subtasks
            )
            create_audit_log(
                data, "task", str(task_id), "subtask_added",
                actor_id=task["assignee_id"],
                actor_type=get_worker_type(task["assignee_id"]),
                details={"subtask_id": subtask["id"], "title": title}
            )
    
    save_data(data)
    return task
```

## Testing

Use pytest with fixtures:

```python
import pytest
from pathlib import Path
import tempfile

@pytest.fixture
def taskflow_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / ".taskflow"
        path.mkdir()
        # Create minimal config and data
        yield path

def test_add_task(taskflow_dir):
    # Test implementation
    pass
```

## Commands Quick Reference

| Command | File | Priority |
|---------|------|----------|
| `taskflow init` | `commands/init.py` | 1 |
| `taskflow config` | `commands/config.py` | 1 |
| `taskflow project` | `commands/project.py` | 1 |
| `taskflow worker/agent` | `commands/worker.py` | 1 |
| `taskflow add/list/show/edit/delete` | `commands/task.py` | 1 |
| `taskflow start/progress/complete` | `commands/workflow.py` | 2 |
| `taskflow assign/delegate/review` | `commands/workflow.py` | 2 |
| `taskflow audit` | `commands/audit.py` | 2 |
| `taskflow link` | `commands/link.py` | 3 |
| `taskflow blueprint` | `commands/blueprint.py` | 3 |

## Before You Code

1. Read `specs/constitution.md` for core principles
2. Read `specs/phase-1/overview.md` for Phase 1 scope
3. Read relevant spec for the feature you're implementing
4. Check if similar pattern exists in codebase
5. Write tests alongside implementation

## Success Criteria

- [ ] `taskflow init` works
- [ ] Can add projects and workers (human + agent)
- [ ] Can CRUD tasks with all options
- [ ] Can start task and create subtasks
- [ ] Can update progress with notes
- [ ] Can delegate between workers
- [ ] Can request review and approve/reject
- [ ] Full audit trail for all actions
- [ ] Filter/sort/search tasks
- [ ] Priorities and tags working
- [ ] All commands have `--help`
- [ ] Colored, formatted output
- [ ] Error messages are helpful
