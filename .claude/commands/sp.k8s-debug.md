# Kubernetes Deployment Debugger

Quick diagnosis for Kubernetes deployment issues.

## Instructions

Run the following diagnostic commands in sequence and analyze results:

### 1. Check Pod Status
```bash
kubectl get pods -n taskflow
```

### 2. For any non-Running pods, describe them:
```bash
kubectl describe pod <pod-name> -n taskflow | grep -E "(Image:|Failed|Error|Reason|Message)"
```

### 3. Check recent events:
```bash
kubectl get events -n taskflow --sort-by='.lastTimestamp' | tail -15
```

### 4. Check node architecture (critical for image issues):
```bash
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.architecture}'
```

### 5. For CrashLoopBackOff, check logs:
```bash
kubectl logs <pod-name> -n taskflow --tail=30
```

## Common Error Resolution

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `ImagePullBackOff` + "not found" | Wrong image tag | Check if build completed, verify tag exists |
| `ImagePullBackOff` + "unauthorized" | Private package | Make GHCR package public or fix imagePullSecrets |
| `ImagePullBackOff` + "no match for platform" | Architecture mismatch | Build for correct platform (arm64 vs amd64) |
| `CrashLoopBackOff` + "exec format error" | Wrong CPU arch binary | Rebuild with `platforms: linux/<arch>` matching cluster |
| `CrashLoopBackOff` + exit code | App error | Check logs for stack trace |

## Build Fix Template (ARM64)

```yaml
- uses: docker/build-push-action@v5
  with:
    platforms: linux/arm64
    provenance: false
    no-cache: true
```

See `aks-deployment-troubleshooter` skill for detailed resolution guides.
