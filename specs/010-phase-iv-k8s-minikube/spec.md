# Feature Specification: Phase IV - Minikube Deployment with Helm

**Feature Branch**: `010-phase-iv-k8s-minikube`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Deploy TaskFlow platform to Minikube using Helm charts as Hackathon Phase IV deliverable"

**Context**: This specification defines the local Kubernetes deployment of TaskFlow (Phase IV hackathon requirement). The platform currently runs via Docker Compose (Phase III) with 5 services: postgres, sso-platform, api, mcp-server, and web-dashboard. This phase transitions to Kubernetes-native deployment using Helm charts on Minikube.

## Success Evals *(defined first)*

**Evals-First Principle**: We define measurable success criteria BEFORE writing user scenarios and requirements. This ensures every requirement traces back to a measurable outcome.

### Deployment Success Rate

- **Target**: 95%+ of Helm installs complete without manual intervention
- **Measurement**: Execute `helm install taskflow ./helm/taskflow -f values-dev.yaml` on clean Minikube cluster
- **Pass Criteria**: All 5 pods reach `Running` state within 5 minutes without user debugging
- **Failure Modes**: CrashLoopBackOff, ImagePullBackOff, Init:Error, Pending >5 min

### Service Health Validation

- **Target**: 100% of services pass health checks post-deployment
- **Measurement**: Execute validation commands within 2 minutes of all pods reaching Running state
  - `kubectl get pods` → all show `1/1 Running`
  - `kubectl get svc,ep` → all services have non-empty endpoints
  - `minikube service web-dashboard --url` → returns HTTP 200
  - `curl $(minikube service api --url)/health` → returns HTTP 200
- **Pass Criteria**: All 4 validation commands succeed with expected output
- **Failure Modes**: Service has no endpoints, health endpoint returns 5xx, connection refused

### Documentation Usability

- **Target**: 80%+ of users complete README-K8S.md validation checklist in <10 minutes
- **Measurement**: Time-box validation from "Prerequisites Complete" to "All Validation Steps Pass"
- **Pass Criteria**:
  - Each validation step has clear expected output (not "verify it works")
  - Troubleshooting section covers top 3 failure modes (image pull, DB connection, missing secrets)
  - All commands are copy-pastable without modification
- **Failure Modes**: Ambiguous validation steps, missing troubleshooting for common failures, commands require path/variable substitution

### Repeatability

- **Target**: 100% of deployments can be torn down and recreated without manual cleanup
- **Measurement**: Execute cleanup and re-deploy sequence:
  ```bash
  helm uninstall taskflow
  minikube delete
  minikube start --memory=6144 --cpus=3 --driver=docker
  helm install taskflow ./helm/taskflow -f values-dev.yaml
  ```
- **Pass Criteria**: Second deployment succeeds without errors, all services reach Running state
- **Failure Modes**: Leftover resources block deployment, config drift between runs, missing idempotency

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Cluster Setup & Service Deployment (Priority: P1)

As a **DevOps engineer**, I need to deploy all TaskFlow services to a local Minikube cluster so that I can validate Kubernetes deployment before cloud deployment.

**Why this priority**: Core deliverable for Phase IV. Without this, no hackathon submission possible. Demonstrates full stack running in Kubernetes environment.

**Independent Test**: Start Minikube, deploy Helm chart, verify all 5 services (postgres, sso, api, mcp, web) are running with `kubectl get pods`. Access web dashboard via NodePort.

**Acceptance Scenarios**:

1. **Given** Minikube is not running, **When** I execute `minikube start --memory=6144 --cpus=3 --driver=docker`, **Then** Minikube cluster starts successfully with metrics-server and storage-provisioner addons enabled
2. **Given** Helm chart exists at `helm/taskflow/`, **When** I run `helm install taskflow ./helm/taskflow -f values-dev.yaml`, **Then** all pods reach `Running` state within 5 minutes
3. **Given** all pods are running, **When** I execute `kubectl get svc,ep`, **Then** all services have endpoints and correct port mappings
4. **Given** deployment is complete, **When** I run `minikube service web-dashboard --url`, **Then** I receive a URL and can access the login page in my browser
5. **Given** services are deployed, **When** I curl the API health endpoint, **Then** I receive HTTP 200 with health status confirmation

---

### User Story 2 - Image Build & Local Registry (Priority: P1)

As a **DevOps engineer**, I need to build Docker images locally using Minikube's Docker daemon so that images are available without pushing to an external registry.

**Why this priority**: Critical for Phase IV scope. Avoids registry complexity and costs. Hackathon requirement explicitly states local image builds.

**Independent Test**: Set Minikube Docker env, build one image (e.g., `docker build -t api:dev ./packages/api`), verify with `docker images | grep api:dev`, deploy to Minikube with `imagePullPolicy: Never`.

**Acceptance Scenarios**:

1. **Given** Minikube is running, **When** I execute `eval $(minikube docker-env)`, **Then** my shell uses Minikube's Docker daemon
2. **Given** Dockerfile exists for a service, **When** I run `docker build -t <service>:dev ./<path>`, **Then** image builds successfully and appears in Minikube's Docker registry
3. **Given** image is built locally, **When** Helm chart specifies `imagePullPolicy: Never`, **Then** Kubernetes uses the local image without attempting external pull
4. **Given** missing Dockerfile for a service, **When** I check service directory, **Then** either Dockerfile exists or spec defines structure to create one

---

### User Story 3 - Configuration Management (Secrets & ConfigMaps) (Priority: P2)

As a **DevOps engineer**, I need to externalize configuration from images so that I can manage environment-specific settings and secrets securely.

**Why this priority**: Essential for multi-environment deployment. Separates config from code. Required for database credentials and API keys.

**Independent Test**: Create K8s secret with `kubectl create secret generic taskflow-secrets`, reference in Helm deployment, verify pod can read secret via `kubectl exec <pod> -- env | grep SECRET`.

**Acceptance Scenarios**:

1. **Given** compose.yaml with environment variables, **When** I classify variables, **Then** sensitive data (passwords, API keys) become K8s Secrets and non-sensitive data become ConfigMaps
2. **Given** Helm chart templates, **When** I deploy with `helm install`, **Then** Secrets are created before Deployments and mounted as environment variables in pods
3. **Given** service needs database URL, **When** I examine ConfigMap, **Then** connection string uses K8s DNS names (e.g., `postgres:5432`) instead of localhost
4. **Given** OPENAI_API_KEY is required, **When** I deploy without it in secrets, **Then** deployment fails with clear error message indicating missing secret

---

### User Story 4 - Service Dependencies & Startup Order (Priority: P2)

As a **DevOps engineer**, I need services to start in correct order (postgres → sso → api → mcp → web) so that dependent services don't crash due to missing dependencies.

**Why this priority**: Prevents CrashLoopBackOff errors. Ensures stable startup. Hackathon judges will see clean deployment.

**Independent Test**: Deploy full stack, verify postgres is healthy before sso starts (check with `kubectl describe pod <sso-pod>` showing successful initContainer or readiness checks).

**Acceptance Scenarios**:

1. **Given** postgres deployment, **When** I check deployment YAML, **Then** readinessProbe is defined with TCP socket or `pg_isready` command
2. **Given** sso-platform deployment, **When** I check deployment YAML, **Then** initContainer or readinessProbe verifies postgres availability before main container starts
3. **Given** api deployment, **When** I check deployment YAML, **Then** initContainer verifies both postgres and sso are reachable before starting
4. **Given** all services deployed, **When** I run `kubectl get pods -w`, **Then** I observe staggered startup (postgres first, then sso, then api, then mcp, then web) without restart cycles

---

### User Story 5 - Deployment Validation & Troubleshooting (Priority: P3)

As a **DevOps engineer**, I need clear validation steps and troubleshooting guidance so that I can confirm deployment success and debug failures quickly.

**Why this priority**: Nice-to-have for hackathon submission. Improves presentation quality. Helps with demo video creation.

**Independent Test**: Follow README-K8S.md validation checklist, encounter simulated failure (e.g., wrong image tag), use troubleshooting guide to identify and fix issue.

**Acceptance Scenarios**:

1. **Given** README-K8S.md exists, **When** I follow validation steps, **Then** each step provides expected output and clear success/failure indicators
2. **Given** pod is in CrashLoopBackOff, **When** I check troubleshooting section, **Then** I find specific guidance for common issues (image pull errors, DB connection failures, missing secrets)
3. **Given** service is not accessible, **When** I run diagnostic commands from README, **Then** I can identify whether issue is networking, pod health, or service configuration
4. **Given** deployment succeeds, **When** I run `kubectl logs <api-pod>`, **Then** logs show successful database connection and service startup without errors

---

### Edge Cases

- **What happens when Minikube runs out of memory?** Pods enter Pending or Evicted state. Minikube must be started with `--memory=6144` minimum.
- **What happens when Docker Desktop is not running?** Minikube fails to start with driver error. User must start Docker Desktop first.
- **How does system handle missing Dockerfiles?** Spec defines Dockerfile structure; implementation creates missing Dockerfiles using base images from compose.yaml.
- **What happens when postgres fails to start?** Dependent services (sso, api) remain in Init state due to initContainer checks. Deployment blocks until postgres is healthy.
- **How does system handle port conflicts?** Minikube uses NodePort with dynamic assignment; conflicts are avoided by K8s port allocation.
- **What happens when Helm chart has syntax errors?** `helm install` fails with validation error before any K8s resources are created. User must fix chart and retry.
- **How does system handle missing secrets?** Pods fail to start with ImagePullBackOff or CrashLoopBackOff. `kubectl describe pod` shows missing secret error.

## Requirements *(mandatory)*

### Functional Requirements

**Helm Chart Structure**:

- **FR-001**: System MUST provide Helm chart at `helm/taskflow/` with Chart.yaml, values.yaml, values-dev.yaml, and templates/ directory
- **FR-002**: Chart.yaml MUST declare Bitnami PostgreSQL chart as dependency (version ~12.x) for database deployment
- **FR-003**: Helm chart MUST include separate template subdirectories for each service: sso-platform/, api/, mcp-server/, web-dashboard/
- **FR-004**: Each service template MUST include deployment.yaml, service.yaml, configmap.yaml (if config needed), and secret.yaml (if secrets needed)
- **FR-005**: values.yaml MUST define default configuration including image tags, resource limits, replica counts, and service types
- **FR-006**: values-dev.yaml MUST override defaults for local development (e.g., imagePullPolicy: Never, NodePort for web)

**Docker Images**:

- **FR-007**: System MUST build Docker images for all 4 services (sso, api, mcp-server, web) using existing Dockerfiles or create missing ones
- **FR-008**: Images MUST be tagged with convention `<service>:dev` (e.g., api:dev, web:dev)
- **FR-009**: Images MUST be built using Minikube's Docker daemon (via `eval $(minikube docker-env)`) to avoid registry push
- **FR-010**: Dockerfile for each service MUST match existing compose.yaml build configuration (context, args, environment)

**Minikube Setup**:

- **FR-011**: Minikube MUST be configured with minimum 6144MB memory, 3 CPUs, and docker driver
- **FR-012**: Minikube MUST have metrics-server addon enabled for resource monitoring
- **FR-013**: Minikube MUST have storage-provisioner addon enabled for PostgreSQL PersistentVolumeClaim

**Service Deployment**:

- **FR-014**: PostgreSQL MUST deploy first via Bitnami chart dependency with ephemeral storage (data loss on cluster delete is acceptable)
- **FR-015**: SSO Platform MUST deploy with dependency check on postgres availability (initContainer or readinessProbe)
- **FR-016**: API MUST deploy with dependency checks on both postgres and sso availability
- **FR-017**: MCP Server MUST deploy with dependency check on api availability
- **FR-018**: Web Dashboard MUST deploy with dependency checks on sso and api availability
- **FR-019**: Web Dashboard service MUST use NodePort type for browser access via `minikube service` command
- **FR-020**: All other services MUST use ClusterIP type for internal cluster communication

**Configuration Management**:

- **FR-021**: System MUST extract environment variables from compose.yaml and classify as Secrets or ConfigMaps using the following decision tree:

  **Classification Rules** (evaluated in order):
  1. **IF** variable name matches regex `(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE_KEY|CREDENTIAL)` → K8s Secret
  2. **ELSE IF** variable value is connection string containing password (pattern: `://[^:]+:[^@]+@`) → ConfigMap with secretKeyRef injection
  3. **ELSE IF** variable name matches `(SMTP_PASS|EMAIL_PASS|DB_PASS)` → K8s Secret
  4. **ELSE** → ConfigMap

  **Classification Examples**:
  - `POSTGRES_PASSWORD=postgres` → Secret (rule 1: PASSWORD in name)
  - `BETTER_AUTH_SECRET=xyz` → Secret (rule 1: SECRET in name)
  - `OPENAI_API_KEY=sk-xxx` → Secret (rule 1: API_KEY in name)
  - `DATABASE_URL=postgresql://user:pass@host/db` → ConfigMap with value `postgresql://user:$(SECRET_REF)/db` (rule 2: contains password)
  - `SSO_URL=http://sso-platform:3001` → ConfigMap (rule 4: no sensitive pattern)
  - `DEBUG=false` → ConfigMap (rule 4: no sensitive pattern)
  - `LOG_LEVEL=INFO` → ConfigMap (rule 4: no sensitive pattern)
  - `ALLOWED_ORIGINS=http://localhost:3000` → ConfigMap (rule 4: no sensitive pattern)

- **FR-022**: Sensitive variables (POSTGRES_PASSWORD, BETTER_AUTH_SECRET, OPENAI_API_KEY) MUST be stored as K8s Secrets
- **FR-023**: Non-sensitive variables (DATABASE_URL patterns, service URLs, feature flags) MUST be stored as ConfigMaps
- **FR-024**: Service URLs in ConfigMaps MUST use Kubernetes DNS format (e.g., `http://sso-platform:3001`, `http://api:8000`)
- **FR-025**: Database connection strings MUST reference K8s secret for password instead of plaintext

**Resource Management**:

- **FR-026**: Each service deployment MUST define resource requests (cpu: 100m, memory: 256Mi)
- **FR-027**: Each service deployment MUST define resource limits (cpu: 500m, memory: 512Mi)
- **FR-028**: PostgreSQL MUST be configured with appropriate resources via Bitnami chart values

**Validation**:

- **FR-029**: README-K8S.md MUST provide step-by-step setup instructions from Minikube start to service access
- **FR-030**: README-K8S.md MUST include validation commands (kubectl get pods, kubectl get svc, curl commands)
- **FR-031**: README-K8S.md MUST include troubleshooting section for common issues (image pull errors, pod crashes, connection failures)
- **FR-032**: System MUST support validation via `kubectl get pods -w` showing all pods reach Running state
- **FR-033**: System MUST support validation via `minikube service web-dashboard --url` returning accessible URL
- **FR-034**: System MUST support validation via `curl $(minikube service api --url)/health` returning HTTP 200

### Key Entities

- **Helm Chart**: Package containing K8s manifests, templates, and configuration. Includes Chart.yaml (metadata), values.yaml (config), templates/ (K8s resources).
- **Minikube Cluster**: Local single-node Kubernetes cluster. Configured with memory, CPU, driver. Hosts all TaskFlow services and addons.
- **Docker Image**: Container image built from Dockerfile. Tagged with service name and version. Stored in Minikube's Docker daemon.
- **Kubernetes Service**: Stable network endpoint for pods. Types: ClusterIP (internal), NodePort (external). Enables service discovery via DNS.
- **Kubernetes Deployment**: Manages pod replicas, rolling updates, health checks. Includes initContainers for dependency checks, readinessProbe for startup validation.
- **ConfigMap**: Key-value store for non-sensitive configuration. Mounted as environment variables or files in pods.
- **Secret**: Key-value store for sensitive data (passwords, API keys). Base64 encoded, mounted as environment variables.
- **PersistentVolumeClaim (PVC)**: Request for storage. Used by PostgreSQL for data persistence. Backed by Minikube storage-provisioner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 services (postgres, sso-platform, api, mcp-server, web-dashboard) reach `Running` state within 5 minutes of `helm install` execution
- **SC-002**: Web dashboard is accessible via browser at URL returned by `minikube service web-dashboard --url` within 30 seconds
- **SC-003**: API health endpoint returns HTTP 200 when accessed via `curl $(minikube service api --url)/health`
- **SC-004**: Database connectivity is confirmed by checking api pod logs with `kubectl logs <api-pod> | grep "database"` showing successful connection message
- **SC-005**: All services have endpoints verified by `kubectl get svc,ep` showing non-empty endpoint lists for each service
- **SC-006**: Deployment can be repeated successfully (helm uninstall, minikube delete, minikube start, helm install) without manual intervention
- **SC-007**: README-K8S.md validation checklist can be completed in under 10 minutes by following documented steps

## Constraints *(mandatory)*

- **C-001**: Phase IV scope only - kubectl-ai and kagent are OUT OF SCOPE (deferred to Phase V)
- **C-002**: Local deployment only - no cloud provider (DigitalOcean DOKS, GKE, AKS) integration required
- **C-003**: Ephemeral storage acceptable - PostgreSQL data loss on `minikube delete` is acceptable for Phase IV
- **C-004**: No Ingress required - NodePort access for web dashboard is sufficient for local testing
- **C-005**: No persistent volumes required beyond PostgreSQL - application state is stateless
- **C-006**: No image registry required - all images built and used locally within Minikube
- **C-007**: No CI/CD pipeline required - manual deployment via `helm install` is acceptable
- **C-008**: Hackathon deadline: January 4, 2026 - specification and implementation must be complete by this date

## Non-Goals *(mandatory)*

- **NG-001**: Production-grade deployment (TLS certificates, domain names, production secrets management) - Phase V scope
- **NG-002**: Advanced monitoring (Prometheus, Grafana) - Phase V scope
- **NG-003**: Event-driven architecture (Kafka, Dapr) - Phase V scope
- **NG-004**: Horizontal pod autoscaling - Phase V optimization
- **NG-005**: Multi-environment deployment (staging, production) - Phase IV focuses on dev environment only
- **NG-006**: Backup and disaster recovery - Phase V scope
- **NG-007**: Service mesh (Istio, Linkerd) - Phase V scope
- **NG-008**: Advanced networking (network policies, custom CNI) - Phase V scope

## Assumptions *(mandatory)*

- **A-001**: User has Docker Desktop installed and running with minimum 8GB memory allocated
- **A-002**: User has Minikube, kubectl, and Helm CLI installed locally
- **A-003**: User has completed Phase III (compose.yaml deployment) successfully and understands TaskFlow architecture
- **A-004**: Existing Dockerfiles in service directories are production-ready or will be created during implementation
- **A-005**: compose.yaml accurately represents all required environment variables and service dependencies
- **A-006**: User has valid OPENAI_API_KEY for ChatKit functionality (required for full system validation)
- **A-007**: Bitnami PostgreSQL Helm chart version ~12.x is compatible with TaskFlow's database requirements
- **A-008**: Minikube's Docker driver is compatible with user's operating system (macOS, Linux, Windows with WSL2)

## Out of Scope *(mandatory)*

- kubectl-ai integration for AI-assisted Kubernetes operations (Phase V)
- kagent integration for autonomous cluster optimization (Phase V)
- DigitalOcean DOKS deployment (Phase V)
- Kafka event streaming (Phase V)
- Dapr service mesh integration (Phase V)
- GitHub Actions CI/CD pipeline (Phase V)
- Production TLS/SSL certificates (Phase V)
- Advanced logging and monitoring dashboards (Phase V)
- Database backup and restore procedures (Phase V)
- Load testing and performance optimization (Phase V)

## Dependencies *(mandatory)*

### External Dependencies

- **Minikube**: Local Kubernetes cluster. Version 1.30+ required.
- **kubectl**: Kubernetes CLI. Version matching Minikube's K8s version.
- **Helm**: Kubernetes package manager. Version 3.12+ required.
- **Docker Desktop**: Container runtime. Version 4.20+ required with 8GB+ memory.
- **Bitnami PostgreSQL Helm Chart**: Database deployment. Version ~12.x from Bitnami repository.

### Internal Dependencies

- **compose.yaml**: Source of truth for service configuration, environment variables, and dependencies.
- **Existing Dockerfiles**: Base for creating or validating container images for each service.
- **Phase III Deliverables**: ChatKit integration, MCP server, Better Auth SSO must be functional before K8s deployment.

## Risks *(mandatory)*

- **R-001 (HIGH)**: Missing or incomplete Dockerfiles could block image builds. **Mitigation**: Spec defines Dockerfile structure; implementation creates missing files.
- **R-002 (MEDIUM)**: Minikube resource constraints (memory, CPU) could cause pod evictions. **Mitigation**: Require minimum 6GB memory, 3 CPUs; document resource requirements clearly.
- **R-003 (MEDIUM)**: Service startup dependencies could cause CrashLoopBackOff if not handled properly. **Mitigation**: Use initContainers with readiness checks for each dependency.
- **R-004 (LOW)**: Bitnami PostgreSQL chart version compatibility could cause schema issues. **Mitigation**: Test with PostgreSQL 16 to match compose.yaml version.
- **R-005 (LOW)**: User might not have OPENAI_API_KEY, blocking ChatKit validation. **Mitigation**: Document as optional for partial deployment validation.
