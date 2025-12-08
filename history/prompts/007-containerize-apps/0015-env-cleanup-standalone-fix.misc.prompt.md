---
id: "0015"
title: "Env Cleanup and Standalone Fix"
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: "conversation continuation"
labels: ["env-vars", "standalone", "local-dev", "duplicate-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - sso-platform/.env (removed duplicate entries)
  - sso-platform/.env.example (simplified to 66 lines)
  - sso-platform/next.config.ts (conditional standalone)
  - sso-platform/Dockerfile (DOCKER_BUILD=true)
  - web-dashboard/next.config.ts (conditional standalone)
  - web-dashboard/Dockerfile (DOCKER_BUILD=true)
  - web-dashboard/.env.example (created for local dev)
tests:
  - Manual: pnpm build && pnpm start (pending)
  - Manual: docker compose up (pending)
---

# Env Cleanup and Standalone Fix

## Prompt

Multiple user messages in session:
1. "You missed these 3 vars for api container" - TASKFLOW_CHATKIT_DATABASE_URL, MCP_SERVER_URL, OPENAI_API_KEY
2. "Also you missed and messed the .env.example for web-dashboard" - Too Docker-centric
3. "Can you .env.example in webdashboard it makes sense to make .env in each project separately for local?"
4. "Why this error happens - pnpm db:push - Error: url: ''" - Empty DATABASE_URL
5. "Another question for local shall i disable standalone?" - pnpm start not working
6. "Something weird is happening - invalid redirect uri" - After pnpm build && start
7. "Shall we improve .env.example to just add dbs and be used like when even make it difficult"

## Response

### Issues Fixed

1. **Duplicate env vars causing empty values**
   - Root cause: "SAMPLE FOR LOCAL?" sections at bottom of .env files overwrote earlier values
   - Fix: Removed duplicate DATABASE_URL, NEXT_PUBLIC_CONTINUE_URL, and branding vars

2. **Standalone mode breaking local dev**
   - Root cause: `output: "standalone"` in next.config.ts breaks `next start`
   - Fix: Made conditional - `output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined`
   - Updated Dockerfiles to set DOCKER_BUILD=true

3. **Invalid redirect URI after login**
   - Root cause: Duplicate NEXT_PUBLIC_CONTINUE_URL (localhost:3000 vs vercel.app)
   - Fix: Removed all duplicate env vars

4. **.env.example confusion**
   - Rewrote all files to be LOCAL dev first, Docker as optional
   - Created per-service .env.example files

### Final State of .env.example Files

| File | Lines | Purpose |
|------|-------|---------|
| `.env.example` (root) | 113 | Master file for all services |
| `sso-platform/.env.example` | 66 | SSO-specific |
| `web-dashboard/.env.example` | 37 | Dashboard-specific |
| `packages/api/.env.example` | 32 | API with ChatKit DB |
| `packages/mcp-server/.env.example` | 4 | MCP minimal |

### Key Pattern: Conditional Standalone

```typescript
// next.config.ts
output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined
```

```dockerfile
# Dockerfile
ENV DOCKER_BUILD=true
RUN pnpm build
```

## Outcome

- [x] All .env.example files simplified and local-dev-first
- [x] Conditional standalone mode for Docker vs local
- [x] Duplicate env vars removed from sso-platform/.env
- [ ] Pending: Test local dev stack
- [ ] Pending: Test Docker stack
- [ ] Pending: PR to main
