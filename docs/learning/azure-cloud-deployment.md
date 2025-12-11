# Azure Cloud Deployment - Learning Journey

**Date:** December 2024
**Goal:** Deploy TaskFlow (5 microservices) to Azure Kubernetes Service (AKS)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Azure Concepts Learned](#azure-concepts-learned)
3. [Cost Analysis](#cost-analysis)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Hetzner Migration Path](#hetzner-migration-path)

---

## Architecture Overview

### What We're Deploying

```
                         INTERNET
                             │
                             ▼
                    ┌─────────────────┐
                    │  Load Balancer  │  (1 Public IP)
                    │     $18/mo      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  nginx-ingress  │  (Routes by subdomain)
                    │      Free       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │   Web    │        │   SSO    │        │   MCP    │
  │  PUBLIC  │        │  PUBLIC  │        │  PUBLIC  │
  │ app.dom  │        │ sso.dom  │        │ mcp.dom  │
  └────┬─────┘        └──────────┘        └────┬─────┘
       │                                       │
       │              ┌──────────┐             │
       └──────────────►   API    ◄─────────────┘
                      │ INTERNAL │
                      └────┬─────┘
                           │
                    ┌──────▼──────┐
                    │ Notification │
                    │  INTERNAL    │
                    │   (Dapr)     │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │    Neon     │           │   Upstash   │
      │ (Postgres)  │           │   (Redis)   │
      │  EXTERNAL   │           │  EXTERNAL   │
      └─────────────┘           └─────────────┘
```

### Service Exposure

| Service | Public? | Subdomain | Why |
|---------|---------|-----------|-----|
| Web | ✅ Yes | app.domain.com | Users access dashboard |
| SSO | ✅ Yes | sso.domain.com | OAuth redirects need public URL |
| MCP | ✅ Yes | mcp.domain.com | External AI agents connect here |
| API | ❌ No | Internal only | Only Web/MCP call it |
| Notification | ❌ No | Internal only | Only Dapr triggers it |

---

## Azure Concepts Learned

### 1. Resource Providers

Before using any Azure service, you must **register** it for your subscription.

```bash
# Check if registered
az provider show --namespace Microsoft.ContainerService --query "registrationState"

# Register if needed (free, takes 1-2 min)
az provider register --namespace Microsoft.ContainerService
```

**Common providers:**
- `Microsoft.ContainerService` - AKS (Kubernetes)
- `Microsoft.Compute` - VMs
- `Microsoft.ContainerRegistry` - ACR (image registry)
- `Microsoft.Network` - Load balancers, IPs

### 2. Resource Groups

A "folder" to organize related resources. All resources in a group can be deleted together.

```bash
az group create --name taskflow-rg --location eastus
```

### 3. AKS (Azure Kubernetes Service)

Managed Kubernetes - Azure handles the control plane, you pay for worker nodes.

```bash
az aks create \
  --resource-group taskflow-rg \
  --name taskflow-cluster \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys
```

**Flags explained:**

| Flag | Purpose |
|------|---------|
| `--node-count 2` | Number of VMs (workers) |
| `--node-vm-size Standard_B2s` | VM size (2 vCPU, 4GB RAM) |
| `--enable-managed-identity` | Azure handles auth |
| `--generate-ssh-keys` | For node access if needed |

### 4. Nodes vs Pods

```
┌─────────────────────────────────────────────────────────┐
│  Node (VM) - What you pay for                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Pod 1  │  │  Pod 2  │  │  Pod 3  │  │  Pod 4  │    │
│  │  (Web)  │  │  (API)  │  │  (SSO)  │  │  (MCP)  │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                         │
│  Kubernetes schedules pods across nodes automatically   │
└─────────────────────────────────────────────────────────┘
```

- **Node** = VM you rent (B2s = ~$30/mo each)
- **Pod** = Container running your app
- **Kubernetes** = Decides which pod runs on which node

### 5. Ingress vs LoadBalancer

**Without Ingress (expensive):**
```
Each service gets its own LoadBalancer ($18 each)
5 services × $18 = $90/month
```

**With Ingress (smart):**
```
1 LoadBalancer → Ingress Controller → Routes by domain
$18 total for all services
```

### 6. Dapr Sidecars

Dapr adds a helper container next to your app for messaging:

```
┌─────────────────────────┐
│  Pod                    │
│  ┌───────┐  ┌────────┐  │
│  │  App  │◄─►│ Dapr   │  │  ← Sidecar (~50MB RAM)
│  │       │  │Sidecar │  │
│  └───────┘  └────────┘  │
└─────────────────────────┘
```

Dapr handles pub/sub to Upstash Redis for notifications.

---

## Cost Analysis

### Azure Costs (Current Setup)

| Resource | Monthly Cost | Notes |
|----------|-------------|-------|
| 2x B2s Nodes | $60 | 2 vCPU, 4GB each |
| Load Balancer | $18 | For ingress |
| Public IP | $3 | Static IP |
| Egress | ~$5 | Data out (first 5GB free) |
| **Total** | **~$85/mo** | |

### Free Credits Strategy

- **$200 credits** expire in 30 days
- ~$85/mo cost = **plenty of runway**
- Use time to validate product, then migrate to cheaper hosting

### Traffic Capacity

| Metric | 2-Node Capacity |
|--------|-----------------|
| Concurrent users | ~100-200 |
| Requests/second | ~50-100 |
| Monthly pageviews | ~500K-1M |
| MCP connections | ~20-50 concurrent |

---

## Step-by-Step Deployment

### Prerequisites

1. Azure CLI installed and logged in
2. `kubectl` installed
3. `helm` installed
4. Domain with DNS access
5. Neon database URLs in `.env.prod`
6. Upstash Redis credentials in `.env.prod`

### Step 1: Register Provider

```bash
az provider register --namespace Microsoft.ContainerService
az provider show --namespace Microsoft.ContainerService --query "registrationState"
# Wait for "Registered"
```

### Step 2: Create Resource Group

```bash
az group create --name taskflow-rg --location eastus
```

### Step 3: Create AKS Cluster

```bash
az aks create \
  --resource-group taskflow-rg \
  --name taskflow-cluster \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys
```

Takes 3-5 minutes. Watch in Portal: Kubernetes services → taskflow-cluster

### Step 4: Get Credentials

```bash
az aks get-credentials --resource-group taskflow-rg --name taskflow-cluster
kubectl get nodes  # Verify connection
```

### Step 5: Install Dapr

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update
helm install dapr dapr/dapr --namespace dapr-system --create-namespace --wait
```

### Step 6: Install Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

### Step 7: Build & Push Images to GHCR

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and push each image
docker build -t ghcr.io/USERNAME/taskflow/api:latest ./apps/api
docker push ghcr.io/USERNAME/taskflow/api:latest
# Repeat for sso, web, mcp-server, notification-service
```

### Step 8: Deploy with Helm

```bash
helm upgrade --install taskflow ./infrastructure/helm/taskflow \
  --namespace taskflow \
  --create-namespace \
  --values infrastructure/helm/taskflow/values-cloud.yaml \
  --set "managedServices.neon.ssoDatabase=$NEON_SSO_DATABASE_URL" \
  --set "managedServices.neon.apiDatabase=$NEON_API_DATABASE_URL" \
  # ... other secrets
```

### Step 9: Configure DNS

Get the LoadBalancer IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Add DNS A records:
```
app.yourdomain.com  → <IP>
sso.yourdomain.com  → <IP>
mcp.yourdomain.com  → <IP>
```

### Step 10: Verify

```bash
kubectl get pods -n taskflow
kubectl get ingress -n taskflow
curl https://app.yourdomain.com/health
```

---

## Hetzner Migration Path

### Why Hetzner?

| Aspect | Azure | Hetzner |
|--------|-------|---------|
| 2 VMs (2 vCPU, 4GB) | $60/mo | $10/mo |
| Load Balancer | $18/mo | $6/mo |
| Egress | $0.087/GB | Free (20TB) |
| **Total** | ~$85/mo | ~$16/mo |
| **Savings** | - | **80%** |

### Migration Is Easy Because

We chose vendor-agnostic services:
- **GHCR** (not Azure ACR) → Same images work anywhere
- **Neon** (not Azure Postgres) → No database migration
- **Upstash** (not Azure Redis) → No cache migration
- **Helm charts** → Same deployment method

### Hetzner Setup (Future)

```bash
# 1. Create 2 VMs on Hetzner Cloud (CX22)
# 2. Install K3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -

# 3. Copy kubeconfig to local machine
# 4. Install Dapr + Ingress (same as Azure)
# 5. Deploy with same Helm chart
helm upgrade --install taskflow ./infrastructure/helm/taskflow ...

# 6. Update DNS to Hetzner IP
```

**Estimated migration time: 2-4 hours**

---

## Key Takeaways

1. **Resource Providers** must be registered before first use
2. **Ingress saves money** - 1 LoadBalancer for all services
3. **Managed services (Neon, Upstash)** = vendor-agnostic flexibility
4. **GHCR over ACR** = easy migration later
5. **Dapr works in any K8s** - not Azure-specific
6. **Start expensive (Azure credits), migrate cheap (Hetzner)**

---

## Commands Reference

```bash
# Azure CLI
az login
az account show
az provider register --namespace Microsoft.ContainerService
az group create --name taskflow-rg --location eastus
az aks create --resource-group taskflow-rg --name taskflow-cluster ...
az aks get-credentials --resource-group taskflow-rg --name taskflow-cluster

# Kubernetes
kubectl get nodes
kubectl get pods -n taskflow
kubectl get svc -n taskflow
kubectl logs -n taskflow <pod-name>

# Helm
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr --namespace dapr-system --create-namespace
helm upgrade --install taskflow ./infrastructure/helm/taskflow --namespace taskflow

# Cleanup (when done with Azure)
az group delete --name taskflow-rg --yes --no-wait
```
