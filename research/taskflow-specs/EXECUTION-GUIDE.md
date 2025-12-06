# TaskFlow Execution Guide

## Mission Statement

**Build TaskFlow: The platform that proves AI-native development works by being the tool that manages AI-native development.**

---

## Your Schedule

| Block | Duration | Target |
|-------|----------|--------|
| Sprint 1 | 69 minutes | Phase 1 Complete |
| Class | 2 hours | Break |
| Sprint 2 | 12 hours | Phases 2, 3, 4 Complete |
| Sprint 3 | Remaining | Phase 5 + Polish |

---

# PHASE 1: PROVE THE CONCEPT

## ⏱️ Target: 69 Minutes

### Business Directive

> **Ship a working CLI that shows humans and AI agents can be managed as equal workers.**

This is your proof of concept. When someone runs `taskflow list`, they see @muhammad and @claude-code side by side. That's the entire pitch visualized.

### Success Criteria (Non-Negotiable)

- [ ] `taskflow init` creates `.taskflow/` directory
- [ ] Can register human: `taskflow worker add @muhammad --type human`
- [ ] Can register agent: `taskflow agent add @claude-code`
- [ ] Can create task: `taskflow add "Ship TaskFlow" --assign @claude-code`
- [ ] Can see audit: `taskflow audit 1`
- [ ] Demo video recordable

### Execution Approach

```bash
# Open Claude Code in the taskflow directory
cd /path/to/taskflow
claude

# Give this SINGLE prompt:
```

**Prompt for Claude Code:**

```
Read CLAUDE.md first, then specs/constitution.md, then specs/phase-1/.

Implement TaskFlow CLI in this order:
1. src/taskflow/models.py - All Pydantic models
2. src/taskflow/storage.py - Load/save config.yaml and data.json
3. src/taskflow/services.py - Business logic + audit logging
4. src/taskflow/main.py - Typer app with commands

Start with a MINIMAL working version:
- init, project add, worker add, agent add
- add task, list tasks, show task
- start, progress, complete
- audit

Skip for now: blueprints, links, filtering, colors

Just make it WORK. We polish later.
```

### Time Allocation

| Task | Minutes |
|------|---------|
| Claude Code reads specs | 5 |
| Models + Storage | 15 |
| Services + Basic Commands | 30 |
| Testing + Fixes | 15 |
| Quick Demo Recording | 4 |
| **Total** | **69** |

### What to Skip (Do in Phase 2+)

- Rich formatting (just print works)
- Blueprints
- Linked resources
- Search/filter/sort
- Colors and emojis

### Demo Script (90 seconds)

```bash
# Initialize
taskflow init
# "TaskFlow initialized!"

# Setup
taskflow project add taskflow --name "TaskFlow Platform"
taskflow worker add @muhammad --type human
taskflow agent add @claude-code --capabilities coding

# Create task
taskflow add "Implement MCP server" --project taskflow --assign @claude-code

# Show task
taskflow show 1

# Start (skip subtask prompt for demo)
taskflow start 1 --no-subtasks

# Progress
taskflow progress 1 --percent 50 --note "Halfway there"

# Complete
taskflow complete 1

# Audit trail
taskflow audit 1
# Shows: created → assigned → started → progress → completed
```

---

# PHASE 2: MULTI-USER WEB APP

## ⏱️ Target: 4 Hours

### Business Directive

> **Make TaskFlow accessible to teams via web UI with secure authentication.**

Now multiple people can use TaskFlow. The Hackathon 1 SSO handles auth. Focus on the API and a clean UI.

### Success Criteria

- [ ] FastAPI backend with all endpoints
- [ ] Next.js frontend with task list/create/edit
- [ ] Authentication via Hackathon 1 SSO (Better Auth)
- [ ] Neon PostgreSQL storing all data
- [ ] Deployed on Vercel

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   FastAPI   │────▶│    Neon     │
│   (Vercel)  │     │   (Vercel)  │     │ PostgreSQL  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       └───────────────────┴──▶ Hackathon 1 SSO
```

### Execution Approach

**Prompt for Claude Code:**

```
Read specs/phase-2/. We're building the web app.

BACKEND FIRST:
1. backend/models.py - SQLModel versions of Phase 1 models
2. backend/database.py - Neon connection
3. backend/auth.py - JWT verification from Hackathon 1 SSO
4. backend/api/ - FastAPI routers for projects, tasks, workers, audit
5. backend/main.py - FastAPI app

FRONTEND SECOND:
1. frontend/ - Next.js 15 app router
2. /app/page.tsx - Dashboard with task list
3. /app/tasks/[id]/page.tsx - Task detail
4. /app/projects/page.tsx - Project list
5. Auth integration with Better Auth

Keep UI minimal. Functionality over beauty.
```

### Time Allocation

| Task | Hours |
|------|-------|
| Backend models + database | 0.5 |
| API endpoints | 1.5 |
| Frontend scaffold | 0.5 |
| Frontend pages | 1.0 |
| Auth integration | 0.3 |
| Deploy + test | 0.2 |
| **Total** | **4** |

### Key Decisions

- **Reuse Hackathon 1 SSO** - Don't rebuild auth
- **SQLModel** - Same structure as Pydantic, just add `table=True`
- **Minimal UI** - shadcn components, no custom design
- **Vercel deploy** - Both frontend and backend

---

# PHASE 3: AGENTS SPEAK MCP

## ⏱️ Target: 4 Hours

### Business Directive

> **Let AI agents connect to TaskFlow and manage their own work autonomously.**

This is where TaskFlow becomes real. @claude-code can actually query its tasks, update progress, and delegate to @qwen.

### Success Criteria

- [ ] MCP server running with task tools
- [ ] Agent can list its tasks via MCP
- [ ] Agent can update progress via MCP
- [ ] Agent can create subtasks via MCP
- [ ] Chat interface for humans (OpenAI ChatKit)
- [ ] All actions logged with agent identity

### Architecture

```
┌─────────────┐                    ┌─────────────┐
│  Human via  │───────────────────▶│             │
│   ChatKit   │                    │   FastAPI   │
└─────────────┘                    │      +      │──▶ Neon DB
                                   │ MCP Server  │
┌─────────────┐                    │             │
│ Agent via   │───────────────────▶│             │
│    MCP      │                    └─────────────┘
└─────────────┘
```

### Execution Approach

**Prompt for Claude Code:**

```
Read specs/phase-3/. We're adding MCP server and chat.

MCP SERVER:
1. mcp-server/tools.py - MCP tool definitions:
   - list_my_tasks(assignee_id)
   - get_task(task_id)
   - update_progress(task_id, percent, note)
   - add_subtask(parent_id, title)
   - complete_task(task_id)
   - delegate_task(task_id, to_worker_id)

2. mcp-server/auth.py - API key auth for agents
3. mcp-server/main.py - MCP server setup

CHAT INTERFACE:
1. frontend/app/chat/page.tsx - ChatKit integration
2. Natural language → TaskFlow actions
3. "What's on my plate?" → list_my_tasks
4. "Assign X to @gemini" → create + assign

Agent API keys generated in UI, stored in workers table.
```

### Time Allocation

| Task | Hours |
|------|-------|
| MCP tools implementation | 1.5 |
| Agent auth (API keys) | 0.5 |
| MCP server setup | 0.5 |
| Chat interface | 1.0 |
| Integration testing | 0.5 |
| **Total** | **4** |

### Key Decisions

- **Official MCP SDK** - Not custom implementation
- **API keys for agents** - Different from human JWT auth
- **OpenAI ChatKit** - Pre-built chat UI
- **Agent identity preserved** - All audit logs show which agent acted

---

# PHASE 4: CONTAINERIZE & ORCHESTRATE

## ⏱️ Target: 4 Hours

### Business Directive

> **Package TaskFlow for deployment anywhere using Kubernetes.**

Prove you can deploy professionally. Minikube locally, ready for cloud.

### Success Criteria

- [ ] Dockerfile for backend
- [ ] Dockerfile for frontend
- [ ] Dockerfile for MCP server
- [ ] Helm chart for full stack
- [ ] `minikube start` → `helm install` → Working app
- [ ] kubectl-ai / docker-ai demonstrated

### Architecture

```
┌─────────────────────────────────────────┐
│              Kubernetes                 │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐  │
│  │Frontend │ │ Backend │ │MCP Server │  │
│  │  Pod    │ │   Pod   │ │    Pod    │  │
│  └────┬────┘ └────┬────┘ └─────┬─────┘  │
│       └──────────┬┴────────────┘        │
│            ┌─────┴─────┐                │
│            │  Ingress  │                │
│            └───────────┘                │
└─────────────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │   Neon    │ (external)
              └───────────┘
```

### Execution Approach

**Prompt for Claude Code:**

```
Read specs/phase-4/. We're containerizing.

DOCKERFILES:
1. backend/Dockerfile - Python FastAPI
2. frontend/Dockerfile - Next.js standalone
3. mcp-server/Dockerfile - Python MCP

HELM CHARTS:
1. helm/taskflow/Chart.yaml
2. helm/taskflow/values.yaml
3. helm/taskflow/templates/
   - backend-deployment.yaml
   - frontend-deployment.yaml
   - mcp-server-deployment.yaml
   - services.yaml
   - ingress.yaml
   - configmap.yaml
   - secrets.yaml

Use AIOps tools where possible:
- docker ai "optimize backend Dockerfile"
- kubectl-ai "create ingress for taskflow"
```

### Time Allocation

| Task | Hours |
|------|-------|
| Dockerfiles (3) | 1.0 |
| Helm chart structure | 0.5 |
| Deployment yamls | 1.0 |
| Services + Ingress | 0.5 |
| Minikube testing | 0.5 |
| AIOps demonstration | 0.5 |
| **Total** | **4** |

### Key Decisions

- **Neon stays external** - Don't containerize database
- **Single Helm chart** - All services in one chart
- **Values override** - Different values for dev/prod
- **AIOps showcase** - Use docker-ai, kubectl-ai, kagent

---

# PHASE 5: PRODUCTION CLOUD

## ⏱️ Target: Remaining Time

### Business Directive

> **Deploy TaskFlow to production with event-driven architecture and advanced features.**

This is the polished product. Real URL, real users, real value.

### Success Criteria

- [ ] Running on DigitalOcean DOKS
- [ ] Kafka (Redpanda Cloud) for events
- [ ] Dapr sidecars for pub/sub
- [ ] Recurring tasks working
- [ ] Due date reminders
- [ ] GitHub Actions CI/CD
- [ ] Production URL live

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    DOKS Cluster                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Dapr Sidecars                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │   │
│  │  │Frontend │ │ Backend │ │ Notification  │  │   │
│  │  │ + Dapr  │ │ + Dapr  │ │   Service     │  │   │
│  │  └─────────┘ └─────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
│                        │                            │
│                   ┌────┴────┐                       │
│                   │  Kafka  │ (Redpanda Cloud)     │
│                   └─────────┘                       │
└─────────────────────────────────────────────────────┘
```

### Execution Approach

**Prompt for Claude Code:**

```
Read specs/phase-5/. Production deployment.

KAFKA EVENTS:
1. Topics: task-created, task-updated, task-completed, reminder-due
2. Backend publishes events via Dapr pub/sub
3. Notification service consumes events

DAPR INTEGRATION:
1. Pub/Sub component for Kafka
2. Bindings for cron (recurring tasks)
3. Secrets for API keys

ADVANCED FEATURES:
1. Recurring tasks (cron expression in task)
2. Due date reminders (check daily, notify if due soon)
3. Priority-based dashboard sorting

CI/CD:
1. .github/workflows/deploy.yaml
2. Build → Test → Push → Helm upgrade
```

### Time Allocation

| Task | Hours |
|------|-------|
| DOKS cluster setup | 0.5 |
| Kafka/Redpanda setup | 0.5 |
| Dapr components | 1.0 |
| Event publishing | 1.0 |
| Notification service | 1.0 |
| Recurring tasks | 1.0 |
| CI/CD pipeline | 0.5 |
| Testing + polish | 0.5 |
| **Total** | **6** |

---

# BONUS FEATURES CHECKLIST

| Feature | Points | Phase | Status |
|---------|--------|-------|--------|
| Human-Agent Platform | +300 | 1 | Core architecture |
| Reusable Intelligence (Blueprints) | +200 | 1-2 | Blueprint system |
| Cloud-Native Blueprints | +200 | 4-5 | Helm + kubectl-ai |
| Multi-language (Urdu) | +100 | 3 | Chat interface |
| Voice Commands | +200 | 3 | Browser speech-to-text |

---

# EXECUTION COMMANDS CHEATSHEET

## Phase 1 Start
```bash
cd taskflow
claude
# Paste the Phase 1 prompt
```

## Phase 2 Start
```bash
# After Phase 1, in same session:
# "Now let's build Phase 2. Read specs/phase-2/ and implement the web app."
```

## Phase 3 Start
```bash
# "Now Phase 3. Read specs/phase-3/ and add MCP server + chat interface."
```

## Phase 4 Start
```bash
# "Now Phase 4. Read specs/phase-4/ and containerize everything."
```

## Phase 5 Start
```bash
# "Now Phase 5. Read specs/phase-5/ and deploy to production."
```

---

# MINDSET

## The 69-Minute Rule

Phase 1 in 69 minutes isn't about rushing. It's about:
1. **Clear spec** → Claude Code knows exactly what to build
2. **Minimal scope** → Only what's needed for demo
3. **Ship first** → Polish later

## The Meta-Proof

You're building a task management platform **using the methodology it teaches**:
- Specs drive development
- Claude Code implements
- Audit trail proves process
- Working system proves competence

## When Stuck

1. Re-read the spec
2. Ask Claude Code "What's blocking?"
3. Simplify scope
4. Ship something

---

**Start time: NOW**
**Phase 1 deadline: 69 minutes from now**

GO! 🚀
