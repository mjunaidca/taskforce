# Tasks: Development Container Environment

**Feature**: 008-dev-containers
**Branch**: `008-dev-containers`
**Generated**: 2025-12-08
**Total Tasks**: 15

---

## Task Summary

| Phase | Description | Task Count |
|-------|-------------|------------|
| Phase 1 | Setup | 1 |
| Phase 2 | US1 - Start Dev Environment (P1) | 4 |
| Phase 3 | US2 - Hot Reload Backend (P1) | 2 |
| Phase 4 | US3 - Hot Reload Frontend (P1) | 2 |
| Phase 5 | US4 - Switch Dev/Prod (P2) | 3 |
| Phase 6 | US5 - Debug Logs (P2) | 2 |
| Phase 7 | Polish | 1 |

---

## Phase 1: Setup

**Goal**: Prepare development environment infrastructure

- [x] T001 Verify existing compose.yaml structure for reference in compose.yaml

---

## Phase 2: User Story 1 - Start Development Environment (P1)

**Goal**: Developers can start the full platform with `./docker-dev.sh`

**Independent Test**: Run `./docker-dev.sh` and verify all 5 services start successfully

- [x] T002 [US1] Create compose.dev.yaml header and postgres service (copy from compose.yaml) in compose.dev.yaml
- [x] T003 [US1] Add pgadmin service to compose.dev.yaml (copy from compose.yaml) in compose.dev.yaml
- [x] T004 [US1] Create docker-dev.sh script with argument parsing and help in docker-dev.sh
- [x] T005 [US1] Add startup logic to docker-dev.sh (stop existing, start postgres, start services) in docker-dev.sh

---

## Phase 3: User Story 2 - Hot Reload Backend (P1)

**Goal**: Python code changes trigger automatic uvicorn reload within 5 seconds

**Independent Test**: Modify packages/api/src/taskflow_api/main.py and verify reload

**Depends on**: US1 (compose.dev.yaml exists)

- [x] T006 [P] [US2] Add api service with volume mount and --reload flag in compose.dev.yaml
- [x] T007 [P] [US2] Add mcp-server service with volume mount and --reload flag in compose.dev.yaml

---

## Phase 4: User Story 3 - Hot Reload Frontend (P1)

**Goal**: React component changes trigger Fast Refresh within 3 seconds

**Independent Test**: Modify web-dashboard/src/app/page.tsx and verify browser updates

**Depends on**: US1 (compose.dev.yaml exists)

- [x] T008 [P] [US3] Add sso-platform service with pnpm dev and volume mounts in compose.dev.yaml
- [x] T009 [P] [US3] Add web-dashboard service with pnpm dev and volume mounts in compose.dev.yaml

---

## Phase 5: User Story 4 - Switch Dev/Prod Modes (P2)

**Goal**: Easy switching between dev and prod container modes

**Independent Test**: Run dev mode, stop, run prod mode, verify different behaviors

**Depends on**: US1 (docker-dev.sh exists)

- [x] T010 [US4] Add stop-other-mode logic to docker-dev.sh (stop prod before starting dev) in docker-dev.sh
- [x] T011 [US4] Rename docker-start.sh to docker-up.sh for consistency (optional) - SKIPPED (keeping docker-start.sh)
- [x] T012 [US4] Add project name `taskflow-dev` to compose.dev.yaml to distinguish from prod in compose.dev.yaml

---

## Phase 6: User Story 5 - Debug with Logs (P2)

**Goal**: Easy log viewing with `--logs` flag

**Independent Test**: Run `./docker-dev.sh --logs` and verify aggregated logs appear

**Depends on**: US1 (docker-dev.sh exists)

- [x] T013 [US5] Add --logs flag handling to docker-dev.sh in docker-dev.sh
- [x] T014 [US5] Add network and volumes sections to compose.dev.yaml in compose.dev.yaml

---

## Phase 7: Polish & Integration

**Goal**: Final validation and documentation

- [ ] T015 Test full workflow: start dev, modify files, verify hot reload, switch to prod, switch back (MANUAL VALIDATION REQUIRED)

---

## Dependencies

```
US1 (Start Dev) ─┬─→ US2 (Backend Hot Reload)
                 ├─→ US3 (Frontend Hot Reload)
                 ├─→ US4 (Dev/Prod Switch)
                 └─→ US5 (Debug Logs)
```

**Critical Path**: T001 → T002-T005 → T006-T014 → T015

---

## Parallel Execution Opportunities

**Within Phase 2**: T002 and T003 can run in parallel (independent services)
**Within Phase 3**: T006 and T007 can run in parallel (independent services)
**Within Phase 4**: T008 and T009 can run in parallel (independent services)
**Cross-Phase**: Phase 3 and Phase 4 can run in parallel after Phase 2 completes

---

## File Mapping

| File | Tasks |
|------|-------|
| compose.dev.yaml | T002, T003, T006, T007, T008, T009, T012, T014 |
| docker-dev.sh | T004, T005, T010, T013 |

---

## Implementation Strategy

### MVP Scope (User Story 1 only)

Complete T001-T005 for minimal viable dev environment:
- compose.dev.yaml with postgres + pgadmin
- docker-dev.sh with basic startup
- Can be tested independently before adding hot reload

### Incremental Delivery

1. **Increment 1** (MVP): US1 - Basic dev environment starts
2. **Increment 2**: US2 + US3 - Hot reload for all services
3. **Increment 3**: US4 + US5 - Dev/Prod switching and logs
4. **Increment 4**: Polish and documentation

---

## Validation Checklist

After all tasks complete, verify:

- [ ] `./docker-dev.sh` starts all services
- [ ] Python changes reload within 5s
- [ ] React changes trigger Fast Refresh within 3s
- [ ] `./docker-dev.sh --logs` shows aggregated logs
- [ ] Can switch between dev and prod modes
- [ ] Ports match production: 3000, 3001, 8000, 8001, 5432, 5050
