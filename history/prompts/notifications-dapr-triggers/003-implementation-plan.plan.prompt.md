---
id: 003
title: Notifications Dapr Triggers Implementation Plan
stage: plan
date: 2025-12-11
surface: agent
model: claude-opus-4-5-20251101
feature: notifications-dapr-triggers
branch: 012-notifications-dapr-triggers
user: agent-2b
command: /sp.plan
labels: ["phase-v", "notifications", "dapr", "implementation-plan", "architecture"]
links:
  spec: specs/012-notifications-dapr-triggers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/012-notifications-dapr-triggers/plan.md
tests:
  - null
---

## Prompt

/sp.plan notifications-dapr-triggers

Create implementation plan for notifications system with Dapr integration.

## Response snapshot

**Plan Created**: `specs/012-notifications-dapr-triggers/plan.md` (1192 lines)

**Prioritized Implementation Phases:**
- **P1 (6-8h)**: Critical bug fix - Cron handler for `on_due_date` trigger
- **P2 (8-10h)**: Core notifications - Notification model, reminders, assignments
- **P3 (6-8h)**: Frontend bell, completion/spawn notifications, Dapr events
- **MCP (2-3h)**: Agent parity - list_notifications, mark_notification_read tools

**Key Technical Decisions:**
1. **APScheduler** for 60-second cron interval (not Dapr cron binding for simplicity)
2. **Row-level locking** with `SELECT FOR UPDATE SKIP LOCKED` for concurrency
3. **Direct notification creation** (API writes DB, Dapr events for observability)
4. **Single PostgreSQL instance** (no separate notification service)
5. **30-second polling** for frontend bell (WebSocket is future enhancement)

**Constitutional Compliance:** All 5 principles verified:
- Audit: Cron spawns create audit entries
- Agent Parity: MCP tools for notifications
- Recursive Tasks: Subtask cloning in cron
- Spec-Driven: Plan derived from spec.md
- Phase Continuity: Notification model stable across phases

**Total Estimated Effort**: 26-35 hours

## Outcome

- Impact: Complete production-ready plan covering database schema, API contracts, cron logic, frontend, MCP tools
- Tests: 18 acceptance scenarios mapped across 4 test phases
- Files: plan.md with implementation checklist (38 items)
- Next prompts: /sp.tasks notifications-dapr-triggers
- Reflection: Plan includes detailed code examples for all critical paths (cron, notifications, frontend)

## Evaluation notes (flywheel)

- Failure modes observed: None - general-purpose agent produced comprehensive plan
- Graders run and results (PASS/FAIL): Manual review PASS
- Prompt variant (if applicable): Standard planning workflow with routing to general-purpose
- Next experiment: Verify APScheduler integration in production (not just Dapr cron)
