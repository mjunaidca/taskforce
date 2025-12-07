---
id: 0006
title: Pattern Documentation in Constitution and Skills
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20250514
feature: 003-backend-api
branch: 005-chatkit-ui
user: mjs
command: manual documentation update
labels: [documentation, patterns, constitution, skills, async, sqlmodel]
links:
  spec: specs/003-backend-api/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - .claude/skills/engineering/sqlmodel-database/SKILL.md
tests:
  - null
---

## Prompt

Q: Where shall this be updated - constitution, subagent, skills, tasks command maker or claude.md?

Q: Okay do it and what about our sqlmodel skill do you see any opportunity to improve or add new ones using your current skills?

## Response snapshot

### Location Decision Analysis

**Options considered**:
1. **Constitution** - Platform-wide principles and invariants
2. **Skills** - Reusable technical patterns for specific technologies
3. **Subagent** - Agent behavior configuration
4. **Claude.md** - AI operational behavior
5. **Tasks command maker** - Task generation templates

**Decision**: Update BOTH constitution AND skills because:
- Constitution: These are **platform-wide invariants** (every Python backend in this project will use async SQLAlchemy)
- Skills: These are **reusable code patterns** specific to SQLModel technology

### Constitution Update (v1.0.4)

Added new **Section III: Technical Implementation Patterns** before Platform Quality Standards:

```markdown
## III. Technical Implementation Patterns

### Async SQLAlchemy / SQLModel (Python Backend)

**Problem**: After `session.commit()`, SQLAlchemy objects become detached.
Accessing attributes triggers lazy loading → MissingGreenlet error.

**Required Pattern**:
1. Extract primitive values BEFORE any commit
2. Use flush() to get generated IDs without committing
3. Single commit at end of operation

### API Input Validation
1. Convert 0 to None for nullable FKs
2. Strip timezone from datetime inputs
3. Validate FK references exist before insert

### Transaction Boundaries
- Service functions should NOT commit internally
- Router endpoints own the commit decision
- Prevents broken transactions and audit gaps
```

### SQLModel Skill Update

Added two major sections to `.claude/skills/engineering/sqlmodel-database/SKILL.md`:

**1. Critical: Async Session Patterns (MissingGreenlet Prevention)**
```python
## The Pattern: Extract → Flush → Commit

@router.post("/entities", response_model=EntityRead, status_code=201)
async def create_entity(...):
    # 1. Extract primitives immediately
    worker_id = worker.id
    worker_type = worker.type

    # 2. Create and flush
    session.add(entity)
    await session.flush()
    entity_id = entity.id

    # 3. Related operations with primitives
    await log_action(session, entity_id=entity_id, actor_id=worker_id)

    # 4. Single commit
    await session.commit()
    await session.refresh(entity)
    return entity

## Service Functions: Never Commit Internally
```

**2. Input Validation Patterns**
```python
@field_validator("assignee_id", mode="after")
@classmethod
def zero_to_none(cls, v: int | None) -> int | None:
    """Convert 0 to None (Swagger sends 0 for empty nullable ints)."""
    return None if v == 0 else v

def strip_timezone(dt: datetime | None) -> datetime | None:
    """Convert timezone-aware to naive UTC for database."""
    if dt and dt.tzinfo:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt
```

**3. Added Common Pitfall #5**
```markdown
5. **MissingGreenlet on attribute access**
   - Cause: Accessing detached object after commit
   - Fix: Extract primitives before commit, use flush() for IDs
```

## Outcome

- Impact: Future Python backend work will have documented patterns to avoid async pitfalls
- Tests: N/A (documentation)
- Files: 2 files updated (constitution.md, SKILL.md)
- Next prompts: MCP Server development (suggested next parallel work)
- Reflection: Patterns belong in both constitution (enforcement) and skills (reusable code)

## Evaluation notes (flywheel)

- Failure modes observed: N/A (documentation phase)
- Graders run and results (PASS/FAIL): Manual review - PASS (patterns documented)
- Prompt variant (if applicable): Interactive decision-making session
- Next experiment (smallest change to try): Create automated linter rule for commit-before-access pattern
