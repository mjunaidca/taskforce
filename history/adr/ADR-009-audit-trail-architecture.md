# ADR-009: Audit Trail Architecture

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** Cross-cutting (001-006)
- **Context:** .specify/memory/constitution.md (Principle 1)

## Decision

Implemented immutable audit logging as a first-class feature (not infrastructure). Every state change creates an AuditLog entry capturing who, what, when, and why. The audit log is queryable by task, project, and actor.

**Audit Log Model:**
```python
class AuditLog:
    id: int
    entity_type: str        # "task", "project", "worker"
    entity_id: int          # ID of affected entity
    action: str             # "created", "started", "completed", "assigned"
    actor_id: int           # Worker.id (human or agent)
    actor_type: str         # "human" | "agent"
    details: dict           # Action-specific context (JSON)
    created_at: datetime    # Immutable timestamp
```

**Auditable Actions:**
- Task: created, updated, started, progressed, review_requested, approved, rejected, completed, deleted, assigned
- Project: created, updated, deleted, member_added, member_removed
- Worker: registered, updated, deleted

**Query Patterns:**
- `GET /api/tasks/{id}/audit` - Task history
- `GET /api/projects/{id}/audit` - Project activity
- `GET /api/audit?actor_id=X` - Actor's actions

## Consequences

### Positive
- Complete accountability for human and agent actions
- Regulatory compliance capability (SOC 2, audit requirements)
- Debugging aid: "What happened to task 42?"
- Metrics foundation: Who completed what, when
- Blame-free postmortems with full context

### Negative
- Storage growth proportional to activity
- Write amplification (every change = extra INSERT)
- Cannot delete audit entries (by design)
- Complex aggregation queries for analytics

## Alternatives Considered

### Alternative A: Application logging only (log files)
- Pros: Simpler, no schema changes, existing log infrastructure
- Cons: Hard to query, not user-visible, retention varies
- Why rejected: Audit is a product feature, not ops infrastructure

### Alternative B: Event sourcing (full event store)
- Pros: Complete history, can replay state, powerful patterns
- Cons: Complex implementation, unfamiliar patterns, rebuild logic
- Why rejected: Overkill for Phase II; audit log provides 80% of value with 20% complexity

### Alternative C: Soft deletes with updated_by tracking
- Pros: Simpler model, uses existing tables
- Cons: Only tracks last change, no history, clutters main models
- Why rejected: Need full history, not just last modification

## Implementation Patterns

**Audit Service:**
```python
async def log_action(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_id: int,
    details: dict | None = None,
):
    """Create immutable audit log entry."""
    worker = await session.get(Worker, actor_id)
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_type=worker.type,
        details=details or {},
    )
    session.add(log)
    await session.commit()
```

**Router Integration:**
```python
@router.patch("/tasks/{task_id}/status")
async def update_status(task_id: int, status: str, user: CurrentUser):
    task = await update_task_status(session, task_id, status)
    await log_action(
        session,
        entity_type="task",
        entity_id=task_id,
        action=f"status_changed_to_{status}",
        actor_id=user.worker_id,
        details={"old_status": old_status, "new_status": status}
    )
    return task
```

## Constitutional Alignment

**Principle 1: Every Action Must Be Auditable**
- ✓ All state changes create audit entries
- ✓ Actor identity captured (human or agent)
- ✓ Timestamp and context preserved
- ✓ Queryable by entity, actor, time

## References
- Constitution: .specify/memory/constitution.md (Principle 1)
- CLI Model: packages/cli/src/taskflow/models.py (AuditLog)
- API Model: packages/api/src/taskflow_api/models/audit.py
- Service: packages/api/src/taskflow_api/services/audit.py
