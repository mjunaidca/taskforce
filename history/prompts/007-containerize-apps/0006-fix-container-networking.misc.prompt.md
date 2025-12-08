---
id: "0006"
title: Fix Container-to-Container Networking
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: debug
labels: ["docker", "networking", "next.js", "api-routes"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - docker-compose.yml
  - web-dashboard/src/app/api/proxy/[...path]/route.ts
  - web-dashboard/src/app/api/chatkit/route.ts
  - web-dashboard/src/app/api/auth/callback/route.ts
tests:
  - null
---

## Prompt

Server-to-server calls failing. Browser works, but Next.js API routes can't reach FastAPI.

## Response snapshot

### Problem
Browser could reach `localhost:8000` (via port mapping), but Next.js API routes running inside the container couldn't.

### Root Cause
Inside web-dashboard container:
- `localhost:8000` = the web-dashboard container itself (nothing listening)
- Need `api:8000` = Docker DNS resolves to api container

### Initial Solution (Confusing)
Same variable with different values:
```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:8000  # Browser
environment:
  - NEXT_PUBLIC_API_URL=http://api:8000  # Server
```

### Final Solution (Clean)
Separate variable names:
```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:8000  # Browser
environment:
  - SERVER_API_URL=http://api:8000  # Server
```

Code change:
```typescript
const API_BASE = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

## Outcome

- ✅ Impact: Container-to-container networking works
- 🧪 Tests: Auth flow, API proxy, ChatKit all working
- 📁 Files: 4 files modified
- 🔁 Next prompts: Document pattern in skills
- 🧠 Reflection: Separate vars cleaner than same var with different values

## Evaluation notes (flywheel)

- Failure modes observed: ECONNREFUSED on localhost inside container
- Graders run and results: N/A
- Prompt variant: User feedback drove simplification
- Next experiment: Capture in skill documentation
