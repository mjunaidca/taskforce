# Feature Specification: TaskFlow Containerization

**Feature Branch**: `007-containerize-apps`
**Created**: 2025-12-08
**Status**: Completed
**Input**: "Containerize all TaskFlow applications for local Docker deployment with production-ready patterns. Build reusable infrastructure (RII) blueprints and skills for future containerization work."

---

## Executive Summary

This sprint containerizes the entire TaskFlow platform (5 services) for local Docker deployment. The goal is production-ready containers that can be run locally with `docker compose up`, with proper networking, health checks, and authentication flow.

**Key Outcome**: One-command local deployment of the full platform, plus reusable containerization skills/blueprints for future projects.

---

## What We Built

### Infrastructure

| Service | Port | Dockerfile | Status |
|---------|------|------------|--------|
| postgres | 5432 | Official image | Ready |
| sso-platform | 3001 | Multi-stage Next.js | Ready |
| api | 8000 | Multi-stage FastAPI + uv | Ready |
| mcp-server | 8001 | Multi-stage Python + uv | Ready |
| web-dashboard | 3000 | Multi-stage Next.js standalone | Ready |
| pgadmin | 5050 | Official image | Ready |

### Files Created

**Dockerfiles:**
- `sso-platform/Dockerfile` - Next.js with standalone output (344MB optimized)
- `packages/api/Dockerfile` - FastAPI with uv package manager
- `packages/mcp-server/Dockerfile` - Python MCP server with uv
- `web-dashboard/Dockerfile` - Next.js with standalone output

**Configuration:**
- `docker-compose.yml` - Full stack orchestration with health checks
- `docker-start.sh` - Automated startup script with migrations
- `.env.example` - Environment variable documentation

**Skills & Blueprints:**
- `.claude/skills/engineering/containerize-apps/SKILL.md`
- `.claude/skills/engineering/containerize-apps/references/auth-containerization.md`
- `.claude/skills/engineering/containerize-apps/references/network-topology.md`
- `.claude/skills/engineering/containerize-apps/assets/Dockerfile.fastapi`
- `.claude/skills/engineering/containerize-apps/assets/Dockerfile.nextjs`
- `.claude/agents/engineering/impact-analyzer-agent.md`
- `.claude/commands/sp.containerize.md`

---

## Technical Decisions

### 1. Browser vs Server URL Pattern

**Problem:** Browser code runs on host machine (needs `localhost`), server-side routes run in container (need Docker service names).

**Solution:** Separate variable names instead of same variable with different values:
- `NEXT_PUBLIC_*` = Browser URLs (build-time, localhost)
- `SERVER_*` = Server-side URLs (runtime, container names)

**Code change:** `const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL`

### 2. Migration Strategy

**Decision:** Run migrations from host machine, not in containers.

**Why:**
- Keeps images slim (no Drizzle CLI in production)
- Simpler debugging when migrations fail
- Works with `docker-start.sh` script

### 3. Health Check Pattern

**Decision:** Use `127.0.0.1` instead of `localhost` in health checks.

**Why:** `localhost` can resolve to IPv6 `[::1]` which fails if server only listens on IPv4.

### 4. Database Driver Detection

**Decision:** Use `sslmode=disable` in local postgres URLs.

**Why:** Code detects Neon (serverless) vs local postgres based on this parameter.

---

## Success Criteria

- [x] All services start with `docker compose up -d --build`
- [x] Health checks pass for all services
- [x] Auth flow works (SSO → Dashboard → API calls)
- [x] Browser-to-API communication works
- [x] Server-to-API communication works (Next.js API routes → FastAPI)
- [x] MCP server connects to API
- [x] pgAdmin can connect to postgres
- [x] `docker-start.sh` automates full setup

---

## Battle-Tested Learnings (RII)

These patterns were discovered through debugging and captured in skills:

1. **IPv6 healthcheck issue** - Use `127.0.0.1` not `localhost`
2. **NEXT_PUBLIC_* at runtime** - Server-side reads at runtime, not build time
3. **Separate URL variables** - Cleaner than same variable with different values
4. **sslmode=disable** - For local postgres detection
5. **Playwright in devDeps** - 300MB+ savings
6. **postgres in deps** - Runtime driver needed
7. **pgAdmin email** - Must use valid domain like `example.com`
8. **Migration from host** - Keeps images slim

---

## Non-Goals

- Kubernetes deployment (Phase IV)
- Production TLS/SSL configuration
- Cloud registry push
- CI/CD pipeline
- Load balancing / replicas
