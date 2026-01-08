# kubectl-ai Prompt Patterns

## Effective Prompt Structures

### Information Queries
```
"show me [resource type] in [namespace]"
"list all [resources] with [condition]"
"describe [resource name] in [namespace]"
"what [resources] are [state]?"
```

### Creation Prompts
```
"create a [resource] named [name] with [specifications]"
"deploy [app] using image [image:tag] with [replicas] replicas"
"expose [deployment] on port [port] as [service type]"
```

### Modification Prompts
```
"scale [deployment] to [count] replicas"
"update [deployment] to use image [new-image]"
"add [resource limit] to [deployment]"
"restart [deployment]"
```

### Troubleshooting Prompts
```
"why is [pod] failing?"
"show logs from [pod] in [namespace]"
"find pods with [error condition]"
"diagnose [service] connectivity"
```

## Examples by Category

### Deployment Operations
```bash
kubectl-ai "create deployment web with nginx:1.21 image, 3 replicas, 512Mi memory limit"
kubectl-ai "scale the api deployment to 5 replicas"
kubectl-ai "update api deployment to use api:v2.0.0 image with rolling update"
```

### Service Operations
```bash
kubectl-ai "expose deployment api as ClusterIP service on port 8000"
kubectl-ai "create LoadBalancer service for web on port 80"
kubectl-ai "show all services with their endpoints"
```

### ConfigMap/Secret Operations
```bash
kubectl-ai "create configmap db-config with DATABASE_HOST=postgres DATABASE_PORT=5432"
kubectl-ai "create secret api-keys with OPENAI_API_KEY from literal"
kubectl-ai "update configmap app-config to add LOG_LEVEL=debug"
```

### Ingress Operations
```bash
kubectl-ai "create ingress for taskflow.local with /api to api:8000 and / to web:3000"
kubectl-ai "add TLS to ingress using secret tls-cert"
kubectl-ai "show ingress rules"
```

### Debugging Prompts
```bash
kubectl-ai "show recent events for failing pods"
kubectl-ai "tail logs from api pod last 100 lines"
kubectl-ai "describe pod api-xyz and explain the issue"
kubectl-ai "find pods in CrashLoopBackOff state"
kubectl-ai "check resource usage across all pods"
```

## Namespace-Aware Prompts

Always specify namespace for clarity:
```bash
kubectl-ai "list pods in production namespace"
kubectl-ai "scale api in staging to 2 replicas"
kubectl-ai "delete all jobs in default namespace"
```

## Conditional Operations

```bash
kubectl-ai "delete all pods in Evicted state"
kubectl-ai "restart pods that have been running more than 7 days"
kubectl-ai "scale down deployments with 0 ready pods"
```
