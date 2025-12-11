# TaskFlow Deployment Guide

Deploy TaskFlow (5 microservices) to any Kubernetes cluster with this guide.

## Architecture

```
                         INTERNET
                             │
                             ▼
                    ┌─────────────────┐
                    │  Load Balancer  │  (Single Public IP)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Ingress (Traefik│  Routes by subdomain
                    │   or nginx)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │   Web    │        │   SSO    │        │   MCP    │
  │ (PUBLIC) │        │ (PUBLIC) │        │ (PUBLIC) │
  │ domain   │        │ sso.dom  │        │ mcp.dom  │
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       │              ┌────▼─────┐             │
       └──────────────►   API    ◄─────────────┘
                      │(INTERNAL)│
                      └────┬─────┘
                           │
                    ┌──────▼──────┐
                    │ Notification │
                    │ (INTERNAL)   │
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

## Services Overview

| Service | Port | Public? | Subdomain | Purpose |
|---------|------|---------|-----------|---------|
| Web Dashboard | 3000 | Yes | `yourdomain.com` | User interface |
| SSO Platform | 3001 | Yes | `sso.yourdomain.com` | Authentication (Better Auth) |
| MCP Server | 8001 | Yes | `mcp.yourdomain.com` | AI agent interface |
| API | 8000 | No | Internal only | Backend API |
| Notification | 8001 | No | Internal only | Dapr pub/sub consumer |

---

## Prerequisites

### Tools Required

```bash
# Azure CLI (for AKS)
brew install azure-cli    # macOS
# or: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# Kubernetes CLI
brew install kubectl

# Helm
brew install helm

# Docker
# Install Docker Desktop or Docker Engine
```

### External Services (Recommended)

We use managed services for databases to enable easy migration between cloud providers:

1. **Neon PostgreSQL** (free tier available)
   - Create account at https://neon.tech
   - Create 4 databases: `sso-v1`, `api-v1`, `chatkit-v1`, `notify-v1`
   - Copy the pooled connection strings

2. **Upstash Redis** (free tier available)
   - Create account at https://upstash.com
   - Create a Redis database with TLS enabled
   - Copy host, password, REST URL, and REST token

3. **Domain** with DNS access (Namecheap, Cloudflare, etc.)

---

## Quick Start (GitHub Actions CD)

The easiest way to deploy is using our GitHub Actions workflow.

### 1. Fork/Clone the Repository

### 2. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions → Secrets**:

```
# Neon PostgreSQL Connection Strings
NEON_SSO_DATABASE_URL=postgresql://...
NEON_API_DATABASE_URL=postgresql://...
NEON_CHATKIT_DATABASE_URL=postgresql://...
NEON_NOTIFICATION_DATABASE_URL=postgresql://...

# Upstash Redis
UPSTASH_REDIS_HOST=xxx.upstash.io:6379
UPSTASH_REDIS_PASSWORD=xxx
REDIS_URL=https://xxx.upstash.io
REDIS_TOKEN=xxx

# Application Secrets
BETTER_AUTH_SECRET=<generate-random-64-char-string>
OPENAI_API_KEY=sk-xxx
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<gmail-app-password>
CHATKIT_DOMAIN_KEY=domain_pk_xxx

# Azure (if using AKS)
AZURE_CREDENTIALS=<service-principal-json> from az ad sp create-for-rbac
```

### 3. Configure GitHub Variables

Go to **Settings → Secrets and variables → Actions → Variables**:

```
CLOUD_PROVIDER=azure           # or: gke, kubeconfig
DOMAIN=yourdomain.com
AZURE_RESOURCE_GROUP=taskflow-rg
AZURE_CLUSTER_NAME=taskflow-cluster
```

### 4. Push to Main

The CD pipeline triggers on push to `main`:
1. Builds all 5 Docker images
2. Pushes to GitHub Container Registry (GHCR)
3. Deploys to Kubernetes via Helm

---

## Manual Deployment (Step by Step)

### Step 1: Create AKS Cluster (Azure)

```bash
# Login to Azure
az login

# Register Kubernetes provider (first time only)
az provider register --namespace Microsoft.ContainerService

# Create resource group
az group create --name taskflow-rg --location westus2

# Create AKS cluster (2 nodes, ~$60/mo)
az aks create \
  --resource-group taskflow-rg \
  --name taskflow-cluster \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group taskflow-rg --name taskflow-cluster

# Verify connection
kubectl get nodes
```

### Step 2: Install Dapr

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set dapr_scheduler.cluster.storageSize=4Gi \
  --wait
```

### Step 3: Install Ingress Controller (Traefik)

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set service.type=LoadBalancer

# Get the external IP (wait ~2 minutes)
kubectl get svc -n traefik traefik -w
```

### Step 4: Install cert-manager (SSL Certificates)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager

# Create Let's Encrypt ClusterIssuer
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

### Step 5: Configure DNS

Point your domain to the LoadBalancer IP:

```
yourdomain.com     → <EXTERNAL-IP>
sso.yourdomain.com → <EXTERNAL-IP>
api.yourdomain.com → <EXTERNAL-IP>
mcp.yourdomain.com → <EXTERNAL-IP>
```

### Step 6: Build and Push Docker Images

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Build and push each image
REGISTRY="ghcr.io/YOUR_USERNAME/taskflow"

# API
docker build -t $REGISTRY/api:latest ./apps/api
docker push $REGISTRY/api:latest

# SSO
docker build -t $REGISTRY/sso:latest ./apps/sso
docker push $REGISTRY/sso:latest

# MCP Server
docker build -t $REGISTRY/mcp:latest ./apps/mcp-server
docker push $REGISTRY/mcp:latest

# Notification Service
docker build -t $REGISTRY/notification:latest ./apps/notification-service
docker push $REGISTRY/notification:latest

# Web Dashboard (requires build args for Next.js)
docker build \
  --build-arg NEXT_PUBLIC_SSO_URL=https://sso.yourdomain.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/callback \
  -t $REGISTRY/web:latest \
  ./apps/web
docker push $REGISTRY/web:latest
```

### Step 7: Create Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace taskflow

# GHCR pull secret
kubectl create secret docker-registry ghcr-secret \
  --namespace taskflow \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=your@email.com
```

### Step 8: Create Values File

Create `infrastructure/helm/taskflow/values-azure.yaml` (gitignored):

```yaml
global:
  domain: yourdomain.com
  namespace: taskflow
  imagePullPolicy: Always
  imageRegistry: ghcr.io/YOUR_USERNAME/taskflow
  imagePullSecrets:
    - name: ghcr-secret

managedServices:
  neon:
    enabled: true
    ssoDatabase: "postgresql://..."
    apiDatabase: "postgresql://..."
    chatkitDatabase: "postgresql://..."
    notificationDatabase: "postgresql://..."
  upstash:
    enabled: true
    host: "xxx.upstash.io:6379"
    password: "xxx"
    restUrl: "https://xxx.upstash.io"
    restToken: "xxx"

sso:
  enabled: true
  name: sso-platform
  image:
    repository: ghcr.io/YOUR_USERNAME/taskflow/sso
    tag: latest
  ingress:
    enabled: true
    className: traefik
    host: sso.yourdomain.com
    tls:
      enabled: true
  env:
    BETTER_AUTH_URL: https://sso.yourdomain.com
    BETTER_AUTH_SECRET: "<random-64-char-string>"
    ALLOWED_ORIGINS: "https://yourdomain.com,https://sso.yourdomain.com,https://api.yourdomain.com"

api:
  enabled: true
  name: taskflow-api
  image:
    repository: ghcr.io/YOUR_USERNAME/taskflow/api
    tag: latest
  ingress:
    enabled: true
    className: traefik
    host: api.yourdomain.com
    tls:
      enabled: true
  openai:
    apiKey: "sk-xxx"

mcpServer:
  enabled: true
  name: mcp-server
  image:
    repository: ghcr.io/YOUR_USERNAME/taskflow/mcp
    tag: latest
  ingress:
    enabled: true
    className: traefik
    host: mcp.yourdomain.com
    tls:
      enabled: true

web:
  enabled: true
  name: web-dashboard
  image:
    repository: ghcr.io/YOUR_USERNAME/taskflow/web
    tag: latest
  ingress:
    enabled: true
    className: traefik
    host: yourdomain.com
    tls:
      enabled: true

notificationService:
  enabled: true

dapr:
  enabled: true
  pubsub:
    redisHost: "xxx.upstash.io:6379"
    redisPassword: "xxx"
    enableTLS: "true"

redis:
  enabled: false

pgadmin:
  enabled: false

ingress-nginx:
  enabled: false  # Using Traefik instead
```

### Step 9: Deploy with Helm

```bash
helm upgrade --install taskflow ./infrastructure/helm/taskflow \
  --namespace taskflow \
  --values infrastructure/helm/taskflow/values-azure.yaml \
  --wait \
  --timeout 10m
```

### Step 10: Verify Deployment

```bash
# Check pods
kubectl get pods -n taskflow

# Check ingress
kubectl get ingress -n taskflow

# Check certificates
kubectl get certificates -n taskflow

# Test endpoints
curl -I https://yourdomain.com
curl -I https://sso.yourdomain.com
curl -I https://api.yourdomain.com
```

---

## Important Notes

### Next.js Build-Time Variables

The web dashboard uses `NEXT_PUBLIC_*` environment variables which are **embedded at build time**, not runtime. If you change your domain, you must rebuild the web image:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SSO_URL=https://sso.newdomain.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.newdomain.com \
  --build-arg NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://newdomain.com/api/auth/callback \
  -t ghcr.io/YOUR_USERNAME/taskflow/web:latest \
  ./apps/web
```

### OAuth Redirect URLs

When changing domains, update `apps/sso/src/lib/trusted-clients.ts`:

```typescript
redirectUrls: [
  "https://yourdomain.com/api/auth/callback",
  "https://api.yourdomain.com/auth/callback",
],
```

### Database Migrations

Migrations are disabled for cloud deployments. Run them locally against Neon:

```bash
cd apps/sso && pnpm db:push
cd apps/api && uv run alembic upgrade head
```

---

## Troubleshooting

### Pods in ImagePullBackOff

```bash
# Check the error
kubectl describe pod <pod-name> -n taskflow

# Usually means GHCR secret is wrong or images are private
# Recreate the secret:
kubectl delete secret ghcr-secret -n taskflow
kubectl create secret docker-registry ghcr-secret ...
```

### SSL Certificate Not Ready

```bash
# Check certificate status
kubectl describe certificate <name> -n taskflow

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Common issue: DNS not propagated yet
# Wait a few minutes and check again
```

### Wrong Auth URL (web shows auth.domain instead of sso.domain)

The web image was built with wrong `NEXT_PUBLIC_SSO_URL`. Rebuild with correct args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SSO_URL=https://sso.yourdomain.com \
  ...
```

---

## Cost Estimates

### Azure AKS

| Resource | Monthly Cost |
|----------|-------------|
| 2x B2s Nodes | ~$60 |
| Load Balancer | ~$18 |
| Public IP | ~$3 |
| Egress | ~$5 |
| **Total** | **~$85/mo** |

### Hetzner (Migration Path)

| Resource | Monthly Cost |
|----------|-------------|
| 2x CX22 VMs | ~$10 |
| Load Balancer | ~$6 |
| **Total** | **~$16/mo** |

Our architecture uses vendor-agnostic services (GHCR, Neon, Upstash) making migration easy.

---

## Commands Reference

```bash
# Azure
az login
az aks get-credentials --resource-group taskflow-rg --name taskflow-cluster

# Kubernetes
kubectl get pods -n taskflow
kubectl logs -n taskflow <pod-name>
kubectl describe pod -n taskflow <pod-name>
kubectl rollout restart deployment/<name> -n taskflow

# Helm
helm upgrade --install taskflow ./infrastructure/helm/taskflow -n taskflow -f values-azure.yaml
helm uninstall taskflow -n taskflow

# Cleanup
az group delete --name taskflow-rg --yes --no-wait
```

---

## GitHub CI/CD Setup Checklist

### Step 1: Create GitHub Secrets (Required)

Go to **Repository → Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NEON_SSO_DATABASE_URL` | SSO database connection string | Neon dashboard → Project → Connection string (pooled) |
| `NEON_API_DATABASE_URL` | API database connection string | Same Neon project, different database |
| `NEON_CHATKIT_DATABASE_URL` | ChatKit database connection string | Same Neon project, different database |
| `NEON_NOTIFICATION_DATABASE_URL` | Notification database connection string | Same Neon project, different database |
| `UPSTASH_REDIS_HOST` | Redis host with port | Upstash dashboard → Redis → Details: `xxx.upstash.io:6379` |
| `UPSTASH_REDIS_PASSWORD` | Redis password | Upstash dashboard → Redis → Details |
| `REDIS_URL` | Redis REST URL | Upstash dashboard → Redis → REST API: `https://xxx.upstash.io` |
| `REDIS_TOKEN` | Redis REST token | Upstash dashboard → Redis → REST API |
| `BETTER_AUTH_SECRET` | 64-char random string | Run: `openssl rand -base64 48` |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI dashboard → API keys |
| `SMTP_PASSWORD` | Gmail App Password | Google Account → Security → 2FA → App passwords |
| `CHATKIT_DOMAIN_KEY` | ChatKit domain key | From your ChatKit account |
| `AZURE_CREDENTIALS` | Azure service principal JSON | See Azure setup below |

### Step 2: Create GitHub Variables (Required)

Go to **Repository → Settings → Secrets and variables → Actions → Variables → New repository variable**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `DOMAIN` | `avixato.com` | Your domain (no https://) |
| `CLOUD_PROVIDER` | `azure` | Options: `azure`, `gke`, `kubeconfig` |
| `AZURE_RESOURCE_GROUP` | `taskflow-rg` | Azure resource group name |
| `AZURE_CLUSTER_NAME` | `taskflow-cluster` | AKS cluster name |
| `INGRESS_CLASS` | `traefik` | Options: `traefik` or `nginx` |

### Step 3: Create Azure Service Principal (for AZURE_CREDENTIALS)

```bash
# Login to Azure
az login

# Get subscription ID
az account show --query id -o tsv

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "github-taskflow-cd" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/taskflow-rg \
  --sdk-auth
```

Copy the entire JSON output and paste it as the `AZURE_CREDENTIALS` secret.

### Step 4: Configure Neon Databases

Create 4 databases in Neon dashboard:
1. `taskflow-sso` → Use pooled connection string for `NEON_SSO_DATABASE_URL`
2. `taskflow-api` → Use pooled connection string for `NEON_API_DATABASE_URL`
3. `taskflow-chatkit` → Use pooled connection string for `NEON_CHATKIT_DATABASE_URL`
4. `taskflow-notify` → Use pooled connection string for `NEON_NOTIFICATION_DATABASE_URL`

### Step 5: Run Database Migrations (Before First Deploy)

```bash
# SSO migrations
cd apps/sso
DATABASE_URL="<NEON_SSO_DATABASE_URL>" pnpm db:push
DATABASE_URL="<NEON_SSO_DATABASE_URL>" pnpm seed:prod

# API migrations
cd ../api
DATABASE_URL="<NEON_API_DATABASE_URL>" uv run alembic upgrade head

# Notification migrations
cd ../notification-service
DATABASE_URL="<NEON_NOTIFICATION_DATABASE_URL>" uv run alembic upgrade head
```

### Step 6: Push to Main

```bash
git add .
git commit -m "Configure CD pipeline"
git push origin main
```

The GitHub Actions workflow will:
1. Build all 5 Docker images with correct build args
2. Push to GHCR (GitHub Container Registry)
3. Deploy to Kubernetes using Helm

---

## Current Status (What's Complete)

### ✅ Infrastructure
- [x] Azure AKS cluster created (`taskflow-cluster` in `taskflow-rg`)
- [x] Dapr installed (v1.15 with scheduler)
- [x] Traefik ingress controller installed
- [x] cert-manager with Let's Encrypt ClusterIssuer
- [x] DNS configured (avixato.com pointing to LoadBalancer)

### ✅ GitHub Actions CD Pipeline
- [x] `.github/workflows/deploy.yml` - Complete build and deploy workflow
- [x] Web image built with `NEXT_PUBLIC_*` build args
- [x] SSO image built with `NEXT_PUBLIC_*` build args
- [x] All services configured via Helm `--set` flags

### ✅ Helm Chart
- [x] `values-cloud.yaml` - Production defaults for CD pipeline
- [x] Neon PostgreSQL integration (4 databases)
- [x] Upstash Redis integration (Dapr pub/sub + rate limiting)
- [x] TLS certificates via cert-manager annotations

### ✅ Code Fixes Applied
- [x] `apps/web/src/app/api/auth/logout/route.ts` - Fixed redirect using `NEXT_PUBLIC_APP_URL`
- [x] `apps/sso/Dockerfile` - Added `NEXT_PUBLIC_CONTINUE_URL` build arg
- [x] `apps/web/Dockerfile` - Added `NEXT_PUBLIC_APP_URL` build arg

### 📋 Next Steps for New Deploy
1. Add all GitHub Secrets (see checklist above)
2. Add all GitHub Variables (see checklist above)
3. Run database migrations locally against Neon
4. Push to main branch
5. Monitor Actions tab for deployment progress

---

## Environment Variables Reference

### Build-Time Variables (embedded in Docker image)

| Service | Variable | Purpose |
|---------|----------|---------|
| **Web** | `NEXT_PUBLIC_SSO_URL` | SSO endpoint for browser OAuth |
| **Web** | `NEXT_PUBLIC_API_URL` | API endpoint for browser fetch |
| **Web** | `NEXT_PUBLIC_APP_URL` | App URL for redirects |
| **Web** | `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | OAuth callback URL |
| **Web** | `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY` | ChatKit domain key |
| **SSO** | `NEXT_PUBLIC_BETTER_AUTH_URL` | Better Auth URL for browser |
| **SSO** | `NEXT_PUBLIC_CONTINUE_URL` | Redirect after email verification |
| **SSO** | `NEXT_PUBLIC_APP_NAME` | App name shown in UI |

### Runtime Variables (from Kubernetes ConfigMaps/Secrets)

| Service | Variable | Source | Purpose |
|---------|----------|--------|---------|
| **SSO** | `DATABASE_URL` | Secret | Neon connection string |
| **SSO** | `BETTER_AUTH_SECRET` | Secret | JWT signing key |
| **SSO** | `BETTER_AUTH_URL` | ConfigMap | Server-side auth URL |
| **SSO** | `ALLOWED_ORIGINS` | ConfigMap | CORS origins |
| **SSO** | `SMTP_*` | ConfigMap/Secret | Email configuration |
| **SSO** | `REDIS_URL`, `REDIS_TOKEN` | Secret | Upstash rate limiting |
| **API** | `DATABASE_URL` | Secret | Neon connection string |
| **API** | `SSO_URL` | ConfigMap | Internal SSO URL |
| **API** | `OPENAI_API_KEY` | Secret | OpenAI API key |
| **API** | `TASKFLOW_CHATKIT_DATABASE_URL` | Secret | ChatKit database |
| **API** | `CORS_ORIGINS` | ConfigMap | CORS origins |
| **MCP** | `TASKFLOW_SSO_URL` | ConfigMap | Internal SSO URL |
| **MCP** | `TASKFLOW_API_URL` | ConfigMap | Internal API URL |
| **MCP** | `TASKFLOW_DEV_MODE` | ConfigMap | Disable for production |
| **Notification** | `DATABASE_URL` | Secret | Neon connection string |
| **Notification** | `SSO_URL` | Deployment env | Internal SSO URL |
| **Dapr** | `redisHost`, `redisPassword` | Secret | Upstash pub/sub |

### Internal Kubernetes Service Names

Services communicate internally using K8s service names:
- `http://sso-platform:3001` - SSO Platform
- `http://taskflow-api:8000` - API Service
- `http://mcp-server:8001` - MCP Server
- `http://taskflow-notification:8001` - Notification Service
