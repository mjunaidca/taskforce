# Pre-Containerization Impact Checklist

Use this checklist before creating any containerization blueprint.

## 1. Environment Variables

### Discovery
```bash
# Find all env var usage in Python
grep -r "os.environ\|os.getenv\|environ.get" --include="*.py"

# Find all env var usage in TypeScript/JavaScript
grep -r "process.env" --include="*.ts" --include="*.tsx" --include="*.js"

# Find .env files
find . -name ".env*" -type f
```

### Classification

| Variable | Build-time | Runtime | Secret? | Docker Value |
|----------|------------|---------|---------|--------------|
| `DATABASE_URL` | | X | Yes | From secrets |
| `NEXT_PUBLIC_API_URL` | X | | No | Build ARG |
| `API_SECRET_KEY` | | X | Yes | From secrets |
| `NODE_ENV` | X | X | No | `production` |

### Rules
- [ ] Build-time vars (NEXT_PUBLIC_*) → Use ARG in Dockerfile
- [ ] Runtime vars → Use ENV or docker-compose environment
- [ ] Secrets → Never in Dockerfile, use K8s secrets or Docker secrets
- [ ] URLs → Must be updated for container networking

---

## 2. Network Topology

### Discovery
```bash
# Find localhost references
grep -r "localhost\|127.0.0.1" --include="*.ts" --include="*.py" --include="*.json"

# Find port references
grep -r ":3000\|:8000\|:5432\|:6379" --include="*.ts" --include="*.py"
```

### Mapping Table

| Local URL | Docker Compose | Kubernetes |
|-----------|----------------|------------|
| `localhost:3000` | `web:3000` | `frontend-svc:3000` |
| `localhost:8000` | `api:8000` | `backend-svc:8000` |
| `localhost:5432` | `db:5432` | External (Neon) |
| `localhost:3001` | `sso:3001` | `sso-svc:3001` |

### Rules
- [ ] All localhost refs identified
- [ ] Docker service names defined
- [ ] External services (Neon, etc.) use actual URLs
- [ ] Internal services use Docker/K8s service names

---

## 3. Auth/SSO Impact (Better Auth)

### Discovery
```bash
# Find Better Auth config
grep -r "trustedOrigins\|baseURL\|BETTER_AUTH" --include="*.ts"

# Find CORS config
grep -r "cors\|origins\|allowedOrigins" --include="*.ts" --include="*.py"
```

### Critical Checks

**trustedOrigins must include:**
```typescript
trustedOrigins: [
  // Local development
  "http://localhost:3000",
  "http://localhost:8000",

  // Docker Compose
  "http://web:3000",
  "http://api:8000",

  // Kubernetes (if applicable)
  "http://frontend-svc:3000",
  "http://backend-svc:8000",

  // Production domain
  "https://yourdomain.com",
]
```

**Backend CORS must include:**
```python
origins = [
    "http://localhost:3000",
    "http://web:3000",          # Docker service name
    "http://frontend-svc:3000", # K8s service name
    os.getenv("FRONTEND_URL"),  # Dynamic
]
```

### Rules
- [ ] trustedOrigins includes Docker service names
- [ ] Backend CORS includes Docker service names
- [ ] Callback URLs work with container networking
- [ ] JWT secret shared between services (via env/secrets)

---

## 4. Service Dependencies

### Dependency Graph
```
web (frontend)
├── depends_on: api
└── depends_on: sso (if separate)

api (backend)
├── depends_on: db (or external Neon)
└── depends_on: redis (if used)
└── depends_on: kafka (Phase V)

mcp-server
└── depends_on: api
```

### Startup Order
1. Database (or verify Neon connection)
2. Redis (if used)
3. API backend
4. SSO service (if separate)
5. MCP server
6. Frontend

### Health Checks
```yaml
# Each service needs health check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Rules
- [ ] Dependency order documented
- [ ] Health checks defined for all services
- [ ] `depends_on` with `condition: service_healthy`
- [ ] Startup timeouts configured

---

## 5. Build vs Runtime Configuration

### Build-Time (Baked into image)
- NEXT_PUBLIC_* variables
- Static assets
- Compiled code
- Cannot change without rebuild

### Runtime (Can change per deployment)
- Database URLs
- API endpoints (non-NEXT_PUBLIC)
- Feature flags
- Secrets

### Rules
- [ ] Build-time vars documented
- [ ] Runtime vars use environment/secrets
- [ ] No secrets baked into image
- [ ] next.config.js uses `output: "standalone"`

---

## 6. Production Mode Differences

### Next.js (NODE_ENV=production)
- API routes may behave differently
- Some dev-only features disabled
- Static optimization kicks in
- **Auth callbacks must use production URLs**

### FastAPI (Environment checks)
- Debug mode should be off
- CORS may be stricter
- Logging level changes

### Rules
- [ ] Tested with NODE_ENV=production locally
- [ ] Auth flows verified in production mode
- [ ] No localhost-only code paths

---

## 7. File System & Volumes

### Stateless Requirements
- [ ] No local file storage for user data
- [ ] Logs go to stdout/stderr
- [ ] Temp files cleaned up

### Volume Needs
```yaml
volumes:
  # Only if needed
  - ./data:/app/data  # Persistent data
  - /tmp:/tmp         # Temp files (usually not needed)
```

---

## 8. Final Verification

### Pre-Build Checks
- [ ] All env vars documented
- [ ] Network topology mapped
- [ ] Auth origins updated
- [ ] Dependencies ordered
- [ ] Health checks defined

### Post-Build Checks
- [ ] `docker compose up` starts all services
- [ ] Services can communicate (test API calls)
- [ ] Auth/login flow works
- [ ] No localhost errors in logs

### Production Readiness
- [ ] Images use specific tags (not `latest`)
- [ ] Non-root user configured
- [ ] Resource limits set
- [ ] Secrets externalized
