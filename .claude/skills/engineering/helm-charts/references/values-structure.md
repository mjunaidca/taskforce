# Values.yaml Structure Guide

## Recommended Organization

```yaml
# ======================
# GLOBAL CONFIGURATION
# ======================
global:
  imageRegistry: ""           # Override for all images
  imagePullSecrets: []        # Registry credentials
  storageClass: ""            # Default storage class

# ======================
# PER-SERVICE CONFIG
# ======================
api:
  enabled: true
  replicaCount: 1

  image:
    repository: taskflow/api
    tag: "latest"
    pullPolicy: IfNotPresent

  service:
    type: ClusterIP
    port: 8000
    annotations: {}

  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi

  # Environment variables
  env:
    LOG_LEVEL: "INFO"
    DEBUG: "false"

  # Sensitive env (reference secrets)
  envSecrets:
    DATABASE_URL: db-credentials
    OPENAI_API_KEY: api-keys

  # Health checks
  healthCheck:
    path: /health
    port: 8000
    initialDelaySeconds: 30

  # Pod scheduling
  nodeSelector: {}
  tolerations: []
  affinity: {}

web:
  enabled: true
  replicaCount: 1
  image:
    repository: taskflow/web
    tag: "latest"
  service:
    type: ClusterIP
    port: 3000

sso:
  enabled: true
  replicaCount: 1
  image:
    repository: taskflow/sso
    tag: "latest"
  service:
    port: 3001

mcpServer:
  enabled: true
  replicaCount: 1
  image:
    repository: taskflow/mcp-server
    tag: "latest"
  service:
    port: 8001

# ======================
# INFRASTRUCTURE
# ======================
postgresql:
  enabled: true
  auth:
    postgresPassword: "postgres"
    database: "taskflow"
  primary:
    persistence:
      size: 10Gi

# ======================
# NETWORKING
# ======================
ingress:
  enabled: false
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
  host: taskflow.local
  tls: []

# ======================
# SECURITY
# ======================
serviceAccount:
  create: true
  name: ""
  annotations: {}

podSecurityContext:
  fsGroup: 1000

securityContext:
  runAsNonRoot: true
  runAsUser: 1000

# ======================
# PERSISTENCE
# ======================
persistence:
  enabled: false
  storageClass: ""
  accessMode: ReadWriteOnce
  size: 10Gi

# ======================
# SECRETS (reference only)
# ======================
# Actual secrets should be created separately
# or use External Secrets Operator
secrets:
  databaseUrl: ""          # Set via --set or external
  openaiApiKey: ""         # Set via --set or external
  betterAuthSecret: ""     # Set via --set or external
```

## Environment-Specific Overrides

### values-dev.yaml
```yaml
api:
  replicaCount: 1
  resources:
    limits:
      cpu: 200m
      memory: 256Mi

ingress:
  enabled: true
  host: taskflow.local

postgresql:
  enabled: true
```

### values-prod.yaml
```yaml
api:
  replicaCount: 3
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi

ingress:
  enabled: true
  host: taskflow.example.com
  tls:
    - secretName: taskflow-tls
      hosts:
        - taskflow.example.com

postgresql:
  enabled: false  # Use external managed DB
```

## Usage

```bash
# Development
helm install taskflow ./helm/taskflow -f values-dev.yaml

# Production
helm install taskflow ./helm/taskflow \
  -f values-prod.yaml \
  --set secrets.databaseUrl=$DATABASE_URL \
  --set secrets.openaiApiKey=$OPENAI_API_KEY
```
