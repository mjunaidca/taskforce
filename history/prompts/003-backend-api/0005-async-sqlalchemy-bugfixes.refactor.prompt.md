---
id: 0005
title: Async SQLAlchemy Bug Fixes and Pattern Discovery
stage: refactor
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20250514
feature: 003-backend-api
branch: 005-chatkit-ui
user: mjs
command: manual debugging session
labels: [bugfix, async, sqlalchemy, sqlmodel, patterns, missinggreenlet]
links:
  spec: specs/003-backend-api/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/api/src/taskflow_api/routers/projects.py
  - packages/api/src/taskflow_api/routers/agents.py
  - packages/api/src/taskflow_api/routers/members.py
  - packages/api/src/taskflow_api/routers/tasks.py
  - packages/api/src/taskflow_api/services/audit.py
  - packages/api/src/taskflow_api/schemas/task.py
  - packages/api/src/taskflow_api/auth.py
tests:
  - Manual Swagger UI testing
---

## Prompt

Q: The backend API is throwing MissingGreenlet errors when testing via Swagger UI. Multiple endpoints fail after initial implementation. Debug and fix.

Q: How are subtasks created in tasks?

Q: Now improve your skills and see if you want to make new one. This was a buggy to improved code. Was my spec or tasks incorrect?

## Response snapshot

### Bug Analysis and Root Cause

**Primary Issue: MissingGreenlet errors**

After `session.commit()`, SQLAlchemy objects become "detached" from the session. In async context, accessing any attribute (even simple ones like `worker.id`) triggers lazy loading which requires a greenlet - causing `MissingGreenlet: greenlet_spawn has not been called`.

**Affected Routers**:
1. `projects.py` - Accessing `project.id` after commit in list_projects
2. `agents.py` - Accessing `agent.handle` after commit in create_agent
3. `members.py` - Accessing `worker.id` after commit in add_member
4. `tasks.py` - Multiple endpoints accessing task/worker attributes after commit

### Fixes Applied

**Pattern 1: Extract Primitives Before Commit**
```python
# WRONG - causes MissingGreenlet
session.add(worker)
await session.commit()
await log_action(session, actor_id=worker.id)  # FAILS

# CORRECT - extract before commit
session.add(worker)
worker_id = worker.id  # Extract while attached
await session.commit()
await log_action(session, actor_id=worker_id)  # Works
```

**Pattern 2: Use flush() for Generated IDs**
```python
# Get ID before commit
session.add(entity)
await session.flush()  # Generates ID without committing
entity_id = entity.id  # Safe to access
# ... do more work ...
await session.commit()  # Single commit at end
```

**Pattern 3: Service Functions Never Commit**
```python
# WRONG - audit.py
async def log_action(...):
    session.add(log)
    await session.commit()  # Breaks caller's transaction

# CORRECT - caller owns transaction
async def log_action(...):
    session.add(log)
    return log  # No commit, caller decides
```

**Pattern 4: Build Response Objects Manually**
```python
# In assign_task endpoint - build TaskRead directly
assignee_handle = assignee.handle if assignee else None  # Extract
await session.commit()
# Build response with extracted values
return TaskRead(
    id=task.id,
    assignee_handle=assignee_handle,
    ...
)
```

### Additional Fixes

**Input Validation**:
- Added `zero_to_none` validator: Convert 0 to None for nullable FKs (Swagger UI sends 0 as default)
- Added `strip_timezone` function: Strip timezone from datetime inputs (DB stores naive UTC)

**Logging**:
- Added comprehensive logging to `auth.py` for JWT verification debugging
- Log token preview, JWKS cache status, key matching

### Spec/Tasks Assessment

The spec and tasks were **correct for functional requirements** but **incomplete for implementation patterns**:
- Spec correctly defined what the API should do
- Tasks correctly broke down the work
- Neither documented async SQLAlchemy pitfalls
- This is a **skill/pattern gap**, not a spec gap

**Recommendation**: Document patterns in skills (reusable) and constitution (platform-wide principles)

## Outcome

- Impact: All 5 routers fixed, API fully functional via Swagger UI
- Tests: Manual testing - all endpoints working
- Files: 7 files modified with async pattern fixes
- Next prompts: Update constitution and skills with learned patterns
- Reflection: The bug pattern (MissingGreenlet) is a common async SQLAlchemy pitfall that should be documented for future work

## Evaluation notes (flywheel)

- Failure modes observed:
  1. MissingGreenlet on attribute access after commit
  2. Swagger UI sends 0 for empty nullable integer fields
  3. Timezone-aware datetime rejected by naive DB columns
  4. Service functions committing inside caller's transaction
- Graders run and results (PASS/FAIL): Manual Swagger testing - PASS (all endpoints work)
- Prompt variant (if applicable): Interactive debugging session
- Next experiment (smallest change to try): Add async pattern checklist to implementation phase
