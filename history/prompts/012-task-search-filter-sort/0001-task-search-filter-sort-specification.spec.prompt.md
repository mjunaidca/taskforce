---
id: 0001
title: task-search-filter-sort-specification
stage: spec
date: 2025-12-10
surface: agent
model: claude-opus-4-5-20251101
feature: 012-task-search-filter-sort
branch: 012-task-search-filter-sort
user: agent-1
command: /sp.specify task-search-filter-sort
labels: [phase-v, performance, n+1-fix, search, filter, sort, api, frontend]
links:
  spec: specs/012-task-search-filter-sort/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/012-task-search-filter-sort/spec.md
  - specs/012-task-search-filter-sort/checklists/requirements.md
tests:
  - N/A (spec phase - no tests)
---

## Prompt

User requested implementation of search, filter, and sort capabilities for tasks, including fixing a critical N+1 performance bug (GitHub #14). Key inputs:
- Time budget: 45-60 minutes
- Priority: N+1 fix first (highest impact)
- Existing search bar filters client-side (needs API wiring)
- Sort dropdown is missing (needs new UI)
- Reference: specs/011-phase-v-features-planner/AGENT-1-INSTRUCTIONS.md and agent-1-feature-fields-prd.md

## Response snapshot

Created comprehensive specification with:
- 4 Success Evals (N+1 fix, server-side search, sort/filter correctness, backward compatibility)
- 5 User Stories (P1: performance + search, P2: sorting, P3: tag/due date filters)
- 15 Functional Requirements across backend API, frontend, and type definitions
- 7 measurable Success Criteria
- 5 edge cases with explicit handling
- 6 non-goals to bound scope
- 4 constraints including backward compatibility

Spec-architect validation identified missing Success Evals section (constitutional requirement) - auto-fixed by inserting evals after Problem Statement. Final verdict: READY for planning.

## Outcome

- ✅ Impact: Specification complete and validated by spec-architect
- 🧪 Tests: N/A (spec phase)
- 📁 Files: 2 files created (spec.md, checklists/requirements.md)
- 🔁 Next prompts: /sp.plan task-search-filter-sort
- 🧠 Reflection: Good separation of P1/P2/P3 priorities. N+1 fix is clearly highest impact/lowest risk.

## Evaluation notes (flywheel)

- Failure modes observed: Initial spec missing Success Evals section (constitutional violation)
- Graders run and results (PASS/FAIL): spec-architect validation PASS (after fix)
- Prompt variant (if applicable): standard /sp.specify flow
- Next experiment (smallest change to try): None - proceed to planning
