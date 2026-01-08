# Kubernetes Troubleshooting Guide

## Pod Issues

### Pod Stuck in Pending

**Symptoms**: Pod shows `Pending` status indefinitely

**Diagnosis**:
```bash
kubectl describe pod <pod-name>
# Look for Events section
```

**Common Causes**:
| Cause | Solution |
|-------|----------|
| Insufficient resources | Check node capacity, scale cluster or reduce requests |
| No matching node (affinity/taints) | Review nodeSelector, tolerations |
| PVC not bound | Check PVC status, StorageClass availability |

### Pod in CrashLoopBackOff

**Symptoms**: Pod repeatedly crashes and restarts

**Diagnosis**:
```bash
kubectl logs <pod-name> --previous
kubectl describe pod <pod-name>
```

**Common Causes**:
| Cause | Solution |
|-------|----------|
| Application error | Check logs for stack trace |
| Missing config/secret | Verify ConfigMaps and Secrets exist |
| Liveness probe failing | Adjust probe timing or fix endpoint |
| OOMKilled | Increase memory limits |

### Pod in ImagePullBackOff

**Symptoms**: Can't pull container image

**Diagnosis**:
```bash
kubectl describe pod <pod-name>
# Check Events for pull errors
```

**Common Causes**:
| Cause | Solution |
|-------|----------|
| Image doesn't exist | Verify image name and tag |
| Private registry | Add imagePullSecrets |
| Network issue | Check cluster DNS and network policies |

## Service Issues

### Service Not Reachable

**Diagnosis**:
```bash
# Check service exists
kubectl get svc <service-name>

# Check endpoints
kubectl get endpoints <service-name>

# Test from within cluster
kubectl run test --rm -it --image=busybox -- wget -qO- http://<service>:<port>
```

**Common Causes**:
| Cause | Solution |
|-------|----------|
| No endpoints | Check pod labels match service selector |
| Wrong port | Verify targetPort matches container port |
| Network policy | Check if NetworkPolicy is blocking traffic |

### Service Has No Endpoints

**Diagnosis**:
```bash
# Compare service selector with pod labels
kubectl get svc <service> -o yaml | grep -A5 selector
kubectl get pods --show-labels
```

**Solution**: Ensure pod labels match service selector exactly

## Ingress Issues

### Ingress Not Working

**Diagnosis**:
```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress <ingress-name>

# Check service backend
kubectl get svc <backend-service>
```

**Common Causes**:
| Cause | Solution |
|-------|----------|
| Ingress controller not installed | Install nginx-ingress or enable Minikube addon |
| Wrong ingressClassName | Verify class matches controller |
| Backend service not found | Check service name and port |
| DNS not configured | Add entry to /etc/hosts |

## Resource Issues

### OOMKilled

**Symptoms**: Container killed due to memory limit

**Diagnosis**:
```bash
kubectl describe pod <pod-name>
# Look for: Reason: OOMKilled
```

**Solution**:
```yaml
resources:
  limits:
    memory: "512Mi"  # Increase this
  requests:
    memory: "256Mi"
```

### CPU Throttling

**Symptoms**: Slow performance, high latency

**Diagnosis**:
```bash
kubectl top pod <pod-name>
```

**Solution**:
```yaml
resources:
  limits:
    cpu: "1000m"  # Increase or remove limit
  requests:
    cpu: "500m"
```

## Network Debugging

### DNS Resolution

```bash
# Test DNS from pod
kubectl exec -it <pod> -- nslookup kubernetes.default
kubectl exec -it <pod> -- nslookup <service-name>

# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Connectivity Test

```bash
# From one pod to another
kubectl exec -it <source-pod> -- wget -qO- http://<target-service>:<port>

# Check if port is open
kubectl exec -it <pod> -- nc -zv <target-host> <port>
```

## Quick Diagnostic Commands

```bash
# Overview of cluster health
kubectl get nodes
kubectl get pods -A | grep -v Running

# Recent events
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Resource usage
kubectl top nodes
kubectl top pods -A

# Problematic pods
kubectl get pods -A | grep -E 'Error|CrashLoop|Pending|ImagePull'
```
