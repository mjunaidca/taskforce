---
id: "0004"
title: "Spec Clarification and Updates"
stage: spec
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 001-cli-core
branch: 001-cli-core
user: mjs
command: user clarification questions
labels: ["clarification", "spec-update", "ux-decision", "demo-mode"]
links:
  spec: specs/001-cli-core/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-cli-core/spec.md (updated)
tests:
  - N/A (spec refinement)
---

## Prompt

User asked 3 clarification questions:
1. Q: Can tasks be general or within projects?
2. Q: If I just add a task, will it go to workspace owner by default? Are we in a default workspace?
3. Q: Will we have a command to see taskflow in demo? `taskflow demo -i` for interactive and `taskflow demo` for simple?

User also asked about workspaces concept.

## Response snapshot

**Decisions Made**:

### Q1: Tasks within projects
- Chose **Option B**: Default project created on `init`
- Tasks without `--project` flag go to "default" project
- Simple UX: `taskflow add "Fix bug"` just works
- Organization when needed: `--project myapp`

### Q2: Current user configuration
- Added `taskflow config set user @handle` command
- Config stores: default_project, current_user, storage_mode
- Tasks get `created_by` from config, `assignee` is optional

### Q3: Demo command
- Added `taskflow demo` - runs full automated demo (~90 seconds)
- Added `taskflow demo -i` - interactive step-by-step with pauses
- Perfect for hackathon presentations

### Workspaces Decision
- **REJECTED for Phase I** - this is multi-tenancy (Phase II)
- Projects are sufficient grouping for single-user CLI
- Workspaces can be added in Phase II web app with organizations

**Spec Updates Applied**:
- FR-001: Now creates "default" project on init
- FR-003: Config includes default_project, current_user, storage_mode
- FR-010: Assignment now optional (unassigned tasks allowed)
- FR-036: New - config set user command
- FR-037: New - default project for tasks without --project
- FR-038: New - demo command
- FR-039: New - demo -i interactive mode
- FR-040: New - demo completes in <90 seconds

## Outcome

- Impact: Spec improved with better UX defaults and demo capability
- Tests: N/A
- Files: spec.md updated with 5 new/modified requirements
- Next prompts: Spec approval, then /sp.plan
- Reflection: User questions led to significant UX improvements. Demo command is excellent for hackathon.

## Evaluation notes (flywheel)

- Failure modes observed: Initial spec lacked default project concept - could have caused friction
- Graders run and results (PASS/FAIL): N/A (spec refinement)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Consider adding `taskflow config show` to display current settings
