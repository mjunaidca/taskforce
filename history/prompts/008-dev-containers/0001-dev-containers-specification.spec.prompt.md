---
id: "0001"
title: Dev Containers Specification
stage: spec
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 008-dev-containers
branch: 008-dev-containers
user: mjs
command: /sp.specify
labels: ["docker", "development", "hot-reload", "containers"]
links:
  spec: specs/008-dev-containers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/008-dev-containers/spec.md
  - specs/008-dev-containers/checklists/requirements.md
tests:
  - null
---

## Prompt

/sp.specify 008-dev-containers

Development container environment with hot reloading on all servers. New dockerfiles and new compose and script so we have hot reloading on all servers.

## Response snapshot

Created comprehensive specification for development container environment:

**Key Deliverables**:
- compose.dev.yaml - Development compose with volume mounts
- docker-dev.sh - Development startup script
- Hot reload for all 5 services (postgres, sso, api, mcp-server, web-dashboard)

**User Stories (5)**:
1. P1: Start dev environment with single command
2. P1: Hot reload Python backend changes (uvicorn --reload)
3. P1: Hot reload Next.js changes (Fast Refresh)
4. P2: Switch between dev/prod modes
5. P2: Debug with container logs

**Success Criteria**:
- Single command startup (./docker-dev.sh)
- Python reload < 5 seconds
- React Fast Refresh < 3 seconds
- Mode switch < 30 seconds
- Zero image rebuilds for code changes

**Validation**: spec-architect validated as READY (9/10 score)

## Outcome

- Impact: Spec created and validated, ready for planning
- Tests: N/A (spec phase)
- Files: spec.md, requirements.md checklist
- Next prompts: /sp.plan 008-dev-containers
- Reflection: Clean spec leveraging existing 007-containerize-apps patterns

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): PASS - spec-architect validated
- Prompt variant (if applicable): Standard /sp.specify
- Next experiment (smallest change to try): N/A
