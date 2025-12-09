---
id: 002
title: Agentic UI Dashboard Planning
stage: plan
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: agentic-ui-dashboard
branch: 008-agentic-ui-dashboard
user: mjs
command: /sp.plan agentic-ui-dashboard
labels: ["architecture", "chatkit-skills", "widget-system", "entity-tagging"]
links:
  spec: specs/008-agentic-ui-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/008-agentic-ui-dashboard/plan.md
tests:
  - N/A (planning phase)
---

## Prompt

/sp.plan agentic-ui-dashboard - Create implementation plan for the Agentic UI Dashboard feature with interactive widgets, entity tagging, streaming UI, and server actions.

## Response snapshot

Created comprehensive 787-line implementation plan with:

**4 Implementation Phases (14 hours total)**:
1. Phase 1 (3h): Foundation - Streaming lifecycle & context awareness
2. Phase 2 (4h): Widget System - Task list with server actions
3. Phase 3 (3h): Entity Tagging - @mentions for workers/agents
4. Phase 4 (4h): Advanced Features - Forms, composer tools, audit timeline

**Technical Architecture**:
- Frontend: Extend ChatKitWidget.tsx with useChatKit configuration
- Backend: Add action() method to chatkit_server.py + widget templates
- New Files: 4 widget templates, members endpoint, widget builders

**Constitution Check**: ✅ All 4 principles passed
- Audit: Widget actions route through existing audited endpoints
- Agent Parity: @mentions treat humans/agents equally
- Recursive Tasks: Subtasks supported via existing parent_id
- Spec-Driven: Implementation derived from spec

**Skills Applied**:
- chatkit-streaming (Phase 1)
- chatkit-actions (Phases 2-4)

**Test Strategy**: Unit (Vitest + Pytest), Integration (Playwright), E2E (10-step flow)

## Outcome

- ✅ Impact: Complete blueprint for transforming basic chat to Agentic UI
- 🧪 Tests: Test strategy defined (unit, integration, E2E mapped to user stories)
- 📁 Files: 1 file created (plan.md - 787 lines)
- 🔁 Next prompts: /sp.tasks agentic-ui-dashboard → /sp.implement
- 🧠 Reflection: Plan leverages all 3 ChatKit skill tiers created earlier

## Evaluation notes (flywheel)

- Failure modes observed: None - plan generated successfully
- Graders run and results (PASS/FAIL): N/A (planning phase)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Proceed to task generation
