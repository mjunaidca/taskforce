# Docker & Kubernetes Network Topology

## Docker Compose Networking

### Default Network
Docker Compose creates a default network where services communicate by name.

```yaml
services:
  web:      # Accessible as "web" from other containers
  api:      # Accessible as "api" from other containers
  db:       # Accessible as "db" from other containers
```

### Service Discovery
```
# From inside 'web' container:
curl http://api:8000/health     # Works! Uses Docker DNS
curl http://localhost:8000      # FAILS! localhost = web container itself
curl http://host.docker.internal:8000  # Works on Docker Desktop (host machine)
```

### Port Mapping

```yaml
services:
  api:
    ports:
      - "8000:8000"   # host:container
      #   │     │
      #   │     └── Container listens on 8000
      #   └──────── Host machine exposes 8000
```

| Access From | URL | Works? |
|-------------|-----|--------|
| Host browser | http://localhost:8000 | ✅ Via port mapping |
| Another container | http://api:8000 | ✅ Via Docker network |
| Another container | http://localhost:8000 | ❌ Wrong host |

### Network Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HOST MACHINE                                 │
│                                                                      │
│   Browser: http://localhost:3000 ─┐                                  │
│   Browser: http://localhost:8000 ─┼─── Port mappings                │
│   Browser: http://localhost:3001 ─┘         │                       │
│                                             │                       │
│   ┌─────────────────────────────────────────┼─────────────────────┐ │
│   │              DOCKER NETWORK             │                     │ │
│   │                                         ▼                     │ │
│   │   ┌─────────┐    ┌─────────┐    ┌─────────┐                  │ │
│   │   │   web   │◄──►│   api   │◄──►│   sso   │                  │ │
│   │   │  :3000  │    │  :8000  │    │  :3001  │                  │ │
│   │   └─────────┘    └────┬────┘    └─────────┘                  │ │
│   │                       │                                       │ │
│   │                       ▼                                       │ │
│   │              External: Neon DB                                │ │
│   │              (Not in Docker)                                  │ │
│   │                                                               │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Kubernetes Networking

### Service Types

```yaml
# ClusterIP (internal only)
apiVersion: v1
kind: Service
metadata:
  name: api-svc
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 8000
      targetPort: 8000

# NodePort (external via node)
apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30000  # Accessible at node:30000

# LoadBalancer (cloud provider)
apiVersion: v1
kind: Service
metadata:
  name: web-lb
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 3000
```

### Service Discovery in K8s

```
# From any pod in same namespace:
curl http://api-svc:8000          # Service name

# From pod in different namespace:
curl http://api-svc.production:8000   # service.namespace

# Full DNS:
curl http://api-svc.production.svc.cluster.local:8000
```

### K8s Network Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                               │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      NAMESPACE: production                       │  │
│   │                                                                  │  │
│   │   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │  │
│   │   │   web-svc    │     │   api-svc    │     │   sso-svc    │   │  │
│   │   │  ClusterIP   │     │  ClusterIP   │     │  ClusterIP   │   │  │
│   │   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │  │
│   │          │                    │                    │            │  │
│   │          ▼                    ▼                    ▼            │  │
│   │   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │  │
│   │   │  web pods    │◄───►│  api pods    │◄───►│  sso pods    │   │  │
│   │   │  (replicas)  │     │  (replicas)  │     │  (replicas)  │   │  │
│   │   └──────────────┘     └──────────────┘     └──────────────┘   │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌──────────────┐                                                      │
│   │   Ingress    │  ← External traffic                                 │
│   │  Controller  │                                                      │
│   └──────────────┘                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
     External: Neon DB (managed)
```

## URL Reference Table

| Context | localhost Works? | Service Name Works? | Use |
|---------|------------------|---------------------|-----|
| Browser → API | ✅ (port mapped) | ❌ | localhost |
| Container → Container | ❌ | ✅ | service name |
| Pod → Pod (same ns) | ❌ | ✅ | service-svc |
| Pod → Pod (diff ns) | ❌ | ✅ | svc.namespace |
| Pod → External DB | N/A | N/A | actual URL |

## Environment Variable Patterns

### Docker Compose
```yaml
services:
  web:
    build:
      args:
        # Browser-facing (baked at build)
        - NEXT_PUBLIC_API_URL=http://localhost:8000
    environment:
      # Server-side (runtime)
      - API_URL=http://api:8000

  api:
    environment:
      # Internal communication
      - SSO_URL=http://sso:3001
      # External database
      - DATABASE_URL=${DATABASE_URL}
      # Dynamic based on deployment
      - FRONTEND_URL=${FRONTEND_URL:-http://web:3000}
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          env:
            # Use K8s service names
            - name: SSO_URL
              value: "http://sso-svc:3001"
            # From ConfigMap
            - name: FRONTEND_URL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: frontend-url
            # From Secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection-string
```

## Health Check Patterns

### Docker Compose
```yaml
services:
  api:
    healthcheck:
      # IMPORTANT: Use 127.0.0.1, NOT localhost!
      # localhost can resolve to IPv6 [::1] which fails if server only listens on IPv4
      test: ["CMD", "curl", "-f", "http://127.0.0.1:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  web:
    healthcheck:
      # For wget (Alpine images without curl):
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    depends_on:
      api:
        condition: service_healthy
```

### IPv6 Gotcha
**Problem:** `localhost` may resolve to `[::1]` (IPv6) but server binds to `0.0.0.0` (IPv4 only)
**Solution:** Always use `127.0.0.1` in healthchecks, never `localhost`

### Kubernetes
```yaml
spec:
  containers:
    - name: api
      livenessProbe:
        httpGet:
          path: /health
          port: 8000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8000
        initialDelaySeconds: 5
        periodSeconds: 5
```
