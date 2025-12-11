# Dapr Setup Guide for TaskFlow

This guide covers setting up Dapr for TaskFlow on Minikube/Kubernetes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DAPR CONTROL PLANE                            │   │
│  │  (dapr-system namespace)                                         │   │
│  │  - dapr-operator        - dapr-sentry                           │   │
│  │  - dapr-placement       - dapr-sidecar-injector                 │   │
│  │  - dapr-scheduler (3x)                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                    │
│  │  TaskFlow API Pod   │    │  Notification Svc   │                    │
│  │  ┌───────┐ ┌──────┐ │    │  ┌───────┐ ┌──────┐ │                    │
│  │  │ API   │ │ Dapr │ │    │  │ Notif │ │ Dapr │ │                    │
│  │  │       │◀┼▶Sidecar│─────▶│       │◀┼▶Sidecar│ │                    │
│  │  │ :8000 │ │ :3500│ │    │  │ :8001 │ │ :3500│ │                    │
│  │  └───────┘ └──────┘ │    │  └───────┘ └──────┘ │                    │
│  └─────────────────────┘    └─────────────────────┘                    │
│            │                           ▲                                │
│            │     Dapr Pub/Sub          │                                │
│            └───────────┬───────────────┘                                │
│                        ▼                                                │
│              ┌─────────────────┐                                        │
│              │     Redis       │  (local) or Kafka (production)         │
│              └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Minikube installed and running
- kubectl configured
- Helm 3.x installed

## Step 1: Start Minikube

```bash
# Start minikube with enough resources
minikube start --cpus=4 --memory=8192

# Verify
kubectl cluster-info
```

## Step 2: Install Dapr on Kubernetes via Helm

```bash
# Add Dapr Helm repo
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Install Dapr control plane (v1.15 for stability)
helm upgrade --install dapr dapr/dapr \
  --version=1.15 \
  --namespace dapr-system \
  --create-namespace \
  --wait

# Verify installation (all pods should be Running 1/1)
kubectl get pods -n dapr-system
```

Expected output:
```
NAME                                    READY   STATUS    RESTARTS   AGE
dapr-operator-xxx                       1/1     Running   0          1m
dapr-placement-server-0                 1/1     Running   0          1m
dapr-scheduler-server-0                 1/1     Running   0          1m
dapr-scheduler-server-1                 1/1     Running   0          1m
dapr-scheduler-server-2                 1/1     Running   0          1m
dapr-sentry-xxx                         1/1     Running   0          1m
dapr-sidecar-injector-xxx               1/1     Running   0          1m
```

## Step 3: Install Dapr Dashboard (Optional)

```bash
helm install dapr-dashboard dapr/dapr-dashboard --namespace dapr-system

# Access dashboard
kubectl port-forward service/dapr-dashboard 8080:8080 -n dapr-system
# Open http://localhost:8080
```

## Step 4: Deploy TaskFlow with Dapr

```bash
cd helm/taskflow

# Install TaskFlow (includes Redis, Dapr components)
helm upgrade --install taskflow . \
  --namespace taskflow \
  --create-namespace \
  --set dapr.enabled=true \
  --wait

# Verify pods have 2/2 containers (app + Dapr sidecar)
kubectl get pods -n taskflow
```

Expected output:
```
NAME                                    READY   STATUS    RESTARTS   AGE
taskflow-api-xxx                        2/2     Running   0          1m
notification-service-xxx                2/2     Running   0          1m
redis-xxx                               1/1     Running   0          1m
...
```

## Step 5: Verify Dapr Components

```bash
# List Dapr components
kubectl get components -n taskflow

# Should show:
# taskflow-pubsub     pubsub.redis
# taskflow-scheduler  scheduler.cron
```

## Step 6: Test Pub/Sub Flow

```bash
# Port forward the API
kubectl port-forward svc/taskflow-api 8000:8000 -n taskflow &

# Create a task with due_date (triggers reminder scheduling)
curl -X POST http://localhost:8000/api/projects/1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Test Dapr Integration",
    "due_date": "2025-12-12T10:00:00Z",
    "is_recurring": true,
    "recurrence_pattern": "daily",
    "recurrence_trigger": "on_due_date"
  }'

# Check Dapr sidecar logs for pub/sub activity
kubectl logs -l app.kubernetes.io/component=api -c daprd -n taskflow --tail=50
```

## Step 7: Test Job Scheduling

The API schedules Dapr Jobs for:
1. **Recurring task spawn** - at exact `due_date`
2. **Reminders** - 24 hours before `due_date`

Check scheduled jobs:
```bash
# Check API logs for job scheduling
kubectl logs -l app.kubernetes.io/component=api -c api -n taskflow | grep DAPR-JOB
```

## Troubleshooting

### Pods stuck at 1/2 Ready
Dapr sidecar not injecting. Check:
```bash
# Verify Dapr is installed
kubectl get pods -n dapr-system

# Check sidecar injector logs
kubectl logs -l app=dapr-sidecar-injector -n dapr-system
```

### Pub/Sub not working
```bash
# Check component is loaded
kubectl get components -n taskflow

# Check Dapr logs
kubectl logs <pod-name> -c daprd -n taskflow
```

### Jobs not firing
```bash
# Check scheduler pods
kubectl get pods -n dapr-system | grep scheduler

# Check scheduler logs
kubectl logs -l app=dapr-scheduler-server -n dapr-system
```

## Production: Switch to Kafka

For production (Redpanda Cloud/Kafka):

```yaml
# values-production.yaml
dapr:
  enabled: true
  pubsub:
    name: taskflow-pubsub
    type: pubsub.kafka
    brokers: "your-kafka-broker:9092"
    consumerGroup: taskflow-group
    authType: password
    secretName: kafka-credentials
```

Then:
```bash
# Create Kafka credentials secret
kubectl create secret generic kafka-credentials \
  --from-literal=username=your-username \
  --from-literal=password=your-password \
  -n taskflow

# Deploy with production values
helm upgrade --install taskflow . \
  -f values-production.yaml \
  --namespace taskflow
```

## Architecture Benefits

| Without Dapr | With Dapr |
|-------------|-----------|
| `pip install kafka-python` | HTTP to sidecar |
| Manual connection management | Automatic retries |
| Cron polling every 60s | Exact-time Jobs API |
| Hardcoded broker config | YAML component swap |
| Tight service coupling | Event-driven decoupling |
