---
id: 0002
title: phase-0-routing-infrastructure-to-general-purpose
stage: misc
date: 2025-12-09
surface: agent
model: claude-sonnet-4.5
feature: 010-phase-iv-k8s-minikube
branch: 010-phase-iv-k8s-minikube
user: mjs
command: /sp.orchestrate (Phase 0)
labels: ["routing", "orchestration", "infrastructure", "sdd-ri", "phase-0"]
links:
  spec: To be created
  ticket: null
  adr: null
  pr: null
files:
  - N/A (routing decision only)
tests:
  - N/A (routing phase)
---

## Prompt

```
Deploy TaskFlow platform to Minikube using Helm charts as Hackathon Phase IV deliverable
```

**Context**: SDD-RI Phase 0 (Context Analysis & Routing) - Analyze request and route to appropriate agent for subsequent phases.

**Input Classification**:
- Work Type: INFRASTRUCTURE (Kubernetes deployment, Helm charts, DevOps)
- Hackathon Phase: Phase IV (local deployment)
- Feature Slug: phase-iv-k8s-minikube

## Response snapshot

**Routing Decision: INFRASTRUCTURE → general-purpose agent**

**Classification Signals**:
- ✅ Mentions: Helm charts, Minikube, Kubernetes deployment, Docker images
- ✅ References: Bitnami PostgreSQL, ConfigMaps, Secrets, service orchestration
- ✅ Includes: Infrastructure setup, DevOps patterns, system architecture
- ❌ No lesson/module/chapter content (not CONTENT work)
- ❌ No educational pedagogical patterns (not chapter-planner work)

**Constitutional Validation (Gate 0)**:
- **Principle 1 (Audit)**: N/A - Infrastructure phase, no task state changes
- **Principle 2 (Agent Parity)**: N/A - Infrastructure deployment
- **Principle 3 (Recursive Tasks)**: N/A - Not task management feature
- **Principle 4 (Spec-Driven)**: ✅ ENFORCED - Will create spec before implementation
- **Principle 5 (Phase Continuity)**: ✅ VERIFIED - Builds on Phase III compose.yaml

**Feature Numbering**:
- Checked all sources: remote branches, local branches, specs/, specs/archived/
- Found highest: 009-event-driven-architecture
- Allocated: 010-phase-iv-k8s-minikube
- Created branch: 010-phase-iv-k8s-minikube

**Routing Matrix Decision**:
```
INFRASTRUCTURE + Phase IV → general-purpose agent
├─ Phase 1 (Spec): general-purpose creates deployment specification
├─ Phase 2 (Plan): general-purpose generates implementation plan
├─ Phase 3 (Tasks): general-purpose breaks down into tasks
└─ Phase 4 (Implement): general-purpose executes Helm chart creation
```

## Outcome

- ✅ Impact: Correctly routed infrastructure work to general-purpose agent (not chapter-planner which is for educational content)
- 🧪 Tests: N/A (routing decision)
- 📁 Files: Created feature branch 010-phase-iv-k8s-minikube, allocated feature number
- 🔁 Next prompts: /sp.specify to create deployment specification
- 🧠 Reflection: Work type classification pattern working correctly - infrastructure signals (Helm, K8s, Minikube) clearly distinguish from content signals (lessons, modules, exercises)

## Evaluation notes (flywheel)

- Failure modes observed: None - routing signals were unambiguous
- Graders run and results (PASS/FAIL): N/A (routing decision)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Proceed to Phase 1 (Specification) to validate routing choice produces correct artifact structure
