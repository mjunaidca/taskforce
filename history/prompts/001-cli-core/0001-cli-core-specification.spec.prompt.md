---
id: "0001"
title: "CLI Core Specification"
stage: spec
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 001-cli-core
branch: 001-cli-core
user: mjs
command: /sp.specify cli-core
labels: ["cli", "phase-1", "human-agent-parity", "audit-trail"]
links:
  spec: specs/001-cli-core/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-cli-core/spec.md
  - specs/001-cli-core/checklists/requirements.md
tests:
  - spec-architect validation (PASSED 9.0/10)
---

## Prompt

User requested: Complete command-line interface for TaskFlow. Built with Typer for clean, typed commands. Record PHRs at every stage for audit trail and carefully plan execution using SpecifyPlus phases.

Requirements included:
- Basic Level: Add, Delete, Update, View, Mark Complete
- Intermediate Level: Priorities, Tags, Search, Filter, Sort
- Advanced Level: Recurring Tasks, Due Dates
- Project structure planned for future monorepo

## Response snapshot

Created comprehensive CLI specification covering:

**8 User Stories** (P1-P3 prioritized):
1. Initialize Project and Register Workers (P1)
2. Create and Manage Tasks (P1)
3. Execute Task Workflow (P1)
4. Create and Manage Subtasks (P2)
5. View Audit Trail (P2)
6. Search, Filter, Sort (P2)
7. Due Dates and Scheduling (P3)
8. Interactive Mode (P3)

**35 Functional Requirements** covering:
- Project & Initialization (FR-001 to FR-003)
- Workers with Human-Agent Parity (FR-004 to FR-007)
- Task CRUD (FR-008 to FR-012)
- Task Organization (FR-013 to FR-016)
- Task Hierarchy (FR-017 to FR-020)
- Workflow & Status (FR-021 to FR-023)
- Audit Trail (FR-024 to FR-027)
- Search/Filter/Sort (FR-028 to FR-030)
- Storage (FR-031 to FR-033)
- Interactive Mode (FR-034 to FR-035)

**10 Success Criteria** all measurable
**11 Edge Cases** with expected behavior
**4 Key Entities**: Project, Worker, Task, AuditLog

## Outcome

- Impact: Comprehensive CLI specification ready for planning phase
- Tests: spec-architect validation PASSED (9.0/10)
- Files: 2 created (spec.md, requirements checklist)
- Next prompts: /sp.plan cli-core
- Reflection: Formal verification identified 2 minor gaps (agent_type requirement, delegation edge case) - both fixed immediately

## Evaluation notes (flywheel)

- Failure modes observed: None critical - spec was comprehensive on first pass
- Graders run and results (PASS/FAIL): spec-architect: PASS (READY verdict)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Consider adding time budget constraints to spec template
