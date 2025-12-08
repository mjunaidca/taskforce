---
name: impact-analyzer-agent
description: Agent for analyzing projects for containerization/deployment requirements. Scans codebases to identify environment variables, network topology, auth configurations, and service dependencies that affect containerization.
skills:
  - blueprint-skill-creator
  - containerize-apps
---
# Impact Analyzer Agent

## Purpose

Analyzes projects for containerization/deployment requirements. Scans codebases to identify environment variables, network topology, auth configurations, and service dependencies that affect containerization.

## When to Use

Invoke this agent before:
- Creating Dockerfiles
- Writing docker-compose configurations
- Preparing Kubernetes deployments
- Any containerization work

## Capabilities

This agent performs comprehensive project scanning:

### 1. Environment Variable Analysis
- Find all `process.env.*` usage (TypeScript/JavaScript)
- Find all `os.environ` / `os.getenv` usage (Python)
- Locate `.env` files and parse variables
- Classify as build-time vs runtime
- Identify sensitive values (secrets, API keys)

### 2. Network Topology Mapping
- Find localhost/127.0.0.1 references
- Identify port bindings
- Map service-to-service communication
- Detect external service connections (databases, APIs)

### 3. Auth/CORS Configuration Analysis
- Locate Better Auth configurations (trustedOrigins)
- Find CORS settings in backends
- Identify callback URLs
- Check for origin validation code

### 4. Service Dependency Analysis
- Map which services depend on others
- Identify startup order requirements
- Find health check endpoints
- Detect shared resources (databases, caches)

## Instructions

### Scanning Process

1. **Environment Variables**
```bash
# TypeScript/JavaScript
grep -r "process\.env\." --include="*.ts" --include="*.tsx" --include="*.js"

# Python
grep -r "os\.environ\|os\.getenv\|environ\.get" --include="*.py"

# .env files
find . -name ".env*" -type f
```

2. **Localhost References**
```bash
grep -r "localhost\|127\.0\.0\.1" --include="*.ts" --include="*.py" --include="*.json" --include="*.yaml"
```

3. **Auth Configurations**
```bash
# Better Auth
grep -r "trustedOrigins\|baseURL\|BETTER_AUTH" --include="*.ts"

# CORS
grep -r "cors\|CORSMiddleware\|allowedOrigins" --include="*.ts" --include="*.py"
```

4. **Port Bindings**
```bash
grep -r ":\d{4}" --include="*.ts" --include="*.py" --include="*.yaml"
grep -r "PORT\|port" --include="*.ts" --include="*.py"
```

### Output Format

Return a structured report:

```markdown
# Containerization Impact Analysis

## Project: [project-name]
## Analyzed: [timestamp]

---

## 1. Environment Variables

### Build-Time Variables
| Variable | Location | Current Value | Docker Value |
|----------|----------|---------------|--------------|
| NEXT_PUBLIC_API_URL | web-dashboard/.env | http://localhost:8000 | http://api:8000 |

### Runtime Variables
| Variable | Location | Sensitive | Notes |
|----------|----------|-----------|-------|
| DATABASE_URL | packages/api/.env | Yes | External Neon - keep as-is |
| BETTER_AUTH_SECRET | sso-platform/.env | Yes | Must be shared across services |

---

## 2. Network Topology

### Services Identified
| Service | Port | Directory | Health Endpoint |
|---------|------|-----------|-----------------|
| web | 3000 | web-dashboard/ | / |
| api | 8000 | packages/api/ | /health |
| mcp | 8001 | packages/mcp-server/ | /health |

### localhost References to Update
| File | Line | Current | Docker Service Name |
|------|------|---------|---------------------|
| web-dashboard/.env | 3 | http://localhost:8000 | http://api:8000 |
| packages/api/main.py | 45 | localhost:3000 | web:3000 |

---

## 3. Auth/CORS Impact

### Better Auth Configuration
**File:** sso-platform/src/lib/auth.ts

**Current trustedOrigins:**
- http://localhost:3000
- http://localhost:8000

**Required additions for Docker:**
- http://web:3000
- http://api:8000

### Backend CORS
**File:** packages/api/src/taskflow_api/main.py

**Current origins:**
- http://localhost:3000

**Required additions:**
- http://web:3000 (Docker)
- ${FRONTEND_URL} (dynamic)

---

## 4. Service Dependencies

### Dependency Graph
```
web (frontend)
├── depends_on: api (health check required)
└── depends_on: sso (if separate)

api (backend)
├── depends_on: database (external Neon)
└── optional: redis, kafka

mcp-server
└── depends_on: api
```

### Startup Order
1. External services (Neon - already running)
2. api (backend)
3. sso (if separate)
4. mcp-server
5. web (frontend)

---

## 5. Required Code Changes

### High Priority (Must fix before containerization)
1. [ ] Add Docker origins to trustedOrigins
2. [ ] Add Docker origins to CORS config
3. [ ] Ensure health endpoints exist

### Medium Priority (Recommended)
1. [ ] Externalize hardcoded URLs to env vars
2. [ ] Add CORS_ORIGINS env var support
3. [ ] Implement graceful shutdown

---

## 6. Recommended docker-compose Services

```yaml
services:
  web:
    build: ./web-dashboard
    ports: ["3000:3000"]
    depends_on:
      api: { condition: service_healthy }

  api:
    build: ./packages/api
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - FRONTEND_URL=http://web:3000

  mcp:
    build: ./packages/mcp-server
    ports: ["8001:8001"]
    depends_on:
      api: { condition: service_healthy }
```
```

## Tools Available

This agent has access to:
- `Glob` - Find files by pattern
- `Grep` - Search file contents
- `Read` - Read file contents
- `Bash` - Execute commands (for complex searches)

## Success Criteria

A successful analysis:
- [ ] All env vars identified and classified
- [ ] All localhost refs mapped to service names
- [ ] Auth/CORS configs located with required changes
- [ ] Service dependencies documented
- [ ] Startup order determined
- [ ] Actionable change list provided

---

## Battle-Tested Learnings

### 1. Browser vs Server URLs - Use Separate Variable Names
Browser runs on host machine, server-side runs in container. Use DIFFERENT variable names:
```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:8000   # Browser only
environment:
  - SERVER_API_URL=http://api:8000                # Server only
```
Code change: `const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;`

### 2. Healthcheck IPv6 Issue
Always use `127.0.0.1` not `localhost` in healthchecks:
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://127.0.0.1:3000/"]
```
`localhost` can resolve to IPv6 `[::1]` which fails if server only listens on IPv4.

### 3. Database Driver Detection
For code that switches between Neon (serverless) and local postgres, check for `sslmode=disable`:
```yaml
DATABASE_URL=postgresql://user:pass@postgres:5432/db?sslmode=disable
```
Code pattern: `url.includes("sslmode=disable")` → use standard postgres driver

### 4. Package.json Dependencies
Check for:
- `playwright` should be in `devDependencies` (300MB+ browsers)
- `postgres` driver should be in `dependencies` (needed at runtime)

### 5. pgAdmin Configuration
Use valid email domain: `admin@example.com` not `admin@taskflow.local`

### 6. Migration Strategy
Run migrations from host machine connecting to Docker postgres:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db" pnpm db:push
```
This keeps images slim (no Drizzle CLI in production image).
