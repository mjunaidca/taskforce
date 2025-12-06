---
id: 013
title: Isolated-Projects-No-Repo-Sync
stage: design
date: 2025-12-06
surface: claude.ai
model: claude-opus-4-5
feature: computer-use
branch: main
user: muhammad
command: chat
labels: [architecture, isolation, simplification]
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
At start we can even isolate so no need ot share repos anyway? Within a project there are monorepos etc. And if we share it can be read only resource as everything int askflow is happening inside a project?

## Response snapshot
 Yes, exactly. Let me clarify this simpler model:

---

## The Isolated Model (What We Actually Need)

```
┌─────────────────────────────────────────────────────────────────┐
│                         TASKFLOW                                 │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    PROJECT:     │  │    PROJECT:     │  │    PROJECT:     │  │
│  │    taskflow     │  │  hackathon-sso  │  │    personal     │  │
│  │                 │  │                 │  │                 │  │
│  │  - Tasks        │  │  - Tasks        │  │  - Tasks        │  │
│  │  - Subtasks     │  │  - Subtasks     │  │  - Subtasks     │  │
│  │  - Audit logs   │  │  - Audit logs   │  │  - Audit logs   │  │
│  │  - Agents       │  │  - Agents       │  │  - Agents       │  │
│  │                 │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│         Everything happens INSIDE TaskFlow.                      │
│         Repos are just metadata (optional URL field).            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** TaskFlow doesn't need to know what's in your repos. It just tracks:
- What needs to be done (tasks)
- Who's doing it (human or agent)
- What happened (audit trail)

**The actual work happens in the repo.** TaskFlow is the orchestration layer, not the execution layer.

---

## How This Actually Works

**Scenario: You're working on TaskFlow (this project)**

```
# In TaskFlow (the platform)
Task #1: "Implement MCP authentication"
  - Assigned to: @claude-code
  - Project: taskflow
  - Status: in_progress
  
# In your terminal (the actual work)
$ cd ~/projects/taskflow
$ claude-code
> "Implement MCP authentication based on the spec in specs/api/mcp-auth.md"
```

**TaskFlow tracks the task. Claude Code does the work in the repo.**

When Claude is done:
```
# Claude updates TaskFlow via MCP
MCP call: update_progress(task_id=1, percent=100, note="Implemented, tests passing")
MCP call: request_review(task_id=1)
```

**TaskFlow never touches the repo.** It just knows the task is done.

---

## Simplified Data Model

```python
class Project(SQLModel, table=True):
    id: str  # "taskflow", "hackathon-sso", "personal"
    name: str
    description: str | None
    repo_url: str | None  # OPTIONAL - just metadata, not used for anything
    owner_id: str  # User who owns this project
    created_at: datetime

class Task(SQLModel, table=True):
    id: int
    title: str
    description: str | None
    project_id: str  # Tasks live INSIDE a project
    
    # Assignment
    assignee_id: str | None  # "@claude-code", "@muhammad", "@qwen"
    created_by_id: str
    
    # Hierarchy
    parent_task_id: int | None
    
    # Status


[...truncated for readability - full response in transcript...]

## Outcome
- ✅ Impact: Decided against repo syncing - TaskFlow stays isolated as orchestration layer
- 🧪 Tests: none
- 📁 Files: 0 files
- 🔁 Next prompts: Linked resources
- 🧠 Reflection: Design decision captured - architectural choice with rationale preserved

## Evaluation notes (flywheel)
- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (design phase)
- Prompt variant (if applicable): original
- Next experiment (smallest change to try): continue conversation flow
