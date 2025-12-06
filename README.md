Let me finalize your Document 5 with the key insight we discussed:

---

# TaskFlow: Human-Agent Task Platform

**One-liner:** Your AI workforce where Claude Code ships alongside you.

---

## Core Data Model

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

---

## Core Principle

**Task = Goal.** You define WHAT, not HOW.

**Subtasks = Worker's Plan.** Whoever starts the task (human or Claude Code) breaks it down as they work. Subtasks are NOT predefined.

```
Example Flow:

1. You create Task: "Implement JWT verification"
   → assigned to: @claude-code
   → status: pending

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

5. Claude Code requests review:
   → status: review
   → audit: "review_requested by claude-code"

6. You review, approve:
   → status: completed
   → audit: "approved by muhammad"
```

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

## Phase Mapping to Hackathon

| Phase | What You Build | Hackathon Requirement Met |
|-------|---------------|---------------------------|
| **I** | CLI: create task, assign, list, complete + subtasks emerge from worker | Console app ✓ |
| **II** | Web UI + FastAPI + Neon DB | Full-stack ✓ |
| **III** | MCP Server - Claude Code connects, claims tasks, adds subtasks, reports progress | AI Chatbot + MCP ✓ |
| **IV** | Docker + Helm + Minikube | Local K8s ✓ |
| **V** | Kafka events (task_assigned, progress_updated) + DOKS | Cloud + Events ✓ |

---

## What Makes This Different

| Regular Todo | TaskFlow |
|--------------|----------|
| You create tasks | You create tasks |
| You do tasks | You OR Claude Code does tasks |
| You break down work upfront | **Worker breaks down work when starting** |
| No visibility into process | **Full audit trail of who did what** |
| Static checklist | **Living collaboration** |

---

## Locked Decisions (Cannot Amend)

1. **Task = Goal** - no predefined subtask hierarchy
2. **Subtasks are emergent** - created by worker, not creator
3. **Two assignee types** - human | agent (specifically Claude Code)
4. **Audit everything** - every action logged with actor
5. **MCP is the agent interface** - Claude Code connects via MCP tools

---
