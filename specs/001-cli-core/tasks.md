# Tasks: TaskFlow CLI Core

**Input**: Design documents from `/specs/001-cli-core/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks follow TDD (Test-Driven Development) - RED → GREEN → REFACTOR

## TDD Methodology

Each feature follows this cycle:
1. **RED**: Write failing test first (defines expected behavior)
2. **GREEN**: Write minimal code to pass the test
3. **REFACTOR**: Clean up while keeping tests green

## Format: `[ID] [P?] [TDD] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[TDD]**: RED (test first), GREEN (implement), REFACTOR (cleanup)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Exact file paths included in descriptions

## Monorepo Structure

```
taskforce/                          # Monorepo root
├── packages/
│   └── cli/                        # CLI package (Phase I) ← WE ARE HERE
│       ├── pyproject.toml
│       ├── src/
│       │   └── taskflow/
│       │       ├── __init__.py
│       │       ├── main.py
│       │       ├── models.py
│       │       ├── storage.py
│       │       ├── audit.py
│       │       ├── config.py
│       │       └── commands/
│       │           ├── __init__.py
│       │           ├── init_cmd.py
│       │           ├── project.py
│       │           ├── worker.py
│       │           ├── task.py
│       │           ├── workflow.py
│       │           ├── audit_cmd.py
│       │           ├── config_cmd.py
│       │           ├── demo.py
│       │           └── interactive.py
│       └── tests/
│           ├── conftest.py
│           ├── test_models.py
│           ├── test_storage.py
│           ├── test_audit.py
│           ├── test_config.py
│           ├── test_init.py
│           ├── test_project.py
│           ├── test_worker.py
│           ├── test_task.py
│           ├── test_workflow.py
│           ├── test_audit_cmd.py
│           ├── test_config_cmd.py
│           ├── test_demo.py
│           └── test_interactive.py
├── apps/
│   └── web/                        # Web app (Phase II - future)
├── .github/
│   └── workflows/
│       └── cli.yml                 # CLI-specific CI
├── specs/                          # Specifications
└── README.md
```

## Path Conventions

- **Package Root**: `packages/cli/`
- **Source**: `packages/cli/src/taskflow/`
- **Commands**: `packages/cli/src/taskflow/commands/`
- **Tests**: `packages/cli/tests/`

## Python 3.13+ Typing Standards

All code MUST use modern Python 3.13+ typing syntax:

```python
# ✅ CORRECT - Modern 3.13+ syntax
def get_task(id: int) -> Task | None:
    ...

class Task(BaseModel):
    tags: list[str] = []              # lowercase list
    metadata: dict[str, Any] = {}     # lowercase dict
    parent_id: int | None = None      # Union via |
    assignee: str | None = None       # No Optional import needed

# ❌ WRONG - Legacy typing (DO NOT USE)
from typing import List, Dict, Optional, Union
def get_task(id: int) -> Optional[Task]:  # Don't use Optional
    ...
```

## User Story Mapping

| User Story | Description | Tasks | Priority |
|------------|-------------|-------|----------|
| US1 | Initialize Project and Register Workers | T043-T055 | P1 |
| US2 | Create and Manage Tasks | T056-T073 | P1 |
| US3 | Execute Task Workflow | T074-T089 | P1 |
| US4 | Create and Manage Subtasks | T090-T094 | P2 |
| US5 | View Audit Trail | T095-T100 | P2 |
| US6 | Search, Filter, and Sort Tasks | T101-T107 | P2 |
| US7 | Due Dates and Task Scheduling | T108-T114 | P3 |
| US8 | Interactive Mode | T115-T119 | P3 |

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Python project with UV in monorepo structure

- [ ] T001 Create monorepo structure: `mkdir -p packages/cli apps`
- [ ] T002 Initialize Python project with `uv init` in `packages/cli/`
- [ ] T003 Configure packages/cli/pyproject.toml with:
  - Python 3.13+ requirement
  - Dependencies: typer, pydantic, rich
  - Dev dependencies: pytest, pytest-cov, ruff
  - Script entry point: `taskflow = "taskflow.main:app"`
- [ ] T004 [P] Create packages/cli/src/taskflow/__init__.py with version info
- [ ] T005 [P] Create packages/cli/src/taskflow/main.py with Typer app entry point
- [ ] T006 [P] Create packages/cli/tests/conftest.py with pytest fixtures (temp .taskflow dir)
- [ ] T007 [P] Update root .gitignore with .taskflow/ and packages/cli/.venv/
- [ ] T008 Create .github/workflows/cli.yml for CLI-specific GitHub Actions CI

**Checkpoint**: `cd packages/cli && uv run taskflow --help` shows app skeleton, `uv run pytest` runs (0 tests)

---

## Phase 2: Foundational (Core Infrastructure) - TDD

**Purpose**: Core models and storage that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

**Working Directory**: `packages/cli/`

### Data Models (TDD Cycle)

- [ ] T009 [RED] Write tests/test_models.py with failing tests for Project model
- [ ] T010 [GREEN] Create src/taskflow/models.py with Project Pydantic model to pass tests
- [ ] T011 [RED] [P] Add failing tests for Worker model with agent_type validation
- [ ] T012 [GREEN] [P] Add Worker Pydantic model to pass tests
- [ ] T013 [RED] [P] Add failing tests for Task model with all fields
- [ ] T014 [GREEN] [P] Add Task Pydantic model to pass tests
- [ ] T015 [RED] [P] Add failing tests for AuditLog model
- [ ] T016 [GREEN] [P] Add AuditLog Pydantic model to pass tests
- [ ] T017 [RED] Add failing tests for status transition validation
- [ ] T018 [GREEN] Add VALID_TRANSITIONS dict and validate_status_transition() to pass tests
- [ ] T019 [REFACTOR] Clean up models.py - ensure DRY, add docstrings, verify 3.13+ typing

### Storage Layer (TDD Cycle)

- [ ] T020 [RED] Write tests/test_storage.py with failing tests for Storage class
- [ ] T021 [GREEN] Create src/taskflow/storage.py with Storage class skeleton
- [ ] T022 [RED] Add failing tests for file locking
- [ ] T023 [GREEN] Implement _file_lock context manager to pass tests
- [ ] T024 [RED] Add failing tests for initialize()
- [ ] T025 [GREEN] Implement initialize() method to pass tests
- [ ] T026 [RED] Add failing tests for load_data/save_data
- [ ] T027 [GREEN] Implement load_data/save_data with locks to pass tests
- [ ] T028 [RED] Add failing tests for load_config/save_config
- [ ] T029 [GREEN] Implement load_config/save_config to pass tests
- [ ] T030 [RED] Add failing tests for CRUD methods
- [ ] T031 [GREEN] Implement CRUD methods for all entities to pass tests
- [ ] T032 [REFACTOR] Clean up storage.py - optimize, add error handling

### Audit Infrastructure (TDD Cycle)

- [ ] T033 [RED] Write tests/test_audit.py with failing tests for log_action()
- [ ] T034 [GREEN] Create src/taskflow/audit.py with log_action() to pass tests
- [ ] T035 [RED] Add failing tests for get_actor_type()
- [ ] T036 [GREEN] Add get_actor_type() function to pass tests
- [ ] T037 [REFACTOR] Clean up audit.py

### Config Management (TDD Cycle)

- [ ] T038 [RED] Write tests/test_config.py with failing tests for config functions
- [ ] T039 [GREEN] Create src/taskflow/config.py with get_config/set_config to pass tests
- [ ] T040 [RED] Add failing tests for get_current_user/get_default_project
- [ ] T041 [GREEN] Add helper functions to pass tests
- [ ] T042 [REFACTOR] Clean up config.py

**Checkpoint**: All tests pass. `cd packages/cli && uv run pytest` shows 100% pass rate for infrastructure.

---

## Phase 3: User Story 1 - Initialize Project and Register Workers (Priority: P1) - TDD

**Goal**: Team lead can setup TaskFlow and register both human and AI agent workers

**Independent Test**: Run `taskflow init`, `taskflow project add`, `taskflow worker add` and verify in `taskflow worker list`

**Working Directory**: `packages/cli/`

### Init Command (TDD Cycle)

- [ ] T043 [US1] Create src/taskflow/commands/__init__.py
- [ ] T044 [RED] [US1] Write tests/test_init.py with failing tests for init command
- [ ] T045 [GREEN] [US1] Implement `taskflow init` in src/taskflow/commands/init_cmd.py to pass tests
- [ ] T046 [GREEN] [US1] Register init command in src/taskflow/main.py

### Project Commands (TDD Cycle)

- [ ] T047 [RED] [P] [US1] Write tests/test_project.py with failing tests for project commands
- [ ] T048 [GREEN] [P] [US1] Implement `taskflow project add` in src/taskflow/commands/project.py
- [ ] T049 [GREEN] [P] [US1] Implement `taskflow project list` in src/taskflow/commands/project.py
- [ ] T050 [GREEN] [US1] Register project commands in src/taskflow/main.py

### Worker Commands (TDD Cycle)

- [ ] T051 [RED] [P] [US1] Write tests/test_worker.py with failing tests for worker commands
- [ ] T052 [GREEN] [P] [US1] Implement `taskflow worker add` in src/taskflow/commands/worker.py
- [ ] T053 [GREEN] [P] [US1] Implement `taskflow worker list` with Rich table in src/taskflow/commands/worker.py
- [ ] T054 [GREEN] [US1] Register worker commands in src/taskflow/main.py
- [ ] T055 [REFACTOR] [US1] Clean up US1 commands - ensure consistent error handling

**Checkpoint**: Can init project, add projects, register human and agent workers. All US1 tests pass.

---

## Phase 4: User Story 2 - Create and Manage Tasks (Priority: P1) - TDD

**Goal**: Users can create tasks with metadata, list with filters, view details, update, delete

**Independent Test**: Create tasks with `taskflow add`, view with `taskflow list` and `taskflow show`

**Working Directory**: `packages/cli/`

### Task CRUD (TDD Cycle)

- [ ] T056 [RED] [US2] Write tests/test_task.py with failing tests for task add command
- [ ] T057 [GREEN] [US2] Implement `taskflow add` with all options in src/taskflow/commands/task.py
- [ ] T058 [RED] [US2] Add failing tests for assignee and parent validation
- [ ] T059 [GREEN] [US2] Add assignee and parent validation to add command
- [ ] T060 [RED] [US2] Add failing tests for circular reference detection
- [ ] T061 [GREEN] [US2] Add circular reference detection to add command
- [ ] T062 [RED] [P] [US2] Add failing tests for task list with filters
- [ ] T063 [GREEN] [P] [US2] Implement `taskflow list` with filters
- [ ] T064 [RED] [P] [US2] Add failing tests for search (case-insensitive substring)
- [ ] T065 [GREEN] [P] [US2] Implement search in list command
- [ ] T066 [RED] [US2] Add failing tests for task show
- [ ] T067 [GREEN] [US2] Implement `taskflow show` with Rich panels
- [ ] T068 [RED] [P] [US2] Add failing tests for task edit
- [ ] T069 [GREEN] [P] [US2] Implement `taskflow edit`
- [ ] T070 [RED] [P] [US2] Add failing tests for task delete with subtask confirmation
- [ ] T071 [GREEN] [P] [US2] Implement `taskflow delete` with subtask confirmation
- [ ] T072 [GREEN] [US2] Register task commands in src/taskflow/main.py
- [ ] T073 [REFACTOR] [US2] Clean up task.py - ensure DRY, consistent patterns

**Checkpoint**: Full task CRUD working with filters and search. All US2 tests pass.

---

## Phase 5: User Story 3 - Execute Task Workflow (Priority: P1) - TDD

**Goal**: Workers can start, progress, complete tasks through defined workflow with review gates

**Independent Test**: Walk task through start -> progress -> complete -> review -> approve

**Working Directory**: `packages/cli/`

### Workflow Commands (TDD Cycle)

- [ ] T074 [RED] [US3] Write tests/test_workflow.py with failing tests for start command
- [ ] T075 [GREEN] [US3] Create src/taskflow/commands/workflow.py with `taskflow start`
- [ ] T076 [RED] [P] [US3] Add failing tests for progress command
- [ ] T077 [GREEN] [P] [US3] Implement `taskflow progress` with percent/note
- [ ] T078 [RED] [P] [US3] Add failing tests for complete command
- [ ] T079 [GREEN] [P] [US3] Implement `taskflow complete`
- [ ] T080 [RED] [P] [US3] Add failing tests for review command
- [ ] T081 [GREEN] [P] [US3] Implement `taskflow review`
- [ ] T082 [RED] [P] [US3] Add failing tests for approve command
- [ ] T083 [GREEN] [P] [US3] Implement `taskflow approve`
- [ ] T084 [RED] [P] [US3] Add failing tests for reject command
- [ ] T085 [GREEN] [P] [US3] Implement `taskflow reject` with reason
- [ ] T086 [RED] [US3] Add failing tests for delegate command
- [ ] T087 [GREEN] [US3] Implement `taskflow delegate`
- [ ] T088 [GREEN] [US3] Register workflow commands in src/taskflow/main.py
- [ ] T089 [REFACTOR] [US3] Clean up workflow.py - ensure audit entries created

**Checkpoint**: Complete workflow cycle operational with all status transitions. All US3 tests pass.

---

## Phase 6: User Story 4 - Create and Manage Subtasks (Priority: P2) - TDD

**Goal**: Agents/humans can decompose tasks into subtasks with recursive hierarchy

**Independent Test**: Create parent task, add subtasks with `--parent`, verify in `taskflow show`

**Working Directory**: `packages/cli/`

### Subtask Features (TDD Cycle)

- [ ] T090 [RED] [US4] Add failing tests for subtask hierarchy display
- [ ] T091 [GREEN] [US4] Enhance `taskflow show` to display subtask hierarchy
- [ ] T092 [RED] [US4] Add failing tests for progress rollup calculation
- [ ] T093 [GREEN] [US4] Implement subtask progress rollup in src/taskflow/storage.py
- [ ] T094 [REFACTOR] [US4] Clean up subtask handling

**Checkpoint**: Recursive subtasks display and progress rolls up. All US4 tests pass.

---

## Phase 7: User Story 5 - View Audit Trail (Priority: P2) - TDD

**Goal**: Project managers see complete history of who did what, when

**Independent Test**: Perform actions on task, run `taskflow audit 1` and verify complete trail

**Working Directory**: `packages/cli/`

### Audit Commands (TDD Cycle)

- [ ] T095 [RED] [US5] Write tests/test_audit_cmd.py with failing tests for audit command
- [ ] T096 [GREEN] [US5] Create src/taskflow/commands/audit_cmd.py with `taskflow audit <id>`
- [ ] T097 [RED] [P] [US5] Add failing tests for project audit filter
- [ ] T098 [GREEN] [P] [US5] Implement `taskflow audit --project <slug>`
- [ ] T099 [GREEN] [US5] Register audit commands in src/taskflow/main.py
- [ ] T100 [REFACTOR] [US5] Clean up audit_cmd.py - Rich table formatting

**Checkpoint**: Audit trail displays with actor types, timestamps, details. All US5 tests pass.

---

## Phase 8: User Story 6 - Search, Filter, and Sort Tasks (Priority: P2) - TDD

**Goal**: Users find tasks quickly with search, filter, and sort options

**Independent Test**: Create diverse tasks, use `taskflow list --search`, `--sort`, `--tag`

**Working Directory**: `packages/cli/`

### Filter/Sort Features (TDD Cycle)

- [ ] T101 [RED] [US6] Add failing tests for sort options
- [ ] T102 [GREEN] [US6] Add sort options (created_at, priority, due_date, title) to list
- [ ] T103 [RED] [P] [US6] Add failing tests for tag filter
- [ ] T104 [GREEN] [P] [US6] Add --tag filter to list command
- [ ] T105 [RED] [P] [US6] Add failing tests for overdue filter
- [ ] T106 [GREEN] [P] [US6] Add --overdue filter to list command
- [ ] T107 [REFACTOR] [US6] Optimize filter/sort performance

**Checkpoint**: Full search, filter, sort capabilities working. All US6 tests pass.

---

## Phase 9: User Story 7 - Due Dates and Task Scheduling (Priority: P3) - TDD

**Goal**: Users set due dates and create recurring tasks

**Independent Test**: Create task with `--due`, complete recurring task and see new instance

**Working Directory**: `packages/cli/`

### Due Date/Recurrence (TDD Cycle)

- [ ] T108 [RED] [US7] Add failing tests for due date parsing
- [ ] T109 [GREEN] [US7] Implement due date parsing in src/taskflow/commands/task.py
- [ ] T110 [RED] [US7] Add failing tests for recurrence pattern handling
- [ ] T111 [GREEN] [US7] Implement recurrence pattern handling in workflow.py
- [ ] T112 [RED] [US7] Add failing tests for auto-create next instance
- [ ] T113 [GREEN] [US7] Auto-create next instance on recurring task completion
- [ ] T114 [REFACTOR] [US7] Clean up date handling

**Checkpoint**: Due dates and recurring tasks functional. All US7 tests pass.

---

## Phase 10: User Story 8 - Interactive Mode (Priority: P3) - TDD

**Goal**: Users run TaskFlow in REPL mode without typing `taskflow` prefix

**Independent Test**: Run `taskflow -i`, execute commands without prefix

**Working Directory**: `packages/cli/`

### Interactive Mode (TDD Cycle)

- [ ] T115 [RED] [US8] Write tests/test_interactive.py with failing tests
- [ ] T116 [GREEN] [US8] Create src/taskflow/commands/interactive.py
- [ ] T117 [GREEN] [US8] Implement REPL loop with prompt_toolkit
- [ ] T118 [GREEN] [US8] Add -i/--interactive flag to main.py
- [ ] T119 [REFACTOR] [US8] Add command history and tab completion

**Checkpoint**: Interactive mode works with command history. All US8 tests pass.

---

## Phase 11: Demo Mode and Config - TDD

**Goal**: Automated demo script and config management

**Working Directory**: `packages/cli/`

### Config Commands (TDD Cycle)

- [ ] T120 [RED] Write tests/test_config_cmd.py with failing tests
- [ ] T121 [GREEN] Create src/taskflow/commands/config_cmd.py
- [ ] T122 [GREEN] Implement `taskflow config set`
- [ ] T123 [GREEN] [P] Implement `taskflow config show`
- [ ] T124 [GREEN] Register config commands in src/taskflow/main.py

### Demo Commands (TDD Cycle)

- [ ] T125 [RED] Write tests/test_demo.py with failing tests (including <90s constraint)
- [ ] T126 [GREEN] Create src/taskflow/commands/demo.py
- [ ] T127 [GREEN] Implement `taskflow demo` (non-interactive)
- [ ] T128 [GREEN] Implement `taskflow demo -i` (interactive)
- [ ] T129 [GREEN] Register demo commands in src/taskflow/main.py
- [ ] T130 [REFACTOR] Optimize demo for <90 second completion

**Checkpoint**: Demo runs end-to-end proving human-agent parity. All demo tests pass.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting all user stories

**Working Directory**: `packages/cli/`

- [ ] T131 [P] Add comprehensive --help text to all commands
- [ ] T132 [P] Add error handling with helpful suggestions to all commands
- [ ] T133 [P] Update packages/cli/README.md with installation and usage instructions
- [ ] T134 Run full test suite (`cd packages/cli && uv run pytest --cov`) and fix any failures
- [ ] T135 Verify test coverage >= 80%
- [ ] T136 Verify demo completes in <90 seconds
- [ ] T137 Validate audit trail shows human-agent parity

**Checkpoint**: Production-ready CLI for Phase I demo. 100% test pass rate.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately (includes CI setup)
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-10 (User Stories)**: All depend on Phase 2 completion
- **Phase 11 (Demo/Config)**: Depends on Phases 3-5 minimum
- **Phase 12 (Polish)**: Depends on all user stories

### User Story Dependencies

| Story | Can Start After | Depends On |
|-------|-----------------|------------|
| US1 (Init/Workers) | Phase 2 | None |
| US2 (Task CRUD) | Phase 2 | None |
| US3 (Workflow) | Phase 2 | None |
| US4 (Subtasks) | US2 | Task model exists |
| US5 (Audit View) | Phase 2 | Audit infrastructure |
| US6 (Search/Filter) | US2 | Task list exists |
| US7 (Due Dates) | US2, US3 | Task + workflow exist |
| US8 (Interactive) | All P1 stories | All commands exist |

### Sprint Mapping (TDD-adjusted)

| Sprint | Duration | Tasks | Goal |
|--------|----------|-------|------|
| Sprint 1 | 35 min | T001-T055 | Setup, Infrastructure, US1 (TDD) |
| Sprint 2 | 25 min | T056-T089 | Task CRUD, Workflow (TDD) |
| Sprint 3 | 20 min | T090-T137 | Subtasks, Audit, Demo, Polish |

---

## GitHub Actions CI (T008)

The CI workflow runs on every push and PR to ensure TDD compliance:

```yaml
# .github/workflows/cli.yml
name: TaskFlow CLI CI

on:
  push:
    branches: [main, 001-cli-core]
    paths:
      - 'packages/cli/**'
      - '.github/workflows/cli.yml'
  pull_request:
    branches: [main]
    paths:
      - 'packages/cli/**'

defaults:
  run:
    working-directory: packages/cli

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Set up Python 3.13
        run: uv python install 3.13
      - name: Install dependencies
        run: uv sync
      - name: Run tests with coverage
        run: uv run pytest --cov=src/taskflow --cov-report=xml --cov-fail-under=80
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: packages/cli/coverage.xml

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Set up Python 3.13
        run: uv python install 3.13
      - name: Install dependencies
        run: uv sync
      - name: Lint with ruff
        run: uv run ruff check .
      - name: Format check
        run: uv run ruff format --check .

  demo:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Install uv
        uses: astral-sh/setup-uv@v4
      - name: Set up Python 3.13
        run: uv python install 3.13
      - name: Install dependencies
        run: uv sync
      - name: Run demo (must complete <90s)
        run: timeout 90 uv run taskflow demo
```

---

## TDD Parallel Opportunities

### Phase 2 (Foundational) - Parallel TDD Cycles

```bash
# After Project model tests/impl, these can run in parallel:
T010-T011 [P] Worker model (RED → GREEN)
T012-T013 [P] Task model (RED → GREEN)
T014-T015 [P] AuditLog model (RED → GREEN)
```

### Phase 3 (US1) - Parallel Command TDD

```bash
# After init tests pass, these can run in parallel:
T046-T049 [P] Project commands (RED → GREEN)
T050-T053 [P] Worker commands (RED → GREEN)
```

### Phase 5 (US3) - Parallel Workflow TDD

```bash
# All status transition commands can be TDD'd in parallel:
T075-T076 [P] progress (RED → GREEN)
T077-T078 [P] complete (RED → GREEN)
T079-T080 [P] review (RED → GREEN)
T081-T082 [P] approve (RED → GREEN)
T083-T084 [P] reject (RED → GREEN)
```

---

## Implementation Strategy

### MVP First (Sprint 1-2 Only)

1. Complete Phase 1: Setup (T001-T008) - **includes GitHub Actions CI**
2. Complete Phase 2: Foundational TDD (T009-T042)
3. Complete Phase 3: US1 TDD - Init/Workers (T043-T055)
4. Complete Phase 4: US2 TDD - Task CRUD (T056-T073)
5. **STOP and VALIDATE**: All tests pass, CI green
6. Demo: `cd packages/cli && uv run taskflow init → add project → add workers → add task → list → show`

### Demo-Ready (Sprint 3)

1. Complete Phase 5: US3 TDD - Workflow (T074-T089)
2. Complete Phase 7: US5 TDD - Audit (T095-T100)
3. Complete Phase 11: Demo TDD (T120-T130)
4. **VALIDATE**: Full demo script runs in <90 seconds, CI passes
5. Demo shows human-agent parity in audit trail

### Full Feature Set (Post-Demo)

1. Phase 6: US4 TDD - Subtasks (T090-T094)
2. Phase 8: US6 TDD - Search/Filter (T101-T107)
3. Phase 9: US7 TDD - Due Dates (T108-T114)
4. Phase 10: US8 TDD - Interactive (T115-T119)
5. Phase 12: Polish (T131-T137)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 137 |
| Phase 1 (Setup + CI) | 8 |
| Phase 2 (Foundational TDD) | 34 |
| US1 (Init/Workers TDD) | 13 |
| US2 (Task CRUD TDD) | 18 |
| US3 (Workflow TDD) | 16 |
| US4 (Subtasks TDD) | 5 |
| US5 (Audit TDD) | 6 |
| US6 (Search/Filter TDD) | 7 |
| US7 (Due Dates TDD) | 7 |
| US8 (Interactive TDD) | 5 |
| Demo/Config TDD | 11 |
| Polish | 7 |
| **RED tasks** | 35 |
| **GREEN tasks** | 69 |
| **REFACTOR tasks** | 12 |
| **Parallelizable [P]** | 38 (28%) |

**MVP Scope**: Phases 1-4 (T001-T073) = 73 tasks
**Demo-Ready Scope**: Add US3 + US5 + Demo = 107 tasks
**Full Scope**: All 137 tasks

---

## TDD Discipline

### Rules

1. **Never write implementation before test** - RED always comes first
2. **Minimal GREEN** - Only write enough code to pass the failing test
3. **REFACTOR after GREEN** - Clean up once tests are passing
4. **CI must pass** - All pushes trigger GitHub Actions
5. **Coverage >= 80%** - Enforced by CI

### Commit Strategy

```bash
# RED phase commit
git commit -m "test: add failing tests for <feature> [RED]"

# GREEN phase commit
git commit -m "feat: implement <feature> to pass tests [GREEN]"

# REFACTOR phase commit
git commit -m "refactor: clean up <feature> [REFACTOR]"
```

---

## Notes

- [P] tasks can run in parallel (different files)
- [RED/GREEN/REFACTOR] indicates TDD phase
- [US#] label maps task to specific user story
- Commit after each TDD phase (RED, GREEN, REFACTOR separately)
- GitHub Actions runs on every push - must stay green
- Test human-agent parity by checking audit trail with both actor types
