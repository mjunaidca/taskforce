# TaskFlow Monorepo Structure

## Directory Layout

```
taskflow/
├── apps/                          # Deployable applications
│   ├── api/                       # FastAPI backend (Python)
│   ├── cli/                       # CLI tool (Python)
│   ├── mcp-server/                # MCP HTTP server (Python)
│   ├── notification-service/      # Dapr notification service (Python)
│   ├── sso/                       # Better Auth SSO (TypeScript/Next.js)
│   └── web/                       # Dashboard frontend (TypeScript/Next.js)
│
├── packages/                      # Shared libraries (FUTURE)
│   ├── shared-models/             # Shared Pydantic models (Python)
│   ├── ui/                        # Shared React components (TypeScript)
│   └── config/                    # Shared configs (eslint, tsconfig, etc.)
│
├── infrastructure/                # Deployment configurations
│   ├── local/                     # Docker Compose for local dev
│   │   ├── compose.yaml           # Production-like local stack
│   │   ├── compose.dev.yaml       # Development with hot reload
│   │   ├── docker-start.sh        # Start production stack
│   │   ├── docker-dev.sh          # Start dev environment
│   │   └── pgadmin-servers.json   # pgAdmin configuration
│   └── helm/                      # Kubernetes Helm charts
│       └── taskflow/              # Main Helm chart
│
├── scripts/                       # Utility scripts
│   ├── local/                     # Local development shortcuts
│   │   ├── docker-dev.sh          # Wrapper → infrastructure/local/
│   │   └── docker-start.sh        # Wrapper → infrastructure/local/
│   └── utils/                     # Build and deployment utilities
│       ├── build-images.sh        # Build Docker images for K8s
│       └── start-port-forwards.sh # K8s port forwarding
│
├── docs/                          # Documentation
│   ├── papers/                    # Research papers and references
│   └── research/                  # Project research notes
│
├── specs/                         # Feature specifications
├── history/                       # Prompt history records (PHR)
└── .github/workflows/             # CI/CD pipelines
```

## apps/ vs packages/ Explained

### `apps/` - Deployable Applications
Each folder in `apps/` is a **standalone deployable unit**:
- Has its own Dockerfile
- Has its own dependencies (pyproject.toml or package.json)
- Runs as a separate container/service
- Can be deployed independently

### `packages/` - Shared Libraries (Future)
Folders in `packages/` are **internal libraries** shared between apps:
- NOT deployed on their own
- Imported by apps as dependencies
- Help avoid code duplication

## How Shared Packages Work

### For Python (uv workspaces)

```toml
# Root pyproject.toml
[tool.uv.workspace]
members = ["apps/*", "packages/*"]

# apps/api/pyproject.toml
[project]
dependencies = [
    "shared-models",  # Local package
    "fastapi>=0.100",
]

[tool.uv.sources]
shared-models = { workspace = true }
```

### For TypeScript (pnpm workspaces)

```yaml
# Root pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// apps/web/package.json
{
  "dependencies": {
    "@taskflow/ui": "workspace:*",
    "react": "^18.0.0"
  }
}
```

## Current State vs Future State

### Current (Simple)
```
apps/
├── api/          # Python - standalone
├── cli/          # Python - standalone
├── mcp-server/   # Python - standalone
├── notification-service/  # Python - standalone
├── sso/          # TypeScript - standalone
└── web/          # TypeScript - standalone
```

Each app manages its own dependencies. Some code duplication exists.

### Future (With Shared Packages)
```
apps/
├── api/          # Python - imports shared-models
├── cli/          # Python - imports shared-models
├── mcp-server/   # Python - imports shared-models
├── notification-service/  # Python - imports shared-models
├── sso/          # TypeScript - imports @taskflow/ui
└── web/          # TypeScript - imports @taskflow/ui

packages/
├── shared-models/    # Python: Task, User, Project models
├── ui/               # TypeScript: Button, Card, etc.
└── config/           # Shared ESLint, TSConfig, etc.
```

## When to Add packages/

**Add shared packages when:**
- Same model/type defined in 3+ places
- UI components duplicated across apps
- Utility functions copied between services

**Don't add prematurely:**
- Adds complexity to builds
- Requires workspace tooling setup
- Makes Docker builds more complex (need to copy packages too)

## Root Configuration Files

### Current
- `.env.example` - Environment template
- `.env.prod` - Production secrets (gitignored)

### If Adding Python Workspaces (Future)
```toml
# pyproject.toml at root
[tool.uv.workspace]
members = ["apps/api", "apps/cli", "apps/mcp-server", "apps/notification-service", "packages/shared-models"]
```

### If Adding TypeScript Workspaces (Future)
```yaml
# pnpm-workspace.yaml at root
packages:
  - "apps/sso"
  - "apps/web"
  - "packages/ui"
  - "packages/config"
```

## Quick Commands

```bash
# Local Development
./scripts/local/docker-dev.sh          # Start with hot reload
./scripts/local/docker-dev.sh --logs   # Start and follow logs
./scripts/local/docker-dev.sh --stop   # Stop environment

# Production-like Local
./scripts/local/docker-start.sh        # Build and start
./scripts/local/docker-start.sh --quick # Quick restart

# Kubernetes (Minikube)
./scripts/utils/build-images.sh        # Build images
./scripts/deploy-prod.sh               # Deploy to cluster
./scripts/utils/start-port-forwards.sh # Access services
```

## Recommendation

For TaskFlow's current scale:
1. **Keep it simple** - no packages/ folder yet
2. **Add when needed** - when duplication becomes painful
3. **Start with Python** - shared-models is the clearest win
4. **TypeScript later** - UI components can wait

The current structure with `apps/` and `infrastructure/` is clean and sufficient for production deployment.
