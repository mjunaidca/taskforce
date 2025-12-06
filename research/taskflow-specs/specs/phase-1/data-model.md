# Phase 1: Data Model Specification

## Overview

This document defines all data structures for TaskFlow Phase 1. These models are designed to evolve to SQLModel/PostgreSQL in Phase 2 without structural changes.

## Core Models

### Project

Container for related tasks.

```python
class Project(BaseModel):
    """A project groups related tasks"""
    id: str                          # Unique identifier (slug format)
    name: str                        # Display name
    description: str | None = None   # Optional description
    owner_id: str                    # Worker ID who owns this project
    created_at: datetime             # When created
    
    # Validation
    # - id: lowercase, alphanumeric, hyphens, 1-50 chars
    # - name: 1-100 chars
    # - description: max 500 chars
```

**Examples:**
```python
Project(
    id="taskflow",
    name="TaskFlow Platform",
    description="Human-Agent Task Orchestration",
    owner_id="@muhammad",
    created_at=datetime.now()
)

Project(
    id="personal",
    name="Personal Tasks",
    description=None,
    owner_id="@muhammad",
    created_at=datetime.now()
)
```

### Worker

Both humans and agents are workers.

```python
class WorkerType(str, Enum):
    HUMAN = "human"
    AGENT = "agent"

class AgentType(str, Enum):
    CLAUDE = "claude"
    QWEN = "qwen"
    GEMINI = "gemini"

class Worker(BaseModel):
    """A worker can be human or AI agent"""
    id: str                              # Unique ID starting with @
    type: WorkerType                     # human or agent
    name: str                            # Display name
    agent_type: AgentType | None = None  # For agents only
    capabilities: list[str] | None = None # Skills/abilities
    created_at: datetime
    
    # Validation
    # - id: starts with @, alphanumeric/hyphens, 2-30 chars
    # - name: 1-100 chars
    # - agent_type: required if type is agent
```

**Examples:**
```python
Worker(
    id="@muhammad",
    type=WorkerType.HUMAN,
    name="Muhammad",
    agent_type=None,
    capabilities=None,
    created_at=datetime.now()
)

Worker(
    id="@claude-code",
    type=WorkerType.AGENT,
    name="Claude Code",
    agent_type=AgentType.CLAUDE,
    capabilities=["coding", "architecture", "debugging"],
    created_at=datetime.now()
)
```

### Task

Unit of work with full lifecycle tracking.

```python
class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Task(BaseModel):
    """A unit of work"""
    id: int                              # Auto-incrementing ID
    title: str                           # Task title
    description: str | None = None       # Detailed description
    project_id: str                      # Parent project
    
    # Assignment
    assignee_id: str | None = None       # Current worker
    created_by_id: str                   # Who created this
    
    # Hierarchy
    parent_task_id: int | None = None    # For subtasks
    
    # Status
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0                    # 0-100
    
    # Organization
    priority: TaskPriority | None = None
    tags: list[str] | None = None
    due_date: datetime | None = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    
    # Validation
    # - title: 1-200 chars
    # - description: max 2000 chars
    # - progress: 0-100
    # - tags: max 10 tags, each 1-30 chars
```

**Examples:**
```python
# Top-level task
Task(
    id=1,
    title="Implement MCP server",
    description="Build MCP server for agent connections",
    project_id="taskflow",
    assignee_id="@claude-code",
    created_by_id="@muhammad",
    parent_task_id=None,
    status=TaskStatus.IN_PROGRESS,
    progress=30,
    priority=TaskPriority.HIGH,
    tags=["backend", "mcp"],
    due_date=datetime(2025, 12, 21),
    created_at=datetime.now(),
    updated_at=datetime.now(),
    started_at=datetime.now(),
    completed_at=None
)

# Subtask
Task(
    id=2,
    title="Design protocol",
    description=None,
    project_id="taskflow",
    assignee_id="@claude-code",
    created_by_id="@claude-code",  # Agent created subtask
    parent_task_id=1,              # Child of task 1
    status=TaskStatus.COMPLETED,
    progress=100,
    priority=None,                 # Inherits from parent
    tags=None,
    due_date=None,
    created_at=datetime.now(),
    updated_at=datetime.now(),
    started_at=datetime.now(),
    completed_at=datetime.now()
)
```

### AuditLog

Immutable record of every action.

```python
class AuditAction(str, Enum):
    # Lifecycle
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    
    # Assignment
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    DELEGATED = "delegated"
    
    # Progress
    STARTED = "started"
    PROGRESS_UPDATED = "progress_updated"
    BLOCKED = "blocked"
    UNBLOCKED = "unblocked"
    
    # Subtasks
    SUBTASK_ADDED = "subtask_added"
    SUBTASK_COMPLETED = "subtask_completed"
    
    # Review
    REVIEW_REQUESTED = "review_requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    
    # Completion
    COMPLETED = "completed"
    REOPENED = "reopened"

class AuditLog(BaseModel):
    """Immutable record of an action"""
    id: int                              # Auto-incrementing ID
    entity_type: str                     # "task", "project", "worker"
    entity_id: str                       # ID of affected entity
    action: AuditAction                  # What happened
    actor_id: str                        # Who did it
    actor_type: WorkerType               # Human or agent
    details: dict | None = None          # Additional context
    created_at: datetime                 # When it happened
    
    # Note: AuditLog is append-only, never modified or deleted
```

**Examples:**
```python
# Task created
AuditLog(
    id=1,
    entity_type="task",
    entity_id="1",
    action=AuditAction.CREATED,
    actor_id="@muhammad",
    actor_type=WorkerType.HUMAN,
    details={"title": "Implement MCP server", "project": "taskflow"},
    created_at=datetime.now()
)

# Task delegated
AuditLog(
    id=5,
    entity_type="task",
    entity_id="2",
    action=AuditAction.DELEGATED,
    actor_id="@claude-code",
    actor_type=WorkerType.AGENT,
    details={
        "from": "@claude-code",
        "to": "@qwen",
        "note": "Need research expertise"
    },
    created_at=datetime.now()
)

# Progress updated
AuditLog(
    id=8,
    entity_type="task",
    entity_id="1",
    action=AuditAction.PROGRESS_UPDATED,
    actor_id="@claude-code",
    actor_type=WorkerType.AGENT,
    details={
        "old_progress": 30,
        "new_progress": 60,
        "note": "Handlers implemented"
    },
    created_at=datetime.now()
)
```

### LinkedResource

Generic linking system.

```python
class ResourceAccess(str, Enum):
    READ = "read"
    WRITE = "write"

class LinkedResource(BaseModel):
    """Links tasks/projects to external resources"""
    id: int                              # Auto-incrementing ID
    owner_type: str                      # "task", "project", "blueprint"
    owner_id: str                        # ID of owner
    resource_type: str                   # "repo", "spec", "doc", "url", "task"
    resource_uri: str                    # Location/identifier
    name: str                            # Display name
    description: str | None = None       # Optional description
    access: ResourceAccess = ResourceAccess.READ  # Default read-only
    created_by: str                      # Who created link
    created_at: datetime
```

**Examples:**
```python
# Link spec to task
LinkedResource(
    id=1,
    owner_type="task",
    owner_id="1",
    resource_type="spec",
    resource_uri="./specs/mcp-server.md",
    name="MCP Server Spec",
    description=None,
    access=ResourceAccess.READ,
    created_by="@muhammad",
    created_at=datetime.now()
)

# Link repo to project
LinkedResource(
    id=2,
    owner_type="project",
    owner_id="taskflow",
    resource_type="repo",
    resource_uri="https://github.com/muhammad/taskflow",
    name="Main Repository",
    description="TaskFlow source code",
    access=ResourceAccess.READ,
    created_by="@muhammad",
    created_at=datetime.now()
)
```

### Blueprint

Reusable task patterns.

```python
class TemplateTask(BaseModel):
    """Task template within a blueprint"""
    title: str
    description: str | None = None
    default_assignee_type: WorkerType | None = None  # Prefer human or agent
    default_agent_type: AgentType | None = None      # Specific agent type
    order: int                                        # Sequence in blueprint

class Blueprint(BaseModel):
    """Reusable pattern of tasks"""
    id: str                              # Unique identifier
    name: str                            # Display name
    description: str | None = None
    template_tasks: list[TemplateTask]   # Ordered task templates
    created_by: str                      # Who created blueprint
    created_at: datetime
```

**Example:**
```python
Blueprint(
    id="feature-dev",
    name="Feature Development",
    description="Standard pattern for new features",
    template_tasks=[
        TemplateTask(
            title="Research existing solutions",
            default_assignee_type=WorkerType.AGENT,
            default_agent_type=AgentType.GEMINI,
            order=1
        ),
        TemplateTask(
            title="Write specification",
            default_assignee_type=WorkerType.HUMAN,
            order=2
        ),
        TemplateTask(
            title="Implement backend",
            default_assignee_type=WorkerType.AGENT,
            default_agent_type=AgentType.CLAUDE,
            order=3
        ),
        TemplateTask(
            title="Implement frontend",
            default_assignee_type=WorkerType.AGENT,
            default_agent_type=AgentType.CLAUDE,
            order=4
        ),
        TemplateTask(
            title="Write tests",
            default_assignee_type=WorkerType.AGENT,
            default_agent_type=AgentType.CLAUDE,
            order=5
        )
    ],
    created_by="@muhammad",
    created_at=datetime.now()
)
```

## ID Generation

### Auto-incrementing IDs

For Tasks, AuditLogs, and LinkedResources:

```python
def get_next_id(entity_type: str, data: dict) -> int:
    """Get next available ID for entity type"""
    existing = data.get(entity_type, [])
    if not existing:
        return 1
    return max(item["id"] for item in existing) + 1
```

### Subtask IDs

Subtasks use parent.child notation for display but store integer IDs:

```
Task #1 "Implement MCP server"
├── Task #2 "Design protocol"      → displays as 1.1
├── Task #3 "Implement handlers"   → displays as 1.2
└── Task #4 "Add authentication"   → displays as 1.3
```

## Relationships

```
Project (1) ──────────── (many) Task
Worker (1) ───────────── (many) Task (as assignee)
Worker (1) ───────────── (many) Task (as creator)
Task (1) ─────────────── (many) Task (parent → subtasks)
Task (1) ─────────────── (many) AuditLog
Task (1) ─────────────── (many) LinkedResource
Project (1) ──────────── (many) LinkedResource
Blueprint (1) ─────────── (many) LinkedResource
```

## Migration Path to Phase 2

These Pydantic models map directly to SQLModel:

```python
# Phase 1 (Pydantic)
class Task(BaseModel):
    id: int
    title: str
    ...

# Phase 2 (SQLModel)
class Task(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    ...
```

The data.json structure maps directly to database tables. Migration is mechanical.
