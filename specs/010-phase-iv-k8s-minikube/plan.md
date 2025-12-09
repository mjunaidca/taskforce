# Implementation Plan: Phase IV - Minikube Deployment with Helm

**Branch**: `010-phase-iv-k8s-minikube` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-phase-iv-k8s-minikube/spec.md`

## Summary

Deploy TaskFlow platform (5 services: postgres, sso-platform, api, mcp-server, web-dashboard) to local Kubernetes using Minikube and Helm charts. Build Docker images locally using Minikube's Docker daemon, create production-ready Helm chart with Bitnami PostgreSQL dependency, externalize configuration to Secrets/ConfigMaps, implement service startup ordering with initContainers, and provide comprehensive validation documentation. This phase proves cloud-native deployment readiness before Phase V production cloud deployment.

**Primary Technical Approach**:
- Leverage existing Dockerfiles (all 4 services already containerized in Phase III)
- Use Bitnami PostgreSQL Helm chart as dependency (no custom postgres deployment)
- Build images with `eval $(minikube docker-env)` to avoid registry push
- Implement strict dependency ordering: postgres → sso → api → mcp → web
- Service mesh via Kubernetes DNS (e.g., `http://sso-platform:3001`)
- NodePort for web-dashboard external access, ClusterIP for internal services

## Technical Context

**Language/Version**:
- Python 3.13+ (API, MCP Server)
- TypeScript/Node.js 18+ (SSO Platform, Web Dashboard)
- Kubernetes 1.28+ (Minikube)
- Helm 3.12+

**Primary Dependencies**:
- Minikube (local Kubernetes cluster)
- Helm (package manager)
- Docker (image builds via Minikube daemon)
- Bitnami PostgreSQL Helm Chart ~12.x
- Existing service dependencies from Phase III (FastAPI, Next.js 16, Better Auth, OpenAI ChatKit, Official MCP SDK)

**Storage**:
- PostgreSQL (via Bitnami chart with ephemeral PVC)
- Kubernetes Secrets (passwords, API keys, auth secrets)
- Kubernetes ConfigMaps (service URLs, non-sensitive config)

**Testing**:
- Manual validation via kubectl commands
- Health endpoint verification (curl)
- Browser-based web dashboard access
- README-K8S.md validation checklist

**Target Platform**:
- Minikube (Docker driver)
- macOS/Linux/Windows (WSL2)
- Minimum 6GB RAM, 3 CPUs

**Project Type**:
- Multi-service web application (infrastructure deployment)
- 5 containerized services coordinated via Kubernetes

**Performance Goals**:
- All pods reach Running state within 5 minutes of `helm install`
- Web dashboard accessible within 30 seconds of full deployment
- Health endpoints respond with HTTP 200 in <5 seconds

**Constraints**:
- Phase IV scope only (kubectl-ai and kagent deferred to Phase V)
- Local deployment only (no cloud provider)
- Ephemeral PostgreSQL storage (data loss on `minikube delete` acceptable)
- No Ingress required (NodePort sufficient)
- No image registry (all images built and stored locally in Minikube)

**Scale/Scope**:
- 5 services (1 database, 4 application services)
- Single replica per service (no HA required for Phase IV)
- ~20 Kubernetes manifest templates (Deployment, Service, ConfigMap, Secret per service)
- 1 Helm chart with values.yaml and values-dev.yaml

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle 1: Every Action MUST Be Auditable
**Status**: ✅ **NOT APPLICABLE (Infrastructure Phase)**

**Rationale**: Phase IV deploys existing Phase III services to Kubernetes. No new task state changes or audit-generating features are introduced. The audit trail functionality implemented in Phase II/III continues to operate unchanged within the containerized environment. Database-level audit entries persist across deployments via PostgreSQL.

**Validation**: Existing audit functionality tested post-deployment by verifying API `/audit` endpoints return correct audit entries for Phase III task operations.

---

### Principle 2: Agents Are First-Class Citizens
**Status**: ✅ **NOT APPLICABLE (Infrastructure Phase)**

**Rationale**: Phase IV deploys existing MCP server and agent infrastructure without modification. Agent authentication (API keys), task assignment parity, and MCP tool interfaces remain unchanged. Agents continue to access the platform via the MCP server endpoint, which becomes accessible via Kubernetes Service DNS (`http://mcp-server:8001/mcp`).

**Validation**: MCP server health endpoint responds correctly, agents can connect and invoke MCP tools post-deployment.

---

### Principle 3: Recursive Task Decomposition
**Status**: ✅ **NOT APPLICABLE (Infrastructure Phase)**

**Rationale**: Recursive task structure (parent_id, subtask relationships) is a database-level feature implemented in Phase II. Kubernetes deployment does not affect data model or task decomposition logic.

**Validation**: Existing subtask creation workflows tested post-deployment to confirm data model integrity.

---

### Principle 4: Spec-Driven Development
**Status**: ✅ **VERIFIED**

**Evidence**:
- Specification exists at `/specs/010-phase-iv-k8s-minikube/spec.md`
- Specification validated at 10/10 READY with all 34 functional requirements, 7 success criteria, 5 user stories
- This plan document follows from the specification
- Implementation will be generated from this plan + spec by Claude Code

**Validation**: Spec exists, is comprehensive, and guides implementation.

---

### Principle 5: Phase Continuity (Data Model Persistence)
**Status**: ✅ **VERIFIED**

**Evidence**:
- Phase IV deploys Phase III services without data model changes
- Database schema remains unchanged (Task, Worker, Project, AuditLog, Conversation, Message)
- Configuration extracted from `compose.yaml` (Phase III artifact)
- Dockerfiles created in Phase III reused directly
- API contracts, authentication flows, and MCP tools unchanged

**Validation**: Phase IV is purely infrastructure deployment. All application-level designs from Phases I-III persist unchanged into Kubernetes environment.

---

**GATE DECISION**: ✅ **PASS** — Proceed to Phase 0 Research

All constitution principles are satisfied. Phase IV is infrastructure-only; no audit, agent parity, or task decomposition changes. Spec-driven development verified. Phase continuity guaranteed (no breaking changes to Phase III services).

## Project Structure

### Documentation (this feature)

```text
specs/010-phase-iv-k8s-minikube/
├── spec.md              # Feature specification (VALIDATED 10/10 READY)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (NEEDS CREATION if clarifications needed)
├── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
└── checklists/          # Validation checklists (already exists)
    └── minikube-deployment-checklist.md
```

### Source Code (repository root)

**Phase IV adds Helm chart and Kubernetes manifests. Existing codebase structure remains unchanged:**

```text
/Users/mjs/Documents/code/mjunaidca/tf-k8/
├── compose.yaml                    # Phase III artifact (source of env vars)
├── .env.example                    # Environment template
├── packages/
│   ├── api/
│   │   ├── Dockerfile              # ✅ EXISTS (Phase III)
│   │   ├── src/                    # FastAPI application
│   │   └── pyproject.toml
│   └── mcp-server/
│       ├── Dockerfile              # ✅ EXISTS (Phase III)
│       ├── src/                    # MCP server application
│       └── pyproject.toml
├── sso-platform/
│   ├── Dockerfile                  # ✅ EXISTS (Phase III)
│   ├── src/                        # Next.js Better Auth SSO
│   └── package.json
├── web-dashboard/
│   ├── Dockerfile                  # ✅ EXISTS (Phase III)
│   ├── src/                        # Next.js 16 frontend
│   └── package.json
├── helm/                           # 🆕 NEW (Phase IV)
│   └── taskflow/
│       ├── Chart.yaml              # Helm chart metadata
│       ├── values.yaml             # Production defaults
│       ├── values-dev.yaml         # Local Minikube overrides
│       ├── .helmignore             # Files to exclude
│       ├── templates/
│       │   ├── NOTES.txt           # Post-install instructions
│       │   ├── _helpers.tpl        # Template helpers
│       │   ├── postgres/           # 🚫 REMOVED (using Bitnami dependency)
│       │   ├── sso-platform/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   ├── configmap.yaml
│       │   │   └── secret.yaml
│       │   ├── api/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   ├── configmap.yaml
│       │   │   └── secret.yaml
│       │   ├── mcp-server/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   └── configmap.yaml
│       │   └── web-dashboard/
│       │       ├── deployment.yaml
│       │       ├── service.yaml
│       │       └── configmap.yaml
│       └── charts/                 # Dependency charts downloaded here
└── README-K8S.md                   # 🆕 NEW (Phase IV validation guide)
```

**Structure Decision**:
Phase IV adds Helm chart under `/helm/taskflow/` directory with standard Helm structure. Existing service directories remain unchanged. Dockerfiles already exist from Phase III (verified via `Glob` - all 4 services have Dockerfiles). Configuration extracted from `compose.yaml` and classified into Secrets/ConfigMaps per FR-021 decision tree.

**Key Decision**: Use Bitnami PostgreSQL Helm chart as dependency instead of custom postgres deployment (FR-002). This eliminates need for `templates/postgres/` directory and leverages production-tested chart.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ **NO VIOLATIONS**

Phase IV introduces no constitutional violations. All complexity is infrastructure deployment (Kubernetes, Helm), not application-level design. No additional justification required.

## Phase 0: Research (if needed)

### Research Questions

**Status**: ✅ **NO RESEARCH NEEDED**

All technical unknowns have been resolved during spec validation:

| Question | Resolution |
|----------|-----------|
| Do Dockerfiles exist for all services? | ✅ **VERIFIED** - All 4 services have Dockerfiles in Phase III codebase |
| What is the Bitnami PostgreSQL chart version? | ✅ **RESOLVED** - Version ~12.x compatible with PostgreSQL 16 |
| How to extract environment variables from compose.yaml? | ✅ **RESOLVED** - Parse `compose.yaml` YAML structure, apply FR-021 classification rules |
| What is the service dependency graph? | ✅ **RESOLVED** - postgres → sso → api → mcp → web (from compose.yaml `depends_on`) |
| How to handle service startup ordering? | ✅ **RESOLVED** - Use initContainers with netcat/curl checks (ADR recommendation) |

**Decision**: Skip research.md creation. Proceed directly to Phase 1 Design.

## Phase 1: Design

### Architecture Overview

**Deployment Model**: Single-node Minikube cluster running 5 services via Helm chart.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MINIKUBE CLUSTER (docker driver)                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     TASKFLOW NAMESPACE (default)                     │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐       ┌──────────────────┐                    │   │
│  │  │  postgres (Pod)  │       │  sso-platform    │                    │   │
│  │  │  Bitnami Chart   │◄──────│  (Deployment)    │                    │   │
│  │  │  ClusterIP:5432  │       │  ClusterIP:3001  │                    │   │
│  │  └────────┬─────────┘       └────────┬─────────┘                    │   │
│  │           │                          │                               │   │
│  │           │    ┌─────────────────────┴────────┐                     │   │
│  │           │    │                              │                     │   │
│  │           │    ▼                              ▼                     │   │
│  │  ┌────────▼────────────┐         ┌──────────────────┐              │   │
│  │  │  api (Deployment)   │◄────────│  mcp-server      │              │   │
│  │  │  ClusterIP:8000     │         │  (Deployment)    │              │   │
│  │  └────────┬────────────┘         │  ClusterIP:8001  │              │   │
│  │           │                      └──────────────────┘              │   │
│  │           │                                                          │   │
│  │           ▼                                                          │   │
│  │  ┌──────────────────┐                                               │   │
│  │  │  web-dashboard   │                                               │   │
│  │  │  (Deployment)    │                                               │   │
│  │  │  NodePort:30000  │ ◄────────────────────────┐                   │   │
│  │  └──────────────────┘                          │                   │   │
│  │                                                 │                   │   │
│  └─────────────────────────────────────────────────┼───────────────────┘   │
│                                                    │                       │
│                                           ┌────────▼────────┐              │
│                                           │  minikube       │              │
│                                           │  service        │              │
│                                           │  web-dashboard  │              │
│                                           │  --url          │              │
│                                           └────────┬────────┘              │
│                                                    │                       │
└────────────────────────────────────────────────────┼───────────────────────┘
                                                     │
                                                     ▼
                                            Browser (localhost)
```

**Service Startup Sequence** (enforced by initContainers):
```
1. postgres       (Bitnami chart, readinessProbe: pg_isready)
2. sso-platform   (initContainer: wait for postgres:5432)
3. api            (initContainer: wait for postgres:5432 AND sso-platform:3001)
4. mcp-server     (initContainer: wait for api:8000/health)
5. web-dashboard  (initContainer: wait for sso-platform:3001 AND api:8000)
```

**Networking**:
- **Internal Services** (ClusterIP): postgres, sso-platform, api, mcp-server
  - Accessed via Kubernetes DNS: `http://<service-name>:<port>`
  - Example: `http://api:8000/health`
- **External Service** (NodePort): web-dashboard
  - Accessed via: `minikube service web-dashboard --url`
  - Browser connects to `http://localhost:<NodePort>`

### Helm Chart Design

#### Chart.yaml
```yaml
apiVersion: v2
name: taskflow
description: TaskFlow Human-Agent Task Management Platform
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - taskflow
  - ai-agents
  - mcp
  - task-management
home: https://github.com/mjunaidca/tf-k8
maintainers:
  - name: Muhammad Junaid
    email: mjunaid@example.com

dependencies:
  - name: postgresql
    version: ~12.0.0
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
    alias: postgres
```

**Rationale**:
- Bitnami PostgreSQL chart handles all database deployment complexity (PVC, StatefulSet, readinessProbe, credentials)
- Version ~12.x ensures compatibility with PostgreSQL 16 (matches compose.yaml)
- Alias `postgres` simplifies service DNS (`taskflow-postgres` → `postgres`)

#### values.yaml (Production Defaults)
```yaml
# Global settings
global:
  imageRegistry: ""
  imagePullPolicy: IfNotPresent

# PostgreSQL (Bitnami dependency)
postgresql:
  enabled: true
  auth:
    username: postgres
    password: postgres  # Override in production
    database: taskflow
  primary:
    persistence:
      enabled: true
      size: 10Gi
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

# SSO Platform (Better Auth)
sso-platform:
  enabled: true
  image:
    repository: sso-platform
    tag: dev
    pullPolicy: Never  # Local Minikube images
  replicas: 1
  service:
    type: ClusterIP
    port: 3001
  env:
    NODE_ENV: development
    BETTER_AUTH_URL: http://localhost:3001
    ALLOWED_ORIGINS: http://localhost:3000,http://localhost:8000
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# API (FastAPI)
api:
  enabled: true
  image:
    repository: api
    tag: dev
    pullPolicy: Never
  replicas: 1
  service:
    type: ClusterIP
    port: 8000
  env:
    DEBUG: false
    LOG_LEVEL: INFO
    DEV_MODE: false
    SSO_URL: http://sso-platform:3001
    MCP_SERVER_URL: http://mcp-server:8001/mcp
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# MCP Server
mcp-server:
  enabled: true
  image:
    repository: mcp-server
    tag: dev
    pullPolicy: Never
  replicas: 1
  service:
    type: ClusterIP
    port: 8001
  env:
    TASKFLOW_API_URL: http://api:8000
    TASKFLOW_MCP_HOST: 0.0.0.0
    TASKFLOW_MCP_PORT: 8001
    TASKFLOW_DEV_MODE: false
    TASKFLOW_API_TIMEOUT: 30.0
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Web Dashboard (Next.js 16)
web-dashboard:
  enabled: true
  image:
    repository: web-dashboard
    tag: dev
    pullPolicy: Never
  replicas: 1
  service:
    type: NodePort
    port: 3000
    nodePort: 30000
  env:
    NODE_ENV: production
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

#### values-dev.yaml (Local Minikube Overrides)
```yaml
# Local development overrides
postgresql:
  primary:
    persistence:
      enabled: true
      size: 1Gi  # Smaller for local

sso-platform:
  image:
    pullPolicy: Never  # Use local Minikube images
  env:
    NODE_ENV: development
    DISABLE_EMAIL_VERIFICATION: true

api:
  image:
    pullPolicy: Never
  env:
    DEBUG: false
    DEV_MODE: false

mcp-server:
  image:
    pullPolicy: Never

web-dashboard:
  image:
    pullPolicy: Never
  service:
    nodePort: 30000  # Fixed port for local access
```

### Configuration Classification (FR-021 Decision Tree)

**Rule Application** (from spec FR-021):
1. IF variable name matches `(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE_KEY|CREDENTIAL)` → **Secret**
2. ELSE IF variable value is connection string containing password → **ConfigMap with secretKeyRef**
3. ELSE IF variable name matches `(SMTP_PASS|EMAIL_PASS|DB_PASS)` → **Secret**
4. ELSE → **ConfigMap**

**Classification Table** (extracted from compose.yaml):

| Service | Variable | Classification | Rationale | Template |
|---------|----------|----------------|-----------|----------|
| **postgres** | POSTGRES_PASSWORD | **Secret** | Rule 1: PASSWORD in name | `secret.yaml` |
| **postgres** | POSTGRES_USER | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **postgres** | POSTGRES_DB | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **sso-platform** | BETTER_AUTH_SECRET | **Secret** | Rule 1: SECRET in name | `secret.yaml` |
| **sso-platform** | DATABASE_URL | ConfigMap (with secretKeyRef) | Rule 2: contains password | `configmap.yaml` |
| **sso-platform** | SMTP_PASS | **Secret** | Rule 3: SMTP_PASS | `secret.yaml` |
| **sso-platform** | SMTP_HOST, SMTP_PORT, SMTP_USER, EMAIL_FROM | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **sso-platform** | BETTER_AUTH_URL, ALLOWED_ORIGINS | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **api** | OPENAI_API_KEY | **Secret** | Rule 1: API_KEY in name | `secret.yaml` |
| **api** | DATABASE_URL | ConfigMap (with secretKeyRef) | Rule 2: contains password | `configmap.yaml` |
| **api** | SSO_URL, MCP_SERVER_URL, ALLOWED_ORIGINS | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **api** | DEBUG, LOG_LEVEL, DEV_MODE | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **mcp-server** | TASKFLOW_API_URL, TASKFLOW_MCP_HOST | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **web-dashboard** | NEXT_PUBLIC_SSO_URL, NEXT_PUBLIC_API_URL | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |
| **web-dashboard** | SERVER_API_URL, SERVER_SSO_URL | ConfigMap | Rule 4: no sensitive pattern | `configmap.yaml` |

**Secret Structure** (per service):
```yaml
# sso-platform/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "taskflow.fullname" . }}-sso-secrets
type: Opaque
stringData:
  BETTER_AUTH_SECRET: {{ .Values.secrets.betterAuthSecret | quote }}
  SMTP_PASS: {{ .Values.secrets.smtpPass | default "" | quote }}
```

**ConfigMap Structure** (per service):
```yaml
# sso-platform/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "taskflow.fullname" . }}-sso-config
data:
  NODE_ENV: {{ .Values.sso-platform.env.NODE_ENV | quote }}
  BETTER_AUTH_URL: {{ .Values.sso-platform.env.BETTER_AUTH_URL | quote }}
  ALLOWED_ORIGINS: {{ .Values.sso-platform.env.ALLOWED_ORIGINS | quote }}
  # DATABASE_URL with secretKeyRef injection
  DATABASE_URL: "postgresql://postgres:$(POSTGRES_PASSWORD)@postgres:5432/taskflow"
```

**Service URL DNS Translation** (Kubernetes-native):
```yaml
# compose.yaml (Phase III)
SSO_URL: http://sso-platform:3001        # Container name
API_URL: http://api:8000                 # Container name

# Kubernetes ConfigMap (Phase IV)
SSO_URL: http://sso-platform:3001        # ✅ UNCHANGED (Kubernetes Service DNS)
API_URL: http://api:8000                 # ✅ UNCHANGED (Kubernetes Service DNS)
```

**Rationale**: Kubernetes Service DNS matches Docker Compose service names. No URL translation required.

### Service Dependency Implementation (ADR: initContainers)

**Decision**: Use **initContainers** with TCP socket checks (not readinessProbes).

**Rationale**:
- **initContainers**: Block pod startup until dependencies ready (enforces strict ordering)
- **readinessProbes**: Mark service ready after startup (used for load balancing, not dependency ordering)
- Postgres has built-in readinessProbe (Bitnami chart), other services use initContainers

**Implementation Pattern** (per service):
```yaml
# api/deployment.yaml
spec:
  template:
    spec:
      initContainers:
        # Wait for postgres
        - name: wait-for-postgres
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z postgres 5432; do
                echo "Waiting for postgres..."
                sleep 2
              done
              echo "Postgres is ready"
        # Wait for sso-platform
        - name: wait-for-sso
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z sso-platform 3001; do
                echo "Waiting for sso-platform..."
                sleep 2
              done
              echo "SSO platform is ready"
      containers:
        - name: api
          image: api:dev
          # ... (main container spec)
```

**Dependency Graph with initContainers**:
```
postgres (Bitnami chart)
  │ readinessProbe: pg_isready
  │
  ├─► sso-platform
  │     initContainer: wait-for-postgres (nc -z postgres 5432)
  │     │
  │     ├─► api
  │     │     initContainer: wait-for-postgres, wait-for-sso
  │     │     │
  │     │     ├─► mcp-server
  │     │     │     initContainer: wait-for-api (nc -z api 8000)
  │     │     │
  │     │     └─► web-dashboard
  │     │           initContainer: wait-for-sso, wait-for-api
  │     │
  │     └─► web-dashboard (duplicate dependency, already listed)
  │
  └─► api (duplicate dependency, already listed)
```

**Validation**: Each service's initContainer checks complete before main container starts. Deployment logs show staggered startup in `kubectl get pods -w`.

### Image Build Strategy

**Decision**: Build images using Minikube's Docker daemon (`eval $(minikube docker-env)`).

**Workflow**:
```bash
# 1. Point shell to Minikube's Docker daemon
eval $(minikube docker-env)

# 2. Build images (stored in Minikube's internal registry)
docker build -t sso-platform:dev ./sso-platform
docker build -t api:dev ./packages/api
docker build -t mcp-server:dev ./packages/mcp-server
docker build -t web-dashboard:dev ./web-dashboard

# 3. Verify images
docker images | grep -E "(sso-platform|api|mcp-server|web-dashboard)"

# 4. Deploy Helm chart with imagePullPolicy: Never
helm install taskflow ./helm/taskflow -f helm/taskflow/values-dev.yaml
```

**Image Naming Convention**:
- Format: `<service-name>:dev`
- Examples: `api:dev`, `web-dashboard:dev`, `sso-platform:dev`, `mcp-server:dev`
- Tag `dev` distinguishes from production images (Phase V will use `:latest` or version tags)

**Rationale**:
- Avoids Docker registry setup (no push/pull, faster iteration)
- Images stored in Minikube's internal registry (accessible to all pods)
- `imagePullPolicy: Never` prevents Kubernetes from attempting external pull

### Template Structure

**Template Organization** (per service):
```
helm/taskflow/templates/
├── _helpers.tpl                 # Shared template functions
├── NOTES.txt                    # Post-install instructions
├── sso-platform/
│   ├── deployment.yaml          # Pod spec, initContainers, resource limits
│   ├── service.yaml             # ClusterIP service
│   ├── configmap.yaml           # Non-sensitive env vars
│   └── secret.yaml              # BETTER_AUTH_SECRET, SMTP_PASS
├── api/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secret.yaml              # OPENAI_API_KEY
├── mcp-server/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml           # No secrets (uses API for auth)
└── web-dashboard/
    ├── deployment.yaml
    ├── service.yaml             # NodePort (not ClusterIP)
    └── configmap.yaml           # NEXT_PUBLIC_* and SERVER_* env vars
```

**_helpers.tpl** (shared functions):
```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "taskflow.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a fully qualified app name.
*/}}
{{- define "taskflow.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "taskflow.labels" -}}
helm.sh/chart: {{ include "taskflow.chart" . }}
{{ include "taskflow.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "taskflow.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

**NOTES.txt** (post-install output):
```text
TaskFlow Platform has been deployed to Minikube!

To access the web dashboard:
  export WEB_URL=$(minikube service {{ include "taskflow.fullname" . }}-web-dashboard --url)
  echo "Web Dashboard: $WEB_URL"
  open $WEB_URL  # macOS
  # xdg-open $WEB_URL  # Linux

To verify deployment:
  kubectl get pods -l app.kubernetes.io/name=taskflow
  kubectl get svc -l app.kubernetes.io/name=taskflow

Health checks:
  API:        curl $(minikube service {{ include "taskflow.fullname" . }}-api --url)/health
  MCP Server: curl $(minikube service {{ include "taskflow.fullname" . }}-mcp-server --url)/health

Logs:
  kubectl logs -l app.kubernetes.io/name=taskflow --all-containers --prefix

Database:
  kubectl exec -it {{ include "taskflow.fullname" . }}-postgres-0 -- psql -U postgres -d taskflow
```

### Validation Strategy

**README-K8S.md Structure**:
```markdown
# TaskFlow - Kubernetes Deployment Guide

## Prerequisites
- Minikube 1.30+
- kubectl 1.28+
- Helm 3.12+
- Docker Desktop 4.20+

## Quick Start
1. Start Minikube
2. Build Images
3. Deploy Helm Chart
4. Validate Deployment

## Validation Checklist
- [ ] All pods Running (kubectl get pods)
- [ ] Services have endpoints (kubectl get svc,ep)
- [ ] Web dashboard accessible (minikube service web-dashboard --url)
- [ ] API health check passes (curl)
- [ ] Database connection verified (logs)

## Troubleshooting
- CrashLoopBackOff: Check logs (kubectl logs <pod>)
- ImagePullBackOff: Verify imagePullPolicy: Never
- Init:Error: Check initContainer logs
- Pending: Check resource availability (kubectl describe pod <pod>)
```

**Validation Commands**:
```bash
# 1. Pod Status
kubectl get pods -l app.kubernetes.io/name=taskflow
# Expected: All pods 1/1 Running

# 2. Service Endpoints
kubectl get svc,ep -l app.kubernetes.io/name=taskflow
# Expected: Each service has non-empty endpoints

# 3. Web Dashboard Access
minikube service web-dashboard --url
# Expected: Returns http://127.0.0.1:<port>
# Open in browser → Should show login page

# 4. API Health Check
curl $(minikube service api --url)/health
# Expected: HTTP 200 with {"status": "healthy"}

# 5. Database Connection (API Logs)
kubectl logs -l app=api | grep -i database
# Expected: "Database connection established" or similar
```

## Implementation Sequence

### Critical Path

**Path**: Helm Chart Creation → Image Builds → Deployment → Validation

**Sequence** (with dependencies):
```
[Helm Chart Creation]
├── Chart.yaml (dependency declaration)
├── values.yaml (production defaults)
├── values-dev.yaml (local overrides)
├── _helpers.tpl (shared functions)
└── Templates (per service)
    ├── sso-platform/ (deployment, service, configmap, secret)
    ├── api/ (deployment, service, configmap, secret)
    ├── mcp-server/ (deployment, service, configmap)
    └── web-dashboard/ (deployment, service, configmap)

↓

[Image Builds]
├── eval $(minikube docker-env)
├── docker build -t sso-platform:dev ./sso-platform
├── docker build -t api:dev ./packages/api
├── docker build -t mcp-server:dev ./packages/mcp-server
└── docker build -t web-dashboard:dev ./web-dashboard

↓

[Helm Deployment]
├── helm dependency update ./helm/taskflow  # Download Bitnami PostgreSQL
├── helm install taskflow ./helm/taskflow -f values-dev.yaml
└── Wait for all pods Running (max 5 minutes)

↓

[Validation]
├── kubectl get pods (verify Running)
├── kubectl get svc,ep (verify endpoints)
├── minikube service web-dashboard --url (browser access)
├── curl API health endpoint (verify HTTP 200)
└── kubectl logs (verify database connections)
```

### Phase Breakdown

#### Phase 1A: Helm Chart Structure (45 minutes)
**Deliverables**:
- Chart.yaml with Bitnami PostgreSQL dependency
- values.yaml with production defaults
- values-dev.yaml with local overrides
- _helpers.tpl with shared template functions

**Acceptance**:
- [ ] `helm lint ./helm/taskflow` passes
- [ ] `helm template taskflow ./helm/taskflow` renders valid YAML
- [ ] Chart.yaml dependency declared correctly

#### Phase 1B: Template Creation - Database (15 minutes)
**Deliverables**:
- No custom postgres templates (using Bitnami chart)
- values.yaml overrides for Bitnami chart (auth, persistence, resources)

**Acceptance**:
- [ ] Bitnami PostgreSQL chart downloads via `helm dependency update`
- [ ] values.yaml overrides match compose.yaml postgres configuration

#### Phase 1C: Template Creation - SSO Platform (30 minutes)
**Deliverables**:
- sso-platform/deployment.yaml (initContainer: wait-for-postgres)
- sso-platform/service.yaml (ClusterIP:3001)
- sso-platform/configmap.yaml (NODE_ENV, BETTER_AUTH_URL, ALLOWED_ORIGINS, DATABASE_URL)
- sso-platform/secret.yaml (BETTER_AUTH_SECRET, SMTP_PASS)

**Acceptance**:
- [ ] initContainer waits for postgres before starting
- [ ] Secret references exist in deployment envFrom
- [ ] Service exposes port 3001 as ClusterIP

#### Phase 1D: Template Creation - API (30 minutes)
**Deliverables**:
- api/deployment.yaml (initContainers: wait-for-postgres, wait-for-sso)
- api/service.yaml (ClusterIP:8000)
- api/configmap.yaml (SSO_URL, MCP_SERVER_URL, ALLOWED_ORIGINS, DEBUG, LOG_LEVEL)
- api/secret.yaml (OPENAI_API_KEY, DATABASE_URL password injection)

**Acceptance**:
- [ ] initContainers wait for both postgres and sso-platform
- [ ] Service exposes port 8000 as ClusterIP
- [ ] DATABASE_URL uses secretKeyRef for password

#### Phase 1E: Template Creation - MCP Server (20 minutes)
**Deliverables**:
- mcp-server/deployment.yaml (initContainer: wait-for-api)
- mcp-server/service.yaml (ClusterIP:8001)
- mcp-server/configmap.yaml (TASKFLOW_API_URL, TASKFLOW_MCP_HOST, TASKFLOW_MCP_PORT)

**Acceptance**:
- [ ] initContainer waits for api:8000 before starting
- [ ] Service exposes port 8001 as ClusterIP
- [ ] No secrets (MCP server uses API for auth)

#### Phase 1F: Template Creation - Web Dashboard (25 minutes)
**Deliverables**:
- web-dashboard/deployment.yaml (initContainers: wait-for-sso, wait-for-api)
- web-dashboard/service.yaml (NodePort:30000)
- web-dashboard/configmap.yaml (NEXT_PUBLIC_SSO_URL, NEXT_PUBLIC_API_URL, SERVER_API_URL, SERVER_SSO_URL)

**Acceptance**:
- [ ] initContainers wait for both sso-platform and api
- [ ] Service type is NodePort with fixed port 30000
- [ ] Both NEXT_PUBLIC_* (browser) and SERVER_* (server-side) URLs configured

#### Phase 1G: NOTES.txt and README-K8S.md (20 minutes)
**Deliverables**:
- NOTES.txt with post-install instructions
- README-K8S.md with setup, validation, and troubleshooting

**Acceptance**:
- [ ] NOTES.txt displays correct URLs after `helm install`
- [ ] README-K8S.md validation checklist is complete and testable
- [ ] Troubleshooting section covers top 3 failure modes

#### Phase 2: Image Builds (20 minutes)
**Steps**:
```bash
# 1. Start Minikube
minikube start --memory=6144 --cpus=3 --driver=docker

# 2. Point to Minikube Docker
eval $(minikube docker-env)

# 3. Build all images
docker build -t sso-platform:dev ./sso-platform
docker build -t api:dev ./packages/api
docker build -t mcp-server:dev ./packages/mcp-server
docker build -t web-dashboard:dev ./web-dashboard

# 4. Verify
docker images | grep -E "(sso-platform|api|mcp-server|web-dashboard)"
```

**Acceptance**:
- [ ] All 4 images built successfully
- [ ] Images visible in `docker images` output
- [ ] No build errors in logs

#### Phase 3: Helm Deployment (15 minutes)
**Steps**:
```bash
# 1. Download Bitnami PostgreSQL dependency
cd helm/taskflow
helm dependency update

# 2. Create secrets (if not in values-dev.yaml)
kubectl create secret generic taskflow-secrets \
  --from-literal=POSTGRES_PASSWORD=postgres \
  --from-literal=BETTER_AUTH_SECRET=your-secret \
  --from-literal=OPENAI_API_KEY=sk-your-key

# 3. Install Helm chart
helm install taskflow . -f values-dev.yaml

# 4. Watch deployment
kubectl get pods -w
```

**Acceptance**:
- [ ] Bitnami PostgreSQL chart downloaded to `charts/` directory
- [ ] `helm install` completes without errors
- [ ] All pods reach Running state within 5 minutes
- [ ] No CrashLoopBackOff or ImagePullBackOff errors

#### Phase 4: Validation (20 minutes)
**Steps**:
```bash
# 1. Pod Status
kubectl get pods -l app.kubernetes.io/name=taskflow
# All should be 1/1 Running

# 2. Service Endpoints
kubectl get svc,ep -l app.kubernetes.io/name=taskflow
# All services should have endpoints

# 3. Web Dashboard Access
minikube service web-dashboard --url
# Open URL in browser → Verify login page loads

# 4. API Health Check
curl $(minikube service api --url)/health
# Should return HTTP 200 with {"status": "healthy"}

# 5. Database Connection (API Logs)
kubectl logs -l app=api | grep -i "database"
# Should show "Database connection established"

# 6. MCP Server Health
curl $(minikube service mcp-server --url)/health
# Should return HTTP 200
```

**Acceptance**:
- [ ] All validation commands succeed
- [ ] Web dashboard accessible and functional
- [ ] API health endpoint returns 200
- [ ] Database connection confirmed in logs
- [ ] No error messages in pod logs

### Testing Checkpoints

**Checkpoint 1: Helm Chart Validity**
- Command: `helm lint ./helm/taskflow && helm template taskflow ./helm/taskflow -f values-dev.yaml > /tmp/rendered.yaml`
- Pass Criteria: No lint errors, valid YAML output

**Checkpoint 2: Image Availability**
- Command: `docker images | grep -E "(sso-platform|api|mcp-server|web-dashboard)"`
- Pass Criteria: All 4 images present with `dev` tag

**Checkpoint 3: Pod Startup**
- Command: `kubectl get pods -l app.kubernetes.io/name=taskflow`
- Pass Criteria: All pods reach Running state, no restarts

**Checkpoint 4: Service Connectivity**
- Command: `kubectl get svc,ep -l app.kubernetes.io/name=taskflow`
- Pass Criteria: All services have non-empty endpoint lists

**Checkpoint 5: External Access**
- Command: `minikube service web-dashboard --url`
- Pass Criteria: Browser displays login page without errors

**Checkpoint 6: Health Endpoints**
- Command: `curl $(minikube service api --url)/health`
- Pass Criteria: HTTP 200 with JSON response

## Integration Strategy

### Minikube Setup Requirements

**System Prerequisites**:
- **OS**: macOS, Linux, or Windows (with WSL2)
- **Memory**: 8GB minimum (6GB allocated to Minikube)
- **CPU**: 4 cores minimum (3 CPUs allocated to Minikube)
- **Disk**: 20GB free space
- **Docker Desktop**: 4.20+ (for Docker driver)

**Minikube Configuration**:
```bash
# 1. Start Minikube with required resources
minikube start \
  --memory=6144 \
  --cpus=3 \
  --driver=docker \
  --kubernetes-version=v1.28.0

# 2. Enable required addons
minikube addons enable metrics-server
minikube addons enable storage-provisioner

# 3. Verify cluster
kubectl cluster-info
kubectl get nodes
```

**Expected Output**:
```
minikube
  type: Control Plane
  host: Running
  kubelet: Running
  apiserver: Running
```

### Image Build Process

**Workflow** (detailed):
```bash
# Step 1: Configure Docker to use Minikube's daemon
eval $(minikube docker-env)

# Step 2: Verify Docker context
docker context ls
# Should show "default" pointing to Minikube

# Step 3: Build images sequentially (order doesn't matter)
echo "Building sso-platform..."
docker build -t sso-platform:dev ./sso-platform

echo "Building api..."
docker build -t api:dev ./packages/api

echo "Building mcp-server..."
docker build -t mcp-server:dev ./packages/mcp-server

echo "Building web-dashboard..."
docker build -t web-dashboard:dev ./web-dashboard

# Step 4: Verify all images
docker images | grep -E "(sso-platform|api|mcp-server|web-dashboard)" | grep dev

# Step 5: (Optional) Save image list for debugging
docker images --format "{{.Repository}}:{{.Tag}}" | grep dev > minikube-images.txt
```

**Build Optimization**:
- Use multi-stage Dockerfiles (already implemented in Phase III)
- Layer caching enabled by default in Minikube daemon
- Build in parallel using `&` (shell job control):
  ```bash
  docker build -t sso-platform:dev ./sso-platform &
  docker build -t api:dev ./packages/api &
  docker build -t mcp-server:dev ./packages/mcp-server &
  docker build -t web-dashboard:dev ./web-dashboard &
  wait  # Wait for all builds to complete
  ```

### Helm Deployment Workflow

**Step-by-Step Deployment**:
```bash
# 1. Navigate to Helm chart directory
cd /Users/mjs/Documents/code/mjunaidca/tf-k8/helm/taskflow

# 2. Download dependencies (Bitnami PostgreSQL)
helm dependency update
# Expected output: Downloaded postgresql-12.x.x to charts/ directory

# 3. Validate chart
helm lint .
# Expected: No errors, 0 chart(s) linted, 0 chart(s) failed

# 4. Dry-run to preview resources
helm install taskflow . -f values-dev.yaml --dry-run --debug > /tmp/helm-preview.yaml
# Review /tmp/helm-preview.yaml for correctness

# 5. Install chart
helm install taskflow . -f values-dev.yaml
# Expected: "STATUS: deployed"

# 6. Monitor deployment
kubectl get pods -w -l app.kubernetes.io/name=taskflow
# Watch until all pods reach Running (max 5 minutes)

# 7. Check Helm status
helm status taskflow
# Should show NOTES.txt instructions
```

**Troubleshooting Deployment**:
```bash
# Check pod status
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp' | head -20

# Check initContainer logs
kubectl logs <pod-name> -c <initContainer-name>

# Check main container logs
kubectl logs <pod-name>

# Delete and retry
helm uninstall taskflow
helm install taskflow ./helm/taskflow -f values-dev.yaml
```

### Validation Commands

**Complete Validation Script** (README-K8S.md will include this):
```bash
#!/bin/bash
set -e

echo "=== TaskFlow Kubernetes Validation ==="
echo

# 1. Check Minikube status
echo "1. Minikube Status"
minikube status
echo

# 2. Check pods
echo "2. Pod Status (should be 1/1 Running)"
kubectl get pods -l app.kubernetes.io/name=taskflow
echo

# 3. Check services and endpoints
echo "3. Services and Endpoints (all should have endpoints)"
kubectl get svc,ep -l app.kubernetes.io/name=taskflow
echo

# 4. Get web dashboard URL
echo "4. Web Dashboard URL"
WEB_URL=$(minikube service taskflow-web-dashboard --url)
echo "Web Dashboard: $WEB_URL"
echo "Opening in browser..."
open "$WEB_URL" || xdg-open "$WEB_URL" 2>/dev/null
echo

# 5. Test API health endpoint
echo "5. API Health Check"
API_URL=$(minikube service taskflow-api --url)
curl -s "$API_URL/health" | jq .
echo

# 6. Test MCP server health
echo "6. MCP Server Health Check"
MCP_URL=$(minikube service taskflow-mcp-server --url)
curl -s "$MCP_URL/health" | jq .
echo

# 7. Check database connection (from API logs)
echo "7. Database Connection (from API logs)"
kubectl logs -l app=api --tail=20 | grep -i "database\|connected"
echo

echo "=== Validation Complete ==="
echo "If all checks passed, deployment is successful!"
```

**Expected Success Output**:
```
=== TaskFlow Kubernetes Validation ===

1. Minikube Status
minikube
type: Control Plane
host: Running
kubelet: Running

2. Pod Status (should be 1/1 Running)
NAME                                    READY   STATUS    RESTARTS   AGE
taskflow-api-7d8f9c4b6-xk2lm           1/1     Running   0          3m
taskflow-mcp-server-6b9d8c5a7-qw3nm    1/1     Running   0          2m
taskflow-postgres-0                     1/1     Running   0          5m
taskflow-sso-platform-5c8e7d6f9-zx4pl  1/1     Running   0          4m
taskflow-web-dashboard-8f7a6b5c4-mn8qr 1/1     Running   0          2m

3. Services and Endpoints (all should have endpoints)
NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
service/taskflow-api         ClusterIP   10.96.123.45     <none>        8000/TCP         3m
service/taskflow-mcp-server  ClusterIP   10.96.234.56     <none>        8001/TCP         2m
service/taskflow-postgres    ClusterIP   10.96.12.34      <none>        5432/TCP         5m
service/taskflow-sso-platform ClusterIP  10.96.56.78      <none>        3001/TCP         4m
service/taskflow-web-dashboard NodePort  10.96.89.12      <none>        3000:30000/TCP   2m

NAME                           ENDPOINTS           AGE
endpoints/taskflow-api         172.17.0.5:8000     3m
endpoints/taskflow-mcp-server  172.17.0.7:8001     2m
endpoints/taskflow-postgres    172.17.0.3:5432     5m
endpoints/taskflow-sso-platform 172.17.0.4:3001    4m
endpoints/taskflow-web-dashboard 172.17.0.8:3000   2m

4. Web Dashboard URL
Web Dashboard: http://127.0.0.1:30000
Opening in browser...

5. API Health Check
{
  "status": "healthy",
  "database": "connected"
}

6. MCP Server Health Check
{
  "status": "healthy",
  "api_connection": "ok"
}

7. Database Connection (from API logs)
INFO: Database connection established
INFO: Connected to postgresql://postgres@postgres:5432/taskflow

=== Validation Complete ===
If all checks passed, deployment is successful!
```

## Risks & Mitigations

### R-001 (HIGH): Missing or Incomplete Dockerfiles
**Risk**: Dockerfiles might not exist or be incomplete, blocking image builds.

**Status**: ✅ **MITIGATED** — All Dockerfiles verified to exist via `Glob`:
- `/Users/mjs/Documents/code/mjunaidca/tf-k8/packages/api/Dockerfile`
- `/Users/mjs/Documents/code/mjunaidca/tf-k8/packages/mcp-server/Dockerfile`
- `/Users/mjs/Documents/code/mjunaidca/tf-k8/sso-platform/Dockerfile`
- `/Users/mjs/Documents/code/mjunaidca/tf-k8/web-dashboard/Dockerfile`

**Validation**: Sample Dockerfile (api) reviewed — multi-stage build with uv, Python 3.13-slim, non-root user, health check. Production-ready.

**Contingency**: If build fails, check Dockerfile context paths match `docker build` command.

---

### R-002 (MEDIUM): Minikube Resource Constraints
**Risk**: Minikube runs out of memory or CPU, causing pod evictions or startup failures.

**Mitigation**:
- **Requirement**: Minikube started with `--memory=6144 --cpus=3` (documented in README-K8S.md)
- **Resource Limits**: Each service has conservative limits (cpu: 500m, memory: 512Mi)
- **Monitoring**: README includes `kubectl top pods` command to check resource usage

**Detection**:
- Symptoms: Pods in `Pending` or `Evicted` state
- Command: `kubectl describe pod <pod-name>` → Look for "Insufficient memory" or "Insufficient cpu"

**Resolution**:
```bash
# Increase Minikube resources
minikube delete
minikube start --memory=8192 --cpus=4 --driver=docker
```

**Validation**: README-K8S.md prerequisites section warns users about minimum requirements.

---

### R-003 (MEDIUM): Service Startup Dependencies
**Risk**: Services crash before dependencies are ready (e.g., api starts before postgres).

**Mitigation**:
- **Implementation**: initContainers with TCP socket checks (nc -z <service> <port>)
- **Ordering**: Strict dependency graph enforced:
  - postgres readinessProbe → sso initContainer → api initContainer → mcp/web initContainers
- **Retry Logic**: initContainers loop with 2-second sleep until dependency is ready

**Detection**:
- Symptoms: CrashLoopBackOff, Init:Error pod status
- Command: `kubectl logs <pod-name> -c <initContainer-name>`

**Resolution**:
```bash
# Check initContainer logs
kubectl logs <pod-name> -c wait-for-postgres

# If dependency service is down, check that service first
kubectl get pods -l app=postgres
kubectl logs <postgres-pod>
```

**Validation**: Deployment logs (kubectl get pods -w) show staggered startup without restarts.

---

### R-004 (LOW): Bitnami PostgreSQL Chart Version Compatibility
**Risk**: Bitnami PostgreSQL chart version mismatch causes schema issues or startup failures.

**Mitigation**:
- **Version Constraint**: Chart.yaml specifies `version: ~12.0.0` (tilde range ensures patch updates only)
- **PostgreSQL Version**: Bitnami chart defaults to PostgreSQL 16 (matches compose.yaml)
- **Schema Compatibility**: No custom PostgreSQL extensions or schemas used (standard SQLModel tables)

**Detection**:
- Symptoms: Postgres pod CrashLoopBackOff, schema migration errors in API logs
- Command: `kubectl logs taskflow-postgres-0`

**Resolution**:
```bash
# Check Bitnami chart version
helm show chart bitnami/postgresql

# If incompatible, pin specific version in Chart.yaml:
# version: 12.1.9
helm dependency update
helm upgrade taskflow ./helm/taskflow -f values-dev.yaml
```

**Validation**: API logs show "Database connection established" without schema errors.

---

### R-005 (LOW): User Missing OPENAI_API_KEY
**Risk**: User deploys without OPENAI_API_KEY, breaking ChatKit functionality.

**Mitigation**:
- **Documentation**: README-K8S.md prerequisites section lists OPENAI_API_KEY as required
- **Validation**: Helm NOTES.txt reminds user to set secret before deployment
- **Graceful Degradation**: ChatKit features fail gracefully (frontend shows error, doesn't crash)

**Detection**:
- Symptoms: ChatKit returns 500 error, API logs show "OpenAI API key not configured"
- Command: `kubectl logs -l app=api | grep -i openai`

**Resolution**:
```bash
# Create/update secret
kubectl create secret generic taskflow-secrets \
  --from-literal=OPENAI_API_KEY=sk-your-key \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart API pod to pick up new secret
kubectl rollout restart deployment/taskflow-api
```

**Validation**: README-K8S.md includes "Optional: ChatKit Setup" section documenting this scenario.

---

## Architectural Decision Records (ADRs)

### ADR-001: Bitnami PostgreSQL Chart vs Custom Deployment
**Decision**: Use Bitnami PostgreSQL Helm chart as dependency instead of custom postgres deployment.

**Context**: Phase IV requires PostgreSQL deployment. Options:
1. Custom Deployment: Write our own StatefulSet, Service, PVC, initContainers
2. Bitnami Chart: Use production-tested chart with 1 dependency declaration

**Rationale**:
- **Complexity**: Bitnami chart handles StatefulSet, PVC, readinessProbe, credentials automatically
- **Maintenance**: Bitnami team maintains chart (security patches, version updates)
- **Best Practices**: Chart follows Kubernetes StatefulSet best practices (we'd need to research)
- **Time**: Custom deployment would add ~60 minutes to Phase IV timeline

**Consequences**:
- ✅ Faster implementation (5 lines in Chart.yaml vs 200+ lines of templates)
- ✅ Production-ready configuration out-of-box
- ✅ Easy upgrade path (helm dependency update)
- ⚠️ Dependency on external chart (mitigation: version pinning with ~12.0.0)
- ⚠️ Less control over postgres configuration (mitigation: values.yaml overrides)

**Status**: ✅ **ACCEPTED**

---

### ADR-002: initContainers vs readinessProbes for Service Ordering
**Decision**: Use **initContainers** for service dependency checks (not readinessProbes).

**Context**: Services have startup dependencies (api depends on postgres and sso). Options:
1. initContainers: Block pod startup until dependency is ready
2. readinessProbes: Mark service ready after dependency check

**Rationale**:
- **initContainers**: Enforce strict ordering (postgres must be ready before sso starts)
- **readinessProbes**: Used for load balancing (mark service ready for traffic), not dependency ordering
- **Failure Mode**: readinessProbe allows pod to start, then marks unready if dependency fails → CrashLoopBackOff
- **initContainer Failure Mode**: Pod stays in Init state until dependency ready → clean startup

**Implementation**:
```yaml
# initContainer approach (CHOSEN)
initContainers:
  - name: wait-for-postgres
    image: busybox:1.36
    command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 2; done']

# readinessProbe approach (REJECTED for dependencies)
readinessProbe:
  exec:
    command: ['sh', '-c', 'nc -z postgres 5432']
  # Problem: Main container starts before probe succeeds → crash
```

**Consequences**:
- ✅ Enforces strict startup ordering (postgres → sso → api → mcp → web)
- ✅ Clean failure mode (pod stays Init until dependency ready)
- ✅ No CrashLoopBackOff from missing dependencies
- ⚠️ Slightly longer startup (each initContainer runs sequentially)
- ⚠️ Requires busybox image (negligible size, 1MB)

**Status**: ✅ **ACCEPTED**

---

### ADR-003: Secret vs ConfigMap Classification Decision Tree
**Decision**: Use rule-based classification (FR-021) instead of manual classification.

**Context**: Environment variables from compose.yaml need classification. Options:
1. Manual: Developer decides per variable (error-prone, inconsistent)
2. Rule-based: Apply decision tree from spec FR-021

**Classification Rules** (from spec):
1. IF name matches `(PASSWORD|SECRET|API_KEY|TOKEN|PRIVATE_KEY|CREDENTIAL)` → Secret
2. ELSE IF value contains password in connection string → ConfigMap with secretKeyRef
3. ELSE IF name matches `(SMTP_PASS|EMAIL_PASS|DB_PASS)` → Secret
4. ELSE → ConfigMap

**Rationale**:
- **Consistency**: Same rules across all services
- **Security**: Catches all sensitive patterns automatically
- **Auditability**: Rules documented in spec, easy to verify

**Example Application**:
```yaml
# compose.yaml
POSTGRES_PASSWORD: postgres          # Rule 1 → Secret (PASSWORD in name)
BETTER_AUTH_SECRET: xyz              # Rule 1 → Secret (SECRET in name)
OPENAI_API_KEY: sk-xxx               # Rule 1 → Secret (API_KEY in name)
DATABASE_URL: postgresql://u:p@h/db  # Rule 2 → ConfigMap with secretKeyRef
SSO_URL: http://sso:3001             # Rule 4 → ConfigMap (no sensitive pattern)
```

**Consequences**:
- ✅ Automated classification (no manual decisions)
- ✅ Security-first (all sensitive data caught by rules)
- ✅ Easy to validate (grep environment variables, apply rules)
- ⚠️ Overly cautious (some non-sensitive vars might be Secrets, e.g., "MASTER_HOST")
- ⚠️ Requires documentation (README explains secretKeyRef pattern)

**Status**: ✅ **ACCEPTED**

---

### ADR-004: Local Minikube Docker Daemon vs External Registry
**Decision**: Build images using Minikube's Docker daemon (`eval $(minikube docker-env)`), no external registry.

**Context**: Phase IV requires Docker images. Options:
1. Minikube daemon: Build images in Minikube, use imagePullPolicy: Never
2. Local registry: Run registry container, push/pull images
3. External registry: Use Docker Hub, GHCR, etc.

**Rationale**:
- **Scope**: Phase IV is local deployment (no cloud requirement)
- **Speed**: No push/pull overhead, images immediately available
- **Simplicity**: No registry auth, no network transfers
- **Phase V Transition**: Phase V will use external registry (DigitalOcean)

**Implementation**:
```bash
# Set Docker to use Minikube's daemon
eval $(minikube docker-env)

# Build images (stored in Minikube's registry)
docker build -t api:dev ./packages/api

# Deploy with imagePullPolicy: Never
# (Kubernetes uses local image, no pull attempt)
```

**Consequences**:
- ✅ Fast iteration (rebuild → redeploy in seconds)
- ✅ No registry setup complexity
- ✅ No network dependency (works offline)
- ⚠️ Images lost on `minikube delete` (mitigation: rebuild script in README)
- ⚠️ Non-transferable (can't share images with other clusters)
- ⚠️ Phase V requires different workflow (mitigation: document in Phase V spec)

**Status**: ✅ **ACCEPTED** (for Phase IV only)

---

## Summary

Phase IV deploys TaskFlow to Minikube using Helm charts, building on Phase III's containerized services. All Dockerfiles exist, Bitnami PostgreSQL chart handles database complexity, initContainers enforce startup ordering, and configuration is externalized to Secrets/ConfigMaps. Validation via README-K8S.md checklist ensures deployment success. Total estimated time: **3 hours** (Helm chart creation: 2h 5m, Image builds: 20m, Deployment: 15m, Validation: 20m).

**Next Steps**:
1. Generate tasks.md via `/sp.tasks` command
2. Implement Helm chart templates (Phase 1A-1G)
3. Build images and deploy (Phase 2-3)
4. Validate and document (Phase 4)
5. Create PR with full deployment artifacts

**Key Success Metrics**:
- All 5 pods reach Running state within 5 minutes
- Web dashboard accessible via browser (minikube service)
- API and MCP health checks return HTTP 200
- README-K8S.md validation checklist passes 100%
