# Skill: Hetzner K3s Cluster Manager

> **Purpose:** Manage the Hetzner CAX31 K3s cluster for TaskFlow and related projects
> **When to use:** Any task involving deployment, debugging, scaling, or monitoring on the Hetzner VPS

## Cluster Identity

```yaml
Server:
  hostname: junaid-k8-lab
  ip: 46.224.224.56
  ssh: root@46.224.224.56
  specs: CAX31 ARM64 | 8 vCPU | 16GB RAM | 160GB SSD
  cost: $13.49/mo
  provider: Hetzner Cloud

Kubernetes:
  distribution: K3s v1.34.3
  kubeconfig_local: ~/.kube/config-hetzner
  kubeconfig_server: /etc/rancher/k3s/k3s.yaml
  ingress: Traefik (built-in)
  load_balancer: ServiceLB (built-in, no cost)

Domain: avixato.com
  subdomains:
    - avixato.com (web-dashboard)
    - sso.avixato.com (sso-platform)
    - api.avixato.com (taskflow-api)
    - mcp.avixato.com (mcp-server)
```

## Quick Access Commands

```bash
# Always prefix with KUBECONFIG or export it
export KUBECONFIG=~/.kube/config-hetzner

# Or prefix each command
KUBECONFIG=~/.kube/config-hetzner kubectl get pods -A
```

## Installed Components

| Component | Namespace | Purpose | Version |
|-----------|-----------|---------|---------|
| K3s | - | Kubernetes distribution | v1.34.3 |
| Traefik | kube-system | Ingress controller | bundled |
| ServiceLB | kube-system | Load balancer (host ports) | bundled |
| CoreDNS | kube-system | Cluster DNS | bundled |
| Dapr | dapr-system | Pub/sub, state, workflows | v1.15.13 |
| cert-manager | cert-manager | Auto SSL via Let's Encrypt | v1.14.0 |

## Namespaces & Applications

### taskflow (Production App)
```
Pods:
  - sso-platform (Better Auth SSO)
  - taskflow-api (FastAPI + Dapr sidecar)
  - web-dashboard (Next.js 15)
  - mcp-server (FastMCP)
  - notification-service (FastAPI + Dapr sidecar)

Resources:
  CPU Requests: 450m | Limits: 2250m
  Memory Requests: 1152Mi | Limits: 2304Mi
```

## External Managed Services

### Neon PostgreSQL (Free Tier)
```yaml
console: https://console.neon.tech
databases:
  - sso-v1 (SSO users, sessions)
  - api-v1 (Tasks, projects, workers)
  - chatkit-v1 (Chat conversations)
  - notify-v1 (Notifications, reminders)
connection: Use pooler endpoint with ?sslmode=require
```

### Upstash Redis (Free Tier)
```yaml
console: https://console.upstash.com
host: refined-ant-42302.upstash.io:6379
tls: Required (enableTLS: "true")
usage: Dapr pub/sub messaging
```

## GitHub Actions Integration

### Repository: mjunaidca/taskforce

**Secrets (sensitive):**
| Secret | Purpose |
|--------|---------|
| KUBECONFIG | Base64 K3s kubeconfig |
| UPSTASH_REDIS_HOST | Redis host:port |
| UPSTASH_REDIS_PASSWORD | Redis password |
| NEON_SSO_DATABASE_URL | SSO PostgreSQL |
| NEON_API_DATABASE_URL | API PostgreSQL |
| NEON_CHATKIT_DATABASE_URL | ChatKit PostgreSQL |
| NEON_NOTIFICATION_DATABASE_URL | Notification PostgreSQL |
| OPENAI_API_KEY | AI agent responses |
| BETTER_AUTH_SECRET | SSO encryption |
| SMTP_USER / SMTP_PASSWORD | Email sending |

**Variables (non-sensitive):**
| Variable | Value |
|----------|-------|
| CLOUD_PROVIDER | kubeconfig |
| INGRESS_CLASS | traefik |
| DOMAIN | avixato.com |

## Common Operations

### Check Cluster Health
```bash
# Node status
KUBECONFIG=~/.kube/config-hetzner kubectl get nodes

# All pods across namespaces
KUBECONFIG=~/.kube/config-hetzner kubectl get pods -A

# Resource usage
KUBECONFIG=~/.kube/config-hetzner kubectl top nodes
KUBECONFIG=~/.kube/config-hetzner kubectl top pods -A
```

### Check TaskFlow Status
```bash
# Pods
KUBECONFIG=~/.kube/config-hetzner kubectl get pods -n taskflow

# Logs
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n taskflow deployment/taskflow-api -c api --tail=100
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n taskflow deployment/sso-platform --tail=100

# SSL Certificates
KUBECONFIG=~/.kube/config-hetzner kubectl get certificates -n taskflow
```

### Restart Services
```bash
# Restart a deployment (picks up new secrets/configmaps)
KUBECONFIG=~/.kube/config-hetzner kubectl rollout restart deployment/taskflow-api -n taskflow

# Restart all TaskFlow deployments
KUBECONFIG=~/.kube/config-hetzner kubectl rollout restart deployment -n taskflow
```

### View Logs for Debugging
```bash
# API errors
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n taskflow deployment/taskflow-api -c api --tail=200 | grep -i error

# Dapr sidecar logs
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n taskflow deployment/taskflow-api -c daprd --tail=100

# SSO logs
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n taskflow deployment/sso-platform --tail=200
```

### Scale Deployments
```bash
# Scale up
KUBECONFIG=~/.kube/config-hetzner kubectl scale deployment/taskflow-api -n taskflow --replicas=2

# Scale down
KUBECONFIG=~/.kube/config-hetzner kubectl scale deployment/taskflow-api -n taskflow --replicas=1
```

### Helm Operations
```bash
# List releases
KUBECONFIG=~/.kube/config-hetzner helm list -n taskflow

# Upgrade/redeploy
KUBECONFIG=~/.kube/config-hetzner helm upgrade taskflow ./infrastructure/helm/taskflow \
  -n taskflow -f infrastructure/helm/taskflow/values-hetzner.yaml \
  --set "api.openai.apiKey=$OPENAI_API_KEY" \
  # ... other --set flags

# Uninstall (CAREFUL!)
KUBECONFIG=~/.kube/config-hetzner helm uninstall taskflow -n taskflow
```

## Deploying New Projects

### Step 1: Create Namespace
```bash
KUBECONFIG=~/.kube/config-hetzner kubectl create namespace <project-name>
```

### Step 2: Create GHCR Pull Secret
```bash
KUBECONFIG=~/.kube/config-hetzner kubectl create secret docker-registry ghcr-secret \
  --namespace <project-name> \
  --docker-server=ghcr.io \
  --docker-username=<github-user> \
  --docker-password=$(gh auth token)
```

### Step 3: Configure Ingress (Traefik + cert-manager)
```yaml
ingress:
  enabled: true
  className: traefik  # MUST be traefik, not nginx
  host: myapp.avixato.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    enabled: true
    secretName: myapp-tls
```

### Step 4: Add DNS Record
Add A record: `myapp.avixato.com` → `46.224.224.56`

### Step 5: Cross-Namespace SSO Access
```yaml
env:
  SSO_URL: http://sso-platform.taskflow.svc.cluster.local:3001
```

## Resource Capacity

```
Total:     8000m CPU | 16384Mi Memory
Used:       ~250m CPU | ~1800Mi Memory (3% | 11%)
Available: ~7750m CPU | ~14500Mi Memory

Estimate: Can fit 8-10 more TaskFlow-sized projects
```

## Troubleshooting Playbook

### Pod Not Starting
```bash
# Check events
KUBECONFIG=~/.kube/config-hetzner kubectl describe pod <pod> -n <ns>

# Common causes:
# - ImagePullBackOff: GHCR secret missing or wrong
# - CrashLoopBackOff: Check logs, likely env var or DB connection
# - Pending: Resource limits exceeded
```

### SSL Certificate Not Issuing
```bash
# Check cert-manager
KUBECONFIG=~/.kube/config-hetzner kubectl logs -n cert-manager deploy/cert-manager

# Check challenges
KUBECONFIG=~/.kube/config-hetzner kubectl get challenges -A
KUBECONFIG=~/.kube/config-hetzner kubectl describe challenge <name> -n <ns>

# Common causes:
# - DNS not pointing to 46.224.224.56
# - Wrong ingress class (must be traefik)
# - Rate limited by Let's Encrypt
```

### Dapr Sidecar Issues
```bash
# Check Dapr system
KUBECONFIG=~/.kube/config-hetzner kubectl get pods -n dapr-system

# Check component
KUBECONFIG=~/.kube/config-hetzner kubectl get components -n taskflow

# Common causes:
# - Redis connection failed (check Upstash host/password)
# - Component misconfigured
```

### Service Unreachable
```bash
# Test from inside cluster
KUBECONFIG=~/.kube/config-hetzner kubectl run curl --rm -it --image=curlimages/curl -- \
  curl http://taskflow-api.taskflow.svc.cluster.local:8000/health

# Check service endpoints
KUBECONFIG=~/.kube/config-hetzner kubectl get endpoints -n taskflow
```

## SSH Server Access

```bash
# Direct SSH
ssh root@46.224.224.56

# On server, use K3s kubectl
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get pods -A

# Server-side Helm (if needed)
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
helm list -A
```

## Backup & Recovery

### Get Current State
```bash
# Export all resources
KUBECONFIG=~/.kube/config-hetzner kubectl get all -n taskflow -o yaml > taskflow-backup.yaml

# Export secrets (sensitive!)
KUBECONFIG=~/.kube/config-hetzner kubectl get secrets -n taskflow -o yaml > taskflow-secrets.yaml
```

### Restore (if needed)
```bash
# Reapply resources
KUBECONFIG=~/.kube/config-hetzner kubectl apply -f taskflow-backup.yaml
```

## Maintenance

### Update Dapr
```bash
KUBECONFIG=~/.kube/config-hetzner helm repo update
KUBECONFIG=~/.kube/config-hetzner helm upgrade dapr dapr/dapr -n dapr-system
```

### Update cert-manager
```bash
KUBECONFIG=~/.kube/config-hetzner kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

### K3s Updates (on server)
```bash
ssh root@46.224.224.56
curl -sfL https://get.k3s.io | sh -
```

## Cost Tracking

| Item | Monthly Cost |
|------|-------------|
| Hetzner CAX31 | $13.49 |
| Neon PostgreSQL | $0 (free tier) |
| Upstash Redis | $0 (free tier) |
| Domain (avixato.com) | ~$1 (amortized) |
| **Total** | **~$14.50/mo** |

---

## When User Asks About Hetzner/K3s/Deployment

1. **Always use** `KUBECONFIG=~/.kube/config-hetzner` prefix
2. **Check pods first** - most issues show in pod status
3. **Check logs** - errors are usually in container logs
4. **Ingress = traefik** - never nginx on this cluster
5. **SSL = cert-manager** - with letsencrypt-prod issuer
6. **Secrets via GitHub Actions** - never hardcode in values files
