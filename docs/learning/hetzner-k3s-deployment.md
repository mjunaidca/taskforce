# Hetzner K3s Deployment - Learning Guide

> **Target:** Deploy TaskFlow platform to Hetzner CAX31 ARM64 server with K3s
> **Cost:** ~$13.49/mo (vs ~$85-150/mo on Azure)
> **Difficulty:** Intermediate

## Table of Contents

1. [Decision: Manual Setup](#decision-manual-setup)
2. [How Current GitHub Images Work](#how-current-github-images-work)
3. [Changes Needed for Hetzner](#changes-needed-for-hetzner)
4. [Step-by-Step Learning Path](#step-by-step-learning-path)
5. [Verification Checklist](#verification-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Decision: Manual Setup

### Why Manual Over Automation Tools

| Factor | Manual | hetzner-k3s | kube-hetzner |
|--------|--------|-------------|--------------|
| **Server already exists** | Use it | Creates new | Creates new |
| **Single node** | Simple | Multi-node focused | Multi-node focused |
| **Learning value** | High | Medium | Low |
| **Extra costs** | $0 | +$6/mo (LB) | +$6/mo (LB) |
| **Complexity** | Low | Medium | High (Terraform) |

**Verdict**: Manual setup is best for single-node learning deployment.

### Tools Considered

1. **[hetzner-k3s](https://github.com/vitobotta/hetzner-k3s)** - Ruby CLI that creates K3s clusters
   - Automatically provisions Hetzner Load Balancer ($6/mo)
   - Best for multi-node production clusters

2. **[kube-hetzner](https://github.com/kube-hetzner/terraform-hcloud-kube-hetzner)** - Terraform module
   - Most feature-rich but complex
   - Creates private networks, firewalls, load balancers
   - Overkill for single-node learning

3. **Manual Installation** (Selected)
   - Reuse existing CAX31 server
   - Use K3s built-in Traefik (no load balancer cost)
   - Full control and maximum learning

---

## How Current GitHub Images Work

### Image Registry & Tags

```
Registry: ghcr.io/mjunaidca/taskflow
Images:
  - ghcr.io/mjunaidca/taskflow/api:latest
  - ghcr.io/mjunaidca/taskflow/sso:latest
  - ghcr.io/mjunaidca/taskflow/web:latest
  - ghcr.io/mjunaidca/taskflow/mcp:latest
  - ghcr.io/mjunaidca/taskflow/notification:latest
```

### Build Architecture

- **Platform**: `linux/arm64` only (perfect for CAX31)
- **No x86 support** - images won't run on Intel/AMD servers

### Build-Time Variables (Baked Into Images)

These are set during `docker build` and **CANNOT** be changed at runtime:

**SSO Image** (build-args in deploy.yml):
```dockerfile
NEXT_PUBLIC_BETTER_AUTH_URL=https://sso.${DOMAIN}
NEXT_PUBLIC_CONTINUE_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_NAME=Taskflow SSO
```

**Web Image** (build-args in deploy.yml):
```dockerfile
NEXT_PUBLIC_SSO_URL=https://sso.${DOMAIN}
NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://${DOMAIN}/api/auth/callback
NEXT_PUBLIC_CHATKIT_DOMAIN_KEY=${CHATKIT_DOMAIN_KEY}
```

### Important: Domain is Baked In

Current images were built for `avixato.com`, containing:
- `NEXT_PUBLIC_SSO_URL=https://sso.avixato.com`
- `NEXT_PUBLIC_API_URL=https://api.avixato.com`

**To use a different domain**: Must rebuild images with new build-args via GitHub Actions.

---

## Changes Needed for Hetzner

### Using Same Domain (avixato.com) - RECOMMENDED

Since we're keeping `avixato.com`:
- **No image rebuild needed** - GHCR images already have correct URLs baked in
- **No code changes** - Helm charts work as-is
- **Just update**:
  1. DNS A records → point to Hetzner IP (46.224.224.56)
  2. GitHub secret `KUBECONFIG` → base64 of K3s kubeconfig
  3. GitHub variable `CLOUD_PROVIDER` → `kubeconfig`

### Migration Checklist

| Item | Action | Where |
|------|--------|-------|
| DNS A records | Point to 46.224.224.56 | Your DNS provider |
| `KUBECONFIG` secret | Base64 encoded K3s config | GitHub Secrets |
| `CLOUD_PROVIDER` var | Set to `kubeconfig` | GitHub Variables |

### If Using New Domain (Optional)

Would require:
1. Update GitHub variable `DOMAIN` to new domain
2. Trigger workflow to rebuild all images
3. Update DNS records for new domain

---

## Step-by-Step Learning Path

### Day 1: Infrastructure Setup

#### Step 1.1: SSH into Server

```bash
ssh root@46.224.224.56
```

#### Step 1.2: Install K3s

```bash
# Install with Traefik (default ingress)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --tls-san 46.224.224.56

# Verify installation
kubectl get nodes
# Should show: junaid-k8-lab   Ready   control-plane,master
```

**What this does:**
- Downloads and installs K3s single binary
- Includes kubectl, containerd, and Traefik
- `--tls-san` adds server IP to certificate (required for remote access)
- `--write-kubeconfig-mode 644` makes kubeconfig readable

#### Step 1.3: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

#### Step 1.4: Install Dapr

```bash
# Add Dapr Helm repo
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Install Dapr
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --wait

# Verify (should show 3 running pods)
kubectl get pods -n dapr-system
```

Expected output:
```
NAME                                    READY   STATUS    RESTARTS   AGE
dapr-operator-xxx                       1/1     Running   0          1m
dapr-sentry-xxx                         1/1     Running   0          1m
dapr-placement-server-xxx               1/1     Running   0          1m
```

#### Step 1.5: Get Kubeconfig Locally

```bash
# On your local machine
mkdir -p ~/.kube
scp root@46.224.224.56:/etc/rancher/k3s/k3s.yaml ~/.kube/config-hetzner

# Edit to replace localhost with server IP
sed -i '' 's/127.0.0.1/46.224.224.56/g' ~/.kube/config-hetzner

# Test connection
export KUBECONFIG=~/.kube/config-hetzner
kubectl get nodes
```

---

### Day 2: Manual Deployment (Learning)

#### Step 2.1: Create Namespace

```bash
kubectl create namespace taskflow
```

#### Step 2.2: Create GHCR Pull Secret

```bash
# Get a GitHub Personal Access Token with packages:read permission
# https://github.com/settings/tokens/new?scopes=read:packages

kubectl create secret docker-registry ghcr-secret \
  --namespace taskflow \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN
```

#### Step 2.3: Deploy with Helm (Manual Learning Method)

```bash
# Clone repo locally if not already
cd /path/to/taskforce_agent1

# Deploy with explicit values (learning method - see all parameters)
helm upgrade --install taskflow ./infrastructure/helm/taskflow \
  --namespace taskflow \
  --values infrastructure/helm/taskflow/values-hetzner.yaml \
  --set global.imagePullSecrets[0].name=ghcr-secret \
  --set sso.image.repository=ghcr.io/mjunaidca/taskflow/sso \
  --set sso.image.tag=latest \
  --set api.image.repository=ghcr.io/mjunaidca/taskflow/api \
  --set api.image.tag=latest \
  --set web.image.repository=ghcr.io/mjunaidca/taskflow/web \
  --set web.image.tag=latest \
  --set mcpServer.image.repository=ghcr.io/mjunaidca/taskflow/mcp \
  --set mcpServer.image.tag=latest \
  --set notificationService.image.repository=ghcr.io/mjunaidca/taskflow/notification \
  --set notificationService.image.tag=latest \
  --set managedServices.neon.enabled=true \
  --set "managedServices.neon.ssoDatabase=YOUR_NEON_SSO_URL" \
  --set "managedServices.neon.apiDatabase=YOUR_NEON_API_URL" \
  --set "managedServices.neon.chatkitDatabase=YOUR_NEON_CHATKIT_URL" \
  --set "managedServices.neon.notificationDatabase=YOUR_NEON_NOTIF_URL" \
  --set managedServices.upstash.enabled=true \
  --set "managedServices.upstash.host=YOUR_UPSTASH_HOST:6379" \
  --set "managedServices.upstash.password=YOUR_UPSTASH_PASS" \
  --set "sso.env.BETTER_AUTH_SECRET=YOUR_SECRET" \
  --set "api.openai.apiKey=YOUR_OPENAI_KEY" \
  --set dapr.enabled=true \
  --set "dapr.pubsub.redisHost=YOUR_UPSTASH_HOST:6379" \
  --set "dapr.pubsub.redisPassword=YOUR_UPSTASH_PASS" \
  --wait
```

#### Step 2.4: Verify Deployment

```bash
# Check pods (all should be Running)
kubectl get pods -n taskflow

# Check services
kubectl get svc -n taskflow

# Check ingress routes
kubectl get ingress -n taskflow

# Check logs if issues
kubectl logs -n taskflow deployment/sso-platform
kubectl logs -n taskflow deployment/taskflow-api
kubectl logs -n taskflow deployment/web-dashboard
```

---

### Day 3: DNS & SSL

#### Step 3.1: Configure DNS

Add A records pointing to `46.224.224.56`:

| Record | Type | Value |
|--------|------|-------|
| `avixato.com` | A | 46.224.224.56 |
| `sso.avixato.com` | A | 46.224.224.56 |
| `api.avixato.com` | A | 46.224.224.56 |
| `mcp.avixato.com` | A | 46.224.224.56 |

#### Step 3.2: Install Cert-Manager

```bash
# Install cert-manager CRDs and components
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for it to be ready
kubectl wait --for=condition=Ready pods \
  -l app.kubernetes.io/instance=cert-manager \
  -n cert-manager \
  --timeout=300s
```

#### Step 3.3: Create ClusterIssuer for Let's Encrypt

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: traefik
EOF
```

#### Step 3.4: Verify SSL Certificates

```bash
# Check certificate status
kubectl get certificates -n taskflow

# Should eventually show:
# NAME       READY   SECRET     AGE
# sso-tls    True    sso-tls    5m
# api-tls    True    api-tls    5m
# web-tls    True    web-tls    5m
# mcp-tls    True    mcp-tls    5m
```

---

## Verification Checklist

### Infrastructure

- [ ] K3s running: `kubectl get nodes` → Ready
- [ ] Dapr installed: `kubectl get pods -n dapr-system` → 3 running
- [ ] Cert-manager: `kubectl get pods -n cert-manager` → 3 running

### Application

- [ ] Namespace exists: `kubectl get ns taskflow`
- [ ] Pods running: `kubectl get pods -n taskflow` → 5 running
- [ ] Services exist: `kubectl get svc -n taskflow` → 5 services
- [ ] Ingress created: `kubectl get ingress -n taskflow` → 4 ingress rules

### Networking

- [ ] DNS resolves: `dig avixato.com` → 46.224.224.56
- [ ] SSL certs ready: `kubectl get certificates -n taskflow` → All True

### Health Checks

```bash
# Test each endpoint
curl -k https://avixato.com
curl -k https://sso.avixato.com/api/health
curl -k https://api.avixato.com/health
curl -k https://mcp.avixato.com/health
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check events
kubectl describe pod <pod-name> -n taskflow

# Check logs
kubectl logs <pod-name> -n taskflow

# Common issues:
# - ImagePullBackOff: GHCR secret not configured
# - CrashLoopBackOff: Check DATABASE_URL or missing env vars
```

### Can't Pull Images

```bash
# Verify GHCR secret exists
kubectl get secret ghcr-secret -n taskflow

# Test image pull manually
kubectl run test --image=ghcr.io/mjunaidca/taskflow/api:latest \
  --restart=Never -n taskflow \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"ghcr-secret"}]}}'
```

### SSL Certificate Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Check certificate request
kubectl describe certificaterequest -n taskflow

# Common issues:
# - DNS not propagated yet (wait 5-10 mins)
# - Wrong ingress class (should be traefik)
```

### Traefik Not Routing

```bash
# Check Traefik logs
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik

# Verify IngressRoute
kubectl get ingressroute -n taskflow
```

---

## Namespace Strategy

### Current Setup (Single Project)

```
Cluster Namespaces:
├── kube-system        # K3s core (coredns, metrics-server)
├── dapr-system        # Dapr control plane (3 pods)
├── cert-manager       # SSL certificate management
└── taskflow           # Your application (5 pods)
    ├── sso-platform
    ├── taskflow-api
    ├── mcp-server
    ├── web-dashboard
    └── notification-service
```

### Future: Multiple Projects (Shared SSO)

```
├── taskflow           # SSO + TaskFlow app
├── project2           # Uses SSO from taskflow namespace
└── project3           # Uses SSO from taskflow namespace

Cross-namespace SSO access:
  SSO_URL: http://sso-platform.taskflow.svc.cluster.local:3001
```

---

## Secrets Flow

```
GitHub Secrets
      │
      ▼ (deploy.yml --set flags)
Helm Values
      │
      ▼ (templates/secrets.yaml)
Kubernetes Secrets
      │
      ▼ (envFrom in deployments)
Pod Environment Variables
```

### Secrets Created by Helm

| Secret | Contents |
|--------|----------|
| `ghcr-secret` | Docker registry auth |
| `sso-platform-secret` | BETTER_AUTH_SECRET, SMTP_PASS |
| `api-secret` | JWT_SECRET, OPENAI_API_KEY |
| `mcp-server-secret` | MCP_API_KEY |
| `notification-secret` | DB credentials |

---

## Cost Summary

| Item | Monthly |
|------|---------|
| Hetzner CAX31 | $13.49 |
| Neon PostgreSQL | $0 (free tier) |
| Upstash Redis | $0 (free tier) |
| Domain | $0 (existing) |
| **Total** | **$13.49/mo** |

**Savings vs Azure AKS**: ~$85-150/mo → **85% reduction**

---

## Key Differences: Hetzner vs Azure

| Aspect | Hetzner K3s | Azure AKS |
|--------|-------------|-----------|
| Ingress | Traefik (built-in) | nginx (installed) |
| Load Balancer | Traefik NodePort | Azure LB |
| SSL | cert-manager + Let's Encrypt | Same |
| Cost | ~$13/mo | ~$85-150/mo |
| Scaling | Single node | Multi-node |
| Cloud Provider | `kubeconfig` | `azure` |

---

## Next Steps

After deployment is working:

1. **Set up GitHub Actions** - Update `KUBECONFIG` secret with Hetzner config
2. **Monitor resources** - `kubectl top nodes` and `kubectl top pods`
3. **Add more projects** - Create new namespaces with shared SSO
4. **Consider backups** - Though stateless, consider Helm release backups

---

## Related Documentation

- [Azure Cloud Deployment](./azure-cloud-deployment.md) - Previous cloud setup
- [Helm Walkthrough](../HELM-WALKTHROUGH.md) - Understanding the Helm charts
- [Kubernetes Debugging Guide](../KUBERNETES-DEBUGGING-GUIDE.md) - Troubleshooting K8s issues
