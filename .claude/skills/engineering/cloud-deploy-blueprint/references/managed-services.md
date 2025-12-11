# Managed Services Integration (Neon + Upstash)

## Why Managed Services?

Using managed services (external DBs, Redis) instead of in-cluster databases provides:

1. **Cloud Portability** - Same DB works across AKS, GKE, DOKS
2. **No StatefulSet Complexity** - No PVC management
3. **Built-in Backups** - Handled by provider
4. **Connection Pooling** - Neon handles this automatically
5. **Free Tiers** - Great for dev/hackathons

## Neon PostgreSQL

### Setup

1. Create account at https://neon.tech
2. Create a project
3. Create separate databases for each service:
   - `taskflow-sso`
   - `taskflow-api`
   - `taskflow-chatkit`
   - `taskflow-notify`

### Connection String Format

```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Important:** Use the **pooled** connection string for serverless-friendly connections.

### Helm Values Pattern

```yaml
managedServices:
  neon:
    enabled: true
    ssoDatabase: ""      # Injected via --set from secrets
    apiDatabase: ""
    chatkitDatabase: ""
    notificationDatabase: ""
```

### Secret Template Pattern

```yaml
{{- if .Values.managedServices.neon.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: sso-db-secret
stringData:
  DATABASE_URL: {{ .Values.managedServices.neon.ssoDatabase | quote }}
{{- end }}
```

### Disable In-Cluster Postgres

When using Neon, disable local postgres:

```yaml
sso:
  postgresql:
    enabled: false
api:
  postgresql:
    enabled: false
```

### Skip wait-for-db InitContainer

```yaml
{{- if not .Values.managedServices.neon.enabled }}
initContainers:
- name: wait-for-db
  # Only needed for in-cluster postgres
{{- end }}
```

## Upstash Redis

### Setup

1. Create account at https://upstash.com
2. Create a Redis database with TLS enabled
3. Note both connection methods:
   - **Native Redis**: `host:6379` + password (for Dapr)
   - **REST API**: `https://xxx.upstash.io` + token (for rate limiting)

### Connection Details

```
Host: xxx-xxx.upstash.io:6379
Password: AXxxxx
REST URL: https://xxx-xxx.upstash.io
REST Token: AXxxxx
```

### Helm Values Pattern

```yaml
managedServices:
  upstash:
    enabled: true
    host: ""        # xxx.upstash.io:6379
    password: ""
    restUrl: ""     # https://xxx.upstash.io
    restToken: ""
```

### Dapr Pub/Sub Configuration

```yaml
dapr:
  pubsub:
    name: taskflow-pubsub
    type: pubsub.redis
    enableTLS: "true"  # Required for Upstash
    # redisHost and redisPassword from secrets
```

### Dapr Component Template

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: {{ .Values.dapr.pubsub.name }}
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: {{ .Values.dapr.pubsub.redisHost | quote }}
  - name: redisPassword
    secretKeyRef:
      name: dapr-pubsub-secret
      key: redis-password
  - name: enableTLS
    value: {{ .Values.dapr.pubsub.enableTLS | quote }}
```

### Better Auth Rate Limiting (Upstash REST)

Better Auth uses Upstash REST API for rate limiting:

```typescript
// In Better Auth config
rateLimit: {
  storage: "redis",
  redis: {
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  }
}
```

Kubernetes Secret:
```yaml
stringData:
  REDIS_URL: {{ .Values.managedServices.upstash.restUrl | quote }}
  REDIS_TOKEN: {{ .Values.managedServices.upstash.restToken | quote }}
```

## GitHub Secrets for Managed Services

```
# Neon PostgreSQL
NEON_SSO_DATABASE_URL=postgresql://...
NEON_API_DATABASE_URL=postgresql://...
NEON_CHATKIT_DATABASE_URL=postgresql://...
NEON_NOTIFICATION_DATABASE_URL=postgresql://...

# Upstash Redis (Native)
UPSTASH_REDIS_HOST=xxx.upstash.io:6379
UPSTASH_REDIS_PASSWORD=AXxxxx

# Upstash Redis (REST)
REDIS_URL=https://xxx.upstash.io
REDIS_TOKEN=AXxxxx
```

## Helm --set Pattern

```bash
helm upgrade --install taskflow ./infrastructure/helm/taskflow \
  --set managedServices.neon.enabled=true \
  --set "managedServices.neon.ssoDatabase=${{ secrets.NEON_SSO_DATABASE_URL }}" \
  --set "managedServices.neon.apiDatabase=${{ secrets.NEON_API_DATABASE_URL }}" \
  --set managedServices.upstash.enabled=true \
  --set "managedServices.upstash.host=${{ secrets.UPSTASH_REDIS_HOST }}" \
  --set "managedServices.upstash.password=${{ secrets.UPSTASH_REDIS_PASSWORD }}" \
  --set "managedServices.upstash.restUrl=${{ secrets.REDIS_URL }}" \
  --set "managedServices.upstash.restToken=${{ secrets.REDIS_TOKEN }}"
```

## Migration Strategy

### Run Migrations Locally Against Neon

Don't run migrations in K8s pods. Run from local machine:

```bash
# SSO (Drizzle)
cd apps/sso
DATABASE_URL="postgresql://..." pnpm db:push
DATABASE_URL="postgresql://..." pnpm seed:prod

# API (Alembic)
cd apps/api
DATABASE_URL="postgresql://..." uv run alembic upgrade head

# Notification (Alembic)
cd apps/notification-service
DATABASE_URL="postgresql://..." uv run alembic upgrade head
```

### Why Not K8s Init Containers?

1. Keeps production images slim (no migration tools)
2. Avoids race conditions on first deploy
3. Migrations are one-time operations
4. Easier to debug locally

## Cost Comparison

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Neon | 0.5 GB storage, 1 project | Good for dev/hackathons |
| Upstash | 10K commands/day | Sufficient for small apps |
| In-cluster Postgres | Free (compute cost only) | More complex to manage |
