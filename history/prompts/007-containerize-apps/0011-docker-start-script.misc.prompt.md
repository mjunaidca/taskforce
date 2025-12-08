---
id: "0011"
title: Docker Start Script
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: implementation
labels: ["docker", "automation", "bash", "startup"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - docker-start.sh
tests:
  - null
---

## Prompt

Create a root-level script that automates Docker startup and migrations.

## Response snapshot

Created `docker-start.sh` with multiple modes:

### Usage
```bash
./docker-start.sh          # Full startup (clean, build, migrate)
./docker-start.sh --quick  # Quick restart (no rebuild)
./docker-start.sh --clean  # Clean everything and rebuild
./docker-start.sh --logs   # Show logs after startup
```

### Steps
1. Stop existing containers
2. Clean if --clean flag (volumes, images)
3. Build and start containers
4. Wait for PostgreSQL health check
5. Run migrations from host (db:push, seed:setup)
6. Show final status and service URLs

### Key Features
- Colored output for better UX
- Retry logic for postgres health check
- Runs migrations with host DATABASE_URL
- Shows service URLs at completion

```bash
#!/bin/bash
set -e

# Wait for postgres
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U postgres; then
        break
    fi
    sleep 2
done

# Run migrations from host
cd sso-platform
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow" pnpm db:push
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow" pnpm seed:setup
```

## Outcome

- ✅ Impact: One-command Docker startup
- 🧪 Tests: ./docker-start.sh runs successfully
- 📁 Files: 1 file created
- 🔁 Next prompts: Document in .env.example
- 🧠 Reflection: Automation beats manual steps for repeatable tasks

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results: N/A
- Prompt variant: User request
- Next experiment: Add --test flag for CI
