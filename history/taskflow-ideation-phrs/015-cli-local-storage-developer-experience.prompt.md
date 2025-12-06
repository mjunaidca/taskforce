---
id: 015
title: CLI-Local-Storage-Developer-Experience
stage: design
date: 2025-12-06
surface: claude.ai
model: claude-opus-4-5
feature: computer-use
branch: main
user: muhammad
command: chat
labels: [cli, storage, developer-experience]
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
Also you share like Create project (just a name, nothing else required) $ taskflow project add "taskflow" $ taskflow project add "personal" # Add agents (global, can work on any project) $ taskflow agent add @claude-code --type claude $ taskflow agent add @qwen --type qwen $ taskflow agent add @gemini --type gemini # Create tasks inside a project $ taskflow add "Implement MCP server" --project taskflow --assign @claude-code $ taskflow add "Message Ahmad" --project personal --assign @muhammad # Work happens $ taskflow start 1 $ taskflow progress 1 --percent 50 --note "Basic structure done" $ taskflow complete 1 # See what's happening $ taskflow list --project taskflow $ taskflow list --all $ taskflow audit 1


But I atually see it better as CLI so in phase 1 it starts we visaully setup projects and everything and it is saved in a file - maybe an env setups filename or something a slater we move storage. Moreover we can list evertrhing as you said?

## Response snapshot
 Yes! You're thinking about the real developer experience. Let me refine this:

---

## Phase 1: Local-First CLI with File Storage

**The flow:**

```bash
# First time - initialize TaskFlow in current directory (or home)
$ taskflow init
Created .taskflow/config.yaml
Created .taskflow/data.json
TaskFlow initialized!

# Or init in a specific location
$ taskflow init --global  # Creates ~/.taskflow/
```

**Everything stored in simple files:**

```
.taskflow/
├── config.yaml      # Settings, default project, etc.
├── data.json        # All data (projects, workers, tasks, audit logs)
└── .env             # API keys for agents (gitignored)
```

---

## Config File (.taskflow/config.yaml)

```yaml
# TaskFlow Configuration
version: "1.0"

# Default project for commands without --project flag
default_project: "taskflow"

# Current user (you)
current_user: "@muhammad"

# Storage (phase 1 = local, phase 2+ = neon)
storage:
  type: "local"  # "local" | "neon"
  path: ".taskflow/data.json"
  # Later:
  # type: "neon"
  # connection_string: "${NEON_DATABASE_URL}"

# Registered agents
agents:
  - id: "@claude-code"
    type: "claude"
    capabilities: ["coding", "architecture", "debugging"]
  - id: "@qwen"
    type: "qwen"
    capabilities: ["research", "analysis"]
  - id: "@gemini"
    type: "gemini"
    capabilities: ["research", "summarization"]

# Registered projects
projects:
  - id: "taskflow"
    name: "TaskFlow Platform"
    description: "Human-Agent Task Orchestration"
  - id: "personal"
    name: "Personal Tasks"
    description: "Non-project tasks"
```

---

## Data File (.taskflow/data.json)

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Implement MCP server",
      "project_id": "taskflow",
      "assignee_id": "@claude-code",
      "created_by_id": "@muhammad",
      "status": "in_progress",
      "progress": 50,
      "subtasks": [
        {"id": "1.1", "title": "Design protocol", "status": "completed"},
        {"id": "1.2", "title": "Implement handlers", "status": "in_progress"},
        {"id": "1.3", "title": "Add auth", "status": "pending"}
      ],
      "created_at": "2025-12-06T10:00:00Z",
      "updated_at": "2025-12-06T14:30:00Z"
    }
  ],
  "audit_logs": [
    {
      "id": 1,
      "entity_type": "task",
      "entity_id": "1",
      "action": "created",
      "actor_id": "@muhammad",
      "actor_type": "human",
      "details": {"title": "Implement MCP server"},
      "created_at": "2025-12-06T10:00:00Z"
    }
  ],
  "linked_resources": [],
  "blueprints": []
}
```

---

## CLI Flow (Natural Developer Experience)

```bash
# === SETUP (one time) ===

$ taskflow init
✓ Created .taskflow/config.yaml
✓ Created .taskflow/data.json
TaskFlow initialized in current directory.

# Add yourself
$ taskflow worker add @muhammad --type human --name "Muhammad"
✓ Added worker @muhammad (human)

# Add your agents
$ taskflow agent add @claude-code --capabilities coding,architecture
✓ Added agent @claude-code (claude)

$ taskflow agent a

[...truncated for readability - full response in transcript...]

## Outcome
- ✅ Impact: Designed file-based storage with clear migration path to database
- 🧪 Tests: none
- 📁 Files: 0 files
- 🔁 Next prompts: Final spec
- 🧠 Reflection: Design decision captured - architectural choice with rationale preserved

## Evaluation notes (flywheel)
- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (design phase)
- Prompt variant (if applicable): original
- Next experiment (smallest change to try): continue conversation flow
