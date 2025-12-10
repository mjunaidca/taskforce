---
id: 001
title: Recurring Tasks Specification
stage: spec
date: 2025-12-10
surface: agent
model: claude-opus-4-5-20251101
feature: recurring-tasks
branch: recurring-tasks
user: autonomous
command: /sp.specify recurring-tasks
labels: ["recurring-tasks", "phase-v", "specification", "sdd"]
links:
  spec: specs/013-recurring-tasks/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/013-recurring-tasks/spec.md
  - specs/013-recurring-tasks/checklists/requirements.md
tests:
  - N/A (specification phase)
---

## Prompt

/sp.specify recurring-tasks

Implement Recurring Tasks - tasks that auto-create their next occurrence when completed. Support minute-level recurrence (1m, 5m, etc.), daily, weekly, monthly patterns. Include max occurrences limit.

Context from PRD (specs/011-phase-v-features-planner/agent-2a-recurring-tasks-prd.md):
- Add 3 fields to Task model (is_recurring, recurrence_pattern, reminder_sent)
- Modify update_status to create next occurrence when completing recurring task
- Add recurring toggle to task forms in frontend

User additions:
- Support 1-minute recurrence intervals
- Add duration/max occurrences feature

## Response snapshot

Created comprehensive specification at `specs/013-recurring-tasks/spec.md` covering:

1. **5 User Stories** (prioritized P1-P3):
   - P1: Complete recurring task creates next occurrence
   - P1: Create recurring task via form
   - P2: View recurring task indicator
   - P2: Edit task recurrence settings
   - P3: Max occurrences limit

2. **13 Functional Requirements** (FR-001 through FR-013):
   - Model fields: is_recurring, recurrence_pattern, reminder_sent, max_occurrences, occurrences_created
   - Supported patterns: 1m, 5m, 10m, 15m, 30m, 1h, daily, weekly, monthly
   - Auto-creation logic on completion
   - Audit log integration
   - Frontend UI requirements

3. **6 Success Criteria** with measurable outcomes:
   - SC-001: Next occurrence appears within 2 seconds
   - SC-002: Exactly one occurrence per completion (no duplicates)
   - SC-006: Max occurrences 100% accuracy

4. **Spec-architect validation**: 9.5/10 score, READY FOR PLANNING

## Outcome

- Impact: Comprehensive specification created for recurring tasks feature
- Tests: N/A (specification phase - no code yet)
- Files: 2 files created (spec.md, requirements.md checklist)
- Next prompts: /sp.plan recurring-tasks
- Reflection: Extended PRD with max_occurrences feature per user request. Spec-architect validated with formal verification (invariants, small scope testing).

## Evaluation notes (flywheel)

- Failure modes observed: None - spec passed all validation checks
- Graders run and results (PASS/FAIL): spec-architect validation PASS (9.5/10)
- Prompt variant (if applicable): Standard /sp.specify flow
- Next experiment (smallest change to try): Could add p95 latency percentile to SC-001
