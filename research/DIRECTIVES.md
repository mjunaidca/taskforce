# TaskFlow: Master Directives

## Mission Statement

**Build the platform that proves AI-native development works.**

TaskFlow isn't just a task manager — it's evidence that humans and AI agents can collaborate as equals, with full accountability. Every audit log entry is proof of process. Every delegation chain shows who did what.

---

## Time Budget

| Phase | Target Time | Deadline |
|-------|-------------|----------|
| Phase 1: CLI | 69 minutes | Dec 7 (before class) |
| Phase 2: Web | 3 hours | Dec 14 |
| Phase 3: MCP + Chat | 3 hours | Dec 21 |
| Phase 4: Kubernetes | 3 hours | Jan 4 |
| **Total Active Build** | ~12 hours | — |

---

# PHASE 1: Local CLI

## Business Directive

> **Prove that humans and agents can be managed through the same interface.**

The CLI is your proof of concept. When you demo this, the audience should immediately understand: "Oh, I can assign tasks to Claude the same way I assign to a human teammate."

## Success Demo (69 minutes from now)

```bash
# Initialize
taskflow init
taskflow project add taskflow --name "TaskFlow Platform"

# Register team
taskflow worker add @muhammad --type human
taskflow agent add @claude-code --capabilities coding,architecture
taskflow agent add @qwen --capabilities research

# Create and assign
taskflow add "Implement MCP server" --assign @claude-code --priority high

# Agent workflow
taskflow start 1
# → Creates subtasks: Design protocol, Implement handlers, Add auth

taskflow delegate 2 @qwen --note "Research needed"
taskflow progress 1 --percent 60 --note "Handlers done"
taskflow review 1

# Human approves
taskflow approve 1

# Show the magic
taskflow audit 1
# → Full trail: who created, who started, who delegated, who approved
```

## Execution Approach

**Don't build everything. Build the demo path first.**

### Sprint 1: Core Loop (30 min)
```
models.py → storage.py → init command → project add → worker add → agent add
```
Goal: Can register workers

### Sprint 2: Task Basics (20 min)
```
task add → task list → task show
```
Goal: Can see tasks

### Sprint 3: Workflow Demo (19 min)
```
start → progress → complete → audit
```
Goal: Demo-ready

### What to Skip Initially
- `edit`, `delete` (nice to have)
- `link`, `blueprint` (bonus)
- Full filtering/sorting (simplify)
- Error edge cases (happy path first)

## Claude Code Prompt

```
Read CLAUDE.md and specs/constitution.md first.

We have 69 minutes. Build the demo path only:

1. models.py - Task, Worker, Project, AuditLog (skip LinkedResource, Blueprint)
2. storage.py - init, load, save (skip backup, locking)
3. commands/init.py - taskflow init
4. commands/project.py - project add, project list
5. commands/worker.py - worker add, agent add, worker list
6. commands/task.py - add, list, show (skip edit, delete)
7. commands/workflow.py - start (with subtask creation), progress, complete, review, approve
8. commands/audit.py - audit <task_id>

Skip: link, blueprint, full filtering, error handling beyond basics

Go fast. We iterate after demo works.
```

---

# PHASE 2: Full-Stack Web

## Business Directive

> **Make it real — multi-user, persistent, accessible from anywhere.**

Phase 1 proves the concept. Phase 2 makes it usable by your students, your team, anyone. The web UI should feel like "professional task management meets AI workforce."

## Success Demo

- Login with Hackathon 1 SSO
- Dashboard shows: My tasks, Agent tasks, Projects
- Create task → Assign to agent → See it in agent's queue
- Progress updates appear in real-time
- Audit trail viewable per task

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│    FastAPI      │────▶│  Neon Postgres  │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │ Hackathon 1 SSO │
         │  (Better Auth)  │
         └─────────────────┘
```

## Execution Approach

### Sprint 1: Database + API (1 hour)
- SQLModel schemas (migrate from Pydantic)
- Neon connection
- CRUD endpoints for Project, Worker, Task
- `taskflow migrate --to neon` command

### Sprint 2: Auth Integration (45 min)
- Better Auth JWKS verification in FastAPI
- Protected routes
- Current user context

### Sprint 3: Frontend (1 hour 15 min)
- Next.js app with Tailwind
- Dashboard layout
- Task list + detail views
- Forms for create/edit
- Audit trail display

## Claude Code Prompt

```
Phase 2: Web Application. Read specs/phase-2/ first.

1. backend/
   - SQLModel schemas from models.py
   - FastAPI app with CRUD routes
   - Better Auth JWT verification (JWKS)
   - Neon connection

2. cli/
   - Add `taskflow migrate --to neon` command

3. frontend/
   - Next.js 16 with App Router
   - Tailwind CSS
   - Dashboard: projects sidebar, task list, task detail
   - Forms: create task, assign worker
   - Audit trail component

Reuse Hackathon 1 auth patterns.
```

---

# PHASE 3: MCP + Chat

## Business Directive

> **Let agents work autonomously. Let humans talk naturally.**

This is where TaskFlow becomes magical. Agents connect via MCP, claim tasks, work on them, report back. Humans just chat: "What's on my plate?" "Assign research to Gemini."

## Success Demo

**Agent side:**
```
# Agent connects via MCP
mcp connect taskflow-server

# Agent sees their tasks
list_my_tasks()
# → [{id: 1, title: "Implement auth", status: "pending"}]

# Agent starts work
claim_task(1)
add_subtask(1, "Research OAuth patterns")
update_progress(1, 30, "Researching...")
```

**Human side (chat):**
```
You: What's Claude working on?
AI: Claude is working on "Implement auth" (30% complete). 
    Currently researching OAuth patterns.

You: Assign the database task to Qwen
AI: Done. Created task "Database migration" and assigned to @qwen.
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   ChatKit UI    │────▶│                 │
│   (Humans)      │     │    FastAPI      │
└─────────────────┘     │       +         │────▶ Neon DB
                        │  Agents SDK     │
┌─────────────────┐     │       +         │
│   MCP Clients   │────▶│   MCP Server    │
│   (AI Agents)   │     │                 │
└─────────────────┘     └─────────────────┘
```

## Execution Approach

### Sprint 1: MCP Server (1 hour)
- Official MCP SDK setup
- Tools: list_my_tasks, claim_task, add_subtask, update_progress, complete_task
- Agent API key authentication
- All actions logged to audit

### Sprint 2: Agent Integration (45 min)
- API key generation in web UI
- Agent identity tied to key
- Test with Claude Code as MCP client

### Sprint 3: Chat Interface (1 hour 15 min)
- OpenAI ChatKit integration
- Natural language → API calls
- Context: user's projects, tasks, agents
- Response: formatted task info

## Claude Code Prompt

```
Phase 3: MCP + Chat. Read specs/phase-3/ first.

1. mcp-server/
   - Official MCP SDK
   - Tools: list_my_tasks, get_task, claim_task, add_subtask, 
     update_progress, complete_task, request_review
   - API key auth (not JWT)
   - Audit logging for all actions

2. backend/
   - API key generation endpoint
   - Agent identity management

3. frontend/
   - OpenAI ChatKit integration
   - Chat component in dashboard
   - Natural language task management

Test: Connect Claude Code as MCP client, have it claim and work on a task.
```

---

# PHASE 4: Local Kubernetes

## Business Directive

> **Prove you can deploy anywhere. Learn container orchestration.**

This phase is about demonstrating cloud-native skills. The app works in Docker, deploys to Minikube, managed via Helm. Bonus: use AI-powered kubectl.

## Success Demo

```bash
# Build images
docker compose build

# Deploy to Minikube
minikube start
helm install taskflow ./helm

# Verify
kubectl get pods
# → taskflow-frontend, taskflow-backend, taskflow-mcp

# AI-powered operations
kubectl-ai "scale backend to 3 replicas"
kubectl-ai "show me the logs from backend"
```

## Execution Approach

### Sprint 1: Dockerize (45 min)
- Dockerfile for frontend, backend, mcp-server
- docker-compose.yml for local testing
- Multi-stage builds for small images

### Sprint 2: Helm Charts (1 hour)
- Deployment manifests
- Service definitions
- ConfigMaps and Secrets
- Ingress configuration

### Sprint 3: Minikube + AI Ops (1 hour 15 min)
- Minikube setup instructions
- kubectl-ai integration
- Health checks and readiness probes
- Demo script

## Claude Code Prompt

```
Phase 4: Kubernetes. Read specs/phase-4/ first.

1. Dockerfiles
   - frontend/Dockerfile (Next.js production build)
   - backend/Dockerfile (FastAPI with uvicorn)
   - mcp-server/Dockerfile

2. docker-compose.yml
   - All services
   - Neon connection (external)
   - Volume mounts for dev

3. helm/taskflow/
   - Chart.yaml
   - values.yaml
   - templates/deployment-frontend.yaml
   - templates/deployment-backend.yaml
   - templates/deployment-mcp.yaml
   - templates/service.yaml
   - templates/ingress.yaml
   - templates/configmap.yaml
   - templates/secret.yaml

4. KUBERNETES.md
   - Minikube setup instructions
   - helm install commands
   - kubectl-ai examples
```

---

# PHASE 5: Production Cloud

## Business Directive

> **Ship to production. Handle real traffic. Event-driven architecture.**

This is the finale. Real Kubernetes cluster on DigitalOcean, Kafka for events, Dapr for service mesh, GitHub Actions for CI/CD. Production-grade.

## Success Demo

- Live URL: taskflow.panaversity.app
- Real-time updates via WebSocket
- Event-driven: task created → notification sent
- Recurring tasks auto-create
- CI/CD: push to main → auto deploy

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DigitalOcean DOKS Cluster                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Frontend   │  │   Backend   │  │ MCP Server  │             │
│  │  + Dapr     │  │   + Dapr    │  │   + Dapr    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│              ┌─────────────────────┐                           │
│              │   Kafka (Redpanda)  │                           │
│              │  - task-events      │                           │
│              │  - agent-progress   │                           │
│              │  - notifications    │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   Neon PostgreSQL   │
              └─────────────────────┘
```

## Execution Approach

### Sprint 1: DOKS Setup (45 min)
- Create DOKS cluster
- Configure kubectl
- Deploy basic app with Helm

### Sprint 2: Kafka + Dapr (1 hour 15 min)
- Redpanda Cloud setup
- Dapr sidecars configuration
- Pub/Sub for task events
- Notification service

### Sprint 3: Advanced Features (30 min)
- Recurring tasks (Dapr cron binding)
- Due date reminders
- Real-time WebSocket updates

### Sprint 4: CI/CD (30 min)
- GitHub Actions workflow
- Build → Push → Deploy
- Environment secrets

## Claude Code Prompt

```
Phase 5: Production. Read specs/phase-5/ first.

1. Dapr configuration
   - components/pubsub.yaml (Kafka/Redpanda)
   - components/statestore.yaml
   - components/cron.yaml (recurring tasks)

2. backend/
   - Dapr pub/sub integration
   - Event publishing on task changes
   - Notification service subscriber

3. .github/workflows/deploy.yml
   - Build Docker images
   - Push to registry
   - Helm upgrade to DOKS

4. PRODUCTION.md
   - DOKS setup guide
   - Redpanda Cloud setup
   - DNS configuration
   - Monitoring setup
```

---

# Quick Reference Card

## Phase 1 (69 min) — CLI
**Goal:** Demo human-agent task assignment
**Key:** `taskflow audit 1` shows the magic

## Phase 2 (3 hr) — Web
**Goal:** Multi-user, persistent, real app
**Key:** Reuse Hackathon 1 SSO

## Phase 3 (3 hr) — MCP + Chat
**Goal:** Agents work autonomously, humans chat
**Key:** MCP tools + ChatKit

## Phase 4 (3 hr) — Kubernetes
**Goal:** Containerized, deployable anywhere
**Key:** Helm charts + kubectl-ai

## Phase 5 (3 hr) — Production
**Goal:** Live, event-driven, CI/CD
**Key:** Kafka + Dapr + GitHub Actions

---

# The Meta-Message

When you present this, you're not just showing a task manager. You're demonstrating:

1. **AI-native development works** — You built this with Claude Code
2. **Humans and AI can collaborate** — The platform itself proves it
3. **Process matters** — Every audit log is evidence
4. **Spec-driven development** — The specs folder is the learning artifact

**This is your answer to "AI is destroying learning."**

The spec iteration, the architectural decisions, the debugging sessions with Claude — that IS the education. The audit trail proves you were there, thinking, deciding, approving.

---

**Now go ship. 69 minutes. Clock starts now.** ⏱️
