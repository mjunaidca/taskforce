# Container Gotchas & Solutions

Common issues when containerizing applications and how to solve them.

---

## 1. SSO/Better Auth Breaks in Docker

### Symptom
```
Error: Invalid origin
Auth callback fails
Login redirects to localhost (unreachable from container)
```

### Root Cause
Better Auth validates origins against `trustedOrigins`. When running in Docker, the frontend makes requests from `web:3000` not `localhost:3000`.

### Solution

**sso-platform/src/lib/auth.ts:**
```typescript
export const auth = betterAuth({
  trustedOrigins: [
    // Always include localhost for local dev
    "http://localhost:3000",
    "http://localhost:8000",

    // Docker Compose service names
    "http://web:3000",
    "http://api:8000",

    // Production
    process.env.FRONTEND_URL,
    process.env.API_URL,
  ].filter(Boolean),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
});
```

**docker-compose.yml:**
```yaml
services:
  sso:
    environment:
      - BETTER_AUTH_URL=http://sso:3001
      - FRONTEND_URL=http://web:3000
      - API_URL=http://api:8000
```

---

## 2. NEXT_PUBLIC_* Variables Don't Update

### Symptom
```
Changed NEXT_PUBLIC_API_URL in docker-compose but app still uses old value
```

### Root Cause
NEXT_PUBLIC_* variables are **baked in at build time**. They cannot be changed at runtime.

### Solution

**Option A: Build with correct values**
```yaml
services:
  web:
    build:
      context: ./web-dashboard
      args:
        - NEXT_PUBLIC_API_URL=http://api:8000
        - NEXT_PUBLIC_SSO_URL=http://sso:3001
```

**Option B: Use runtime config (Next.js 13+)**
```typescript
// next.config.ts
const nextConfig = {
  output: "standalone",
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL,
  },
};
```

**Option C: Client-side environment detection**
```typescript
// lib/config.ts
export const config = {
  apiUrl: typeof window !== 'undefined'
    ? window.location.origin.includes('localhost')
      ? 'http://localhost:8000'
      : '/api'  // Use relative URL in production
    : process.env.NEXT_PUBLIC_API_URL,
};
```

---

## 3. Backend Can't Connect to Database

### Symptom
```
Connection refused: localhost:5432
psycopg2.OperationalError: could not connect to server
```

### Root Cause
`localhost` inside a container refers to the container itself, not the host machine or other containers.

### Solution

**For Docker Compose (local Postgres):**
```yaml
services:
  api:
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/taskflow
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d taskflow"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**For External Database (Neon):**
```yaml
services:
  api:
    environment:
      - DATABASE_URL=${DATABASE_URL}  # From .env, points to Neon
```

---

## 4. Services Start Before Dependencies Ready

### Symptom
```
Connection refused to api:8000
Backend starts but database not ready
```

### Root Cause
`depends_on` only waits for container to start, not for service to be ready.

### Solution

**Use health checks with conditions:**
```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  web:
    depends_on:
      api:
        condition: service_healthy
```

---

## 5. NODE_ENV=production Breaks Auth

### Symptom
```
Works in development, fails in production mode
Cookies not set
Session not persisted
```

### Root Cause
Better Auth and Next.js behave differently in production:
- Cookies may require `secure: true` (HTTPS only)
- SameSite policies are stricter
- Some dev-only features are disabled

### Solution

**For local Docker testing (HTTP):**
```typescript
// auth config
cookies: {
  secure: process.env.NODE_ENV === 'production' && !process.env.DOCKER_ENV,
  sameSite: 'lax',
}
```

**docker-compose.yml:**
```yaml
services:
  web:
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=true  # Flag to indicate Docker (not real prod)
```

---

## 6. Container Runs as Root (Security Issue)

### Symptom
```
Container works but security scan fails
Permission issues when mounting volumes
```

### Solution

**Dockerfile.nextjs:**
```dockerfile
# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Switch to non-root user
USER nextjs
```

**Dockerfile.fastapi:**
```dockerfile
RUN useradd --create-home --uid 1000 appuser
USER appuser
```

---

## 7. Image Too Large

### Symptom
```
Image size > 1GB
Slow deployments
High storage costs
```

### Solution

**Multi-stage builds:**
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
RUN pnpm build

# Stage 2: Runtime (minimal)
FROM node:22-alpine AS runner
COPY --from=builder /app/.next/standalone ./
# Only copy what's needed
```

**Use slim/alpine images:**
```dockerfile
# Instead of
FROM python:3.13

# Use
FROM python:3.13-slim
# or
FROM python:3.13-alpine
```

---

## 8. Health Check Fails

### Symptom
```
Container marked unhealthy
Service restarts repeatedly
```

### Root Cause
Health check runs before app is ready, or endpoint doesn't exist.

### Solution

**Ensure health endpoint exists:**
```python
# FastAPI
@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**Configure appropriate timing:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

**start_period** is crucial - gives app time to start before health checks begin.

---

## 9. Logs Not Visible

### Symptom
```
docker logs shows nothing
Can't debug issues
```

### Root Cause
Application logs to file instead of stdout/stderr.

### Solution

**Python (FastAPI):**
```python
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
```

**Next.js:**
Logs go to stdout by default. Ensure no file-based logging.

---

## 10. Can't Access Service from Host

### Symptom
```
curl localhost:3000 - connection refused
Service runs but not accessible
```

### Root Cause
Port not published or service bound to wrong interface.

### Solution

**docker-compose.yml:**
```yaml
services:
  web:
    ports:
      - "3000:3000"  # host:container
```

**Application must bind to 0.0.0.0:**
```dockerfile
# Next.js
ENV HOSTNAME="0.0.0.0"

# FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Quick Reference: Common Fixes

| Issue | Fix |
|-------|-----|
| Auth origin error | Add Docker service names to trustedOrigins |
| NEXT_PUBLIC_* not updating | Rebuild image with new ARGs |
| Can't connect to DB | Use service name, not localhost |
| Service not ready | Add health checks + depends_on condition |
| Production mode issues | Set DOCKER_ENV flag for local testing |
| Permission denied | Run as non-root user |
| Large images | Use multi-stage builds + slim images |
| Health check fails | Add start_period, verify endpoint exists |
| No logs | Log to stdout/stderr |
| Port not accessible | Publish port + bind to 0.0.0.0 |
