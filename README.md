# TaskFlow: Human-Agent Task Orchestration Platform

**TaskFlow** is a Human-Agent Task Orchestration Platform that evolves from a local CLI tool to a cloud-native, event-driven system where humans and AI agents collaborate as equals.

**One-liner:** Your AI workforce — assign tasks to humans or agents, track everything, ship together.

This project fulfills all hackathon requirements while solving a real problem: **fragmented work across projects with no unified visibility or agent collaboration.**

---

## Why TaskFlow (The Real Problem)

### Current State: Data Silos Everywhere

| Silo | What's Trapped |
|------|----------------|
| Each GitHub repo | Specs, context, implementation details |
| Personal notes | Tasks that never become actionable |
| Chat with Claude | Context lost after each session |
| Team communication | Decisions buried in WhatsApp/Slack |

### TaskFlow Solution: Unified Orchestration Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                         TASKFLOW                                 │
│                                                                  │
│   HUMANS                              AI AGENTS                  │
│   @muhammad                           @claude-code               │
│   @hammad                             @qwen                      │
│   @wania                              @gemini                    │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  PROJECT:   │  │  PROJECT:   │  │  PROJECT:   │            │
│   │  taskflow   │  │  personal   │  │ panaversity │            │
│   │             │  │             │  │             │            │
│   │  Tasks      │  │  Tasks      │  │  Tasks      │            │
│   │  Subtasks   │  │  Subtasks   │  │  Subtasks   │            │
│   │  Audit logs │  │  Audit logs │  │  Audit logs │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│   Everything tracked. Everyone accountable. Full audit trail.   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Makes TaskFlow Different

| Traditional Task Manager | TaskFlow |
|-------------------------|----------|
| Humans only | Humans AND Agents as first-class workers |
| Static assignment | Dynamic delegation (agent → agent) |
| Manual status updates | Agents report progress via MCP |
| Single project view | Cross-project visibility |
| Trust the artifact | Trust the audit trail |
| Personal OR work | Unified: "Message Ahmad" + "Implement MCP server" |

### The Killer Feature: Agent-to-Agent Delegation

```
Task: "Research authentication patterns"
Assigned to: @claude-code
│
├── Subtask: "Survey existing solutions"
│   Delegated to: @gemini (by @claude-code)
│   Status: ✅ Completed
│
├── Subtask: "Analyze security tradeoffs"
│   Delegated to: @qwen (by @claude-code)
│   Status: 🔄 In Progress (60%)
│
└── Subtask: "Draft recommendation"
    Kept by: @claude-code
    Status: ⏳ Blocked (waiting on analysis)

AUDIT TRAIL shows every delegation, every decision.
```

---

## Data Model (Core Schema)

```python
# === CORE ENTITIES ===

class Project(SQLModel, table=True):
    """Container for related tasks"""
    id: str                          # "taskflow", "personal"
    name: str
    description: str | None
    owner_id: str
    created_at: datetime

class Worker(SQLModel, table=True):
    """Both humans and agents are workers"""
    id: str                          # "@muhammad", "@claude-code"
    type: Literal["human", "agent"]
    name: str
    agent_type: str | None           # "claude", "qwen", "gemini"
    capabilities: list[str] | None   # ["coding", "research"]
    api_key_hash: str | None         # For agent authentication
    created_at: datetime

class Task(SQLModel, table=True):
    """Unit of work — can be assigned to human or agent"""
    id: int
    title: str
    description: str | None
    project_id: str
    
    # Assignment
    assignee_id: str | None          # "@claude-code", "@muhammad"
    created_by_id: str
    
    # Hierarchy
    parent_task_id: int | None       # For subtasks
    
    # Status
    status: Literal["pending", "in_progress", "review", "completed", "blocked"]
    progress: int = 0                # 0-100
    
    # Organization (Intermediate features)
    priority: Literal["low", "medium", "high", "urgent"] | None
    tags: list[str] | None
    due_date: datetime | None
    
    # Recurrence (Advanced features)
    recurrence: str | None           # "daily", "weekly", "monthly"
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

class LinkedResource(SQLModel, table=True):
    """Generic linking — anything to anything"""
    id: int
    owner_type: Literal["project", "task", "blueprint"]
    owner_id: str
    resource_type: str               # "repo", "spec", "doc", "url", "task"
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
    template_tasks: list[dict]
    created_by: str
    created_at: datetime

class AuditLog(SQLModel, table=True):
    """Every action tracked — this is the proof"""
    id: int
    entity_type: str                 # "task", "project", "worker"
    entity_id: str
    action: str                      # "created", "assigned", "delegated", "completed"
    actor_id: str
    actor_type: Literal["human", "agent"]
    details: dict | None
    created_at: datetime

class Conversation(SQLModel, table=True):
    """Chat sessions with TaskFlow AI"""
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime

class Message(SQLModel, table=True):
    """Individual messages in conversations"""
    id: int
    conversation_id: int
    role: Literal["user", "assistant", "system"]
    content: str
    tool_calls: list[dict] | None
    created_at: datetime
```

---

## Phase Breakdown: The Evolution of TaskFlow

Each phase powers up a specific capability while meeting all hackathon requirements.

---

### Phase I: Local CLI with File Storage (Dec 7)
**Points: 100 | Core Proof of Concept**

**Objective:** Build command-line TaskFlow that proves human-agent task management works.

**Storage:** Local files (`.taskflow/config.yaml` + `.taskflow/data.json`)

**Technology Stack:**
- Python 3.13+
- UV
- Typer (CLI framework)
- Pydantic (data validation)
- Claude Code + Spec-Kit Plus

**Deliverables:**

1. **Initialization & Configuration**
```bash
$ taskflow init
✓ Created .taskflow/config.yaml
✓ Created .taskflow/data.json
TaskFlow initialized!
```

2. **Project Management**
```bash
$ taskflow project add taskflow --name "TaskFlow Platform"
$ taskflow project add personal --name "Personal Tasks"
$ taskflow project list
```

3. **Worker Management (Humans + Agents)**
```bash
$ taskflow worker add @muhammad --type human --name "Muhammad"
$ taskflow agent add @claude-code --capabilities coding,architecture
$ taskflow agent add @qwen --capabilities research,analysis
$ taskflow agent add @gemini --capabilities research,summarization
$ taskflow worker list
```

4. **Task CRUD (Basic Level Features)**
```bash
# Add Task
$ taskflow add "Implement MCP server" --project taskflow --assign @claude-code
✓ Created task #1

# View Task List
$ taskflow list
$ taskflow list --project taskflow
$ taskflow list --assignee @claude-code
$ taskflow list --status pending

# Update Task
$ taskflow edit 1 --title "Implement MCP server v2" --priority high

# Delete Task
$ taskflow delete 1

# Mark Complete
$ taskflow complete 1
```

5. **Intermediate Features**
```bash
# Priorities & Tags
$ taskflow add "Fix auth bug" --priority urgent --tags bug,security

# Search & Filter
$ taskflow list --tag bug
$ taskflow list --priority urgent

# Sort
$ taskflow list --sort due_date
$ taskflow list --sort priority
```

6. **Human-Agent Workflow**
```bash
# Agent starts task and breaks down into subtasks
$ taskflow start 1
Starting task #1...
Enter subtasks (or empty to let agent decompose):
> Design protocol
> Implement handlers
> Add authentication
✓ 3 subtasks created

# Progress tracking
$ taskflow progress 1 --percent 30 --note "Protocol designed"

# Agent delegates to another agent
$ taskflow delegate 1.2 @qwen --note "Need research first"
✓ Subtask 1.2 delegated to @qwen by @claude-code

# Request review
$ taskflow review 1

# Human approves/rejects
$ taskflow approve 1
$ taskflow reject 1 --reason "Missing tests"
```

7. **Audit Trail**
```bash
$ taskflow audit 1
TASK #1: Implement MCP server
──────────────────────────────────────────────────
[2025-12-06 10:00] created by @muhammad
[2025-12-06 10:00] assigned to @claude-code
[2025-12-06 10:05] started by @claude-code
[2025-12-06 10:05] subtask added: "Design protocol"
[2025-12-06 10:05] subtask added: "Implement handlers"
[2025-12-06 10:05] subtask added: "Add authentication"
[2025-12-06 12:00] progress: 30% "Protocol designed"
[2025-12-06 13:00] subtask 1.2 delegated to @qwen
[2025-12-06 15:00] review requested
```

8. **Linked Resources**
```bash
$ taskflow link 1 --type spec --uri "./specs/mcp.md" --name "MCP Spec"
$ taskflow links 1
```

**File Structure:**
```
.taskflow/
├── config.yaml      # Projects, workers, settings
├── data.json        # Tasks, audit logs, links
└── .env             # API keys (gitignored)
```

**Repository Structure:**
```
taskflow/
├── .spec-kit/
│   └── config.yaml
├── specs/
│   ├── constitution.md
│   ├── overview.md
│   ├── phase-1/
│   │   ├── cli-interface.md
│   │   ├── data-model.md
│   │   └── storage.md
│   └── features/
│       ├── task-crud.md
│       ├── human-agent-assignment.md
│       └── audit-trail.md
├── cli/
│   ├── CLAUDE.md
│   ├── pyproject.toml
│   └── src/taskflow/
│       ├── __init__.py
│       ├── main.py
│       ├── models.py
│       ├── storage.py
│       └── commands/
├── CLAUDE.md
└── README.md
```

---

### Phase II: Full-Stack Web Application (Dec 14)
**Points: 150 | Multi-User + Persistence**

**Objective:** Transform CLI into multi-user web app with real database.

**What Changes:**
- Storage moves from local files to Neon PostgreSQL
- Web UI for humans (Next.js)
- REST API (FastAPI)
- Authentication via Better Auth (reuse from Hackathon 1 SSO)

**Technology Stack:**
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16+ (App Router), TypeScript, Tailwind |
| Backend | Python FastAPI |
| ORM | SQLModel |
| Database | Neon Serverless PostgreSQL |
| Auth | Better Auth with JWT/JWKS |

**Architecture:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   FastAPI       │────▶│   Neon DB       │
│   (Humans)      │     │   Backend       │     │   (PostgreSQL)  │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │                      ▼
         │              ┌─────────────────┐
         └─────────────▶│ Hackathon 1 SSO │
                        │ (Better Auth)   │
                        └─────────────────┘
```

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/{id}/tasks | List tasks in project |
| POST | /api/projects/{id}/tasks | Create task |
| GET | /api/tasks/{id} | Get task with subtasks |
| PUT | /api/tasks/{id} | Update task |
| DELETE | /api/tasks/{id} | Delete task |
| POST | /api/tasks/{id}/start | Start task |
| POST | /api/tasks/{id}/subtasks | Add subtask |
| PATCH | /api/tasks/{id}/progress | Update progress |
| POST | /api/tasks/{id}/delegate | Delegate subtask |
| POST | /api/tasks/{id}/review | Request review |
| POST | /api/tasks/{id}/approve | Approve |
| POST | /api/tasks/{id}/reject | Reject |
| GET | /api/tasks/{id}/audit | Get audit trail |
| GET | /api/workers | List workers |
| POST | /api/workers | Register worker/agent |

**CLI Migration:**
```bash
# One command migrates local data to cloud
$ taskflow migrate --to neon
Migrating 15 tasks, 3 projects, 45 audit logs...
✓ Migration complete. Storage: neon
```

**Repository Structure:**
```
taskflow/
├── specs/
│   ├── phase-2/
│   │   ├── api-endpoints.md
│   │   ├── database-schema.md
│   │   ├── authentication.md
│   │   └── frontend-components.md
├── cli/                    # Phase 1 CLI (still works)
├── frontend/
│   ├── CLAUDE.md
│   └── ... (Next.js app)
├── backend/
│   ├── CLAUDE.md
│   └── ... (FastAPI app)
├── docker-compose.yml
└── README.md
```

---

### Phase III: AI-Powered TaskFlow with MCP (Dec 21)
**Points: 200 | Agent Gateway**

**Objective:** Agents connect via MCP, humans chat via natural language.

**What Changes:**
- MCP Server for agent connections
- Chat interface with OpenAI ChatKit
- OpenAI Agents SDK for orchestration
- Agents can work autonomously

**Technology Stack:**
| Component | Technology |
|-----------|------------|
| Chat UI | OpenAI ChatKit |
| AI Framework | OpenAI Agents SDK |
| MCP Server | Official MCP SDK |
| Backend | FastAPI |
| Database | Neon PostgreSQL |

**Architecture:**
```
┌─────────────────┐     ┌─────────────────────────────────────────────────┐
│   ChatKit UI    │     │              TaskFlow Backend                    │
│   (Human Chat)  │────▶│                                                 │
└─────────────────┘     │  ┌─────────────┐    ┌─────────────────────────┐│
                        │  │ Chat API    │    │     MCP Server          ││
┌─────────────────┐     │  │ /api/chat   │    │  (Agent Connections)    ││
│   Web UI        │────▶│  └──────┬──────┘    └───────────┬─────────────┘│
│   (Dashboard)   │     │         │                       │              │
└─────────────────┘     │         ▼                       ▼              │
                        │  ┌──────────────────────────────────────────┐  │
                        │  │         OpenAI Agents SDK                │  │
                        │  │         (Orchestration Layer)            │  │
                        │  └──────────────────────────────────────────┘  │
                        └─────────────────────────────────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────┐
              │                               │                           │
              ▼                               ▼                           ▼
      ┌───────────────┐               ┌───────────────┐           ┌───────────────┐
      │ @claude-code  │               │    @qwen      │           │   @gemini     │
      │ (MCP Client)  │               │ (MCP Client)  │           │ (MCP Client)  │
      └───────────────┘               └───────────────┘           └───────────────┘
```

**MCP Tools Specification:**

| Tool | Purpose | Parameters |
|------|---------|------------|
| `list_my_tasks` | Get tasks assigned to this agent | `agent_id`, `status?`, `project?` |
| `get_task_details` | Get full task context | `task_id` |
| `claim_task` | Start working on task | `task_id` |
| `add_subtask` | Break down work | `task_id`, `title`, `assignee?` |
| `delegate_subtask` | Assign to another agent | `subtask_id`, `agent_id`, `note?` |
| `update_progress` | Report status | `task_id`, `percent`, `note?` |
| `complete_subtask` | Mark subtask done | `subtask_id` |
| `request_review` | Flag for human approval | `task_id` |

**Chat Interface Examples:**

```
You: "What's on my plate today?"

TaskFlow AI: Based on your tasks:

URGENT:
- #12 "Phase 1 submission" (due today)
- #15 "Message Ahmad about RTJ" (personal)

IN PROGRESS (agents working):
- #8 @claude-code: "MCP implementation" (70%)
- #9 @qwen: "Auth research" (completed, awaiting review)

BLOCKED:
- #11 "Choose auth pattern" — waiting for your decision

Shall I show details on any of these?
```

```
You: "Assign the research task to @gemini"

TaskFlow AI: Created task #23 "Research task" assigned to @gemini.
@gemini will report progress. I'll notify you when complete.
```

**Agent Authentication:**
- Agents authenticate with API keys (generated in UI)
- API key tied to agent identity
- All actions logged with agent actor

---

### Phase IV: Local Kubernetes Deployment (Jan 4)
**Points: 250 | Cloud-Native Local**

**Objective:** Deploy TaskFlow on local Kubernetes with AI-assisted operations.

**Technology Stack:**
| Component | Technology |
|-----------|------------|
| Containerization | Docker + Gordon |
| Orchestration | Kubernetes (Minikube) |
| Package Manager | Helm Charts |
| AI DevOps | kubectl-ai, Kagent |

**Architecture:**
```
┌────────────────────────────────────────────────────────────────────────┐
│                         MINIKUBE CLUSTER                                │
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │
│  │   Frontend      │   │   Backend       │   │   MCP Server    │      │
│  │   Deployment    │   │   Deployment    │   │   Deployment    │      │
│  │   (Next.js)     │   │   (FastAPI)     │   │   (Python)      │      │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘      │
│           │                     │                     │                │
│           └─────────────────────┴─────────────────────┘                │
│                                 │                                       │
│                    ┌────────────▼────────────┐                         │
│                    │    Ingress Controller   │                         │
│                    └────────────┬────────────┘                         │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Neon DB (External)      │
                    └───────────────────────────┘
```

**AIOps Commands:**
```bash
# Docker AI (Gordon)
$ docker ai "build the taskflow backend image"
$ docker ai "optimize the Dockerfile for production"

# kubectl-ai
$ kubectl-ai "deploy taskflow with 2 backend replicas"
$ kubectl-ai "check why the mcp-server pod is failing"
$ kubectl-ai "scale frontend to handle more traffic"

# Kagent
$ kagent "analyze cluster health"
$ kagent "suggest resource optimizations"
```

**Helm Charts:**
```
helm/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── frontend-deployment.yaml
    ├── backend-deployment.yaml
    ├── mcp-server-deployment.yaml
    ├── services.yaml
    ├── ingress.yaml
    └── configmap.yaml
```

---

### Phase V: Production Cloud Deployment (Jan 18)
**Points: 300 | Event-Driven + Global**

**Objective:** Deploy to production Kubernetes with event-driven architecture.

**What's Added:**
- DigitalOcean Kubernetes (DOKS)
- Kafka via Redpanda Cloud
- Dapr for service mesh
- Advanced features (recurring tasks, reminders)
- CI/CD via GitHub Actions

**Technology Stack:**
| Component | Technology |
|-----------|------------|
| Cloud K8s | DigitalOcean DOKS |
| Event Streaming | Kafka (Redpanda Cloud) |
| Service Mesh | Dapr |
| CI/CD | GitHub Actions |

**Event-Driven Architecture:**
```
┌────────────────────────────────────────────────────────────────────────┐
│                    DIGITALOCEAN KUBERNETES (DOKS)                       │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                     DAPR SIDECARS                               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐   │   │
│  │  │Frontend │  │Backend  │  │MCP      │  │Notification     │   │   │
│  │  │+ Dapr   │  │+ Dapr   │  │+ Dapr   │  │Service + Dapr   │   │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘   │   │
│  │       │            │            │                │             │   │
│  └───────┴────────────┴────────────┴────────────────┴─────────────┘   │
│                                    │                                    │
│                       ┌────────────▼────────────┐                      │
│                       │     DAPR COMPONENTS     │                      │
│                       │  ┌──────────────────┐   │                      │
│                       │  │ pubsub.kafka     │───┼──▶ Redpanda Cloud    │
│                       │  │ state.postgresql │───┼──▶ Neon DB           │
│                       │  │ bindings.cron    │   │   (Reminders)        │
│                       │  │ secretstores.k8s │   │   (API Keys)         │
│                       │  └──────────────────┘   │                      │
│                       └─────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────┘
```

**Kafka Topics:**

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `task-events` | Backend | Audit Service | All CRUD operations |
| `agent-progress` | MCP Server | Dashboard | Real-time progress |
| `review-requests` | MCP Server | Notification | Alert humans |
| `reminders` | Cron Binding | Notification | Due date alerts |

**Advanced Features:**

```bash
# Recurring tasks
$ taskflow add "Weekly standup" --recurrence weekly --assign @muhammad

# Due dates with reminders
$ taskflow add "Submit phase 5" --due "2025-01-18 20:00" --remind "1 hour before"

# Priority-based sorting
$ taskflow list --sort priority --status pending
```

**CI/CD Pipeline:**
```yaml
# .github/workflows/deploy.yaml
name: Deploy TaskFlow
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: docker-compose build
      - name: Push to registry
        run: docker-compose push
      - name: Deploy to DOKS
        run: helm upgrade --install taskflow ./helm
```

---

## Bonus Features Implementation

| Bonus | Points | Implementation |
|-------|--------|----------------|
| **Human-Agent Platform** | +300 | Core feature — agents are first-class workers |
| **Reusable Intelligence (Blueprints)** | +200 | `taskflow blueprint` commands |
| **Cloud-Native Blueprints** | +200 | Helm charts + kubectl-ai patterns |
| **Multi-language (Urdu)** | +100 | Chat understands Urdu commands |
| **Voice Commands** | +200 | Browser speech-to-text → chat |
| **TOTAL** | +1000 | |

**Blueprint Example:**
```bash
# Create blueprint
$ taskflow blueprint add feature-dev --name "Feature Development"
$ taskflow blueprint tasks feature-dev
> Research existing solutions [@gemini]
> Write spec [@human]
> Implement backend [@claude-code]
> Implement frontend [@claude-code]
> Write tests [@claude-code]
> Deploy [@claude-code]

# Use blueprint
$ taskflow add "Add recurring tasks" --blueprint feature-dev
✓ Created task #50 with 6 subtasks from blueprint
```

---

## Repository Final Structure

```
taskflow/
├── .spec-kit/
│   └── config.yaml
├── specs/
│   ├── constitution.md
│   ├── overview.md
│   ├── architecture.md
│   ├── data-model/
│   │   ├── core-entities.md
│   │   └── audit-system.md
│   ├── features/
│   │   ├── task-crud.md
│   │   ├── human-agent-assignment.md
│   │   ├── agent-delegation.md
│   │   ├── audit-trail.md
│   │   ├── linked-resources.md
│   │   ├── blueprints.md
│   │   └── chat-interface.md
│   ├── api/
│   │   ├── rest-endpoints.md
│   │   └── mcp-tools.md
│   └── phases/
│       ├── phase-1-cli.md
│       ├── phase-2-web.md
│       ├── phase-3-mcp.md
│       ├── phase-4-k8s.md
│       └── phase-5-cloud.md
├── cli/
│   ├── CLAUDE.md
│   ├── pyproject.toml
│   └── src/taskflow/
├── frontend/
│   ├── CLAUDE.md
│   └── ... (Next.js)
├── backend/
│   ├── CLAUDE.md
│   └── ... (FastAPI)
├── mcp-server/
│   ├── CLAUDE.md
│   └── ... (MCP SDK)
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── .github/
│   └── workflows/
│       └── deploy.yaml
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

---

## Submission Checklist

| Phase | Due | Deliverables |
|-------|-----|--------------|
| I | Dec 7 | CLI + GitHub + Demo Video |
| II | Dec 14 | Web App + Vercel + API URL |
| III | Dec 21 | Chat + MCP Server |
| IV | Jan 4 | Minikube Instructions |
| V | Jan 18 | DOKS URL + Full Demo |

---

## The Meta-Lesson

This project proves:

1. **AI-native learning works** — spec evolution shows real understanding
2. **The constraint is the curriculum** — "cannot write code manually" forces thinking
3. **Human-agent collaboration is the future** — TaskFlow demonstrates it
4. **Process is proof** — audit trail shows who did what
