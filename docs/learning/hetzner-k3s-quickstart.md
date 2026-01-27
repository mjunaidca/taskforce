# Hetzner K3s Deployment - Quick Reference

> **Server:** CAX31 ARM64 @ 46.224.224.56 | **Cost:** $13.49/mo | **Cluster:** K3s v1.34.3

## TL;DR - Deploy a New Project

```bash
# 1. Add your project's namespace
KUBECONFIG=~/.kube/config-hetzner kubectl create namespace <project-name>

# 2. Create GHCR pull secret in namespace
KUBECONFIG=~/.kube/config-hetzner kubectl create secret docker-registry ghcr-secret \
  --namespace <project-name> \
  --docker-server=ghcr.io \
  --docker-username=<github-user> \
  --docker-password=$(gh auth token)

# 3. Deploy with Helm (example)
KUBECONFIG=~/.kube/config-hetzner helm upgrade --install <release> ./helm \
  --namespace <project-name> \
  --set ingress.className=traefik \
  --set "ingress.annotations.cert-manager\.io/cluster-issuer=letsencrypt-prod"
```

---

## Cluster Access

### Local Kubeconfig
```bash
# Location
~/.kube/config-hetzner

# Use it
export KUBECONFIG=~/.kube/config-hetzner
kubectl get nodes

# Or prefix commands
KUBECONFIG=~/.kube/config-hetzner kubectl get pods -A
```

### SSH Access
```bash
ssh root@46.224.224.56
```

### Server-Side Kubectl
```bash
# On server, K3s stores kubeconfig here
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
```

---

## Pre-Installed Components

| Component | Version | Namespace | Purpose |
|-----------|---------|-----------|---------|
| K3s | v1.34.3 | - | Kubernetes distribution |
| Traefik | (bundled) | kube-system | Ingress controller |
| Dapr | v1.15.13 | dapr-system | Pub/sub, state, workflows |
| cert-manager | v1.14.0 | cert-manager | Auto SSL certificates |
| Let's Encrypt | - | - | ClusterIssuer configured |

---

## Ingress Configuration

### Key Settings for Hetzner/K3s

```yaml
ingress:
  enabled: true
  className: traefik              # NOT nginx!
  host: myapp.yourdomain.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod  # Auto SSL
  tls:
    enabled: true
    secretName: myapp-tls
```

### DNS Required
Add A record: `myapp.yourdomain.com` → `46.224.224.56`

---

## Shared Services (Cross-Namespace)

### Using TaskFlow SSO from Another Project

```yaml
# In your project's deployment
env:
  SSO_URL: http://sso-platform.taskflow.svc.cluster.local:3001
  # OR for external (browser) access:
  SSO_PUBLIC_URL: https://sso.avixato.com
```

### Using Dapr Pub/Sub

Dapr is cluster-wide. Any namespace can use it:

```yaml
# Dapr component reference
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-pubsub
  namespace: <your-namespace>
spec:
  type: pubsub.redis
  metadata:
  - name: redisHost
    value: refined-ant-42302.upstash.io:6379  # Shared Upstash
  - name: redisPassword
    secretKeyRef:
      name: upstash-secret
      key: password
  - name: enableTLS
    value: "true"
```

---

## GitHub Actions Integration

### Required Secrets (Already Set)

| Secret | Purpose |
|--------|---------|
| `KUBECONFIG` | Base64 K3s kubeconfig |
| `UPSTASH_REDIS_HOST` | Redis host for Dapr |
| `UPSTASH_REDIS_PASSWORD` | Redis password |
| `NEON_*_DATABASE_URL` | PostgreSQL connections |

### Required Variables

| Variable | Value |
|----------|-------|
| `CLOUD_PROVIDER` | `kubeconfig` |
| `INGRESS_CLASS` | `traefik` |
| `DOMAIN` | `avixato.com` |

### Workflow Kubeconfig Setup

```yaml
- name: Set kubeconfig
  if: ${{ vars.CLOUD_PROVIDER == 'kubeconfig' }}
  run: |
    mkdir -p ~/.kube
    echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config
```

---

## Resource Capacity

### Current Usage (TaskFlow)

| Resource | Used | Available | Utilization |
|----------|------|-----------|-------------|
| CPU | 450m | 8000m | 5.6% |
| Memory | 1.2GB | 16GB | 7.5% |

### Headroom for Additional Projects

~3-4 similar projects can fit comfortably.

### Recommended Limits per Service

```yaml
resources:
  requests:
    cpu: 50m-100m
    memory: 128Mi-256Mi
  limits:
    cpu: 250m-500m
    memory: 256Mi-512Mi
```

---

## Common Commands

### Namespace Management
```bash
# List namespaces
kubectl get ns

# Create namespace
kubectl create namespace <name>

# Delete namespace (CAREFUL - deletes everything in it!)
kubectl delete namespace <name>
```

### Pod Operations
```bash
# List pods in namespace
kubectl get pods -n <namespace>

# Pod logs
kubectl logs -n <namespace> <pod-name>
kubectl logs -n <namespace> deployment/<deploy-name>

# Describe pod (for debugging)
kubectl describe pod -n <namespace> <pod-name>

# Exec into pod
kubectl exec -it -n <namespace> <pod-name> -- /bin/sh
```

### Helm Operations
```bash
# List releases
helm list -n <namespace>

# Install/upgrade
helm upgrade --install <release> <chart> -n <namespace> -f values.yaml

# Uninstall
helm uninstall <release> -n <namespace>

# Debug template rendering
helm template <release> <chart> -f values.yaml
```

### Certificate Operations
```bash
# List certificates
kubectl get certificates -n <namespace>

# Check certificate status
kubectl describe certificate <name> -n <namespace>

# Check ACME challenges
kubectl get challenges -n <namespace>
```

---

## Managed Services

### Neon PostgreSQL (Free Tier)

- **Console:** https://console.neon.tech
- **Databases:** sso-v1, api-v1, chatkit-v1, notify-v1
- **Connection:** Use pooler endpoint with `?sslmode=require`

### Upstash Redis (Free Tier)

- **Console:** https://console.upstash.com
- **Host:** refined-ant-42302.upstash.io:6379
- **TLS:** Required (`enableTLS: "true"`)

---

## Troubleshooting

### Pod Not Starting

```bash
# Check events
kubectl describe pod <pod> -n <ns>

# Common issues:
# - ImagePullBackOff: Check GHCR secret
# - CrashLoopBackOff: Check logs
# - Pending: Check resource limits
```

### SSL Certificate Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Check challenge status
kubectl describe challenge -n <ns>

# Common issues:
# - DNS not pointing to 46.224.224.56
# - Wrong ingress class (must be traefik)
```

### Ingress Not Working

```bash
# Check Traefik logs
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik

# Verify ingress created correctly
kubectl get ingress -n <ns> -o yaml
```

---

## Quick Helm Values Template

```yaml
# values-hetzner.yaml template for new projects

global:
  domain: yourdomain.com
  imagePullSecrets:
    - name: ghcr-secret

myapp:
  enabled: true
  image:
    repository: ghcr.io/youruser/yourapp
    tag: latest
    pullPolicy: Always

  ingress:
    enabled: true
    className: traefik
    host: myapp.yourdomain.com
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      enabled: true
      secretName: myapp-tls

  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# If using Neon PostgreSQL
managedServices:
  neon:
    enabled: true
    databaseUrl: ""  # Inject via --set

# If using Dapr
dapr:
  enabled: true
  appId: myapp
```

---

## Cost Summary

| Item | Monthly |
|------|---------|
| Hetzner CAX31 | $13.49 |
| Neon PostgreSQL | $0 (free) |
| Upstash Redis | $0 (free) |
| **Total** | **$13.49** |

Compare: Azure AKS ~$85-150/mo = **85% savings**
