# TaskFlow Deployment Scripts

Simple scripts for deploying and accessing TaskFlow on Minikube.

---

## Prerequisites: Root `.env` File

Create a `.env` file in the project root with these secrets:

```bash
# Required for all deployments
BETTER_AUTH_SECRET=your-32-char-secret    # Generate: openssl rand -base64 32
OPENAI_API_KEY=sk-proj-...                 # For ChatKit AI (API service only)

# SMTP for email verification (SSO)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS="your gmail app password"        # Google App Password (not regular password)
SMTP_SECURE=false
EMAIL_FROM=no-reply@yourdomain.org

# Optional (have defaults)
POSTGRES_PASSWORD=postgres                 # Local PostgreSQL password
```

**The deploy script reads `.env` automatically** - no need for separate secrets files.

---

## Quick Start

```bash
# 1. Start Minikube (if not running)
minikube start --memory=4096 --cpus=2

# 2. Deploy everything (builds images automatically on first run)
./scripts/deploy-local.sh --rebuild --parallel --port-forward --pgadmin
```

Check Status:

```bash
kubectl get pods -n taskflow -w  
```

**That's it!** First time takes ~15 minutes (includes building images), subsequent runs take ~10 minutes.

**Access your services:**
- Web Dashboard: http://localhost:3000
- SSO Platform: http://localhost:3001
- API Docs: http://localhost:8000/docs
- pgAdmin: http://localhost:5050


  | Database           | Password        |
  |--------------------|-----------------|
  | SSO (sso-postgres) | changeme-sso-db |
  | API (api-postgres) | changeme-api-db |

  These are defined at:
  - values.yaml:74 → sso.postgresql.password: "changeme-sso-db"
  - values.yaml:151 → api.postgresql.password: "changeme-api-db"

Fresh Restart
```bash
helm uninstall taskflow -n taskflow; kubectl delete pvc --all -n taskflow; kubectl delete namespace taskflow; sleep 5; ./scripts/deploy-local.sh --port-forward 
```
---

### Available Flags

| Flag | What It Does | Time Impact |
|------|--------------|-------------|
| `--port-forward` | Start port-forwarding to access services | +30s |
| `--pgadmin` | Deploy pgAdmin for database management | +1min |
| `--skip-cleanup` | Skip namespace deletion (faster) | Saves 7-8min |
| `--rebuild` | Force rebuild all Docker images | +5-10min |

**Combine flags as needed:** All flags work together!

## Common Workflows (Copy-Paste Ready)

### 🚀 Daily Development (Most Common)
```bash
# Fast iteration: No rebuild, no cleanup, just upgrade
./scripts/deploy-local.sh --skip-cleanup --port-forward
```
**Time:** 2-3 minutes | **Use when:** Testing code changes, iterating quickly

---

### 🔨 After Code Changes
```bash
# Rebuild images + fast upgrade
./scripts/deploy-local.sh --rebuild --skip-cleanup --port-forward
```
**Time:** 7-8 minutes (5min build + 2-3min deploy) | **Use when:** Changed Dockerfile, dependencies, or application code

---

### 🆕 First Time Setup
```bash
# Clean deploy with all extras
./scripts/deploy-local.sh --port-forward --pgadmin
```
**Time:** 15 minutes (auto-builds images) | **Use when:** Initial setup, showing someone the project

---

### 🧹 Clean Slate (Nuclear Option)
```bash
# Delete everything and redeploy fresh
./scripts/deploy-local.sh --port-forward
```
**Time:** 10 minutes | **Use when:** Database corrupted, PVC issues, weird state, starting over

---

### 🔥 Complete Rebuild
```bash
# Rebuild images + clean deploy
./scripts/deploy-local.sh --rebuild --port-forward
```
**Time:** 15 minutes (5min build + 10min deploy) | **Use when:** Dockerfile changes + need fresh state

---

### 🗄️ With Database GUI
```bash
# Any command + pgAdmin
./scripts/deploy-local.sh --skip-cleanup --port-forward --pgadmin
```
**Time:** +1 minute | **Use when:** Need to inspect or modify database directly

---

### ⚡ Ultra-Fast (No Port-Forwards)
```bash
# Skip cleanup, no port-forwards (manual later)
./scripts/deploy-local.sh --skip-cleanup
```
**Time:** 2 minutes | **Use when:** Just want to deploy, will forward ports manually


---

## The One Script You Need

### `deploy-local.sh` ⭐

**Complete local deployment** - This is the ONLY script you run!

```bash
./scripts/deploy-local.sh [--pgadmin] [--port-forward]
```

**What it does:**
- ✅ Checks Minikube and images
- ✅ Clean deployment (deletes old namespace)
- ✅ Uses .env secrets consistently
- ✅ Offline-ready (imagePullPolicy=Never)
- ✅ Runs migrations automatically
- ✅ Optional pgAdmin and port-forwards

**After running:**
- Web Dashboard: http://localhost:3000 (after --port-forward)
- SSO Platform: http://localhost:3001
- API Docs: http://localhost:8000/docs

---

## Supporting Tools (in utils/)

You rarely need these directly:

- **`utils/build-images.sh`** - Build Docker images (run before first deploy)
- **`utils/start-port-forwards.sh`** - Manual port-forwarding (or use --port-forward flag)
- **`utils/add-pgadmin.sh`** - Database GUI (or use --pgadmin flag)

---

## Access Methods Explained

**Why port-forwarding?**

Minikube with Docker driver on macOS doesn't support direct NodePort or Ingress access. You MUST use ONE of these methods:

1. **Port-forward** (✅ Recommended - used by our scripts)
   - Simplest and most reliable
   - No sudo required
   - localhost URLs: http://localhost:3000, etc.

2. **Minikube tunnel** (Advanced - production-like)
   - Requires sudo and keeping terminal open
   - Uses domain names: http://taskflow.local
   - More complex setup

**Our scripts use port-forward** because it's the simplest and works immediately.

---

## Common Tasks

### First Time Setup (Build images once)
```bash
# 1. Build images (ONLY needed once!)
eval $(minikube docker-env)
./scripts/utils/build-images.sh

# 2. Deploy everything
./scripts/deploy-local.sh --port-forward
```

### Restart Locally (Without Rebuilding!) ⚡

**Option 1: Fast Upgrade (2-3 minutes) ✨ Recommended**
```bash
# Skips namespace deletion - just updates deployments
./scripts/deploy-local.sh --skip-cleanup --port-forward
```

**Option 2: Clean Restart (10 minutes)**
```bash
# Deletes namespace first - fresh state but slower
./scripts/deploy-local.sh --port-forward
```

**When to use each:**
- `--skip-cleanup`: Daily development, testing code changes
- Without `--skip-cleanup`: After database issues, corrupted PVCs, or major config changes

### After Code Changes (Rebuild images)
```bash
# 1. Rebuild images
eval $(minikube docker-env)
./scripts/utils/build-images.sh

# 2. Fresh deploy
./scripts/deploy-local.sh --port-forward
```

### Manual Helm Deployment (Advanced)
If you want to skip the script and run Helm directly:

```bash
# 1. Delete old deployment
kubectl delete namespace taskflow
sleep 10

# 2. Deploy with Helm
source .env
helm install taskflow ./helm/taskflow \
    --namespace taskflow \
    --create-namespace \
    --set global.imagePullPolicy=Never \
    --set sso.env.BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
    --set sso.smtp.password="${SMTP_PASS}" \
    --set api.openai.apiKey="${OPENAI_API_KEY}" \
    --wait \
    --timeout 15m

# 3. Start port-forwards
./scripts/utils/start-port-forwards.sh
```

### Start pgAdmin Separately (After Deployment)
```bash
# pgAdmin can be started anytime after deployment
./scripts/utils/add-pgadmin.sh

# Access at http://localhost:5050
# Login: admin@taskflow.dev / admin
```

### View Logs
```bash
# SSO Platform logs
kubectl logs -l app.kubernetes.io/component=sso -n taskflow --tail=50

# API logs
kubectl logs -l app.kubernetes.io/component=api -n taskflow --tail=50

# Web Dashboard logs
kubectl logs -l app.kubernetes.io/component=web -n taskflow --tail=50
```

### Watch Pod Status
```bash
kubectl get pods -n taskflow -w
```

### Delete Everything
```bash
helm uninstall taskflow -n taskflow
kubectl delete namespace taskflow
```

---

## Troubleshooting

### "Can't connect to localhost:3000"

**Problem:** Port-forwards stopped or weren't started

**Solution:**
```bash
./scripts/start-port-forwards.sh
```

---

### "Images not found" or "ImagePullBackOff"

**Problem:** Images weren't built in Minikube's Docker

**Solution:**
```bash
eval $(minikube docker-env)
./scripts/build-images.sh
```

---

### "ErrImageNeverPull" on PostgreSQL Pods

**Problem:** PostgreSQL image not available in Minikube's Docker (happens with `imagePullPolicy=Never`)

**Solution:**
```bash
# Switch to Minikube Docker and pull PostgreSQL image
eval $(minikube docker-env)
docker pull postgres:16-alpine

# Delete failed pods to recreate them
kubectl delete pod <pod-name> -n taskflow
```

**Note:** The deploy-local.sh script now automatically pulls this image, so this should only happen if you're deploying manually.

---

### "CrashLoopBackOff" on SSO or API

**Problem:** Usually database connection or migration issue

**Solution:**
```bash
# Check logs
kubectl logs <pod-name> -n taskflow

# Check previous crash
kubectl logs <pod-name> -n taskflow --previous

# Check init container logs (migrations)
kubectl logs <pod-name> -c run-migrations -n taskflow
```

---

### Pods stuck in "Pending"

**Problem:** Minikube out of resources

**Solution:**
```bash
# Check node resources
kubectl top nodes

# Restart Minikube with more resources
minikube stop
minikube start --memory=4096 --cpus=2
```

---

## Complete Workflow

**First Time Setup:**
```bash
# 1. Start Minikube
minikube start --memory=4096 --cpus=2

# 2. Deploy everything
./scripts/deploy-one-command.sh

# 3. Access services
open http://localhost:3000
```

**Daily Development:**
```bash
# If Minikube is stopped:
minikube start

# If port-forwards stopped:
./scripts/start-port-forwards.sh

# Access services:
open http://localhost:3000
```

**After Code Changes:**
```bash
# Rebuild images
eval $(minikube docker-env)
./scripts/build-images.sh

# Restart deployments
kubectl rollout restart deployment -n taskflow

# Wait for restart
kubectl rollout status deployment -n taskflow
```

---

## Directory Structure

```
scripts/
├── deploy-local.sh ⭐         # THE script - use this!
├── README.md                  # This file
└── utils/                     # Supporting tools
    ├── build-images.sh        # Build Docker images
    ├── start-port-forwards.sh # Port forwarding
    └── add-pgadmin.sh         # Database GUI
```

---

## Documentation Reference

### What You DON'T Need Anymore
These docs in `/docs` are **obsolete** with the new simplified scripts:
- ❌ Any "offline deployment" guides - deploy-local.sh is offline-ready by default
- ❌ Any "reset/clean" guides - deploy-local.sh deletes namespace automatically
- ❌ Complex multi-step deployment guides - just use deploy-local.sh

### Still Useful Docs
- ✅ `docs/KUBERNETES-DEBUGGING-GUIDE.md` - kubectl debugging tips
- ✅ `docs/HELM-WALKTHROUGH.md` - Understanding Helm charts
- ✅ `docs/LEARNINGS-PHASE-IV.md` - Project context and decisions

---

## Cleanup & Reset

### Delete TaskFlow Deployment Only
```bash
# Remove TaskFlow but keep Minikube and images
kubectl delete namespace taskflow

# Or use Helm
helm uninstall taskflow -n taskflow
kubectl delete namespace taskflow
```

### Stop Minikube (Pause Everything)
```bash
# Stop Minikube - keeps cluster and images for later
minikube stop

# Start again later
minikube start
./scripts/deploy-local.sh --port-forward
```

### Complete Reset (Delete Everything)
```bash
# Nuclear option - deletes cluster, images, everything!
minikube delete

# Start fresh from scratch
minikube start --memory=4096 --cpus=2
./scripts/deploy-local.sh --port-forward --pgadmin
```

**What gets deleted:**
- `kubectl delete namespace taskflow` → Just TaskFlow deployment
- `minikube stop` → Nothing deleted, just paused
- `minikube delete` → **Everything** (cluster + images + config)

---

## Need Help?

### Quick Restart
```bash
# Restart without rebuilding images (fast!)
./scripts/deploy-local.sh --port-forward
```

### Check Status
```bash
kubectl get pods -n taskflow
kubectl logs -n taskflow -l app=sso-platform --tail=50
```

### View Minikube Resources
```bash
# Check Minikube status
minikube status

# Check images in Minikube
eval $(minikube docker-env)
docker images | grep taskflow

# Check disk usage
minikube ssh "df -h"
```

---

## Key Points

✅ **All flags work together** - Combine as needed for your workflow
✅ **Auto-builds on first run** - Checks for images, builds if missing
✅ **Fast upgrades with --skip-cleanup** - 2-3 min instead of 10 min
✅ **Force rebuild with --rebuild** - When you change code or Dockerfiles
✅ **Uses .env secrets** - Consistent passwords across restarts

**Quick Reference:**
- **Daily dev:** `./scripts/deploy-local.sh --skip-cleanup --port-forward` (2-3 min)
- **After code:** `./scripts/deploy-local.sh --rebuild --skip-cleanup --port-forward` (7-8 min)
- **Clean slate:** `./scripts/deploy-local.sh --port-forward` (10 min)
---

## All Flags

Complete Flag Matrix

```bash

  # All possible combinations (examples):
  ./scripts/deploy-local.sh                                            # Default (10 min)
  ./scripts/deploy-local.sh --skip-cleanup                             # Fast (2 min)
  ./scripts/deploy-local.sh --rebuild                                  # Rebuild (15 min)
  ./scripts/deploy-local.sh --rebuild --skip-cleanup                   # Rebuild + fast (7 min)
  ./scripts/deploy-local.sh --port-forward                             # With access (10 min)
  ./scripts/deploy-local.sh --skip-cleanup --port-forward              # Fast + access (2-3 min) ⭐ MOST COMMON
  ./scripts/deploy-local.sh --rebuild --skip-cleanup --port-forward    # Rebuild + fast + access (7-8 min) ⭐ AFTER CODE
  ./scripts/deploy-local.sh --pgadmin --port-forward                   # With DB GUI (11 min)
  ./scripts/deploy-local.sh --rebuild --pgadmin --port-forward         # Everything (16 min)

```

---

Why This Solves "No One Can Remember"

Problem: Too many options, easy to forget
Solution: Documentation as reference card

1. Visual hierarchy: Emojis + sections make scanning easy
2. Copy-paste ready: Just copy the command you need
3. Time estimates: Know how long each will take
4. Use cases: Clear "Use when" guidance
5. Quick reference: 3-line summary at bottom

Result: Anyone can open README and find their workflow in <10 seconds

## Why Helm? (Honest Assessment)

**Your question is valid** - for local Minikube dev, Helm adds complexity. Here's the honest breakdown:

### What Helm Provides Here

**Actually Useful:**
1. **`helm upgrade --install`** - Idempotent deployments (install or upgrade automatically)
2. **Templating** - Single values.yaml for all services (DRY)
3. **Secret injection** - Pass .env values via --set flags
4. **Atomic deployments** - Rollback on failure with --wait

**Not That Useful (for local dev):**
- Package versioning (we're not versioning locally)
- Dependency management (no external charts)
- Release history (we delete namespace each time)
- Multi-environment management (only have one env: local)

### What Plain K8s Manifests Would Look Like

**Alternative: kubectl + Kustomize**
```bash
# Instead of Helm:
kubectl apply -k ./k8s/overlays/local

# Kustomize handles:
# - Base manifests in k8s/base/
# - Env-specific patches in k8s/overlays/local/
# - ConfigMap/Secret generation
```

**Pros of plain manifests:**
- No Helm learning curve
- Simpler debugging (what you see is what you get)
- Faster feedback (no template rendering)
- Native Kubernetes (Kustomize built into kubectl)

**Cons vs Helm:**
- No idempotent install/upgrade (would need manual checks)
- Secrets harder to inject (would need envsubst or similar)
- More verbose (more YAML files)

### Why We Chose Helm Anyway

**Honest reasons:**
1. **Future-proofing** - If deploying to production later, Helm patterns already in place
2. **Learning value** - Helm is industry standard for K8s deployments
3. **Hackathon context** - Demonstrating production-like patterns
4. **One command deploys** - `helm upgrade --install` is cleaner than multi-step kubectl

**Reality Check:**
- For pure local dev? Kustomize would be simpler
- For production? Helm is the right choice
- For learning? Helm teaches transferable skills

### The Honest Answer

**For TaskFlow's current scale** (4 services, local only), **plain manifests + Kustomize would work fine and be simpler**.

**But Helm prepares you for:**
- Multi-environment deployments (dev/staging/prod)
- Production Kubernetes clusters
- Industry-standard deployment patterns
- Team collaboration on larger projects

**Bottom line:** You're right to question it. Helm is overkill for pure local dev, but valuable if this ever goes beyond Minikube.

