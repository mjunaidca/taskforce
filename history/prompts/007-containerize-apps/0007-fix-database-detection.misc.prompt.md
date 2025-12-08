---
id: "0007"
title: Fix Database Driver Detection
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: debug
labels: ["docker", "postgres", "neon", "database"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - docker-compose.yml
  - sso-platform/src/lib/db/index.ts
tests:
  - null
---

## Prompt

Database connection failing. Code trying to use Neon serverless driver for local postgres.

## Response snapshot

### Problem
SSO platform code detects Neon vs local postgres to choose driver, but Docker service name `postgres:5432` wasn't being detected as local.

### Root Cause
Code was checking for `localhost` or `127.0.0.1` in DATABASE_URL to detect local postgres. Docker uses `postgres:5432` (service name).

### Solution
Add `sslmode=disable` to local postgres URLs and detect based on that:

```yaml
# docker-compose.yml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/taskflow?sslmode=disable
```

```typescript
// Detection logic
const isLocal = url.includes("sslmode=disable") || url.includes("localhost");
```

### Battle-Tested Learning
Use `sslmode=disable` as the canonical signal for local postgres in containerized environments.

## Outcome

- ✅ Impact: Database connection works with local postgres
- 🧪 Tests: SSO platform connects and runs migrations
- 📁 Files: 2 files modified
- 🔁 Next prompts: Test full auth flow
- 🧠 Reflection: Query parameter as signal is robust pattern

## Evaluation notes (flywheel)

- Failure modes observed: Wrong driver selected for local postgres
- Graders run and results: N/A
- Prompt variant: Debugging session
- Next experiment: Document in skill
