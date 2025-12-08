# Tasks: TaskFlow Containerization

**Feature Branch**: `007-containerize-apps`
**Created**: 2025-12-08
**Status**: All Completed

---

## Task Summary

| # | Task | Status | PHR |
|---|------|--------|-----|
| 1 | Impact analysis | Done | 0001 |
| 2 | SSO Dockerfile | Done | 0002 |
| 3 | API Dockerfile | Done | 0003 |
| 4 | MCP Dockerfile | Done | 0004 |
| 5 | Web Dockerfile | Done | 0005 |
| 6 | docker-compose.yml | Done | 0006 |
| 7 | Fix healthcheck IPv6 | Done | 0007 |
| 8 | Fix container networking | Done | 0008 |
| 9 | Fix database detection | Done | 0009 |
| 10 | Image size optimization | Done | 0010 |
| 11 | .dockerignore files | Done | 0011 |
| 12 | Auth origins config | Done | 0012 |
| 13 | Simplify URL pattern | Done | 0013 |
| 14 | docker-start.sh script | Done | 0014 |
| 15 | Skill hardening | Done | 0015 |
| 16 | Documentation | Done | 0016 |

---

## Task Details

### Task 1: Impact Analysis
**Status:** Completed
**Description:** Analyze codebase for containerization requirements
**Deliverables:**
- Environment variable inventory
- Localhost reference mapping
- Auth/CORS config locations
- Service dependency graph

---

### Task 2: SSO Platform Dockerfile
**Status:** Completed
**Description:** Create multi-stage Dockerfile for sso-platform (Next.js)
**Deliverables:**
- `sso-platform/Dockerfile`
- Standalone output mode
- Non-root user
- Build ARGs for NEXT_PUBLIC_*

---

### Task 3: API Dockerfile
**Status:** Completed
**Description:** Create multi-stage Dockerfile for FastAPI backend
**Deliverables:**
- `packages/api/Dockerfile`
- uv package manager
- Non-root user
- Health endpoint

---

### Task 4: MCP Server Dockerfile
**Status:** Completed
**Description:** Create Dockerfile for MCP server
**Deliverables:**
- `packages/mcp-server/Dockerfile`
- uv package manager
- Non-root user

---

### Task 5: Web Dashboard Dockerfile
**Status:** Completed
**Description:** Create multi-stage Dockerfile for web-dashboard (Next.js)
**Deliverables:**
- `web-dashboard/Dockerfile`
- Standalone output mode
- Build ARGs for NEXT_PUBLIC_*

---

### Task 6: Docker Compose
**Status:** Completed
**Description:** Create docker-compose.yml orchestrating all services
**Deliverables:**
- `docker-compose.yml`
- Health checks
- depends_on conditions
- Network configuration

---

### Task 7: Fix Healthcheck IPv6
**Status:** Completed
**Description:** Health checks failing due to IPv6 localhost resolution
**Solution:** Changed `localhost` to `127.0.0.1` in all healthchecks

---

### Task 8: Fix Container Networking
**Status:** Completed
**Description:** Server-side API routes couldn't reach other containers
**Solution:**
- Initial: NEXT_PUBLIC_* with different values (confusing)
- Final: Separate SERVER_* variables (cleaner)

---

### Task 9: Fix Database Detection
**Status:** Completed
**Description:** Code couldn't distinguish local postgres from Neon
**Solution:** Add `sslmode=disable` to local postgres URLs

---

### Task 10: Image Size Optimization
**Status:** Completed
**Description:** SSO image was 1.2GB
**Solution:**
- Move playwright to devDependencies
- Multi-stage builds
- Final size: 344MB

---

### Task 11: .dockerignore Files
**Status:** Completed
**Description:** Create .dockerignore for each service
**Deliverables:**
- `sso-platform/.dockerignore`
- `packages/api/.dockerignore`
- `packages/mcp-server/.dockerignore`
- `web-dashboard/.dockerignore`

---

### Task 12: Auth Origins Config
**Status:** Completed
**Description:** Better Auth rejecting requests from container names
**Solution:** Add Docker service names to trustedOrigins and CORS

---

### Task 13: Simplify URL Pattern
**Status:** Completed
**Description:** Same variable with different values was confusing
**Solution:**
- `NEXT_PUBLIC_*` = browser only (localhost)
- `SERVER_*` = server-side only (container names)
- Code: `SERVER_* || NEXT_PUBLIC_*`

---

### Task 14: docker-start.sh Script
**Status:** Completed
**Description:** Automate Docker startup with migrations
**Deliverables:**
- `docker-start.sh`
- Options: --quick, --clean, --logs

---

### Task 15: Skill Hardening
**Status:** Completed
**Description:** Capture learnings in reusable skills
**Deliverables:**
- Updated SKILL.md with battle-tested gotchas
- Updated auth-containerization.md
- Updated impact-analyzer-agent.md
- Updated sp.containerize.md command

---

### Task 16: Documentation
**Status:** Completed
**Description:** Document containerization setup
**Deliverables:**
- Updated `.env.example`
- Updated docker-compose.yml comments
- This spec/plan/tasks
- PHR records
