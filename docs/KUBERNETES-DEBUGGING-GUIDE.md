# Kubernetes Debugging Guide - Minikube & kubectl

**Your Path to Kubernetes Mastery**

This guide teaches you how to see **everything happening inside Kubernetes** - from debugging pods to inspecting secrets.

---

## 🎯 Quick Reference Card

**Most Used Commands** (memorize these):

```bash
# See everything in namespace
kubectl get all -n taskflow

# Watch pods in real-time
kubectl get pods -n taskflow -w

# View logs (live)
kubectl logs -f <pod-name> -n taskflow

# Describe resource (troubleshooting)
kubectl describe pod <pod-name> -n taskflow

# Execute commands inside pod
kubectl exec -it <pod-name> -n taskflow -- /bin/sh

# Port forward to access services locally
kubectl port-forward svc/sso-platform 3001:3001 -n taskflow
```

---

## 📚 Table of Contents

1. [Viewing Resources](#1-viewing-resources)
2. [Pod Debugging](#2-pod-debugging)
3. [Logs & Events](#3-logs--events)
4. [Secrets & ConfigMaps](#4-secrets--configmaps)
5. [Networking & Services](#5-networking--services)
6. [Helm Debugging](#6-helm-debugging)
7. [Common Issues & Fixes](#7-common-issues--fixes)
8. [Advanced Debugging](#8-advanced-debugging)

---

## 1. Viewing Resources

### See Everything in a Namespace

```bash
# All resources (pods, services, deployments, etc.)
kubectl get all -n taskflow

# Example output:
# NAME                                 READY   STATUS    RESTARTS   AGE
# pod/sso-platform-xxx                 1/1     Running   0          5m
# pod/taskflow-api-xxx                 1/1     Running   0          5m
#
# NAME                   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
# service/sso-platform   ClusterIP   10.96.100.50    <none>        3001/TCP
#
# NAME                           READY   UP-TO-DATE   AVAILABLE   AGE
# deployment.apps/sso-platform   1/1     1            1           5m
```

### List Specific Resources

```bash
# Pods
kubectl get pods -n taskflow

# Deployments
kubectl get deployments -n taskflow

# Services
kubectl get services -n taskflow
kubectl get svc -n taskflow  # Short form

# ConfigMaps
kubectl get configmaps -n taskflow
kubectl get cm -n taskflow  # Short form

# Secrets
kubectl get secrets -n taskflow

# StatefulSets (for databases)
kubectl get statefulsets -n taskflow
kubectl get sts -n taskflow  # Short form

# Ingresses
kubectl get ingress -n taskflow
kubectl get ing -n taskflow  # Short form

# Persistent Volume Claims
kubectl get pvc -n taskflow
```

### Watch Resources in Real-Time

```bash
# Watch pods (updates automatically)
kubectl get pods -n taskflow -w

# Press Ctrl+C to stop watching

# Wide output (more details)
kubectl get pods -n taskflow -o wide

# JSON output (full details)
kubectl get pod sso-platform-xxx -n taskflow -o json

# YAML output (for copying/editing)
kubectl get pod sso-platform-xxx -n taskflow -o yaml
```

---

## 2. Pod Debugging

### Check Pod Status

```bash
# Basic status
kubectl get pods -n taskflow

# Detailed status
kubectl get pods -n taskflow -o wide

# Common statuses:
# - Running: All good ✅
# - Pending: Waiting for resources
# - CrashLoopBackOff: Container keeps crashing ❌
# - Init:0/2: Init containers running
# - ErrImagePull: Can't pull Docker image
# - ImagePullBackOff: Gave up pulling image
```

### Describe Pod (Most Important!)

```bash
# Shows EVERYTHING about a pod
kubectl describe pod <pod-name> -n taskflow

# Example:
kubectl describe pod sso-platform-56c8867449-5j47h -n taskflow

# What you'll see:
# - Status & conditions
# - Events (errors, warnings, pulls)
# - Container details
# - Environment variables (names only)
# - Volume mounts
# - Resource limits
# - Restart count
```

### View Pod Logs

```bash
# Current logs
kubectl logs <pod-name> -n taskflow

# Follow logs (live tail)
kubectl logs -f <pod-name> -n taskflow

# Last 50 lines
kubectl logs --tail=50 <pod-name> -n taskflow

# Logs from previous crash
kubectl logs --previous <pod-name> -n taskflow

# Logs from specific container (multi-container pods)
kubectl logs <pod-name> -c <container-name> -n taskflow

# Logs from init container
kubectl logs <pod-name> -c run-migrations -n taskflow
```

### Execute Commands Inside Pod

```bash
# Get a shell inside the pod
kubectl exec -it <pod-name> -n taskflow -- /bin/sh

# Or bash if available
kubectl exec -it <pod-name> -n taskflow -- /bin/bash

# Once inside, you can:
# - Check files: ls, cat
# - Test network: curl, wget
# - Check environment: env
# - View processes: ps aux
# - Exit: type 'exit'

# Run single command without shell
kubectl exec <pod-name> -n taskflow -- env
kubectl exec <pod-name> -n taskflow -- ls /app
kubectl exec <pod-name> -n taskflow -- cat /etc/hosts
```

### Check Container Resources

```bash
# See CPU/memory usage
kubectl top pods -n taskflow

# If command not found, enable metrics-server:
minikube addons enable metrics-server
```

---

## 3. Logs & Events

### View Events

```bash
# All events in namespace (sorted by time)
kubectl get events -n taskflow --sort-by='.lastTimestamp'

# Events for specific pod
kubectl get events -n taskflow --field-selector involvedObject.name=<pod-name>

# Watch events in real-time
kubectl get events -n taskflow -w
```

### Application Logs by Component

```bash
# SSO Platform logs
kubectl logs -l app.kubernetes.io/component=sso -n taskflow --tail=50

# API logs
kubectl logs -l app.kubernetes.io/component=api -n taskflow --tail=50

# MCP Server logs
kubectl logs -l app.kubernetes.io/component=mcp -n taskflow --tail=50

# Web Dashboard logs
kubectl logs -l app.kubernetes.io/component=web -n taskflow --tail=50

# PostgreSQL logs
kubectl logs sso-postgres-0 -n taskflow --tail=50
kubectl logs api-postgres-0 -n taskflow --tail=50
```

### Save Logs to File

```bash
# Save all SSO logs
kubectl logs sso-platform-xxx -n taskflow > /tmp/sso-logs.txt

# Save logs from all pods with label
kubectl logs -l app.kubernetes.io/name=taskflow -n taskflow --all-containers=true > /tmp/all-logs.txt
```

---

## 4. Secrets & ConfigMaps

### View Secrets (Safely)

```bash
# List secrets
kubectl get secrets -n taskflow

# Describe secret (doesn't show values)
kubectl describe secret sso-platform-secret -n taskflow

# View secret (base64 encoded)
kubectl get secret sso-platform-secret -n taskflow -o yaml

# Decode specific key
kubectl get secret sso-platform-secret -n taskflow -o jsonpath='{.data.BETTER_AUTH_SECRET}' | base64 -d
echo ""  # Add newline

# View all keys decoded
kubectl get secret sso-platform-secret -n taskflow -o json | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

### View ConfigMaps

```bash
# List ConfigMaps
kubectl get configmaps -n taskflow

# View ConfigMap content
kubectl get configmap sso-db-schema-sql -n taskflow -o yaml

# Get specific key from ConfigMap
kubectl get configmap sso-db-schema-sql -n taskflow -o jsonpath='{.data.schema\.sql}'
```

### Edit Secrets/ConfigMaps

```bash
# Edit secret (will open in editor)
kubectl edit secret sso-platform-secret -n taskflow

# Edit ConfigMap
kubectl edit configmap sso-platform-config -n taskflow

# Delete and recreate (easier for complex changes)
kubectl delete secret sso-platform-secret -n taskflow
kubectl create secret generic sso-platform-secret \
  --from-literal=BETTER_AUTH_SECRET="new-value" \
  -n taskflow
```

---

## 5. Networking & Services

### View Services

```bash
# List services
kubectl get svc -n taskflow

# Describe service (shows endpoints)
kubectl describe svc sso-platform -n taskflow

# See service endpoints (actual pod IPs)
kubectl get endpoints -n taskflow
```

### Test Service Connectivity

```bash
# From inside a pod
kubectl exec -it sso-platform-xxx -n taskflow -- curl http://api-postgres:5432

# Port forward to local machine
kubectl port-forward svc/sso-platform 3001:3001 -n taskflow
# Now access: http://localhost:3001

# Port forward pod directly
kubectl port-forward pod/sso-platform-xxx 3001:3001 -n taskflow
```

### DNS Debugging

```bash
# Create debug pod
kubectl run debug --image=busybox:1.36 --rm -it --restart=Never -n taskflow -- /bin/sh

# Inside debug pod:
nslookup sso-platform.taskflow.svc.cluster.local
nslookup api-postgres.taskflow.svc.cluster.local
wget -O- http://sso-platform:3001/api/health
exit
```

### View Ingress

```bash
# List ingresses
kubectl get ingress -n taskflow

# Describe ingress
kubectl describe ingress taskflow-web -n taskflow

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50
```

---

## 6. Helm Debugging

### View Helm Releases

```bash
# List releases
helm list -n taskflow

# Get release values
helm get values taskflow -n taskflow

# Get all computed values (with defaults)
helm get values taskflow -n taskflow --all

# Get release manifest (what was deployed)
helm get manifest taskflow -n taskflow

# Get release history
helm history taskflow -n taskflow
```

### Test Helm Chart Before Deploy

```bash
# Dry-run (doesn't actually deploy)
helm install taskflow ./helm/taskflow -n taskflow --dry-run --debug

# Template rendering (see generated YAML)
helm template taskflow ./helm/taskflow -n taskflow > /tmp/rendered.yaml

# Lint chart for errors
helm lint ./helm/taskflow
```

### Debug Helm Deployment

```bash
# Check Helm release status
helm status taskflow -n taskflow

# View last deployment notes
helm get notes taskflow -n taskflow

# Rollback to previous version
helm rollback taskflow -n taskflow

# Rollback to specific revision
helm rollback taskflow 2 -n taskflow
```

---

## 7. Common Issues & Fixes

### Issue: Pod is CrashLoopBackOff

**Symptoms**: Pod keeps restarting

**Debug**:
```bash
# 1. Check logs from crashed container
kubectl logs <pod-name> -n taskflow --previous

# 2. Describe pod for events
kubectl describe pod <pod-name> -n taskflow

# 3. Check if container has right command
kubectl get pod <pod-name> -n taskflow -o jsonpath='{.spec.containers[0].command}'
```

**Common causes**:
- Application error on startup
- Missing environment variable
- Database connection failed
- Port already in use

---

### Issue: ImagePullBackOff

**Symptoms**: Can't pull Docker image

**Debug**:
```bash
kubectl describe pod <pod-name> -n taskflow | grep -A 10 "Events"
```

**Fix**:
```bash
# Verify image exists in Minikube Docker
eval $(minikube docker-env)
docker images | grep taskflow

# If missing, rebuild
./scripts/build-images.sh
```

---

### Issue: Init Container Stuck

**Symptoms**: Pod shows `Init:0/2` for long time

**Debug**:
```bash
# Check init container logs
kubectl logs <pod-name> -c wait-for-db -n taskflow
kubectl logs <pod-name> -c run-migrations -n taskflow

# Describe pod to see which init container
kubectl describe pod <pod-name> -n taskflow
```

**Common causes**:
- Database not ready
- Migration SQL error
- Wrong DATABASE_URL

---

### Issue: Service Not Accessible

**Symptoms**: Can't reach service from browser/curl

**Debug**:
```bash
# 1. Check service exists
kubectl get svc sso-platform -n taskflow

# 2. Check endpoints (should show pod IP)
kubectl get endpoints sso-platform -n taskflow

# 3. Check pod is running
kubectl get pods -l app.kubernetes.io/component=sso -n taskflow

# 4. Test from inside cluster
kubectl run curl --image=curlimages/curl --rm -it --restart=Never -n taskflow -- curl http://sso-platform:3001/api/health

# 5. Check ingress
kubectl get ingress -n taskflow
kubectl describe ingress <ingress-name> -n taskflow
```

---

### Issue: Database Connection Failed

**Symptoms**: App logs show "connection refused" or "authentication failed"

**Debug**:
```bash
# 1. Check PostgreSQL is running
kubectl get pods -n taskflow | grep postgres

# 2. Check PostgreSQL logs
kubectl logs sso-postgres-0 -n taskflow --tail=50

# 3. Test connection from app pod
kubectl exec -it sso-platform-xxx -n taskflow -- sh
nc -zv sso-postgres 5432
exit

# 4. Verify DATABASE_URL secret
kubectl get secret sso-postgres-secret -n taskflow -o jsonpath='{.data.DATABASE_URL}' | base64 -d
echo ""
```

**Fix password mismatch**:
```bash
# Delete StatefulSet and PVC
kubectl delete statefulset sso-postgres -n taskflow
kubectl delete pvc postgres-data-sso-postgres-0 -n taskflow

# Helm will recreate with current password
kubectl get pods -n taskflow -w
```

---

## 8. Advanced Debugging

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n taskflow

# Node resource usage
kubectl top nodes

# Describe node
kubectl describe node minikube
```

### Persistent Volumes

```bash
# List PVCs
kubectl get pvc -n taskflow

# Describe PVC
kubectl describe pvc postgres-data-sso-postgres-0 -n taskflow

# List PVs
kubectl get pv

# Check what's using a PV
kubectl get pods -n taskflow -o json | jq '.items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName=="postgres-data-sso-postgres-0") | .metadata.name'
```

### Network Policies

```bash
# List network policies (if any)
kubectl get networkpolicies -n taskflow

# Test pod-to-pod connectivity
kubectl exec -it sso-platform-xxx -n taskflow -- nc -zv taskflow-api 8000
```

### Export Resources for Debugging

```bash
# Export all resources to YAML
kubectl get all -n taskflow -o yaml > /tmp/taskflow-resources.yaml

# Export specific resource
kubectl get deployment sso-platform -n taskflow -o yaml > /tmp/sso-deployment.yaml

# Share with someone for debugging
tar -czf taskflow-debug.tar.gz /tmp/taskflow-resources.yaml /tmp/*-logs.txt
```

---

## 🔧 Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# kubectl shortcuts
alias k='kubectl'
alias kg='kubectl get'
alias kd='kubectl describe'
alias kl='kubectl logs'
alias kx='kubectl exec -it'
alias kdel='kubectl delete'

# Taskflow specific
alias ktf='kubectl -n taskflow'
alias ktfpods='kubectl get pods -n taskflow'
alias ktflogs='kubectl logs -n taskflow'
alias ktfwatch='kubectl get pods -n taskflow -w'

# Helm shortcuts
alias h='helm'
alias hls='helm list'
alias hstat='helm status'
```

Reload shell: `source ~/.zshrc` (or ~/.bashrc)

Now you can use: `ktfpods` instead of `kubectl get pods -n taskflow`

---

## 📊 Monitoring Dashboard

### Kubernetes Dashboard

```bash
# Enable dashboard
minikube dashboard

# This opens browser with full GUI
# You can see:
# - All resources visually
# - Logs in UI
# - Resource graphs
# - Edit resources
```

### K9s (Terminal UI)

```bash
# Install k9s
brew install derailed/k9s/k9s

# Run
k9s -n taskflow

# Navigation:
# - :pods - View pods
# - :svc - View services
# - :deploy - View deployments
# - <enter> - View details
# - l - View logs
# - d - Describe
# - <ctrl-d> - Delete
# - ? - Help
```

---

## 🎓 Learning Path

**Day 1-2**: Master these
```bash
kubectl get pods -n taskflow
kubectl describe pod <name> -n taskflow
kubectl logs <pod-name> -n taskflow
```

**Day 3-5**: Add these
```bash
kubectl exec -it <pod-name> -n taskflow -- /bin/sh
kubectl get events -n taskflow --sort-by='.lastTimestamp'
kubectl port-forward svc/sso-platform 3001:3001 -n taskflow
```

**Week 2**: Explore
```bash
kubectl get all -n taskflow -o wide
kubectl top pods -n taskflow
helm get values taskflow -n taskflow
```

**Week 3**: Master
- Use labels for filtering
- Debug networking
- Edit resources live
- Create debug pods

---

## 📚 Additional Resources

- **kubectl Cheat Sheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- **Minikube Docs**: https://minikube.sigs.k8s.io/docs/
- **Helm Docs**: https://helm.sh/docs/
- **K9s**: https://k9scli.io/

---

**Remember**: Most debugging starts with:
1. `kubectl get pods -n taskflow` - What's the status?
2. `kubectl describe pod <name> -n taskflow` - What happened?
3. `kubectl logs <pod-name> -n taskflow` - What did it say?

Master these 3 commands and you'll solve 90% of issues!
