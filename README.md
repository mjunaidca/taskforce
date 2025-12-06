# Hackathon II: TaskFlow — Human-Agent Task Platform

## The Question You Must Answer

> "If ChatGPT can generate student essays, complete assignments, and even provide feedback, what remains of the software engineers transaction?"

If Claude Code can write the code, why are you here? What are you learning? What will you be able to do that someone who just prompts AI cannot?

**This project ships a project I will personally use and designed to answer that question — not with words, but with proof.**

---

Let's be honest about what's dying:

| Dying Skill | Why It's Dying |
|-------------|----------------|
| Memorizing syntax | AI knows all syntax |
| Typing code fast | AI types faster |
| Implementing algorithms from scratch | AI has seen every implementation |
| Debugging by staring at code | AI spots patterns you'd miss |

---

The skills that matter now:

| Emerging Skill | Why It Matters |
|----------------|----------------|
| **Specifying intent precisely** | AI does what you say, not what you mean. The gap is your job. |
| **Evaluating AI output critically** | AI produces plausible garbage. Catching it is your job. |
| **Debugging across the human-AI boundary** | When it fails, was it your spec or AI's execution? Knowing the difference is your job. |
| **Architecting systems** | AI implements. You decide what's worth implementing. |
| **Defending every choice** | If you can't explain why, you don't understand it. |

**The constraint — "you cannot write code manually" — is not a limitation. It's the way forward.**

---

## The Core Constraint

> **Must refine the Spec until Claude Code generates the correct output.**

This constraint creates learning through:

1. **Write spec** → Claude Code generates code
2. **Code is wrong** → You must understand WHY it's wrong
3. **Refine spec** → You must know WHAT correct looks like
4. **Repeat** → Each iteration sharpens your thinking

If we write the code ourself or just vibecode, we'd skip the refinement loop. The constraint forces us to think.

---

## Build: TaskFlow

**One-liner:** Your AI workforce where Claude Code ships alongside you.

This is a **Human-Agent Task Management Platform** where:

| Traditional Todo | TaskFlow |
|------------------|----------|
| You create tasks | You create tasks |
| You do tasks | You OR Claude Code does tasks |
| You break down work upfront | **Worker breaks down work when starting** |
| No visibility into process | **Full audit trail of who did what** |
| Static checklist | **Living collaboration** |

### Why This Design Teaches What You Need

Every architectural decision in TaskFlow teaches an SDD-RI principle:

| Design Decision | What It Teaches |
|-----------------|-----------------|
| **Task = Goal (no predefined subtasks)** | You learn to specify outcomes, not steps |
| **Subtasks emerge from worker** | You learn that decomposition IS the skill |
| **Two assignee types (human \| agent)** | You learn to think about human-AI collaboration |
| **Audit everything** | You learn that process is proof |
| **Human approves agent work** | You learn that judgment cannot be delegated |

**You are building the tool that teaches the skill you're using.**

---

## Core Data Model (LOCKED)

These decisions are final. Do not amend.

```
Task (Goal)
├── id
├── title
├── description
├── assignee_type (human | agent)
├── assignee_id (user_id | "claude-code")
├── status (pending | in_progress | review | completed)
├── progress (0-100)
├── created_by
├── created_at
├── updated_at

Subtask (Emergent - created BY the worker when they start)
├── id
├── task_id
├── title
├── status (pending | completed)
├── created_by_type (human | agent)
├── created_by_id
├── created_at

AuditLog (Everything tracked)
├── id
├── entity_type (task | subtask)
├── entity_id
├── action (created | assigned | started | subtask_added | progress_updated | review_requested | approved | completed)
├── actor_type (human | agent)
├── actor_id
├── details (json - notes, old_value, new_value)
├── created_at
```

### Why These Models Are Locked

| Model | Pedagogical Purpose |
|-------|---------------------|
| **Task has no subtask hierarchy** | Forces goal-oriented thinking |
| **Subtask has created_by_type** | Makes visible who did the decomposition |
| **AuditLog captures everything** | Creates unfakeable process evidence |

---

## Example Flow

```
1. You create Task: "Implement JWT verification"
   → assigned to: @claude-code
   → status: pending
   → audit: "created by muhammad"

2. Claude Code claims task via MCP
   → status: in_progress
   → audit: "started by claude-code"

3. Claude Code breaks down work (adds subtasks):
   → "Research JWKS endpoint patterns"
   → "Write FastAPI middleware"
   → "Add token validation tests"
   → audit: "subtask_added by claude-code" (x3)

4. Claude Code works, completes subtasks:
   → subtask 1: completed
   → subtask 2: completed
   → progress: 66%
   → audit: "progress_updated by claude-code"

5. Claude Code requests review:
   → status: review
   → audit: "review_requested by claude-code"

6. You review, find issue, reject:
   → status: in_progress
   → audit: "rejected by muhammad" with notes

7. Claude Code fixes, requests review again:
   → status: review
   → audit: "review_requested by claude-code"

8. You review, approve:
   → status: completed
   → audit: "approved by muhammad"
```

**The audit trail is your proof that you understood the work.**

---

## MCP Tools (How Claude Code Interacts)

| Tool | Purpose |
|------|---------|
| `list_my_tasks` | Get tasks assigned to this agent |
| `claim_task` | Start working (status → in_progress) |
| `get_task_details` | Get full context |
| `add_subtask` | Break down work (emergent planning) |
| `complete_subtask` | Mark subtask done |
| `update_progress` | Report % complete with notes |
| `request_review` | Flag for human approval |

### Why MCP Matters Pedagogically

When you build the MCP server, you are:
- Defining the **interface** between human and AI
- Deciding what **capabilities** the AI has
- Creating the **boundaries** of AI autonomy

This is the architect's job. The AI implements. You decide the interface.

---

## Human UI Actions

| Action | What Happens |
|--------|--------------|
| Create Task | Define goal, assign to human OR agent |
| View Tasks | See all tasks, status, progress, assignee |
| View Task Detail | See subtasks (created by worker), audit trail |
| Approve/Reject | After agent requests review |
| Reassign | Move task to different human/agent |

---

## Phase Breakdown

### Phase I: Console App (Due Dec 7)
**Points: 100**

Build CLI for TaskFlow with in-memory storage.

| Feature | Pedagogical Purpose |
|---------|---------------------|
| Create task with assignee_type | Learn to model human vs agent |
| Worker adds subtasks when starting | Learn emergent decomposition |
| Complete subtask, update progress | Learn progress tracking |
| View audit trail | Learn that process is visible |

**Technology:** Python 3.13+, UV, Claude Code, Spec-Kit Plus

**Deliverables:**
- Constitution file
- specs/ folder with all specification history
- /src folder with Python source
- README.md with setup instructions
- CLAUDE.md with Claude Code instructions

**What Success Looks Like:**
```
$ taskflow create "Implement JWT verification" --assign agent
Task #1 created, assigned to agent

$ taskflow start 1
Starting task #1...
Enter subtasks (empty line to finish):
> Research JWKS patterns
> Write middleware
> Add tests
3 subtasks added

$ taskflow progress 1 --percent 33 --note "Research complete"
Task #1: 33% complete

$ taskflow audit 1
[2025-12-06 10:00] created by muhammad
[2025-12-06 10:01] started by claude-code
[2025-12-06 10:01] subtask_added: "Research JWKS patterns" by claude-code
[2025-12-06 10:01] subtask_added: "Write middleware" by claude-code
[2025-12-06 10:01] subtask_added: "Add tests" by claude-code
[2025-12-06 10:30] progress_updated: 33% by claude-code
```

---

### Phase II: Full-Stack Web Application (Due Dec 14)
**Points: 150**

Transform console app into multi-user web application.

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16+ (App Router) |
| Backend | Python FastAPI |
| ORM | SQLModel |
| Database | Neon Serverless PostgreSQL |
| Authentication | Better Auth with JWT/JWKS |

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/{user_id}/tasks | List all tasks |
| POST | /api/{user_id}/tasks | Create task with assignee_type |
| GET | /api/{user_id}/tasks/{id} | Get task with subtasks and audit |
| PUT | /api/{user_id}/tasks/{id} | Update task |
| DELETE | /api/{user_id}/tasks/{id} | Delete task |
| POST | /api/{user_id}/tasks/{id}/start | Start task (create subtasks) |
| POST | /api/{user_id}/tasks/{id}/subtasks | Add subtask |
| PATCH | /api/{user_id}/tasks/{id}/progress | Update progress |
| POST | /api/{user_id}/tasks/{id}/review | Request review |
| POST | /api/{user_id}/tasks/{id}/approve | Approve (human only) |
| POST | /api/{user_id}/tasks/{id}/reject | Reject with notes |

**Authentication (JWKS-based):**

Better Auth issues JWT tokens signed with RS256. FastAPI verifies using public keys from JWKS endpoint. No shared secrets.

```python
from jwt import decode, PyJWKClient

JWKS_URL = "https://your-sso/api/auth/jwks"
jwks_client = PyJWKClient(JWKS_URL)

def verify_token(request: Request):
    token = request.headers.get("authorization", "").split(" ", 1)[1]
    signing_key = jwks_client.get_signing_key_from_jwt(token).key
    return decode(token, signing_key, algorithms=["RS256"])
```

**Monorepo Structure:**

```
hackathon-taskflow/
├── .spec-kit/config.yaml
├── specs/
│   ├── overview.md
│   ├── features/
│   │   ├── task-management.md
│   │   ├── audit-trail.md
│   │   └── human-agent-assignment.md
│   ├── api/
│   │   └── rest-endpoints.md
│   └── database/
│       └── schema.md
├── CLAUDE.md
├── frontend/
│   ├── CLAUDE.md
│   └── ... (Next.js)
├── backend/
│   ├── CLAUDE.md
│   └── ... (FastAPI)
└── docker-compose.yml
```

---

### Phase III: AI-Powered TaskFlow (Due Dec 21)
**Points: 200**

Add MCP server so Claude Code can actually work on tasks.

**Architecture:**

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐     ┌─────────────────┐
│                 │     │              FastAPI Server                   │     │                 │
│  ChatKit UI     │────▶│  Chat Endpoint → Agents SDK → MCP Server     │────▶│    Neon DB      │
│  (Frontend)     │     │                                               │     │                 │
└─────────────────┘     └──────────────────────────────────────────────┘     └─────────────────┘
```

**MCP Tools for TaskFlow:**

| Tool | Parameters | Purpose |
|------|------------|---------|
| `list_my_tasks` | agent_id | Get tasks assigned to this agent |
| `claim_task` | task_id | Start working on task |
| `get_task_details` | task_id | Get full context |
| `add_subtask` | task_id, title | Create emergent subtask |
| `complete_subtask` | subtask_id | Mark done |
| `update_progress` | task_id, percent, notes | Report progress |
| `request_review` | task_id | Flag for human approval |

**Natural Language Examples:**

| User Says | Agent Does |
|-----------|------------|
| "What tasks are assigned to Claude Code?" | Calls `list_my_tasks` |
| "Start working on task 3" | Calls `claim_task`, then adds subtasks |
| "How's task 3 going?" | Calls `get_task_details` |
| "Mark the first subtask done" | Calls `complete_subtask` |
| "Submit task 3 for review" | Calls `request_review` |

**The Meta-Level:**

When you chat with the AI to manage tasks, you are:
1. Assigning work to Claude Code
2. Reviewing what Claude Code produced
3. Approving or rejecting based on your judgment

**You are learning orchestration by doing orchestration.**

---

### Phase IV: Local Kubernetes (Due Jan 4)
**Points: 250**

Deploy TaskFlow on Minikube with Helm charts.

| Component | Technology |
|-----------|------------|
| Containerization | Docker |
| Orchestration | Kubernetes (Minikube) |
| Package Manager | Helm Charts |
| AI DevOps | kubectl-ai, Kagent |

**What You Learn:**

- How to specify infrastructure (Helm values = specs for infra)
- How to debug deployments (when pods fail, was it your spec or the container?)
- How AI tools (kubectl-ai, Kagent) operate at the infrastructure level

---

### Phase V: Cloud Deployment (Due Jan 18)
**Points: 300**

Deploy to DigitalOcean/GKE/AKS with Kafka event streaming and Dapr.

**Kafka Topics:**

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| task-events | API | Audit Service | All operations logged |
| agent-progress | MCP Server | Dashboard | Real-time progress |
| review-requests | MCP Server | Notification | Alert humans |

**Dapr Building Blocks:**

| Block | Use |
|-------|-----|
| Pub/Sub | Kafka abstraction |
| State | Conversation state |
| Bindings | Scheduled reminders |
| Secrets | API keys |

**What You Learn:**

- Event-driven architecture (publish events, don't call functions)
- Loose coupling (services don't know about each other)
- Production concerns (monitoring, logging, scaling)

---

## How You Will Be Evaluated

### What We Check (Process)

| Artifact | What It Proves |
|----------|----------------|
| **Spec history in /specs** | You refined thinking, not just code |
| **Git commit history** | You iterated, didn't just dump final code |
| **Audit trail in app** | You built what you designed |
| **CLAUDE.md evolution** | You learned what to tell AI |

### What We Verify (Competence)

| Method | What It Proves |
|--------|----------------|
| **Live demo** | It actually works |
| **Modify on the spot** | You understand the code |
| **Oral defense** | You can explain any decision |
| **Handle unexpected input** | You didn't just memorize happy path |

### What You Cannot Fake

- Commit history (shows process over time)
- Spec revisions (shows thinking evolved)
- Oral defense (you either understand or you don't)
- Live modification (you either can or you can't)

---

## What Panaversity Graduates Can Do

After completing this hackathon, you can:

| Capability | Evidence |
|------------|----------|
| **Specify systems precisely** | Specs that Claude Code implements correctly |
| **Evaluate AI output critically** | Rejected bad code, approved good code |
| **Debug human-AI boundaries** | Know when spec was wrong vs AI failed |
| **Architect complex systems** | Designed TaskFlow data model |
| **Defend every choice** | Passed oral examination |
| **Know what you don't know** | Asked AI appropriately, not dependently |

---
At the end, you don't have a certificate. You have:
- 5 deployed projects (console → web → AI → K8s → cloud)
- Spec history proving your thinking process
- Public GitHub proving real work
- Oral defense proving understanding
- Potential interview for Panaversity team

**That's not a credential. That's a portfolio of proof.**

---

## Bonus Points

| Feature | Points |
|---------|--------|
| **Full Human-Agent Platform** (as designed above) | +300 |
| Reusable Intelligence via Subagents/Skills | +200 |
| Cloud-Native Blueprints via Agent Skills | +200 |
| Multi-language (Urdu) | +100 |
| Voice Commands | +200 |
| **Total Bonus** | +1000 |

## The Bottom Line

This project answers the question: **"If AI can code, what's left for humans?"**

The answer: **Specification, evaluation, orchestration, and judgment.**

You will prove you have these skills — not by telling us, but by showing us:
- Your specs that evolved
- Your commits that iterated
- Your system that works
- Your defense that demonstrates understanding

**The constraint — "cannot write code manually" — is not a limitation. It's the entire curriculum.**
