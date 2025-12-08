# Implementation Plan: TaskFlow Containerization

**Feature Branch**: `007-containerize-apps`
**Created**: 2025-12-08
**Status**: Completed

---

## Overview

Containerize all TaskFlow services for local Docker deployment with production-ready patterns.

## Phases

### Phase 1: Impact Analysis (Completed)

**Objective:** Understand what needs to change before writing Dockerfiles.

**Activities:**
1. Scan for environment variables (process.env, os.environ)
2. Find localhost references that need Docker service names
3. Identify auth/CORS configurations
4. Map service dependencies and startup order
5. Document required code changes

**Artifacts:**
- Impact analysis report
- Service dependency graph

---

### Phase 2: Dockerfile Creation (Completed)

**Objective:** Create optimized, production-ready Dockerfiles for each service.

**Activities:**
1. SSO Platform (Next.js)
   - Multi-stage build (deps → builder → runner)
   - Standalone output mode
   - Non-root user
   - Build ARGs for NEXT_PUBLIC_*

2. API (FastAPI)
   - Multi-stage build with uv
   - Non-root user
   - Health check endpoint

3. MCP Server (Python)
   - Multi-stage build with uv
   - Non-root user

4. Web Dashboard (Next.js)
   - Multi-stage build
   - Standalone output mode
   - Build ARGs for NEXT_PUBLIC_*

**Optimizations:**
- Image size: SSO reduced from 1.2GB to 344MB
- Playwright moved to devDependencies
- .dockerignore for each service

---

### Phase 3: Docker Compose (Completed)

**Objective:** Orchestrate all services with proper networking.

**Activities:**
1. Create docker-compose.yml with:
   - Service definitions
   - Health checks with proper timing
   - depends_on with conditions
   - Environment variable configuration
   - Network isolation

2. Handle browser vs server URL pattern:
   - NEXT_PUBLIC_* as build args (localhost for browser)
   - SERVER_* as runtime env (container names for server)

3. Add pgAdmin for database management

---

### Phase 4: Debugging & Fixes (Completed)

**Issues Resolved:**
1. IPv6 healthcheck failures → Use 127.0.0.1
2. Container-to-container networking → SERVER_* variables
3. Database driver detection → sslmode=disable
4. pgAdmin email validation → Use example.com domain
5. Auth origin errors → Add container names to trustedOrigins

---

### Phase 5: Skill Hardening (Completed)

**Objective:** Capture learnings as reusable skills and blueprints.

**Artifacts:**
1. `.claude/skills/engineering/containerize-apps/SKILL.md`
2. `.claude/skills/engineering/containerize-apps/references/auth-containerization.md`
3. `.claude/skills/engineering/containerize-apps/references/network-topology.md`
4. `.claude/agents/engineering/impact-analyzer-agent.md`
5. `.claude/commands/sp.containerize.md`
6. `docker-start.sh` automation script

---

## Key Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| URL pattern | Same var different values vs separate vars | Separate vars | Cleaner, no confusion |
| Migrations | In container vs from host | From host | Keeps images slim |
| Health checks | localhost vs 127.0.0.1 | 127.0.0.1 | IPv6 compatibility |
| Init containers | Migrator container | Manual/script | Simpler debugging |

---

## Dependencies

**External:**
- Docker Desktop
- PostgreSQL 16 image
- pgAdmin image

**Internal:**
- SSO platform code (auth endpoints)
- API code (CORS configuration)
- Web dashboard code (API routes)
