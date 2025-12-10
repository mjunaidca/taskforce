---
id: 0005
title: phase-3-tasks-breakdown-preventing-failure-modes
stage: tasks
date: 2025-12-09
surface: agent
model: claude-sonnet-4.5
feature: 010-phase-iv-k8s-minikube
branch: 010-phase-iv-k8s-minikube
user: mjs
command: /sp.tasks 010-phase-iv-k8s-minikube
labels: ["tasks", "granularity", "user-stories", "traceability", "anti-patterns"]
links:
  spec: specs/010-phase-iv-k8s-minikube/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/010-phase-iv-k8s-minikube/tasks.md
tests:
  - N/A (task breakdown phase)
---

## Prompt

```
010-phase-iv-k8s-minikube
```

**Context**: User observed that "plan and specs are golden while tasks break everything cause buggy." They wanted to see how a detailed prompt prevents task breakdown failures.

**User's Learning Goal**: See how AI-native cloud expert prevents common anti-patterns:
1. Wrong granularity (tasks too big or too small)
2. Dependency blindness (tasks ordered wrong)
3. Spec drift (tasks don't map to FRs)
4. Validation gaps (no acceptance criteria)

## Response snapshot

**Task Generation with Anti-Pattern Prevention**

**Strategy Applied**:

1. **Granularity Guards**:
   - Each task: 1-2 hours max (not "Create Helm chart" = 8 hours)
   - 80 tasks total, avg 2.7 minutes each
   - Example: T007 "Create Chart.yaml" separate from T008 "Create values.yaml"

2. **Dependency Safety**:
   - Explicit dependency graph showing US completion order
   - Critical path identified: Setup → Foundation → US1 → US2 → US4 → Deployment
   - Parallel opportunities marked with [P] tag (40 tasks parallelizable)

3. **Traceability**:
   - Each task → User Story (US1-US5 labels)
   - Each phase → FR mapping (e.g., "FR-001, FR-002, FR-005, FR-006")
   - 5 user stories from spec mapped to 9 implementation phases

4. **Acceptance Criteria**:
   - Per-phase acceptance with verification commands
   - Example US1: "All 20 templates created, helm template renders valid YAML"
   - Independent test per user story for isolated validation

**Task Organization by User Story** (NOT by technical layer):

```
Phase 3: US1 - Service Deployment (22 tasks, 115 min)
  ├─ Phase 3A: SSO Platform (5 tasks, 30 min)
  ├─ Phase 3B: API (6 tasks, 30 min)
  ├─ Phase 3C: MCP Server (5 tasks, 20 min)
  ├─ Phase 3D: Web Dashboard (4 tasks, 20 min)
  └─ Phase 3E: Helper Templates (2 tasks, 15 min)

Phase 4: US2 - Image Builds (8 tasks, 20 min)
Phase 5: US3 - Configuration (6 tasks, 15 min)
Phase 6: US4 - Dependencies (7 tasks, 20 min)
Phase 8: US5 - Documentation (7 tasks, 20 min)
```

**MVP Scope Defined**:
- Critical path: 3h 5min (65 tasks)
- Optional: US3 validation, US5 documentation (15 tasks, 30 min)
- Enables fast feedback loop

**Preventing "Tasks Break Everything"**:

| Common Anti-Pattern | How Prevented |
|---------------------|---------------|
| Vague tasks | ✅ Exact file paths: `helm/taskflow/templates/api/deployment.yaml` |
| Wrong order | ✅ Dependency graph + initContainer sequencing |
| Untestable | ✅ Acceptance criteria per phase with commands |
| Spec drift | ✅ FR mapping + US labels link back to spec |
| Too big | ✅ 80 atomic tasks, average 2.7 min each |
| No done condition | ✅ Checkboxes with expected outputs |

**Task Format Enforcement**:
```
- [ ] T014 [P] [US1] Create deployment.yaml with initContainer
      ^^^^ ^^^ ^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      Box  Par Story Description with file path
```

**Parallel Execution Examples**:
- Phase 3A-3D: 4 services can be templated simultaneously (different files)
- Phase 4: 4 image builds can run concurrently
- US3 + US4: Configuration review and dependency implementation can overlap

## Outcome

- ✅ Impact: Generated 80 tasks with proper granularity, preventing common failure modes that cause "buggy" task breakdowns
- 🧪 Tests: Acceptance criteria defined per phase with specific kubectl/helm validation commands
- 📁 Files: Created specs/010-phase-iv-k8s-minikube/tasks.md (comprehensive breakdown)
- 🔁 Next prompts: /sp.implement to execute tasks and demonstrate clean implementation flow
- 🧠 Reflection: Task breakdown quality prevents implementation chaos - proper organization by user story (not technical layers) enables independent development and testing

## Evaluation notes (flywheel)

- Failure modes observed: None - systematic extraction from spec/plan produced well-structured tasks
- Graders run and results (PASS/FAIL): Task format validation PASS (all 80 tasks follow checkbox + ID + labels + file path format)
- Prompt variant (if applicable): "Educational demonstration" - showing user how detailed task generation prevents breakdown failures
- Next experiment (smallest change to try): Execute tasks and measure actual completion time vs estimates to refine future task sizing
