# Helm Charts Walkthrough - Learn by Example

**Understanding TaskFlow's Kubernetes deployment through Helm**

---

## 📁 Helm Chart Structure

```
helm/taskflow/
├── Chart.yaml                          # Helm chart metadata
├── values.yaml                         # Configuration values (THE BRAIN)
├── README.md                           # Chart documentation
└── templates/                          # Kubernetes manifests (templates)
    ├── _helpers.tpl                    # Reusable template functions
    ├── namespace.yaml                  # Create taskflow namespace
    ├── configmap.yaml                  # Non-sensitive configuration
    ├── secrets.yaml                    # Sensitive data (passwords, keys)
    │
    ├── sso-platform/                   # SSO Service (Better Auth)
    │   ├── deployment.yaml            # How to run SSO pods
    │   ├── service.yaml               # Network access to SSO
    │   ├── ingress.yaml               # External access (if enabled)
    │   ├── postgres-statefulset.yaml  # SSO database (persistent)
    │   └── postgres-service.yaml      # Network access to DB
    │
    ├── api/                            # TaskFlow API (FastAPI)
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── ingress.yaml
    │   ├── postgres-statefulset.yaml
    │   └── postgres-service.yaml
    │
    ├── web-dashboard/                  # Next.js Frontend
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── ingress.yaml
    │
    └── mcp-server/                     # Agent Communication
        ├── deployment.yaml
        └── service.yaml
```

---

## 🧠 The Flow: How Helm Works

### 1. **values.yaml** (The Brain)

This is where ALL configuration lives. Think of it as your "settings file".

```yaml
# Example from our values.yaml
sso:
  enabled: true                         # Should we deploy this?
  replicaCount: 1                       # How many pods?
  image:
    repository: taskflow/sso-platform
    tag: latest
  env:
    NODE_ENV: development               # Environment setting
    BETTER_AUTH_URL: http://localhost:3001
  smtp:
    enabled: true
    host: smtp.gmail.com
    port: "587"
```

**Key Concept**: values.yaml is the ONLY file you edit. Templates use these values via `{{ .Values.* }}`.

---

### 2. **Templates** (The Workers)

Templates are Kubernetes YAML files with placeholders that get filled from values.yaml.

#### Example: SSO Deployment

Let's break down `templates/sso-platform/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.sso.name }}          # From values.yaml
  namespace: {{ .Values.global.namespace }}
  labels:
    app.kubernetes.io/name: {{ .Values.sso.name }}
    app.kubernetes.io/component: sso
spec:
  replicas: {{ .Values.sso.replicaCount }}  # How many copies?
  selector:
    matchLabels:
      app.kubernetes.io/component: sso
  template:
    metadata:
      labels:
        app.kubernetes.io/component: sso
    spec:
      # 1. Init Containers (run BEFORE main container)
      initContainers:
      - name: wait-for-db
        image: busybox:1.36
        command: ["sh", "-c"]
        args:
        - |
          # Wait until PostgreSQL is ready
          until nc -z {{ .Values.sso.database.host }} {{ .Values.sso.database.port }}; do
            echo "Waiting for PostgreSQL..."
            sleep 2
          done

      - name: run-migrations
        image: "{{ .Values.sso.image.repository }}:{{ .Values.sso.image.tag }}"
        command: ["sh", "-c"]
        args:
        - |
          # Run database migrations automatically
          npx drizzle-kit push --config=drizzle.config.ts
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: sso-postgres-secret
              key: DATABASE_URL

      # 2. Main Container (the actual application)
      containers:
      - name: sso-platform
        image: "{{ .Values.sso.image.repository }}:{{ .Values.sso.image.tag }}"
        ports:
        - name: http
          containerPort: {{ .Values.sso.service.targetPort }}

        # 3. Environment Variables (from ConfigMap)
        envFrom:
        - configMapRef:
            name: sso-platform-config

        # 4. Secrets (sensitive data)
        env:
        - name: BETTER_AUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: sso-platform-secret
              key: BETTER_AUTH_SECRET
        - name: SMTP_PASS
          valueFrom:
            secretKeyRef:
              name: sso-platform-secret
              key: SMTP_PASS

        # 5. Health Checks
        livenessProbe:          # Is the app alive?
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:         # Is the app ready for traffic?
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Key Concepts**:
- **Init Containers**: Run once before main app starts (migrations, waiting for dependencies)
- **envFrom**: Load ALL variables from ConfigMap
- **env**: Load specific variables from Secrets
- **Probes**: Kubernetes checks if app is healthy

---

### 3. **ConfigMaps** (Non-Sensitive Config)

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sso-platform-config
data:
  NODE_ENV: {{ .Values.sso.env.NODE_ENV | quote }}
  BETTER_AUTH_URL: {{ .Values.sso.env.BETTER_AUTH_URL | quote }}
  ALLOWED_ORIGINS: {{ .Values.sso.env.ALLOWED_ORIGINS | quote }}

  # SMTP (non-sensitive parts)
  SMTP_HOST: {{ .Values.sso.smtp.host | quote }}
  SMTP_PORT: {{ .Values.sso.smtp.port | quote }}
  SMTP_USER: {{ .Values.sso.smtp.user | quote }}
```

**When to use ConfigMaps**:
- Public configuration (URLs, ports, hostnames)
- Feature flags
- Configuration files

**When NOT to use ConfigMaps**:
- Passwords
- API keys
- Tokens
- Certificates

---

### 4. **Secrets** (Sensitive Data)

```yaml
# templates/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sso-platform-secret
type: Opaque
stringData:                             # Gets base64 encoded automatically
  BETTER_AUTH_SECRET: {{ .Values.sso.env.BETTER_AUTH_SECRET | quote }}
  DATABASE_PASSWORD: {{ .Values.sso.postgresql.password | quote }}
  SMTP_PASS: {{ .Values.sso.smtp.password | quote }}
```

**Key Differences from ConfigMap**:
- ✅ Base64 encoded automatically
- ✅ Not visible in `kubectl get`
- ✅ Can be encrypted at rest
- ✅ RBAC can restrict access

---

### 5. **Services** (Networking)

```yaml
# templates/sso-platform/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: sso-platform
spec:
  type: ClusterIP                       # Only accessible inside cluster
  ports:
  - port: 3001                          # Port inside cluster
    targetPort: 3001                    # Port on pod
    name: http
  selector:
    app.kubernetes.io/component: sso    # Which pods to send traffic to
```

**Service Types**:
- **ClusterIP**: Internal only (default) - Used for all our services
- **NodePort**: Exposed on each node's IP
- **LoadBalancer**: Cloud provider load balancer
- **ExternalName**: DNS alias

**Why ClusterIP?**: We use port-forwarding for local access, so services only need internal communication.

---

### 6. **StatefulSets** (Databases)

```yaml
# templates/sso-platform/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet                       # Not Deployment!
metadata:
  name: sso-postgres
spec:
  serviceName: sso-postgres             # Required for StatefulSet
  replicas: 1
  selector:
    matchLabels:
      app: sso-postgres
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:17-alpine
        env:
        - name: POSTGRES_DB
          value: sso_db
        - name: POSTGRES_USER
          value: sso_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sso-postgres-secret
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data

  # Persistent storage
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi                  # 1GB persistent disk
```

**StatefulSet vs Deployment**:
| Feature | Deployment | StatefulSet |
|---------|-----------|-------------|
| Pod names | Random | Predictable (sso-postgres-0) |
| Storage | Ephemeral | Persistent |
| Use case | Stateless apps | Databases, caches |
| Restart | Data lost | Data preserved |

---

## 🔄 Deployment Flow

### What Happens When You Run `helm install`

```bash
helm install taskflow ./helm/taskflow \
  --set sso.smtp.password="mypassword"
```

**Step-by-Step**:

1. **Helm reads values.yaml**
   - Loads default configuration
   - Applies `--set` overrides

2. **Helm renders templates**
   - Replaces `{{ .Values.* }}` with actual values
   - Generates Kubernetes YAML files

3. **Helm applies to Kubernetes**
   ```
   Creating namespace...           ✅
   Creating ConfigMaps...          ✅
   Creating Secrets...             ✅
   Creating Services...            ✅
   Creating StatefulSets...        ✅
   Creating Deployments...         ✅
   ```

4. **Kubernetes schedules pods**
   - Pulls Docker images
   - Runs init containers (migrations)
   - Starts main containers
   - Performs health checks

5. **Services become available**
   - Pods get IP addresses
   - Services route traffic
   - Port-forwards work

---

## 🎯 Key Helm Concepts

### 1. Template Functions

```yaml
# Quote strings safely
NODE_ENV: {{ .Values.sso.env.NODE_ENV | quote }}

# Default values
replicas: {{ .Values.sso.replicaCount | default 1 }}

# Conditional rendering
{{- if .Values.sso.smtp.enabled }}
SMTP_HOST: {{ .Values.sso.smtp.host }}
{{- end }}

# Include reusable templates
{{- include "taskflow.labels" . | nindent 4 }}
```

### 2. Values Hierarchy

```yaml
# Global values (shared)
global:
  namespace: taskflow

# Service-specific values
sso:
  enabled: true
  env:
    NODE_ENV: development
```

**Access in templates**:
```yaml
namespace: {{ .Values.global.namespace }}      # taskflow
env: {{ .Values.sso.env.NODE_ENV }}            # development
```

### 3. Chart Dependencies

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

**We don't use this** - We manage PostgreSQL directly via StatefulSets for learning purposes.

---

## 🔍 Debugging Helm Charts

### 1. Dry Run (Preview without applying)

```bash
helm install taskflow ./helm/taskflow --dry-run --debug
```

Shows exact YAML that would be applied.

### 2. Template Rendering

```bash
helm template taskflow ./helm/taskflow | less
```

See rendered templates without connecting to Kubernetes.

### 3. Get Deployed Values

```bash
helm get values taskflow -n taskflow
```

See what values were actually used.

### 4. Check What's Deployed

```bash
helm list -n taskflow
helm status taskflow -n taskflow
```

---

## 📝 Common Patterns

### Pattern 1: Conditional Features

```yaml
# values.yaml
smtp:
  enabled: true                         # Feature flag

# template
{{- if .Values.sso.smtp.enabled }}
- name: SMTP_HOST
  value: {{ .Values.sso.smtp.host }}
{{- end }}
```

### Pattern 2: Environment-Specific Values

```yaml
# values-dev.yaml
sso:
  env:
    NODE_ENV: development
    BETTER_AUTH_URL: http://localhost:3001

# values-prod.yaml
sso:
  env:
    NODE_ENV: production
    BETTER_AUTH_URL: https://sso.taskflow.com
```

Deploy with:
```bash
helm install taskflow ./helm/taskflow -f values-prod.yaml
```

### Pattern 3: Secret Management

```bash
# Override secrets at deploy time (don't commit!)
helm install taskflow ./helm/taskflow \
  --set sso.env.BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
  --set sso.smtp.password="${SMTP_PASS}"
```

---

## ✅ Best Practices We Follow

1. **Separation of Concerns**:
   - ConfigMaps: Non-sensitive config
   - Secrets: Sensitive data
   - Values: Configuration input

2. **Init Containers for Dependencies**:
   - Wait for database before starting app
   - Run migrations before app starts
   - No manual intervention needed

3. **Health Checks**:
   - Liveness: Restart if unhealthy
   - Readiness: Don't send traffic if not ready

4. **Resource Organization**:
   - One folder per service
   - Consistent naming (deployment, service, ingress)

5. **StatefulSets for Data**:
   - Databases use StatefulSets (persistent storage)
   - Apps use Deployments (stateless)

---

## 🎓 Learning Resources

### Helm Docs
- Official: https://helm.sh/docs/
- Best Practices: https://helm.sh/docs/chart_best_practices/

### Kubernetes Concepts
- Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Services: https://kubernetes.io/docs/concepts/services-networking/service/
- ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- Secrets: https://kubernetes.io/docs/concepts/configuration/secret/

### Our Docs
- **START-HERE.md**: Quick start guide
- **KUBERNETES-QUICKSTART.md**: Detailed operations
- **LEARNINGS-PHASE-IV.md**: What we learned

---

## 🚀 Next Steps

1. **Modify values.yaml**: Change a config value and redeploy
2. **Add a new service**: Copy existing template structure
3. **Create environment files**: values-dev.yaml, values-prod.yaml
4. **Explore templates**: Read through deployment.yaml files
5. **Practice helm commands**: template, install, upgrade, rollback

**Pro Tip**: The best way to learn Helm is to break things and fix them. Change values.yaml, deploy, see what happens!
