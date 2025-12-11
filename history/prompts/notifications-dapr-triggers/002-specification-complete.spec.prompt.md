---
id: 002
title: Notifications Dapr Triggers Specification Complete
stage: spec
date: 2025-12-11
surface: agent
model: claude-opus-4-5-20251101
feature: notifications-dapr-triggers
branch: 012-notifications-dapr-triggers
user: agent-2b
command: /sp.specify
labels: ["phase-v", "notifications", "dapr", "specification", "formal-verification"]
links:
  spec: specs/012-notifications-dapr-triggers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/012-notifications-dapr-triggers/spec.md
  - specs/012-notifications-dapr-triggers/checklists/requirements.md
  - packages/api/src/taskflow_api/models/task.py
tests:
  - null
---

## Prompt

/sp.specify notifications-dapr-triggers

Create specification for notifications system with Dapr integration, cron handlers for on_due_date trigger, reminders, event publishing, and frontend bell.

## Response snapshot

**Specification Created**: `specs/012-notifications-dapr-triggers/spec.md`

**Key Components:**
- 6 User Stories (P1: on_due_date spawn fix, P2: assignment/reminders, P3: bell/completion/spawn notifications)
- 22 Functional Requirements (FR-001 to FR-022)
- 7 Success Criteria (SC-001 to SC-007)
- Constraints for atomicity, concurrency control, data retention
- 7 Assumptions documented

**Spec-Architect Validation:**
- Formal verification identified 5 invariants
- 2 counterexamples auto-fixed (spawn atomicity, concurrency)
- 1 architectural clarification resolved: Direct Creation (Option A) - API creates notifications directly in database, Dapr events are observability only
- Checklist generated: `specs/012-notifications-dapr-triggers/checklists/requirements.md`

**P0 Fix Applied:**
- Added `reminder_sent` field to Task model (line 94-97 in task.py)
- Note: `recurring_root_id` already had `index=True` (PRD was outdated)

**Overall Verdict:** READY for planning phase

## Outcome

- Impact: Comprehensive spec covers bug fix (on_due_date silent failure) + full notification system
- Tests: Spec includes 14 acceptance scenarios across 6 user stories
- Files: spec.md, checklist, task.py model update
- Next prompts: /sp.plan notifications-dapr-triggers
- Reflection: Spec-architect validation caught atomicity and concurrency gaps. Architectural decision (Direct Creation) ensures SC-005 achievable.

## Evaluation notes (flywheel)

- Failure modes observed: Initial PRD claimed recurring_root_id needed index - it already existed
- Graders run and results (PASS/FAIL): spec-architect validation PASS after auto-fixes
- Prompt variant (if applicable): Standard spec workflow with formal verification
- Next experiment: Verify cron handler implementation matches atomicity constraints
