---
id: "0013"
title: Simplify URL Pattern
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: refactor
labels: ["docker", "env-vars", "simplification", "user-feedback"]
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
  - .claude/skills/engineering/containerize-apps/SKILL.md
  - .claude/skills/engineering/containerize-apps/references/auth-containerization.md
  - .claude/agents/engineering/impact-analyzer-agent.md
  - .claude/commands/sp.containerize.md
tests:
  - null
---

## Prompt

"Why make the buildtime and runtime args different (localhost vs api:)? It will make confusion for future maintainers."

## Response snapshot

### Problem
User feedback: Having same variable (NEXT_PUBLIC_API_URL) with different values in build args vs runtime env was confusing.

### Initial Pattern (Confusing)
```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:8000
environment:
  - NEXT_PUBLIC_API_URL=http://api:8000  # Same name, different value!
```

### Final Pattern (Clear)
```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:8000  # Browser only
environment:
  - SERVER_API_URL=http://api:8000               # Server only
```

### Code Change
```typescript
// In each API route
const API_BASE = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

### Files Updated
- docker-compose.yml
- 3 API route files
- 4 skill/agent documentation files

### Why This Is Better
- Each variable has ONE value
- Clear naming: SERVER_* vs NEXT_PUBLIC_*
- Future maintainers understand immediately
- Minimal code change (one-liner fallback)

## Outcome

- ✅ Impact: Cleaner, more maintainable pattern
- 🧪 Tests: Full auth flow verified
- 📁 Files: 8 files updated
- 🔁 Next prompts: Update .env.example, create spec/plan/tasks
- 🧠 Reflection: User feedback drove better design

## Evaluation notes (flywheel)

- Failure modes observed: Initial design was confusing
- Graders run and results: N/A
- Prompt variant: User feedback
- Next experiment: Apply pattern to new projects
