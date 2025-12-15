# Infrastructure Evolution Plan

**Status**: Approved
**Created**: 2025-12-15
**Target**: Q1 2025

---

## Executive Summary

Phased approach to evolve TaskFlow infrastructure for cloud migration (Azure → DOKS/Hetzner) and enable autonomous agent execution. Each phase builds on the previous, minimizing risk.

---

## Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Compute:     Azure AKS (2x B2s nodes)                          │
│  CD:          GitHub Actions → GHCR → Helm                      │
│  Ingress:     Traefik + cert-manager                            │
│  Pub/Sub:     Dapr + Upstash Redis                              │
│  Database:    Neon PostgreSQL (external, 4 databases)           │
│  Cache:       Upstash Redis (external)                          │
│  Secrets:     Kubernetes Secrets                                │
│                                                                  │
│  Services:                                                       │
│  ├── Web Dashboard (Next.js)                                    │
│  ├── SSO Platform (Better Auth)                                 │
│  ├── API (FastAPI)                                              │
│  ├── MCP Server (Python)                                        │
│  └── Notification Service (Dapr pub/sub consumer)               │
│                                                                  │
│  Monthly Cost: ~$85 (Azure) + ~$0 (Neon/Upstash free tiers)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                      TARGET INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Compute:     DOKS or Hetzner K8s (~$16-30/mo)                  │
│  CD:          GitHub Actions + Argo CD (GitOps)                 │
│  Ingress:     Traefik + cert-manager (unchanged)                │
│  Pub/Sub:     Dapr + Kafka (Strimzi, in-cluster)                │
│  Database:    Neon PostgreSQL (unchanged, external)             │
│  Cache:       Upstash Redis (unchanged, external)               │
│  Secrets:     Dapr Secrets (cloud-agnostic abstraction)         │
│                                                                  │
│  NEW Services:                                                   │
│  ├── Agent Scheduler (Dapr Actors)                              │
│  ├── Agent Workers (isolated containers)                        │
│  └── Provider Credential Vault                                  │
│                                                                  │
│  Monthly Cost: ~$16-30 (compute) + usage-based (Neon/Upstash)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Freeze (NOW)

**Duration**: Until migration
**Goal**: Don't break what works

### Actions
- [x] Current system stable and deployed
- [ ] Document current state (this document)
- [ ] No infrastructure changes until Phase 1

### Exit Criteria
- Production running stable
- All services healthy
- Ready to start Phase 1

---

## Phase 1: Cloud-Agnostic Foundation

**Duration**: 1 week
**Goal**: Prepare for painless cloud migration
**Trigger**: Start ~1 week before migration

### 1.1 Argo CD Setup

**Why**: GitOps for K8s state management. Cluster dies? `git clone` + `argocd sync` = back online.

```bash
# Install Argo CD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Repository Structure**:
```
infrastructure/
├── argocd/
│   ├── apps/
│   │   ├── taskflow.yaml        # Main app
│   │   ├── dapr-components.yaml # Dapr config
│   │   └── kafka.yaml           # Strimzi Kafka
│   └── projects/
│       └── taskflow.yaml        # Argo project definition
├── helm/
│   └── taskflow/                # Existing Helm chart
└── dapr/
    └── components/              # Dapr component YAMLs
```

**Argo Application**:
```yaml
# infrastructure/argocd/apps/taskflow.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: taskflow
  namespace: argocd
spec:
  project: taskflow
  source:
    repoURL: https://github.com/mjunaidca/taskflow
    targetRevision: main
    path: infrastructure/helm/taskflow
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: taskflow
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### 1.2 Dapr Secrets Component

**Why**: Abstract secret storage. Change backend without code changes.

```yaml
# infrastructure/dapr/components/secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-secrets
  namespace: taskflow
spec:
  type: secretstores.kubernetes
  version: v1
  metadata:
    - name: namespace
      value: taskflow
```

**Migration Path** (later, if needed):
```yaml
# Swap to Vault without code changes
spec:
  type: secretstores.hashicorp.vault
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
```

**Application Code** (provider-agnostic):
```python
# Works with any Dapr secret store backend
async with DaprClient() as client:
    secret = await client.get_secret(
        store_name="taskflow-secrets",
        key="provider-credentials/claude"
    )
```

### 1.3 Migration Checklist

Before switching clusters:
- [ ] Argo CD installed and configured
- [ ] All manifests in Git (GitOps ready)
- [ ] Dapr secrets component configured
- [ ] Test deploy to new cluster
- [ ] DNS TTL lowered (for quick switchover)
- [ ] Rollback plan documented

### Exit Criteria
- Argo CD managing all deployments
- Secrets accessed via Dapr (not direct K8s)
- Can deploy to new cluster in <30 minutes

---

## Phase 2: Messaging Upgrade

**Duration**: 1-2 weeks
**Goal**: Production-ready event streaming for agents
**Trigger**: After successful cloud migration

### 2.1 Strimzi Kafka Operator

**Why**: Kafka on K8s done right. Handles upgrades, scaling, monitoring.

```bash
# Install Strimzi operator
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

# Wait for operator
kubectl wait --for=condition=ready pod -l name=strimzi-cluster-operator -n kafka --timeout=300s
```

### 2.2 Kafka Cluster Definition

```yaml
# infrastructure/kafka/cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: taskflow-kafka
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: persistent-claim
      size: 10Gi
      class: standard  # Adjust for DOKS/Hetzner
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 5Gi
      class: standard
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### 2.3 Agent Event Topics

```yaml
# infrastructure/kafka/topics.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: task-lifecycle
  namespace: kafka
  labels:
    strimzi.io/cluster: taskflow-kafka
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 604800000  # 7 days
    cleanup.policy: delete
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: agent-events
  namespace: kafka
  labels:
    strimzi.io/cluster: taskflow-kafka
spec:
  partitions: 12  # Higher for agent parallelism
  replicas: 3
  config:
    retention.ms: 2592000000  # 30 days (audit trail)
    cleanup.policy: delete
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: agent-audit
  namespace: kafka
  labels:
    strimzi.io/cluster: taskflow-kafka
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 7776000000  # 90 days
    cleanup.policy: compact  # Keep latest per key
```

### 2.4 Dapr Pub/Sub Swap (Redis → Kafka)

```yaml
# infrastructure/dapr/components/pubsub-kafka.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: taskflow-pubsub
  namespace: taskflow
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "taskflow-kafka-kafka-bootstrap.kafka:9092"
    - name: consumerGroup
      value: "taskflow"
    - name: authType
      value: "none"  # Internal cluster, TLS optional
    - name: initialOffset
      value: "oldest"
    - name: maxMessageBytes
      value: "1048576"  # 1MB
```

### 2.5 Keep Redis for Cache/Rate-Limiting

Redis (Upstash) stays for:
- Rate limiting (SSO, API)
- Session cache
- Dapr state store (fast access)

Kafka handles:
- Event streaming (pub/sub)
- Agent lifecycle events
- Audit trail

### Exit Criteria
- Strimzi Kafka running (3 brokers)
- Dapr pub/sub using Kafka
- Existing notification service working with Kafka
- Event replay tested

---

## Phase 3: Agent Cloud Execution

**Duration**: 6-8 weeks (see AGENT-CLOUD-EXECUTION.md)
**Goal**: Autonomous AI agents in isolated containers
**Trigger**: After Phase 2 complete

### 3.1 Provider Integration (Week 1-2)

From: `docs/design/BYOK-PROVIDER-STRATEGY.md`

- [ ] Provider credentials vault (Dapr secrets)
- [ ] OAuth flow (Gemini)
- [ ] API key flow (Claude, OpenAI, Qwen)
- [ ] Key validation and testing
- [ ] Settings UI for provider management

### 3.2 Dapr Agent Orchestration (Week 2-3)

From: `docs/design/DAPR-AGENT-ORCHESTRATION.md`

- [ ] Agent lifecycle events (Kafka topics)
- [ ] Dapr Actors for agent state
- [ ] Agent scheduler service
- [ ] Event handlers

### 3.3 Single-Agent Execution (Week 3-5)

From: `docs/design/AGENT-CLOUD-EXECUTION.md` Phase 3

- [ ] Container spawning (K8s Jobs or Pods)
- [ ] Agent runtime image
- [ ] Unified provider client
- [ ] Progress tracking
- [ ] Audit sidecar

### 3.4 Multi-Agent & Cost Controls (Week 5-8)

From: `docs/design/AGENT-CLOUD-EXECUTION.md` Phase 4-5

- [ ] Subtask creation
- [ ] Agent-to-agent delegation
- [ ] Cost limits and budgets
- [ ] Loop detection
- [ ] Security hardening

### Exit Criteria
- Users can connect AI providers (BYOK)
- Tasks assignable to agents
- Agents execute autonomously
- Full audit trail
- Cost controls enforced

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Migration downtime | GitOps + low DNS TTL = <5 min switchover |
| Kafka complexity | Strimzi operator handles operations |
| Agent runaway costs | Hard limits enforced by platform, not agents |
| Provider API changes | Unified client abstracts providers |
| Data loss during migration | External databases (Neon) unchanged |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-15 | Argo CD for GitOps | Cloud-agnostic deployment, easy migration |
| 2025-12-15 | Strimzi for Kafka | Operator pattern, K8s native, handles complexity |
| 2025-12-15 | Keep Upstash Redis | Already working for cache/rate-limit, no need to change |
| 2025-12-15 | Dapr Secrets abstraction | Decouple from K8s secrets, future Vault option |
| 2025-12-15 | Phased approach | Don't break production, layer improvements |

---

## Related Documents

- [AGENT-CLOUD-EXECUTION.md](./AGENT-CLOUD-EXECUTION.md) - Full agent feature design
- [DAPR-AGENT-ORCHESTRATION.md](./DAPR-AGENT-ORCHESTRATION.md) - Dapr event architecture
- [BYOK-PROVIDER-STRATEGY.md](./BYOK-PROVIDER-STRATEGY.md) - Multi-provider integration
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Current deployment guide
- [../dapr-setup.md](../dapr-setup.md) - Existing Dapr configuration

---

## Commands Reference

### Phase 1: Argo CD
```bash
# Install
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# CLI login
argocd login localhost:8080

# Create app from Git
argocd app create taskflow --repo https://github.com/mjunaidca/taskflow --path infrastructure/helm/taskflow --dest-server https://kubernetes.default.svc --dest-namespace taskflow
```

### Phase 2: Strimzi Kafka
```bash
# Install operator
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

# Deploy cluster
kubectl apply -f infrastructure/kafka/cluster.yaml -n kafka

# Check status
kubectl get kafka -n kafka
kubectl get pods -n kafka

# Get bootstrap server
kubectl get kafka taskflow-kafka -n kafka -o jsonpath='{.status.listeners[0].bootstrapServers}'
```

### Migration
```bash
# DOKS
doctl kubernetes cluster kubeconfig save <cluster-name>

# Hetzner
export KUBECONFIG=~/.kube/hetzner-config

# Verify
kubectl get nodes
kubectl get pods -n taskflow
```
