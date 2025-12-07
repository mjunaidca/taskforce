# Requirements Quality Checklist

**Feature**: TaskFlow Backend API (Phase 2)
**Spec File**: `/specs/003-backend-api/spec.md`
**Validated**: 2025-12-07
**Agent**: spec-architect v3.0

---

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) - **PASS**: Spec focuses on requirements and behavior, not implementation specifics
- [x] Focused on user value and business needs - **PASS**: User scenarios clearly articulate value propositions
- [x] Written for non-technical stakeholders - **PARTIAL**: Some sections use technical jargon (JWKS, SQLModel), but overall structure is accessible
- [x] All mandatory sections completed - **PASS**: Executive Summary, User Scenarios, Requirements, Success Criteria, Constraints, Non-Goals all present

---

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain - **PASS**: No markers found in spec
- [x] Requirements are testable and unambiguous - **PASS**: Functional requirements have clear MUST/SHOULD language
- [x] Success criteria are measurable - **PASS**: SC-001 through SC-011 have quantifiable targets (30s, 200ms, 100%)
- [x] Success criteria are technology-agnostic - **FAIL**: Several criteria mention specific technologies (JWT, JWKS)
- [x] All acceptance scenarios are defined - **PASS**: 7 user stories with Given/When/Then scenarios
- [x] Edge cases are identified - **PASS**: 8 edge cases documented with expected behaviors
- [x] Scope is clearly bounded (constraints + non-goals) - **PASS**: 8 constraints, 8 non-goals explicitly listed
- [x] Dependencies and assumptions identified - **PASS**: 7 assumptions documented, Better Auth dependency clear

---

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria - **PASS**: 40 functional requirements (FR-001 to FR-040) with clear acceptance criteria via user scenarios
- [x] User scenarios cover primary flows - **PASS**: 7 prioritized user stories (5 P1, 2 P2) with independent test definitions
- [x] Evals-first pattern followed - **NEEDS VERIFICATION**: No "Success Evals" section appears before "User Scenarios" - evals are embedded in Success Criteria section

---

## Formal Verification (Complexity Assessment)

**Complexity Level**: HIGH
- 5 interacting entities (Project, Worker, Task, AuditLog, ProjectWorker)
- 7+ constraint types (authentication, authorization, status transitions, parent-child, audit completeness)
- Safety-critical features (authentication, audit trail)

**Formal Verification Applied**: YES

### Invariants Identified

| Invariant | Expression | Status |
|-----------|------------|--------|
| **Audit Completeness** | `∀ task_change: StateChange \| ∃ audit_entry: AuditLog` | ✅ Holds (FR-029 enforces) |
| **Worker-Project Coverage** | `∀ worker: Worker \| worker.id in some ProjectWorker.worker_id` | ⚠️ Unclear - spec doesn't enforce workers must belong to at least one project |
| **Task-Worker Constraint** | `∀ task: Task \| task.assignee_id -> Worker.project_id = task.project_id` | ✅ Holds (FR-023 enforces same project) |
| **Parent-Task Acyclic** | `no task: Task \| task in task.^parent_task_id` | ✅ Holds (FR-028 prevents cycles) |
| **Authentication Coverage** | `∀ request: APIRequest \| request.auth in {JWT, APIKey}` | ✅ Holds (FR-009 rejects unauthenticated) |
| **Status Transition Validity** | `∀ transition: StatusChange \| transition in ValidTransitions` | ✅ Holds (FR-025 enforces valid transitions) |

### Small Scope Test (3 Projects, 3 Workers, 3 Tasks)

**Scenario**: Multi-project task assignment with human and agent workers

| Instance | Configuration | Passes Invariants |
|----------|---------------|-------------------|
| Project 1 | Owner: user1, Workers: [@sarah (human), @claude (agent)] | ✅ |
| Project 2 | Owner: user2, Workers: [@sarah (human), @gpt (agent)] | ✅ |
| Project 3 | Owner: user1, Workers: [@claude (agent)] | ✅ |
| Task 1 | Project: 1, Assignee: @sarah | ✅ (worker in project) |
| Task 2 | Project: 1, Assignee: @gpt | ❌ **VIOLATION** - @gpt not in Project 1 |
| Task 3 | Project: 2, Assignee: @sarah, Parent: Task 2 | ⚠️ **CROSS-PROJECT PARENT** - parent is in different project |

### Counterexamples Found

**Counterexample 1: Cross-Project Worker Assignment**
- Setup: Task in Project 1, Assignee @gpt registered in Project 2 only
- Violation: Spec says "tasks can be assigned to any worker" but doesn't enforce same-project constraint explicitly in API validation
- Required fix: FR-023 clarification - "Tasks MUST support assignment to any worker **registered in the same project**"

**Counterexample 2: Cross-Project Parent Task**
- Setup: Task in Project 2, Parent Task in Project 1
- Violation: Spec allows `parent_task_id` but doesn't enforce parent must be in same project
- Required fix: Add FR-027a - "Parent task MUST belong to the same project as child task"

**Counterexample 3: Worker Without Project**
- Setup: Worker created via `POST /api/workers/agents` but not added to any project
- Violation: Worker exists globally but cannot be assigned (no project membership)
- Required fix: Clarify worker lifecycle - either workers are created per-project only, OR global workers require explicit project addition

### Relational Constraints Verified

- [x] **No cycles in dependencies**: `parent_task_id` cycle prevention enforced (FR-028)
- [⚠️] **Complete coverage**: Every task has assignee (optional per schema, unclear if required)
- [⚠️] **Unique mappings**: `@handle` unique per project (FR-017), but global worker handles unclear
- [x] **All states reachable**: Status transitions form valid DAG from pending → completed

---

## Overall Verdict

**Status**: NEEDS_FIXES

**Readiness Score**: 7.5/10
- **Testability**: 9/10 (excellent acceptance scenarios, measurable success criteria)
- **Completeness**: 7/10 (missing critical constraint clarifications from formal verification)
- **Ambiguity**: 7/10 (worker lifecycle unclear, cross-project constraints undefined)
- **Traceability**: 8/10 (good Phase 1 continuity, Better Auth dependency clear)

**Reasoning**:
The specification is well-structured with comprehensive user scenarios and clear acceptance criteria. However, formal verification revealed critical gaps in relational constraints (cross-project worker assignment, parent task project membership, worker lifecycle). These gaps would cause runtime confusion during implementation and potential security issues (assigning tasks to workers from other projects).

**Next Steps**:
1. **CRITICAL**: Add constraints for cross-project entity relationships (FR-027a, FR-023 clarification)
2. **CRITICAL**: Clarify worker lifecycle and project membership model
3. **MAJOR**: Move Success Criteria to precede Requirements section for evals-first compliance
4. **MINOR**: Define assignee requirement - is `assignee_id` nullable or required for task creation?

---

## Auto-Applied Fixes

**None** - Issues require architectural clarification (global vs project-scoped workers, cross-project constraints) that cannot be auto-fixed without user input.

---

**Checklist Written To**: `/specs/003-backend-api/checklists/requirements.md`
**Validation Complete**: 2025-12-07
