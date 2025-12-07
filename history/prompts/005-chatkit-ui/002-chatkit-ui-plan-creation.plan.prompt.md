---
id: 002
title: ChatKit UI Implementation Plan
stage: plan
date: 2025-12-07
surface: agent
model: claude-opus-4
feature: 005-chatkit-ui
branch: 005-chatkit-ui
user: mjunaidca
command: /sp.plan
labels: [chatkit, ui, plan, architecture]
links:
  spec: specs/005-chatkit-ui/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/8
files:
  - specs/005-chatkit-ui/plan.md
tests:
  - null
---

## Prompt

Generate implementation plan for ChatKit UI based on spec at specs/005-chatkit-ui/spec.md

## Response snapshot

Created detailed implementation plan with:

**Technical Context:**
- Analyzed existing web-dashboard (Next.js 16, React 19, Better Auth)
- Referenced robolearn-interface ChatKitWidget (863 lines) as battle-tested pattern
- Documented key differences between Docusaurus and Next.js App Router

**Architecture Decisions:**
1. Use @openai/chatkit-react (not custom chat UI)
2. Custom hook with component-local state (not global store)
3. Proxy through Next.js API route (not direct backend calls)
4. Extract project context from URL via usePathname/useParams

**Constitution Compliance Check:**
- Principle 1 (Auditable): COMPLIANT - all chat actions create audit entries
- Principle 2 (Agent Parity): COMPLIANT - humans chat, agents use MCP
- Principle 3 (Recursive Tasks): SUPPORTED - can decompose via chat
- Principle 4 (Spec-Driven): COMPLIANT - plan follows spec

**6-Phase Implementation:**
1. Foundation (P1 Stories) - basic chat
2. Authentication (P1) - auth integration
3. Context Awareness (P2) - project context
4. Backend Integration (P2) - Agents SDK
5. Conversation Persistence (P2) - history
6. Polish (P3) - animations, tool calls

## Outcome

- Impact: Clear implementation roadmap for developers
- Tests: Test strategy defined (unit, integration, E2E)
- Files: 1 plan file created (404 lines)
- Next prompts: /sp.tasks for task breakdown
- Reflection: Plan bridges spec to actionable implementation steps

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Constitution check PASS
- Prompt variant (if applicable): Standard plan command
- Next experiment: Generate tasks from plan
