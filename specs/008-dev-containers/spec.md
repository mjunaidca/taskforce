# Feature Specification: Development Container Environment

**Feature Branch**: `008-dev-containers`
**Created**: 2025-12-08
**Status**: Draft
**Input**: "Development container environment with hot reloading on all servers"

---

## Executive Summary

Create a parallel development container setup that enables hot reloading across all TaskFlow services. This complements the existing production container setup (007-containerize-apps) by providing a developer-friendly environment where code changes are immediately reflected without rebuilding images.

**Key Outcome**: Developers can run `./docker-dev.sh` and have the full platform running with live code reloading, enabling rapid iteration during development.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Development Environment (Priority: P1)

As a developer, I want to start the entire TaskFlow platform in development mode with a single command, so I can begin coding immediately with hot reload enabled.

**Why this priority**: This is the core use case - developers need a frictionless way to start the dev environment.

**Independent Test**: Can be fully tested by running `./docker-dev.sh` and verifying all services start with hot reload enabled.

**Acceptance Scenarios**:

1. **Given** a clean checkout of the repository, **When** I run `./docker-dev.sh`, **Then** all 5 services (postgres, sso-platform, api, mcp-server, web-dashboard) start successfully
2. **Given** the dev environment is starting, **When** services initialize, **Then** I see clear status messages indicating which services are ready
3. **Given** all services are running, **When** I access `http://localhost:3000`, **Then** the web dashboard loads successfully

---

### User Story 2 - Hot Reload Backend Changes (Priority: P1)

As a developer, I want my Python code changes (API, MCP server) to be immediately reflected without restarting containers, so I can iterate quickly on backend features.

**Why this priority**: Backend hot reload is essential for productive development - manual restarts break flow.

**Independent Test**: Modify a Python file and verify the change is reflected within seconds without manual intervention.

**Acceptance Scenarios**:

1. **Given** the API server is running in dev mode, **When** I modify `packages/api/src/taskflow_api/main.py`, **Then** uvicorn automatically reloads within 3 seconds
2. **Given** the MCP server is running in dev mode, **When** I modify `packages/mcp-server/src/taskflow_mcp/app.py`, **Then** the server automatically reloads within 3 seconds
3. **Given** I introduce a syntax error in Python code, **When** the reload triggers, **Then** I see a clear error message in the container logs (not a crash)

---

### User Story 3 - Hot Reload Frontend Changes (Priority: P1)

As a developer, I want my Next.js code changes (SSO, Dashboard) to be immediately reflected with Fast Refresh, so I can iterate quickly on UI features.

**Why this priority**: Frontend hot reload with state preservation is critical for UI development productivity.

**Independent Test**: Modify a React component and verify the change appears in browser without full page reload.

**Acceptance Scenarios**:

1. **Given** the web-dashboard is running in dev mode, **When** I modify a React component, **Then** Next.js Fast Refresh updates the browser within 2 seconds
2. **Given** the sso-platform is running in dev mode, **When** I modify a page component, **Then** the change is reflected without losing auth state
3. **Given** I'm viewing a page, **When** I modify the page's code, **Then** React state is preserved where possible (Fast Refresh behavior)

---

### User Story 4 - Switch Between Dev and Prod Modes (Priority: P2)

As a developer, I want to easily switch between development and production container modes, so I can test production builds locally before deploying.

**Why this priority**: Ability to test prod builds locally catches issues before deployment.

**Independent Test**: Run dev mode, stop, run prod mode, verify different behaviors.

**Acceptance Scenarios**:

1. **Given** I'm running dev mode, **When** I run `./docker-up.sh`, **Then** it stops dev containers and starts production containers
2. **Given** I'm running prod mode, **When** I run `./docker-dev.sh`, **Then** it stops prod containers and starts dev containers
3. **Given** I want to see which mode is running, **When** I run `docker compose ps`, **Then** container names indicate dev vs prod mode

---

### User Story 5 - Debug with Container Logs (Priority: P2)

As a developer, I want to easily view logs from all services with proper formatting, so I can debug issues across the stack.

**Why this priority**: Log visibility is essential for debugging multi-service applications.

**Independent Test**: Trigger an error and verify it appears in aggregated logs.

**Acceptance Scenarios**:

1. **Given** the dev environment is running, **When** I run `./docker-dev.sh --logs`, **Then** I see aggregated logs from all services
2. **Given** an API error occurs, **When** I check logs, **Then** the Python traceback is fully visible and readable
3. **Given** multiple services log simultaneously, **When** I view logs, **Then** each service's logs are prefixed with the service name

---

### Edge Cases

- What happens when a port is already in use? (Clear error message, suggest which service to stop)
- How does hot reload behave with database schema changes? (Requires migration, not auto-handled)
- What if node_modules are missing locally? (Dev containers should install dependencies on start)
- How does the system handle Docker resource constraints? (Document minimum requirements)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `compose.dev.yaml` file that configures all services for development mode
- **FR-002**: System MUST provide a `docker-dev.sh` script that starts the development environment
- **FR-003**: Python services (API, MCP) MUST run with `--reload` flag for automatic code reloading
- **FR-004**: Next.js services (SSO, Dashboard) MUST run in `dev` mode with Fast Refresh enabled
- **FR-005**: Source code directories MUST be mounted as volumes to enable live code changes
- **FR-006**: System MUST share postgres and pgadmin configuration with production setup (same ports, credentials)
- **FR-007**: Development containers MUST NOT require rebuilding images for code changes
- **FR-008**: System MUST support `--logs` flag to show aggregated service logs
- **FR-009**: System MUST support `--quick` flag to skip initial setup steps
- **FR-010**: Node.js services MUST have `node_modules` handled appropriately (mounted or installed in container)

### Non-Functional Requirements

- **NFR-001**: Hot reload MUST complete within 5 seconds of file save
- **NFR-002**: Dev environment MUST use same ports as production (3000, 3001, 8000, 8001, 5432, 5050)
- **NFR-003**: Dev containers MUST start within 60 seconds on a warm cache
- **NFR-004**: Memory usage MUST stay under 4GB for the complete dev stack

### Key Entities

- **compose.dev.yaml**: Docker Compose configuration for development mode with volume mounts and dev commands
- **docker-dev.sh**: Shell script to orchestrate development environment startup
- **Dockerfile.dev (optional)**: Development-specific Dockerfiles if needed (may reuse base images with different commands)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can start the full dev environment with a single command (`./docker-dev.sh`)
- **SC-002**: Python code changes are reflected within 5 seconds without manual intervention
- **SC-003**: React component changes trigger Fast Refresh within 3 seconds
- **SC-004**: Switching between dev and prod modes takes less than 30 seconds
- **SC-005**: All existing application functionality works identically in dev mode
- **SC-006**: Zero Docker image rebuilds required for source code changes during development

---

## Technical Constraints

### Volume Mount Strategy

```
Production (007):                    Development (008):
├── Image contains code              ├── Image contains runtime only
├── No volume mounts                 ├── Source mounted as volumes
├── Standalone Next.js builds        ├── next dev with Fast Refresh
└── uvicorn without --reload         └── uvicorn with --reload
```

### Port Parity

Development MUST use identical ports to production to ensure:
- Same URLs work in both modes
- Browser bookmarks/history work across modes
- No port configuration confusion

### Assumptions

1. Developers have Docker Desktop with at least 4GB RAM allocated
2. Source code is checked out locally (not running from container-only)
3. Node.js and pnpm are available locally for initial node_modules setup (or handled by container)
4. PostgreSQL data persists across dev/prod mode switches (shared volume)

---

## Out of Scope

- Remote development containers (VS Code Dev Containers / GitHub Codespaces)
- Debugging configuration (IDE-specific)
- Performance profiling setup
- Multi-platform builds (ARM64 vs AMD64)
- Database migrations (handled by existing scripts)
