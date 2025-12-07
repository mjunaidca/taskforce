# ADR-007: Human-Agent Parity Model

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** Cross-cutting (001-006)
- **Context:** .specify/memory/constitution.md

## Decision

Designed a unified Worker model where AI agents and humans are first-class citizens with identical capabilities. Both worker types use the same data structures, API endpoints, and audit mechanisms. This is a foundational architectural decision that pervades the entire system.

**Core Principle:** "If humans can do it, agents can do it."

**Worker Model:**
```python
class Worker:
    id: int
    handle: str          # @human-name or @agent-name
    name: str
    type: Literal["human", "agent"]

    # Human-specific
    user_id: str | None  # SSO user ID

    # Agent-specific
    agent_type: str | None      # claude, qwen, gemini, custom
    capabilities: list[str]     # coding, research, etc.
```

**Parity Implementation:**

| Dimension | Human | Agent | Implementation |
|-----------|-------|-------|----------------|
| Task assignment | ✓ | ✓ | Same assignee_id field |
| Task creation | ✓ | ✓ | Same POST /api/tasks |
| Status updates | ✓ | ✓ | Same PATCH /api/tasks/{id}/status |
| Audit actor | ✓ | ✓ | actor_type: "human" \| "agent" |
| Project membership | ✓ | ✓ | Same ProjectMember model |
| Handle format | @john-doe | @claude-code | Same regex pattern |

**Access Patterns:**
- CLI: `taskflow assign 1 --to @claude-code` (same as `--to @john`)
- MCP: `taskflow_assign_task(task_id=1, assignee_handle="@claude-code")`
- Web: Single dropdown lists both humans and agents
- API: Same endpoint, same schema, type indicated in Worker.type

## Consequences

### Positive
- No separate "AI features" section in UI - agents are native
- Same audit trail format for human and agent actions
- Future agent types require no schema changes
- Assignment, workflow, and review processes work identically
- Metrics and reporting treat all workers uniformly

### Negative
- Agents need explicit registration before use (not auto-discovered)
- No capability-based task routing (manual assignment only in Phase II)
- Agent credentials (if any) must be managed separately
- UI must handle both types in all worker-related views

## Alternatives Considered

### Alternative A: Separate Human/Agent tables with polymorphism
- Pros: Type-specific fields, cleaner schema
- Cons: Complex JOINs, separate endpoints, parity harder to enforce
- Why rejected: Unified model enforces parity by design; complexity not justified

### Alternative B: Agents as "AI-assisted" mode on human accounts
- Pros: Simpler onboarding, no separate registration
- Cons: Conflates human and AI actions, audit trail unclear, ownership murky
- Why rejected: Constitutional requirement that agents are workers, not helpers

### Alternative C: AI as system actor (not a worker)
- Pros: Simpler model, no agent registration needed
- Cons: No audit trail attribution, no assignment, violates parity principle
- Why rejected: Fundamentally conflicts with TaskFlow's differentiating premise

## Constitutional Alignment

This ADR implements two of TaskFlow's four non-negotiable principles:

1. **Principle 2: Agents Are First-Class Citizens**
   - Same Worker model for both types
   - Same endpoints and capabilities
   - Audit trail identifies actor type

2. **Principle 1: Every Action Must Be Auditable**
   - AuditLog.actor_type captures human vs agent
   - Same audit format regardless of actor
   - Who did what, when, why - for all actors

## Implementation Evidence

**Models (packages/api/src/taskflow_api/models/worker.py):**
```python
class Worker(SQLModel, table=True):
    type: Literal["human", "agent"]
    # Both types use same base fields
```

**Audit (packages/api/src/taskflow_api/models/audit.py):**
```python
class AuditLog(SQLModel, table=True):
    actor_id: int  # Worker.id (human or agent)
    actor_type: Literal["human", "agent"]
```

**CLI (packages/cli/src/taskflow/models.py):**
```python
class Worker(BaseModel):
    type: Literal["human", "agent"]
    handle: str  # @format
```

## References
- Constitution: .specify/memory/constitution.md (Principles 1 & 2)
- Spec references: All phase specs mention agent parity
- Implementation: packages/*/models/worker.py, models/audit.py
- UI: Assignment dropdowns, members lists, audit displays
