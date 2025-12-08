# Implementation Plan: Development Container Environment

**Branch**: `008-dev-containers` | **Date**: 2025-12-08 | **Spec**: specs/008-dev-containers/spec.md
**Input**: Feature specification from `/specs/008-dev-containers/spec.md`

---

## Summary

Create a development container environment parallel to the production setup (007-containerize-apps). The key difference is volume mounts for source code and dev-mode commands that enable hot reloading across all services.

**Approach**: Reuse existing production infrastructure (postgres, network, volumes), override commands in compose.dev.yaml, and mount source directories as volumes for live code editing.

---

## Technical Context

**Language/Version**: Docker Compose v2, Node.js 22, Python 3.13
**Primary Dependencies**: Docker, pnpm, uv, uvicorn, Next.js
**Storage**: PostgreSQL (shared with production)
**Testing**: Manual verification of hot reload
**Target Platform**: Local development (macOS, Linux, Windows with Docker Desktop)
**Project Type**: Infrastructure/DevOps
**Performance Goals**: Hot reload < 5 seconds, startup < 60 seconds
**Constraints**: Same ports as production, shared database volume
**Scale/Scope**: 5 services (postgres, sso, api, mcp-server, web-dashboard)

---

## Constitution Check

*GATE: Infrastructure tooling - most principles N/A*

| Principle | Status | Notes |
|-----------|--------|-------|
| Audit | N/A | Infrastructure tooling, not app feature |
| Agent Parity | N/A | Development tooling |
| Recursive Tasks | N/A | Not applicable |
| Spec-Driven | ✓ | Spec created first (008-dev-containers/spec.md) |
| Phase Continuity | ✓ | Dev mirrors prod patterns exactly |

---

## Technical Architecture

### Production vs Development Comparison

| Aspect | Production (compose.yaml) | Development (compose.dev.yaml) |
|--------|---------------------------|--------------------------------|
| **Next.js** | Standalone build, `node server.js` | Source mounted, `pnpm dev` |
| **Python** | Pre-built deps, `uvicorn ...` | Source mounted, `uvicorn --reload` |
| **Images** | Multi-stage, optimized | Base images with dev tools |
| **Volumes** | Data only (postgres) | Source code + data |
| **Startup** | Health checks required | Relaxed startup |
| **Project Name** | `tf-k8` (default) | `taskflow-dev` |

### Volume Mount Strategy

```
compose.dev.yaml volumes:
├── sso-platform/
│   └── ./sso-platform → /app (full source)
│   └── /app/node_modules (anonymous - platform safe)
│   └── /app/.next (anonymous - build cache)
├── web-dashboard/
│   └── ./web-dashboard → /app
│   └── /app/node_modules (anonymous)
│   └── /app/.next (anonymous)
├── api/
│   └── ./packages/api → /app
└── mcp-server/
    └── ./packages/mcp-server → /app
```

### Node Modules Strategy

**Decision**: Install in container via anonymous volume, NOT mount local node_modules

**Rationale**:
- Platform compatibility (Linux containers vs macOS/Windows host)
- Avoids native module rebuild issues (esbuild, turbo, etc.)
- Consistent behavior across dev machines
- First run installs deps, subsequent runs use cached volume

---

## Implementation Sequence

### Phase 1: compose.dev.yaml

Create development compose file with these service definitions:

**1. postgres + pgadmin**: Identical to production (shared data)

**2. sso-platform**:
```yaml
image: node:22-alpine
working_dir: /app
command: sh -c "corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm dev"
volumes:
  - ./sso-platform:/app
  - /app/node_modules
  - /app/.next
ports: ["3001:3001"]
```

**3. web-dashboard**: Same pattern as sso-platform, port 3000

**4. api**:
```yaml
image: python:3.13-slim
working_dir: /app
command: sh -c "pip install uv && uv pip install --system -r pyproject.toml && uvicorn taskflow_api.main:app --reload --host 0.0.0.0 --port 8000"
volumes:
  - ./packages/api:/app
environment:
  - PYTHONPATH=/app/src
ports: ["8000:8000"]
```

**5. mcp-server**: Same pattern as api, port 8001

### Phase 2: docker-dev.sh

Shell script mirroring docker-start.sh with dev-specific behavior:

```bash
#!/bin/bash
# Flags: --quick, --logs, --clean, --help
# Uses: docker compose -f compose.dev.yaml --project-name taskflow-dev
```

Key behaviors:
- Stops any running containers (both dev and prod projects)
- Uses compose.dev.yaml with project name `taskflow-dev`
- Skips SSO migrations (reuses existing postgres data)
- Supports `--logs` for aggregated log viewing

### Phase 3: Testing & Documentation

1. Verify hot reload on all services
2. Test switching between dev and prod modes
3. Update README with dev workflow

---

## Project Structure

### New Files

```
repo/
├── compose.yaml           # Production (existing)
├── compose.dev.yaml       # Development (NEW)
├── docker-start.sh        # Production script (existing)
└── docker-dev.sh          # Development script (NEW)
```

### Specs Directory

```
specs/008-dev-containers/
├── spec.md                # Feature specification
├── plan.md                # This file
├── tasks.md               # Task breakdown (from /sp.tasks)
└── checklists/
    └── requirements.md    # Quality checklist
```

---

## Dependencies & Shared Resources

### Container Dependencies

| Service | Base Image | Dev Dependencies |
|---------|------------|------------------|
| sso-platform | node:22-alpine | pnpm (via corepack) |
| web-dashboard | node:22-alpine | pnpm (via corepack) |
| api | python:3.13-slim | uv, uvicorn |
| mcp-server | python:3.13-slim | uv |
| postgres | postgres:16-alpine | None (unchanged) |
| pgadmin | dpage/pgadmin4 | None (unchanged) |

### Shared Resources

- **postgres_data volume**: Shared between dev and prod
- **pgadmin_data volume**: Shared between dev and prod
- **taskflow-network**: Same network for service discovery

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Slow first start (deps install) | Use `--quick` flag to skip on subsequent runs |
| Port conflicts dev/prod | Scripts stop other mode before starting |
| node_modules platform issues | Anonymous volume, never mount local |
| Database conflicts | Shared postgres volume (intentional - same data) |
| File watching limits | Document ulimit increase for Linux |

---

## Success Validation

### Manual Testing Checklist

- [ ] `./docker-dev.sh` starts all 5 services successfully
- [ ] Modify `packages/api/src/taskflow_api/main.py` → API reloads within 5s
- [ ] Modify `packages/mcp-server/src/taskflow_mcp/app.py` → MCP reloads within 5s
- [ ] Modify `web-dashboard/src/app/page.tsx` → Browser updates via Fast Refresh
- [ ] Modify `sso-platform/src/app/page.tsx` → SSO updates via Fast Refresh
- [ ] `./docker-dev.sh --logs` shows aggregated logs with service prefixes
- [ ] `./docker-start.sh` (prod) works after stopping dev
- [ ] Ports match production: 3000, 3001, 8000, 8001, 5432, 5050

---

## Estimated Scope

| Component | Complexity | Est. Lines |
|-----------|------------|------------|
| compose.dev.yaml | Medium | ~180 |
| docker-dev.sh | Low | ~120 |
| Testing | Low | N/A |
| **Total** | **Medium** | **~300** |

---

## Next Steps

1. Generate tasks: `/sp.tasks 008-dev-containers`
2. Implement compose.dev.yaml first
3. Implement docker-dev.sh second
4. Test hot reload on each service
5. Commit and create PR
