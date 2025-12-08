---
id: "0009"
title: Auth Origins Configuration
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: debug
labels: ["docker", "auth", "cors", "better-auth"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - sso-platform/src/lib/auth.ts
  - docker-compose.yml
tests:
  - null
---

## Prompt

Better Auth rejecting requests with "Invalid origin" error.

## Response snapshot

### Problem
Auth requests from containers were being rejected because the request origin (Docker service name) wasn't in trustedOrigins.

### Root Cause
Better Auth validates request origins against a whitelist. Container-to-container requests use service names (e.g., `http://web-dashboard:3000`) which weren't listed.

### Solution
Add Docker service names to trustedOrigins in sso-platform auth config:

```typescript
// sso-platform/src/lib/auth.ts
trustedOrigins: [
  // Local development
  "http://localhost:3000",
  "http://localhost:8000",

  // Docker Compose (service names)
  "http://web-dashboard:3000",
  "http://api:8000",
]
```

Also configure ALLOWED_ORIGINS env var in docker-compose.yml for runtime flexibility:

```yaml
environment:
  - ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,http://web-dashboard:3000,http://api:8000
```

## Outcome

- ✅ Impact: Auth flow works in Docker
- 🧪 Tests: Full OAuth flow from browser through containers
- 📁 Files: 2 files modified
- 🔁 Next prompts: Document in auth-containerization reference
- 🧠 Reflection: Auth origins must include both localhost and container names

## Evaluation notes (flywheel)

- Failure modes observed: "Invalid origin" errors
- Graders run and results: N/A
- Prompt variant: Debugging session
- Next experiment: Test in Kubernetes with different service names
