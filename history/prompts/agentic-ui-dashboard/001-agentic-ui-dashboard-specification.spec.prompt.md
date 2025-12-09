---
id: 001
title: Agentic UI Dashboard Specification
stage: spec
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: agentic-ui-dashboard
branch: 008-agentic-ui-dashboard
user: mjs
command: /sp.orchestrate → /sp.specify agentic-ui-dashboard
labels: ["chatkit", "widgets", "streaming-ui", "entity-tagging", "agentic-ui"]
links:
  spec: specs/008-agentic-ui-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/008-agentic-ui-dashboard/spec.md
  - specs/008-agentic-ui-dashboard/checklists/requirements.md
tests:
  - N/A (specification phase)
---

## Prompt

Now let's build Agentic UI interface where user can easily manage the tasks, projects workers by actions, weidgets, streaming uis and a modern interface. This page will be in @web-dashboard/ And we have to access that changes in our chatkit server agent config @packages/api/ and our mcp server tools. Will the MCP server tools stream these actions themselves this is another interesting question @packages/mcp-server/ . Given the complexity of this feature you will user proper spec loop from /sp.specify and beresponsible for recording phrs and adrs. As you are engineering this Agentic UI Interface for lousy enterprises on my behalf be metacilous. I am not avalaible for this session overview so take the reins and report once done. Rather than getting your head in water use the relevant subagents and skills and tools.

## Response snapshot

Created comprehensive specification for TaskFlow Agentic UI Dashboard (008-agentic-ui-dashboard) with:

**7 User Stories** (P1-P3 prioritized):
1. P1: Interactive Task List Widget with action buttons
2. P1: @Mention Workers/Agents for assignment
3. P2: Real-time Progress During Operations
4. P2: Composer Tool Modes (Tasks/Projects/Quick Actions)
5. P2: Task Creation via Widget Form
6. P3: Project Context Awareness with Visual Indicator
7. P3: Audit Trail Widget

**31 Functional Requirements** across:
- Widget System (FR-001 to FR-005)
- Entity Tagging (FR-010 to FR-014)
- Streaming UI (FR-020 to FR-023)
- Composer Tools (FR-030 to FR-033)
- Task Form Widget (FR-040 to FR-043)
- Context Awareness (FR-050 to FR-053)
- Audit Widget (FR-060 to FR-062)

**10 Success Criteria** with specific metrics (200ms autocomplete, <3s task completion, etc.)

**Validation**: spec-architect validated with 9.3/10 score, 0 counterexamples in formal verification.

**MCP Streaming Answer**: MCP tools don't stream themselves - they return JSON. ChatKit server wraps responses via `stream_agent_response()`. Widget updates happen via `ThreadItemReplacedEvent` when server actions complete.

## Outcome

- ✅ Impact: Foundation for Agentic UI - enables interactive widgets, entity tagging, streaming UX
- 🧪 Tests: N/A (specification phase - tests defined in acceptance scenarios)
- 📁 Files: 2 files created (spec.md, requirements.md checklist)
- 🔁 Next prompts: /sp.plan agentic-ui-dashboard → /sp.tasks → /sp.implement
- 🧠 Reflection: Comprehensive spec covering all ChatKit skill tiers (integration, streaming, actions)

## Evaluation notes (flywheel)

- Failure modes observed: None - spec validated successfully
- Graders run and results (PASS/FAIL): spec-architect validation PASS (9.3/10)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Proceed to planning phase
