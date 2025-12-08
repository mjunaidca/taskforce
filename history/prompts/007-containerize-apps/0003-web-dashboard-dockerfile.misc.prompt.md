---
id: "0003"
title: Web Dashboard Dockerfile
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: /sp.containerize
labels: ["docker", "nextjs", "web-dashboard", "standalone"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - web-dashboard/Dockerfile
  - web-dashboard/.dockerignore
  - web-dashboard/next.config.ts
tests:
  - null
---

## Prompt

Containerize the web-dashboard Next.js application.

## Response snapshot

Created multi-stage Dockerfile for Next.js with standalone output:

### web-dashboard/Dockerfile
- Three-stage build (deps → builder → runner)
- Standalone output mode for minimal production image
- Build ARGs for NEXT_PUBLIC_* variables
- Non-root user (uid 1001 for Next.js convention)

### Key Pattern
```dockerfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL

RUN pnpm build
```

### Code Change
Updated `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

## Outcome

- ✅ Impact: Web dashboard containerized with standalone output
- 🧪 Tests: Manual docker build validation
- 📁 Files: 3 files created/modified
- 🔁 Next prompts: Add to docker-compose.yml
- 🧠 Reflection: Standalone output critical for Docker-optimized Next.js

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results: N/A
- Prompt variant: Direct implementation
- Next experiment: Measure final image size
