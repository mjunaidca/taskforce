---
id: "0005"
title: Fix Healthcheck IPv6 Issue
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: debug
labels: ["docker", "healthcheck", "ipv6", "debugging"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - docker-compose.yml
tests:
  - null
---

## Prompt

Health checks failing for services. Debug and fix.

## Response snapshot

### Problem
Health checks using `wget http://localhost:3000` were failing intermittently.

### Root Cause
`localhost` can resolve to IPv6 `[::1]` on some systems, but Node.js/Python servers default to listening on IPv4 `0.0.0.0` only.

### Solution
Changed all healthchecks to use `127.0.0.1` instead of `localhost`:

```yaml
# Before (broken)
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3000/"]

# After (fixed)
healthcheck:
  test: ["CMD", "wget", "--spider", "http://127.0.0.1:3000/"]
```

### Battle-Tested Learning
Always use `127.0.0.1` in Docker healthchecks, never `localhost`.

## Outcome

- ✅ Impact: Health checks now pass reliably
- 🧪 Tests: docker compose up -d, verify all services healthy
- 📁 Files: 1 file modified
- 🔁 Next prompts: Continue with networking issues
- 🧠 Reflection: IPv6 gotcha captured in skill documentation

## Evaluation notes (flywheel)

- Failure modes observed: Intermittent health check failures
- Graders run and results: N/A
- Prompt variant: Debugging session
- Next experiment: Document in containerize-apps skill
