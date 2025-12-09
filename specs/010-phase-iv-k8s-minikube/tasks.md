# Tasks: Phase IV - Minikube Deployment with Helm

**Branch**: `010-phase-iv-k8s-minikube` | **Date**: 2025-12-09
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Overview

This tasks breakdown implements Phase IV Minikube deployment for TaskFlow platform. Tasks are organized by user story to enable independent implementation and testing.

**Total Estimated Time**: 3 hours 20 minutes
**Critical Path**: Helm Chart Creation → Image Builds → Deployment → Validation

---

## AI-Native Execution Guide

### Skills to Use (from `.claude/skills/engineering/`)

**Required Skills for This Feature:**
- **`helm-charts`** - Helm chart creation, templating, Chart.yaml/values.yaml structure
- **`kubernetes-essentials`** - K8s concepts, manifests, deployments, services, ConfigMaps, Secrets
- **`minikube`** - Local cluster setup, Docker daemon integration, troubleshooting

**Optional Skills (for troubleshooting):**
- **`kubectl-ai`** - AI-powered troubleshooting with natural language queries
  - Use for: "why is pod failing?", "show logs from api pod", "check pod health"
  - **NOT** for primary implementation (we're using Helm + manual commands for educational value)
  - Useful for Phase 7 validation and debugging

### Official Documentation (Query via Context7 MCP)

**CRITICAL**: For all Helm/Kubernetes/Minikube tasks, query official docs FIRST before implementation.

#### Phase 2-3: Helm Chart Creation Tasks

**For Chart.yaml, values.yaml, templates/ tasks (T007-T035):**

```bash
# Query Helm documentation
mcp__context7__resolve-library-id --libraryName "helm"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/helm/helm" --topic "chart structure"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/helm/helm" --topic "values files"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/helm/helm" --topic "template functions"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/helm/helm" --topic "dependencies"
```

**Topics to Query:**
- **Chart.yaml**: `mcp__context7__get-library-docs --topic "Chart.yaml schema"`
- **values.yaml**: `mcp__context7__get-library-docs --topic "values files best practices"`
- **_helpers.tpl**: `mcp__context7__get-library-docs --topic "named templates"`
- **Deployment**: `mcp__context7__get-library-docs --topic "deployment spec"`
- **Service**: `mcp__context7__get-library-docs --topic "service types"`
- **ConfigMap/Secret**: `mcp__context7__get-library-docs --topic "configmap" OR "secret"`
- **initContainers**: `mcp__context7__get-library-docs --topic "init containers"`

#### Phase 4: Image Build Tasks

**For Docker build tasks (T036-T043):**

```bash
# Query Docker documentation
mcp__context7__resolve-library-id --libraryName "docker"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/docker/docs" --topic "docker build"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/docker/docs" --topic "image tagging"
```

#### Phase 6-7: Kubernetes Deployment Tasks

**For K8s resource creation (T050-T066):**

```bash
# Query Kubernetes documentation
mcp__context7__resolve-library-id --libraryName "kubernetes"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/kubernetes" --topic "probes"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/kubernetes" --topic "pod lifecycle"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/kubernetes" --topic "service discovery"
```

#### Phase 4: Minikube Tasks

**For Minikube cluster management (T036-T037):**

```bash
# Query Minikube documentation
mcp__context7__resolve-library-id --libraryName "minikube"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/minikube" --topic "start command"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/minikube" --topic "docker driver"
mcp__context7__get-library-docs --context7CompatibleLibraryID "/kubernetes/minikube" --topic "service command"
```

### Documentation Query Strategy (Per Phase)

| Phase | Primary Docs | Query Before Tasks |
|-------|--------------|-------------------|
| Phase 1 | Minikube, kubectl, Helm | T001-T006: Version compatibility |
| Phase 2 | Helm | T007-T013: Chart.yaml schema, values structure, template syntax |
| Phase 3 | Helm + Kubernetes | T014-T035: Deployment spec, Service types, ConfigMap/Secret format |
| Phase 4 | Minikube + Docker | T036-T043: Docker build options, image tagging |
| Phase 5 | Kubernetes | T044-T049: ConfigMap/Secret best practices |
| Phase 6 | Kubernetes | T050-T056: initContainers, readinessProbe syntax |
| Phase 7 | Helm + kubectl | T057-T066: Helm install options, kubectl commands |
| Phase 8 | N/A | T067-T073: Documentation writing |

### Task-Specific Documentation Mapping

**Example: Before T014 (Create sso-platform/deployment.yaml)**

1. Query Helm deployment template syntax:
   ```bash
   mcp__context7__get-library-docs \
     --context7CompatibleLibraryID "/helm/helm" \
     --topic "deployment template"
   ```

2. Query K8s Deployment spec:
   ```bash
   mcp__context7__get-library-docs \
     --context7CompatibleLibraryID "/kubernetes/kubernetes" \
     --topic "deployment spec" \
     --mode "code"
   ```

3. Query initContainer syntax:
   ```bash
   mcp__context7__get-library-docs \
     --context7CompatibleLibraryID "/kubernetes/kubernetes" \
     --topic "init containers" \
     --mode "code"
   ```

4. Implement task using official patterns from docs

**Example: Before T042 (Build web-dashboard image)**

1. Query Docker build best practices:
   ```bash
   mcp__context7__get-library-docs \
     --context7CompatibleLibraryID "/docker/docs" \
     --topic "dockerfile best practices" \
     --mode "code"
   ```

2. Query multi-stage builds (if needed):
   ```bash
   mcp__context7__get-library-docs \
     --context7CompatibleLibraryID "/docker/docs" \
     --topic "multi-stage builds"
   ```

3. Build image following official recommendations

### MCP Tools Available

**Better Auth MCP** (for SSO configuration reference):
```bash
mcp__better-auth__search --query "environment variables" --mode "balanced"
mcp__better-auth__search --query "database connection" --mode "fast"
```

**Next.js DevTools MCP** (for web-dashboard config):
```bash
mcp__next-devtools__nextjs_docs --action "get" --path "deploying/docker"
```

### Implementation Pattern (For Each Task)

```yaml
For EVERY task:
  1. Query relevant official docs via Context7
  2. Review plan.md for architecture decisions
  3. Check spec.md for functional requirements
  4. Implement using official patterns
  5. Verify with acceptance criteria commands
  6. Mark task complete with checkbox
```

**Never guess syntax** - always query official docs first.

---

## Phase 1: Setup & Prerequisites (15 minutes)

**Goal**: Ensure local environment ready for Helm chart development and Minikube deployment.

### Tasks

- [ ] T001 Verify Minikube installation (version 1.30+) with `minikube version`
- [ ] T002 Verify kubectl installation (version 1.28+) with `kubectl version --client`
- [ ] T003 Verify Helm installation (version 3.12+) with `helm version`
- [ ] T004 Verify Docker Desktop is running with `docker ps`
- [ ] T005 Create Helm chart directory structure at `helm/taskflow/`
- [ ] T006 Create templates subdirectories: `sso-platform/`, `api/`, `mcp-server/`, `web-dashboard/`

**Acceptance**: All prerequisite tools installed, Helm chart directory structure created.

---

## Phase 2: Foundational - Helm Chart Base (45 minutes)

**Goal**: Create Helm chart foundation with Bitnami PostgreSQL dependency and shared templates.

**FR Mapping**: FR-001 (Helm chart structure), FR-002 (PostgreSQL dependency), FR-005 (values.yaml), FR-006 (values-dev.yaml)

### Tasks

- [ ] T007 [P] Create `helm/taskflow/Chart.yaml` with Bitnami PostgreSQL dependency ~12.0.0
- [ ] T008 [P] Create `helm/taskflow/values.yaml` with production defaults for all 5 services
- [ ] T009 [P] Create `helm/taskflow/values-dev.yaml` with local overrides (imagePullPolicy: Never, NodePort)
- [ ] T010 [P] Create `helm/taskflow/templates/_helpers.tpl` with shared template functions (fullname, labels, selectorLabels)
- [ ] T011 Validate Chart.yaml dependency declaration with `helm dependency list ./helm/taskflow`
- [ ] T012 Run `helm lint ./helm/taskflow` to verify chart structure
- [ ] T013 Run `helm template taskflow ./helm/taskflow` to verify template rendering

**Acceptance**:
- `helm lint` passes with no errors
- `helm template` renders valid YAML
- Chart.yaml dependency correctly declared

---

## Phase 3: User Story 1 - Local Cluster Setup & Service Deployment (Priority: P1)

**User Story**: As a DevOps engineer, I need to deploy all TaskFlow services to a local Minikube cluster so that I can validate Kubernetes deployment before cloud deployment.

**Independent Test**: Start Minikube, deploy Helm chart, verify all 5 services running with `kubectl get pods`.

**FR Mapping**: FR-003 (service templates), FR-004 (template files), FR-014 to FR-020 (service deployment), FR-026 to FR-028 (resources)

### Phase 3A: SSO Platform Templates (30 minutes)

- [ ] T014 [P] [US1] Create `helm/taskflow/templates/sso-platform/deployment.yaml` with initContainer for postgres readiness
- [ ] T015 [P] [US1] Create `helm/taskflow/templates/sso-platform/service.yaml` with ClusterIP type, port 3001
- [ ] T016 [P] [US1] Create `helm/taskflow/templates/sso-platform/configmap.yaml` with NODE_ENV, BETTER_AUTH_URL, ALLOWED_ORIGINS, DATABASE_URL (K8s DNS format)
- [ ] T017 [P] [US1] Create `helm/taskflow/templates/sso-platform/secret.yaml` with BETTER_AUTH_SECRET, SMTP credentials
- [ ] T018 [US1] Add resource requests (cpu: 100m, memory: 256Mi) and limits (cpu: 500m, memory: 512Mi) to sso-platform deployment

### Phase 3B: API Templates (30 minutes)

- [ ] T019 [P] [US1] Create `helm/taskflow/templates/api/deployment.yaml` with initContainers for postgres and sso readiness
- [ ] T020 [P] [US1] Create `helm/taskflow/templates/api/service.yaml` with ClusterIP type, port 8000
- [ ] T021 [P] [US1] Create `helm/taskflow/templates/api/configmap.yaml` with MCP_SERVER_URL, ALLOWED_ORIGINS, LOG_LEVEL, DEBUG
- [ ] T022 [P] [US1] Create `helm/taskflow/templates/api/secret.yaml` with OPENAI_API_KEY
- [ ] T023 [US1] Add resource requests (cpu: 100m, memory: 256Mi) and limits (cpu: 500m, memory: 512Mi) to api deployment
- [ ] T024 [US1] Add health check probe to api deployment (path: /health, port: 8000)

### Phase 3C: MCP Server Templates (20 minutes)

- [ ] T025 [P] [US1] Create `helm/taskflow/templates/mcp-server/deployment.yaml` with initContainer for api readiness
- [ ] T026 [P] [US1] Create `helm/taskflow/templates/mcp-server/service.yaml` with ClusterIP type, port 8001
- [ ] T027 [P] [US1] Create `helm/taskflow/templates/mcp-server/configmap.yaml` with TASKFLOW_API_URL, TASKFLOW_MCP_HOST, TASKFLOW_MCP_PORT
- [ ] T028 [US1] Add resource requests (cpu: 100m, memory: 256Mi) and limits (cpu: 500m, memory: 512Mi) to mcp-server deployment
- [ ] T029 [US1] Add health check probe to mcp-server deployment (path: /health, port: 8001)

### Phase 3D: Web Dashboard Templates (20 minutes)

- [ ] T030 [P] [US1] Create `helm/taskflow/templates/web-dashboard/deployment.yaml` with initContainers for sso and api readiness
- [ ] T031 [P] [US1] Create `helm/taskflow/templates/web-dashboard/service.yaml` with NodePort type, port 3000
- [ ] T032 [P] [US1] Create `helm/taskflow/templates/web-dashboard/configmap.yaml` with SERVER_API_URL, SERVER_SSO_URL (K8s DNS)
- [ ] T033 [US1] Add resource requests (cpu: 100m, memory: 256Mi) and limits (cpu: 500m, memory: 512Mi) to web-dashboard deployment

### Phase 3E: Helper Templates & NOTES (15 minutes)

- [ ] T034 [P] [US1] Create `helm/taskflow/templates/NOTES.txt` with post-install instructions and validation commands
- [ ] T035 [US1] Run `helm template taskflow ./helm/taskflow -f helm/taskflow/values-dev.yaml` to verify all templates render correctly

**US1 Acceptance Criteria**:
- [ ] All 20 Kubernetes manifest templates created (4 services × 4-5 files each)
- [ ] helm template renders valid YAML for all services
- [ ] Each service has correct resource limits and health checks
- [ ] Service dependency order enforced via initContainers

---

## Phase 4: User Story 2 - Image Build & Local Registry (Priority: P1)

**User Story**: As a DevOps engineer, I need to build Docker images locally using Minikube's Docker daemon so that images are available without pushing to an external registry.

**Independent Test**: Set Minikube Docker env, build one image, verify with `docker images`.

**FR Mapping**: FR-007 (build images), FR-008 (image tags), FR-009 (Minikube Docker daemon), FR-010 (Dockerfile compatibility)

### Tasks (20 minutes)

- [ ] T036 [US2] Start Minikube cluster with `minikube start --memory=6144 --cpus=3 --driver=docker`
- [ ] T037 [US2] Verify Minikube addons with `minikube addons list` (metrics-server, storage-provisioner enabled)
- [ ] T038 [US2] Set shell to use Minikube Docker daemon with `eval $(minikube docker-env)`
- [ ] T039 [P] [US2] Build sso-platform image: `docker build -t sso-platform:dev ./sso-platform`
- [ ] T040 [P] [US2] Build api image: `docker build -t api:dev ./packages/api`
- [ ] T041 [P] [US2] Build mcp-server image: `docker build -t mcp-server:dev ./packages/mcp-server`
- [ ] T042 [P] [US2] Build web-dashboard image: `docker build -t web-dashboard:dev ./web-dashboard`
- [ ] T043 [US2] Verify all 4 images in Minikube registry with `docker images | grep ":dev"`

**US2 Acceptance Criteria**:
- [ ] Minikube cluster running with correct resource allocation
- [ ] All 4 service images built successfully with :dev tag
- [ ] Images visible in Minikube's Docker daemon (not host Docker)

---

## Phase 5: User Story 3 - Configuration Management (Priority: P2)

**User Story**: As a DevOps engineer, I need to externalize configuration from images so that I can manage environment-specific settings and secrets securely.

**Independent Test**: Create K8s secret, reference in deployment, verify pod can read secret via env vars.

**FR Mapping**: FR-021 (classify env vars), FR-022 (Secrets), FR-023 (ConfigMaps), FR-024 (K8s DNS URLs), FR-025 (secret references)

### Tasks (15 minutes)

- [ ] T044 [P] [US3] Extract environment variables from `compose.yaml` for all 5 services
- [ ] T045 [P] [US3] Apply FR-021 classification decision tree to categorize variables as Secrets or ConfigMaps
- [ ] T046 [US3] Verify POSTGRES_PASSWORD, BETTER_AUTH_SECRET, OPENAI_API_KEY, SMTP_PASS classified as Secrets
- [ ] T047 [US3] Verify DATABASE_URL, SERVICE_URLS, DEBUG, LOG_LEVEL classified as ConfigMaps
- [ ] T048 [US3] Verify all service URLs in ConfigMaps use K8s DNS format (e.g., `http://postgres:5432`, `http://sso-platform:3001`)
- [ ] T049 [US3] Verify DATABASE_URL in ConfigMaps uses secretKeyRef for password: `postgresql://postgres:$(SECRET_REF)@postgres:5432/taskflow`

**US3 Acceptance Criteria**:
- [ ] All environment variables classified correctly per FR-021 rules
- [ ] Sensitive data (17 variables) stored in K8s Secrets
- [ ] Non-sensitive data stored in ConfigMaps with K8s DNS URLs
- [ ] No plaintext passwords in ConfigMaps

---

## Phase 6: User Story 4 - Service Dependencies & Startup Order (Priority: P2)

**User Story**: As a DevOps engineer, I need services to start in correct order so that dependent services don't crash due to missing dependencies.

**Independent Test**: Deploy full stack, verify staggered startup without restart cycles.

**FR Mapping**: FR-014 to FR-018 (service deployment order), FR-015 to FR-018 (dependency checks)

### Tasks (20 minutes)

- [ ] T050 [P] [US4] Add readinessProbe to postgres deployment (Bitnami chart values override): `pg_isready` command
- [ ] T051 [P] [US4] Add initContainer to sso-platform deployment: wait for `postgres:5432` TCP connection
- [ ] T052 [P] [US4] Add initContainers to api deployment: wait for `postgres:5432` AND `sso-platform:3001`
- [ ] T053 [P] [US4] Add initContainer to mcp-server deployment: wait for `api:8000/health` HTTP 200
- [ ] T054 [P] [US4] Add initContainers to web-dashboard deployment: wait for `sso-platform:3001` AND `api:8000`
- [ ] T055 [US4] Verify initContainer images use `busybox:1.36` or `curlimages/curl:8.5.0`
- [ ] T056 [US4] Test dependency chain: Deploy only postgres → verify sso waits in Init state

**US4 Acceptance Criteria**:
- [ ] Postgres has readinessProbe defined
- [ ] All dependent services have initContainers checking upstream dependencies
- [ ] Deployment order enforced: postgres → sso → api → mcp/web
- [ ] Services don't enter CrashLoopBackOff due to missing dependencies

---

## Phase 7: Helm Deployment & Validation (30 minutes)

**Goal**: Deploy Helm chart to Minikube and validate all services are healthy.

**FR Mapping**: FR-029 to FR-034 (validation), SC-001 to SC-007 (success criteria)

### Tasks

- [ ] T057 Download Bitnami PostgreSQL chart with `helm dependency update ./helm/taskflow`
- [ ] T058 Install Helm chart with `helm install taskflow ./helm/taskflow -f helm/taskflow/values-dev.yaml`
- [ ] T059 Watch pod startup with `kubectl get pods -w` and verify staggered startup order
- [ ] T060 Verify all pods reach Running state within 5 minutes with `kubectl get pods`
- [ ] T061 Verify all services have endpoints with `kubectl get svc,ep -l app.kubernetes.io/name=taskflow`
- [ ] T062 Get web dashboard URL with `minikube service web-dashboard --url`
- [ ] T063 Access web dashboard in browser and verify login page loads
- [ ] T064 Verify API health endpoint with `curl $(minikube service api --url)/health` returns HTTP 200
- [ ] T065 Verify database connection in api pod logs with `kubectl logs -l app=api | grep -i database`
- [ ] T066 Run `helm list` to verify taskflow release deployed successfully

**Phase 7 Acceptance Criteria**:
- [ ] All 5 services (postgres, sso, api, mcp, web) in Running state
- [ ] Web dashboard accessible via browser
- [ ] API health check passes
- [ ] Database connection logs confirm successful startup
- [ ] No pods in CrashLoopBackOff or Error state

### Optional: Troubleshooting with kubectl-ai

If any pods fail during Phase 7, use **`kubectl-ai`** skill for natural language debugging:

```bash
# Install kubectl-ai if not already installed (see .claude/skills/engineering/kubectl-ai)
kubectl-ai --help

# AI-powered troubleshooting queries
kubectl-ai -quiet "why is the api pod failing?"
kubectl-ai -quiet "show logs from all taskflow pods"
kubectl-ai -quiet "check events for pods in crashloopbackoff"
kubectl-ai -quiet "which pods are not ready and why?"
kubectl-ai -quiet "describe the sso-platform deployment"

# Health check queries
kubectl-ai -quiet "are all taskflow services healthy?"
kubectl-ai -quiet "show resource usage for taskflow pods"
kubectl-ai -quiet "check if postgres is accepting connections"

# Network debugging
kubectl-ai -quiet "test connectivity from api pod to postgres service"
kubectl-ai -quiet "show all services and their endpoints"
```

**When to use kubectl-ai**:
- ✅ Debugging pod failures (faster than manual kubectl commands)
- ✅ Understanding error logs (AI explains errors)
- ✅ Validating deployment health (natural language queries)
- ❌ NOT for primary implementation (educational value in manual commands)

---

## Phase 8: User Story 5 - Deployment Validation & Troubleshooting (Priority: P3)

**User Story**: As a DevOps engineer, I need clear validation steps and troubleshooting guidance so that I can confirm deployment success and debug failures quickly.

**Independent Test**: Follow README validation checklist, simulate failure, use troubleshooting guide.

**FR Mapping**: FR-029 (README structure), FR-030 (validation commands), FR-031 (troubleshooting), FR-032 to FR-034 (validation support)

### Tasks (20 minutes)

- [ ] T067 [P] [US5] Create `README-K8S.md` with prerequisites section (Minikube, kubectl, Helm, Docker versions)
- [ ] T068 [P] [US5] Add Quick Start section to README-K8S.md with 4-step deployment process
- [ ] T069 [P] [US5] Add Validation Checklist section with 5 verification steps and expected outputs
- [ ] T070 [P] [US5] Add Troubleshooting section with common issues: CrashLoopBackOff, ImagePullBackOff, Init:Error, Pending
- [ ] T071 [US5] Add diagnostic commands section: `kubectl describe pod`, `kubectl logs`, `kubectl get events`
- [ ] T072 [US5] Add cleanup section with `helm uninstall taskflow` and `minikube delete` commands
- [ ] T073 [US5] Test README walkthrough: Delete cluster, follow README from scratch, verify all steps work

**US5 Acceptance Criteria**:
- [ ] README-K8S.md exists with complete deployment guide
- [ ] Validation checklist includes all 5 verification steps with expected outputs
- [ ] Troubleshooting covers top 4 failure modes with specific commands
- [ ] README can be followed by new user without prior Kubernetes knowledge

---

## Phase 9: Polish & Cross-Cutting Concerns (15 minutes)

**Goal**: Final validation, cleanup, and documentation improvements.

### Tasks

- [ ] T074 [P] Run `helm lint ./helm/taskflow` to verify chart quality
- [ ] T075 [P] Run `helm template taskflow ./helm/taskflow -f helm/taskflow/values-dev.yaml | kubectl apply --dry-run=client -f -` to verify K8s manifest validity
- [ ] T076 Test repeatability: Run `helm uninstall taskflow && minikube delete && minikube start && helm install taskflow ./helm/taskflow -f helm/taskflow/values-dev.yaml`
- [ ] T077 Verify cleanup leaves no orphaned resources with `kubectl get all`
- [ ] T078 Update README-K8S.md with actual deployment times from testing
- [ ] T079 Add troubleshooting entry for "Minikube out of memory" scenario
- [ ] T080 Create `.gitignore` entry for `helm/taskflow/charts/` directory (downloaded dependencies)

**Phase 9 Acceptance Criteria**:
- [ ] helm lint passes with no warnings
- [ ] Deployment can be torn down and recreated successfully
- [ ] All documentation accurate and tested
- [ ] No leftover resources after cleanup

---

## Dependencies & Execution Order

### Story Completion Order

```
Setup (Phase 1)
  ↓
Foundational (Phase 2 - Helm Chart Base)
  ↓
US1 (Phase 3 - Service Deployment) → Blocks: US2, US4, US5
  ↓
US2 (Phase 4 - Image Builds) → Blocks: Deployment
  ↓
US3 (Phase 5 - Configuration) → Can run in parallel with US4
US4 (Phase 6 - Dependencies) → Can run in parallel with US3
  ↓
Deployment (Phase 7) → Requires: US1, US2, US4
  ↓
US5 (Phase 8 - Documentation) → Can run in parallel with Deployment
  ↓
Polish (Phase 9)
```

### Critical Path

**Minimum Path to Working Deployment**:
1. Setup (Phase 1) → 15 min
2. Foundational (Phase 2) → 45 min
3. US1 (Phase 3) → 115 min
4. US2 (Phase 4) → 20 min
5. US4 (Phase 6) → 20 min
6. Deployment (Phase 7) → 30 min

**Total Critical Path**: 3 hours 5 minutes

### Parallel Opportunities

**Phase 3 (US1)**: T014-T017 (SSO), T019-T024 (API), T025-T029 (MCP), T030-T033 (Web) can be done in parallel (different files)

**Phase 4 (US2)**: T039-T042 (image builds) can be done in parallel

**Phase 5-6**: US3 (Configuration review) and US4 (Dependencies) can be done in parallel

**Phase 8 (US5)**: T067-T070 (README sections) can be written in parallel

**Phase 9**: T074-T075 (validation commands) can run in parallel

---

## Task Summary

| Phase | Task Count | Est. Time | Priority |
|-------|------------|-----------|----------|
| Phase 1: Setup | 6 | 15 min | Blocking |
| Phase 2: Foundational | 7 | 45 min | Blocking |
| Phase 3: US1 (Service Deployment) | 22 | 115 min | P1 |
| Phase 4: US2 (Image Builds) | 8 | 20 min | P1 |
| Phase 5: US3 (Configuration) | 6 | 15 min | P2 |
| Phase 6: US4 (Dependencies) | 7 | 20 min | P2 |
| Phase 7: Deployment & Validation | 10 | 30 min | P1 |
| Phase 8: US5 (Documentation) | 7 | 20 min | P3 |
| Phase 9: Polish | 7 | 15 min | Final |

**Total Tasks**: 80
**Total Estimated Time**: 3 hours 35 minutes (includes buffer)

---

## MVP Scope (Minimum Viable Deployment)

For fastest path to working deployment, focus on:

**Phase 1 + 2 + 3 + 4 + 6 + 7** (Skip US3 validation, US5 documentation initially)

**MVP Tasks**: T001-T035, T036-T043, T050-T056, T057-T066
**MVP Time**: 3 hours 5 minutes
**MVP Deliverable**: All services running on Minikube, accessible via browser

---

## Implementation Strategy

1. **Start with Setup & Foundation** (Phases 1-2): Ensure Helm chart base is solid before templates
2. **Implement US1 Service by Service** (Phase 3): Complete one service fully (deployment + service + config + secret) before moving to next
3. **Build Images Early** (Phase 4): Build after first service template to catch issues
4. **Add Dependencies Incrementally** (Phase 6): Test each initContainer individually
5. **Deploy Often**: Run `helm install` after each service added to catch issues early
6. **Document Last** (Phase 8): Write README after deployment working

---

## Notes

- **[P] marker**: Indicates task can be done in parallel with others (different files, no dependencies)
- **[US#] marker**: Maps task to user story from spec.md
- **FR Mapping**: Each phase lists corresponding functional requirements
- **Independent Tests**: Each user story phase includes validation commands
- **Acceptance Criteria**: Clear done conditions for each phase
- **File Paths**: All tasks specify exact file locations for implementation

---

**Next Step**: Begin implementation with Phase 1 Setup tasks (T001-T006).
