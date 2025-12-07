---
id: "0005"
title: "CLI Core Implementation Plan"
stage: plan
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 001-cli-core
branch: 001-cli-core
user: mjs
command: /sp.plan 001-cli-core
labels: ["architecture", "implementation", "sprint-planning", "typer-cli"]
links:
  spec: specs/001-cli-core/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-cli-core/plan.md
tests:
  - Constitution Check: PASSED (5/5 principles)
---

## Prompt

Generate implementation plan for TaskFlow CLI Core feature based on:
- Spec: 40 functional requirements (FR-001 to FR-040)
- Constitutional principles: Audit, Agent Parity, Recursive Tasks, Spec-Driven, Phase Continuity
- Target: 69-minute implementation across 3 sprints
- Tech stack: Python 3.13+, Typer, Pydantic, Rich, UV

## Response snapshot

**Comprehensive 1000+ line plan generated covering:**

### 1. Technical Architecture
- 4-layer dependency graph: Models → Infrastructure → Commands → Entry Point
- Data flow diagrams for task creation, status transitions, audit trail
- Module breakdown: models.py, storage.py, audit.py, config.py, 9 command modules

### 2. Component Breakdown (9 Command Modules)
- init.py: Project initialization
- project.py: Project CRUD
- worker.py: Worker registration (human + agent)
- task.py: Task CRUD with filters
- workflow.py: Status transitions (start, progress, complete, review, approve, reject)
- audit.py: Audit trail viewing
- config.py: Configuration management
- demo.py: Automated demo script
- interactive.py: REPL mode

### 3. Implementation Sequence (3 Sprints)
- Sprint 1 (30 min): models.py → storage.py → init → project → worker
- Sprint 2 (20 min): task add → task list → task show
- Sprint 3 (19 min): workflow → audit → demo

### 4. Data Model Details
- Complete Pydantic models with validation
- JSON storage structure (.taskflow/config.json, data.json)
- Phase continuity: Pydantic → SQLModel migration path documented

### 5. Test Strategy
- Unit tests: models, storage, audit
- Integration tests: all CLI commands
- Demo as acceptance test (<90 seconds)

### 6. Key Technical Decisions
- Typer over Click (modern, typed)
- Rich for terminal output (tables, colors)
- JSON + file locking for Phase I
- Dict-based status transition validation

### Constitutional Compliance
All 5 principles verified and documented with specific implementation mappings.

## Outcome

- Impact: Complete architectural blueprint for 69-minute implementation
- Tests: Constitution check PASSED (5/5)
- Files: 1 created (plan.md - 1000+ lines)
- Next prompts: /sp.tasks 001-cli-core
- Reflection: Plan is comprehensive and includes Pydantic model code samples ready to copy

## Evaluation notes (flywheel)

- Failure modes observed: None - plan generated successfully on first pass
- Graders run and results (PASS/FAIL): Constitution Check: PASS, Phase Continuity: PASS
- Prompt variant (if applicable): general-purpose agent with engineering focus
- Next experiment (smallest change to try): Consider adding mermaid diagrams for architecture visualization
