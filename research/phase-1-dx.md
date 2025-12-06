Yes! That's elegant. A generic linking system that can point to anything:

---

## Generic Linked Resources

```python
class LinkedResource(SQLModel, table=True):
    """Anything can link to anything - repos, specs, docs, other tasks, external URLs"""
    id: int
    
    # What owns this link
    owner_type: Literal["project", "task", "blueprint"]
    owner_id: str  # project_id, task_id, or blueprint_id
    
    # What it points to
    resource_type: Literal["repo", "spec", "doc", "url", "task", "blueprint"]
    resource_uri: str  # GitHub URL, file path, task ID, whatever
    
    # Metadata
    name: str  # Human-readable label
    description: str | None
    
    # Access control
    access: Literal["read", "write"] = "read"  # Default read-only
    
    created_by: str
    created_at: datetime
```

---

## How It Works

**Task links to a spec:**
```python
LinkedResource(
    owner_type="task",
    owner_id="1",
    resource_type="spec",
    resource_uri="github.com/muhammad/taskflow/specs/mcp-auth.md",
    name="MCP Auth Spec",
    access="read"
)
```

**Project links to its repo:**
```python
LinkedResource(
    owner_type="project",
    owner_id="taskflow",
    resource_type="repo",
    resource_uri="github.com/muhammad/taskflow",
    name="Main Repo",
    access="read"
)
```

**Blueprint links to template spec:**
```python
LinkedResource(
    owner_type="blueprint",
    owner_id="feature-development",
    resource_type="spec",
    resource_uri="github.com/muhammad/templates/feature-spec-template.md",
    name="Feature Spec Template",
    access="read"
)
```

**Task links to another task (dependency):**
```python
LinkedResource(
    owner_type="task",
    owner_id="5",
    resource_type="task",
    resource_uri="3",  # Task #3
    name="Blocked by auth implementation",
    access="read"
)
```

---

## CLI Usage

```bash
# Link a spec to a task
$ taskflow link 1 --type spec --uri "github.com/muhammad/taskflow/specs/auth.md" --name "Auth Spec"
Linked "Auth Spec" to task #1 (read-only)

# Link repo to project
$ taskflow link --project taskflow --type repo --uri "github.com/muhammad/taskflow" --name "Main Repo"
Linked "Main Repo" to project taskflow (read-only)

# See all links for a task
$ taskflow links 1
Task #1 "Implement MCP auth" links:
  [spec] Auth Spec → github.com/muhammad/taskflow/specs/auth.md (read)
  [task] Depends on → Task #3 "Setup FastAPI" (read)

# Link with write access (rare)
$ taskflow link 1 --type doc --uri "notion.so/shared-doc" --name "Design Doc" --access write
```

---

## Simplified Data Model (Complete)

```python
# === CORE ENTITIES ===

class Project(SQLModel, table=True):
    id: str
    name: str
    description: str | None
    owner_id: str
    created_at: datetime

class Worker(SQLModel, table=True):
    id: str  # "@muhammad", "@claude-code"
    type: Literal["human", "agent"]
    name: str
    agent_type: str | None  # "claude", "qwen", "gemini" (for agents)
    capabilities: list[str] | None
    api_key_hash: str | None  # For agent auth
    created_at: datetime

class Task(SQLModel, table=True):
    id: int
    title: str
    description: str | None
    project_id: str
    
    assignee_id: str | None
    created_by_id: str
    parent_task_id: int | None
    
    status: Literal["pending", "in_progress", "review", "completed", "blocked"]
    progress: int = 0
    
    priority: Literal["low", "medium", "high", "urgent"] | None
    tags: list[str] | None
    due_date: datetime | None
    recurrence: str | None  # "daily", "weekly", etc.
    
    created_at: datetime
    updated_at: datetime

class LinkedResource(SQLModel, table=True):
    """Generic linking - anything to anything"""
    id: int
    owner_type: Literal["project", "task", "blueprint"]
    owner_id: str
    resource_type: str  # "repo", "spec", "doc", "url", "task", "blueprint", anything
    resource_uri: str
    name: str
    description: str | None
    access: Literal["read", "write"] = "read"
    created_by: str
    created_at: datetime

class Blueprint(SQLModel, table=True):
    """Reusable task patterns"""
    id: str
    name: str
    description: str | None
    template_tasks: list[dict]  # Task templates
    created_by: str
    created_at: datetime

class AuditLog(SQLModel, table=True):
    """Everything tracked"""
    id: int
    entity_type: str
    entity_id: str
    action: str
    actor_id: str
    actor_type: Literal["human", "agent"]
    details: dict | None
    created_at: datetime

class Conversation(SQLModel, table=True):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime

class Message(SQLModel, table=True):
    id: int
    conversation_id: int
    role: Literal["user", "assistant", "system"]
    content: str
    tool_calls: list[dict] | None
    created_at: datetime
```

---

## What This Enables

| Use Case | How LinkedResource Handles It |
|----------|------------------------------|
| Task needs a spec for context | Link spec URL to task |
| Project has a repo | Link repo URL to project |
| Task depends on another task | Link task to task |
| Blueprint references a template | Link template to blueprint |
| Task needs external doc | Link Notion/Google Doc URL |
| Agent needs API reference | Link docs URL to task |

**All read-only by default. Write access is opt-in.**

**TaskFlow never fetches or modifies linked resources.** It just stores the links. Agents/humans follow the links when they need context.

---

## Phase 1 Scope (Final)

For the CLI:

```bash
# Projects
taskflow project add <name>
taskflow project list

# Workers (humans + agents)  
taskflow worker add <id> --type human|agent [--agent-type claude|qwen|gemini]
taskflow worker list

# Tasks
taskflow add <title> --project <project> [--assign <worker>] [--priority <p>] [--tags <t>]
taskflow list [--project <p>] [--status <s>] [--assignee <a>]
taskflow show <task_id>
taskflow start <task_id>  # Creates subtasks if agent
taskflow progress <task_id> --percent <n> [--note <text>]
taskflow complete <task_id>
taskflow delegate <task_id> <worker_id>

# Links
taskflow link <task_id> --type <type> --uri <uri> --name <name>
taskflow links <task_id>

# Audit
taskflow audit <task_id>
taskflow audit --project <project>
```

---

**This is clean, extensible, and doesn't over-engineer.**

Ready to write the constitution and Phase 1 spec for Claude Code?
