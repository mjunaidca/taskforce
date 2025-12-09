# Minikube Addons Guide

## Production-Essential Addons

### ingress
Enables NGINX Ingress Controller for routing external traffic.

```bash
minikube addons enable ingress

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

**Use case**: Route external traffic to services based on hostname/path.

### metrics-server
Enables resource metrics (CPU/memory) for pods and nodes.

```bash
minikube addons enable metrics-server

# Usage
kubectl top pods
kubectl top nodes
```

**Use case**: Monitor resource usage, enable HPA (Horizontal Pod Autoscaler).

### storage-provisioner
Enables dynamic PersistentVolume provisioning.

```bash
minikube addons enable storage-provisioner

# Creates default StorageClass
kubectl get storageclass
```

**Use case**: Automatically provision storage for PersistentVolumeClaims.

## Development Addons

### dashboard
Kubernetes web UI for cluster management.

```bash
minikube addons enable dashboard
minikube dashboard  # Opens in browser
```

### registry
Local container registry within Minikube.

```bash
minikube addons enable registry

# Push images to: localhost:5000/my-image
```

### ingress-dns
Enables DNS resolution for ingress hostnames.

```bash
minikube addons enable ingress-dns

# Configure your system to use Minikube DNS
# macOS: Add to /etc/resolver/minikube-test
#   nameserver $(minikube ip)
#   search_order 1
#   timeout 5
```

## Monitoring Addons

### prometheus (via helm)
```bash
# Not a built-in addon, install via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus
```

## Recommended Setup for TaskFlow

```bash
# Essential for any deployment
minikube addons enable ingress
minikube addons enable storage-provisioner
minikube addons enable metrics-server

# For development
minikube addons enable dashboard

# Optional for local registry
minikube addons enable registry
```
