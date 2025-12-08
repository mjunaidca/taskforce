---
description: Containerize applications with impact analysis. Generates Dockerfiles, docker-compose, and documents required code changes for auth/CORS/networking.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). User may specify:
- Specific services to containerize
- Target environment (Docker Compose, Kubernetes, or both)
- Custom port mappings or service names

## Core Directive

**Impact-First Containerization**: This command performs comprehensive impact analysis BEFORE generating any container configuration. It ensures auth origins, CORS settings, and network topology are properly documented.

**WHY**: Containerization without impact analysis leads to auth failures, CORS errors, and broken service-to-service communication. The impact-analyzer subagent scans the codebase to identify all required changes.

## Outline

### Phase 1: Impact Analysis

1. **Invoke impact-analyzer subagent**:

   ```
   Use Task tool with:
   - subagent_type: "Explore"
   - prompt: |
       Analyze this project for containerization requirements.

       Scan for:
       1. Environment variables:
          - grep -r "process\.env\." --include="*.ts" --include="*.tsx"
          - grep -r "os\.environ\|os\.getenv" --include="*.py"
          - Find all .env files
          - Classify as build-time (NEXT_PUBLIC_*) vs runtime

       2. Localhost references:
          - grep -r "localhost\|127\.0\.0\.1" --include="*.ts" --include="*.py" --include="*.json"
          - Map each to Docker service name

       3. Auth/CORS configurations:
          - Find Better Auth config (trustedOrigins)
          - Find FastAPI CORS middleware
          - List origins that need Docker service names added

       4. Service dependencies:
          - Identify all services (web, api, mcp, sso)
          - Map startup order
          - Find health check endpoints

       5. Ports:
          - What port does each service use?

       Return structured report with actionable findings.
   ```

2. **Wait for analysis report** before proceeding.

### Phase 2: Load Blueprints

3. **Read containerize-apps skill references**:
   - `.claude/skills/engineering/containerize-apps/references/auth-containerization.md`
   - `.claude/skills/engineering/containerize-apps/references/network-topology.md`

4. **Read Dockerfile blueprints**:
   - `.claude/skills/engineering/containerize-apps/assets/Dockerfile.fastapi`
   - `.claude/skills/engineering/containerize-apps/assets/Dockerfile.nextjs`
   - `.claude/skills/engineering/containerize-apps/assets/docker-compose.template.yml`

### Phase 3: Generate Configurations

5. **Generate Dockerfiles** for each service identified:

   | Service Type | Blueprint | Customize |
   |--------------|-----------|-----------|
   | FastAPI/Python | Dockerfile.fastapi | APP_MODULE, PORT |
   | Next.js | Dockerfile.nextjs | Build ARGs for NEXT_PUBLIC_* |
   | Python Service | Dockerfile.fastapi | Module path |

   **Output locations**:
   - `packages/api/Dockerfile`
   - `web-dashboard/Dockerfile`
   - `packages/mcp-server/Dockerfile` (if exists)

6. **Generate docker-compose.yml** at project root:
   - Use template from assets
   - Customize service names from analysis
   - Set correct build contexts
   - Configure environment variables
   - Add health checks with proper timing
   - Set depends_on with conditions

7. **Generate .env.docker** template:
   ```bash
   # External services
   DATABASE_URL=postgresql://...

   # Secrets (shared across services)
   BETTER_AUTH_SECRET=your-secret-here

   # Service URLs (for reference - most are set in compose)
   # Browser access uses localhost (port mapping)
   # Container-to-container uses service names
   ```

### Phase 4: Document Impact

8. **Generate CONTAINERIZATION.md** with:

   ```markdown
   # Containerization Impact Report

   ## Required Code Changes

   ### 1. Auth Configuration
   File: [path]
   Add to trustedOrigins:
   - http://web:3000
   - http://api:8000

   ### 2. Backend CORS
   File: [path]
   Add to origins:
   - http://web:3000

   ### 3. next.config.ts
   Ensure `output: "standalone"` is set

   ## Network Topology
   [Diagram from analysis]

   ## Startup Order
   [Order from analysis]

   ## Usage
   docker compose build
   docker compose up -d
   docker compose logs -f
   ```

### Phase 5: Validation (Optional)

9. **Suggest Gordon validation** (if Docker Desktop available):
   ```bash
   # Validate Dockerfiles with Docker AI
   cat packages/api/Dockerfile | docker ai "Rate this Dockerfile for production"
   cat web-dashboard/Dockerfile | docker ai "Rate this Dockerfile for production"

   # Or use Docker Desktop UI: Click ✨ → Review Dockerfile
   ```

### Phase 6: Report

10. **Output summary**:
    ```
    ✅ CONTAINERIZATION COMPLETE

    Generated files:
    - packages/api/Dockerfile
    - web-dashboard/Dockerfile
    - docker-compose.yml
    - .env.docker
    - CONTAINERIZATION.md

    Required manual changes:
    - [ ] Add Docker origins to trustedOrigins in [file]
    - [ ] Add Docker origins to CORS in [file]
    - [ ] Set output: "standalone" in next.config.ts
    - [ ] Copy .env.docker to .env and fill secrets

    Next steps:
    1. Make required code changes
    2. docker compose build
    3. docker compose up -d
    4. Test auth flow at http://localhost:3000
    ```

## Key Rules

- **ALWAYS** run impact analysis first
- **NEVER** generate Dockerfiles without understanding auth/CORS impact
- Use blueprint templates from skill assets
- Document ALL required code changes

### Critical Patterns (Battle-Tested):

1. **Browser vs Server URLs** - Use SEPARATE variable names (no confusion):
   ```yaml
   build:
     args:
       - NEXT_PUBLIC_API_URL=http://localhost:8000   # Browser only
   environment:
     - SERVER_API_URL=http://api:8000                # Server only
   ```
   Code: `const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;`

2. **Healthchecks** - Use `127.0.0.1` NOT `localhost` (IPv6 issue):
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "--spider", "http://127.0.0.1:3000/"]
   ```

3. **Database URLs** - Add `sslmode=disable` for local postgres detection:
   ```yaml
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/db?sslmode=disable
   ```

4. **Migrations** - Run from host, not in container (keeps image slim):
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db" pnpm db:push
   ```

5. **Package.json** - Check playwright in devDeps, postgres in deps

## File Locations

| Output | Location |
|--------|----------|
| API Dockerfile | `packages/api/Dockerfile` |
| Web Dockerfile | `web-dashboard/Dockerfile` |
| MCP Dockerfile | `packages/mcp-server/Dockerfile` |
| Compose file | `docker-compose.yml` |
| Env template | `.env.docker` |
| Impact doc | `CONTAINERIZATION.md` |

---

As the main request completes, you MUST create and complete a PHR (Prompt History Record).

1) Determine Stage: `misc` (infrastructure work)

2) Generate Title and Determine Routing:
   - Title: "Containerize project with impact analysis"
   - Route: `history/prompts/general/`

3) Create and Fill PHR:
   - Run: `.specify/scripts/bash/create-phr.sh --title "containerize-project" --stage misc --json`
   - Fill placeholders with containerization summary

4) Validate + report
