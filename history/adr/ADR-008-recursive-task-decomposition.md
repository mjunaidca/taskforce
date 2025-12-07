# ADR-008: Recursive Task Decomposition

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** Cross-cutting (001-006)
- **Context:** .specify/memory/constitution.md (Principle 3)

## Decision

Implemented unlimited recursive task decomposition via self-referential `parent_task_id` foreign key. Tasks can spawn subtasks to any depth, enabling both human-driven breakdown and AI agent autonomous decomposition.

**Data Model:**
```python
class Task:
    id: int
    parent_task_id: int | None  # Self-referential FK
    project_id: int

    # Derived relationship
    subtasks: list["Task"]  # Children where parent_task_id = self.id
    parent: "Task" | None   # Parent task
```

**Validation Rules:**
1. **Same Project**: Subtask must be in same project as parent
2. **No Cycles**: Task cannot be ancestor of itself (prevented at creation)
3. **No Orphans**: parent_task_id must reference existing task

**Progress Rollup:**
- Subtask completion contributes to parent progress
- Parent task cannot be completed until all subtasks are done
- Status transitions propagate upward (blocked children block parent)

## Consequences

### Positive
- Agents can autonomously break complex tasks into manageable pieces
- Humans can organize work hierarchically
- Unlimited depth supports complex project structures
- Progress visibility at any level of granularity
- Same model works from CLI to Web to MCP

### Negative
- Deep hierarchies can impact query performance
- UI must handle tree rendering (collapse/expand)
- Bulk operations across hierarchy add complexity
- Deletion cascades require confirmation

## Alternatives Considered

### Alternative A: Flat task list with labels/tags
- Pros: Simpler queries, no tree complexity
- Cons: No structural hierarchy, harder to track decomposition
- Why rejected: Task decomposition is constitutional requirement for AI agent autonomy

### Alternative B: Fixed depth hierarchy (Epic → Story → Task)
- Pros: Predictable structure, simpler UI
- Cons: Artificial constraint, doesn't match real work patterns
- Why rejected: Unlimited depth enables organic work breakdown

### Alternative C: External task relationship table
- Pros: Supports multiple relationship types (blocks, depends, parent)
- Cons: More complex queries, additional join table
- Why rejected: Parent-child is the primary relationship; simpler model preferred

## Implementation Patterns

**Same-Project Validation:**
```python
@validator("parent_task_id")
def validate_parent(cls, v, values):
    if v is not None:
        parent = get_task(v)
        if parent.project_id != values["project_id"]:
            raise ValueError("Parent must be in same project")
    return v
```

**Cycle Prevention:**
```python
def check_no_cycle(task_id, proposed_parent_id):
    """Walk up tree to ensure task_id is not an ancestor of proposed_parent."""
    current = proposed_parent_id
    while current:
        if current == task_id:
            raise CycleError("Task cannot be its own ancestor")
        current = get_task(current).parent_task_id
```

**Tree Query (PostgreSQL recursive CTE):**
```sql
WITH RECURSIVE task_tree AS (
    SELECT id, title, parent_task_id, 0 as depth
    FROM task WHERE id = :root_id
    UNION ALL
    SELECT t.id, t.title, t.parent_task_id, tt.depth + 1
    FROM task t
    JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree ORDER BY depth;
```

## Constitutional Alignment

**Principle 3: Recursive Task Decomposition**
- ✓ Tasks can spawn infinite subtasks
- ✓ Agents can autonomously decompose work
- ✓ Progress rolls up from subtasks to parents

## References
- Constitution: .specify/memory/constitution.md (Principle 3)
- CLI Model: packages/cli/src/taskflow/models.py (parent_id field)
- API Model: packages/api/src/taskflow_api/models/task.py (parent_task_id)
- Spec: specs/001-cli-core/spec.md (recursive task commands)
