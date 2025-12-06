# TaskFlow Constitution

## Purpose

TaskFlow is a Human-Agent Task Orchestration Platform where humans and AI agents collaborate as equals to accomplish work across projects.

## Core Principles

### 1. Humans and Agents Are Equal Workers

Both humans and AI agents are "workers" in TaskFlow. They can:
- Be assigned tasks
- Create subtasks
- Delegate work to others
- Report progress
- Request review

The system makes no fundamental distinction — only tracks WHO did WHAT.

### 2. Everything Is Audited

Every action creates an audit log entry. The audit trail is:
- Immutable (append-only)
- Complete (every action recorded)
- Attributable (actor always identified)
- Timestamped (when it happened)

This is the proof of process. Without it, there's no accountability.

### 3. Projects Are Containers, Not Silos

Projects group related tasks but don't restrict collaboration:
- Workers can participate in multiple projects
- Tasks belong to exactly one project
- Cross-project visibility is available
- Personal and professional tasks coexist

### 4. Linked Resources Are Read-Only by Default

When tasks link to external resources (specs, repos, docs):
- Links are metadata, not copies
- Default access is read-only
- TaskFlow doesn't fetch or modify linked content
- Workers follow links when they need context

### 5. Emergent Decomposition

Work breakdown happens when work starts, not when tasks are created:
- Create task with goal/outcome
- Worker (human or agent) breaks into subtasks when starting
- Subtasks can be delegated to other workers
- Progress tracked at task and subtask level

### 6. Spec-Driven Development

All features are specified before implementation:
- Write spec first
- Claude Code implements from spec
- Iterate on spec until implementation is correct
- Never write code manually

## Constraints

### Must Have
- Every task has exactly one project
- Every task has at most one assignee at a time
- Every action has exactly one actor
- Audit logs are never deleted or modified
- Workers must be registered before assignment

### Must Not
- Tasks cannot be assigned to unregistered workers
- Completed tasks cannot be modified (only notes added)
- Audit logs cannot be backdated
- Subtasks cannot exist without parent task

### Should Have
- Tasks should have clear, actionable titles
- Progress updates should include notes
- Delegations should include reason
- Reviews should have approval/rejection reason

## Terminology

| Term | Definition |
|------|------------|
| **Worker** | Human or AI agent that can be assigned work |
| **Agent** | AI worker (Claude, Qwen, Gemini, etc.) |
| **Task** | Unit of work with goal, assignee, status |
| **Subtask** | Child task created during work breakdown |
| **Project** | Container for related tasks |
| **Audit Log** | Immutable record of an action |
| **Blueprint** | Reusable pattern of tasks |
| **Linked Resource** | External reference attached to task/project |

## Success Criteria

TaskFlow succeeds when:
1. I can see all my work across all projects in one place
2. I can assign work to humans or agents with same interface
3. I can trace exactly who did what and when
4. Agents can work autonomously and report progress
5. The system grows from CLI to cloud without breaking

## Evolution Path

| Phase | Capability | Storage |
|-------|------------|---------|
| 1 | CLI proof of concept | Local files |
| 2 | Multi-user web app | Neon PostgreSQL |
| 3 | Agent MCP gateway | + MCP Server |
| 4 | Local Kubernetes | + Helm Charts |
| 5 | Production cloud | + Kafka + Dapr |

Each phase builds on previous. Data model remains stable. Only storage and interfaces evolve.
