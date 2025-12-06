---
id: 014
title: Generic-Linked-Resources-Model
stage: design
date: 2025-12-06
surface: claude.ai
model: claude-opus-4-5
feature: computer-use
branch: main
user: muhammad
command: chat
labels: [data-model, linked-resources, extensibility]
links:
  spec: # none yet
  ticket: # none
  adr: # none
  pr: # none
files:
  # none
tests:
  # none
---
## Prompt
linked_specs and repos can become just actually linked_blueprints() it can be anything and scoped default to read only?

## Response snapshot
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
    api_key_

[...truncated for readability - full response in transcript...]

## Outcome
- ✅ Impact: Designed generic LinkedResource model for future extensibility
- 🧪 Tests: none
- 📁 Files: 0 files
- 🔁 Next prompts: CLI flow
- 🧠 Reflection: Design decision captured - architectural choice with rationale preserved

## Evaluation notes (flywheel)
- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (design phase)
- Prompt variant (if applicable): original
- Next experiment (smallest change to try): continue conversation flow
