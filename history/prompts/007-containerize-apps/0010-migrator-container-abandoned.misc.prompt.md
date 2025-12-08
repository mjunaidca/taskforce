---
id: "0010"
title: Migrator Container (Abandoned)
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: implementation
labels: ["docker", "migrations", "init-container", "abandoned"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - sso-platform/Dockerfile.migrator
tests:
  - null
---

## Prompt

Why not run migrations as a pre-startup script instead of manually?

## Response snapshot

### Attempt
Created a separate `Dockerfile.migrator` as an init container to run migrations before main services start.

```dockerfile
# sso-platform/Dockerfile.migrator
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY drizzle.config.ts auth-schema.ts tsconfig.json ./
CMD ["pnpm", "db:push"]
```

### Problems Encountered
1. Missing files in Docker context (auth-schema.ts, tsconfig.json)
2. Complex dependency chain for migrations
3. Debugging iterations taking 30+ minutes
4. User frustration with slow progress

### Decision
Abandoned init container approach. Reverted to manual migrations from host.

### Why Manual is Better
1. Keeps production images slim (no Drizzle CLI)
2. Simpler debugging when migrations fail
3. One-time operation, not ongoing overhead
4. `docker-start.sh` script automates the manual step anyway

## Outcome

- ❌ Impact: Approach abandoned
- 🧪 Tests: N/A - reverted
- 📁 Files: Dockerfile.migrator created but unused
- 🔁 Next prompts: Create docker-start.sh instead
- 🧠 Reflection: Sometimes simple manual steps beat complex automation

## Evaluation notes (flywheel)

- Failure modes observed: Over-engineering simple task
- Graders run and results: N/A
- Prompt variant: User suggestion
- Next experiment: Keep migrations simple, automate via script
