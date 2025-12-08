---
id: "0012"
title: Skill Hardening with Battle-Tested Learnings
stage: misc
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: 007-containerize-apps
branch: 007-containerize-apps
user: mjs
command: /sp.skill-harvest
labels: ["skills", "documentation", "rii", "blueprints"]
links:
  spec: specs/007-containerize-apps/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/engineering/containerize-apps/SKILL.md
  - .claude/skills/engineering/containerize-apps/references/auth-containerization.md
  - .claude/skills/engineering/containerize-apps/references/network-topology.md
  - .claude/agents/engineering/impact-analyzer-agent.md
  - .claude/commands/sp.containerize.md
tests:
  - null
---

## Prompt

Harden skills, agents, and commands with all the battle-tested learnings from this sprint.

## Response snapshot

Updated multiple skill files with learnings:

### SKILL.md - Common Gotchas (Battle-Tested)
1. Browser vs Server URLs - Use separate variable names
2. localhost in Container - Use Docker service names
3. Healthcheck IPv6 Issue - Use 127.0.0.1 not localhost
4. Database Driver Detection - Use sslmode=disable
5. Auth Origins - Add Docker service names
6. Service Startup Order - Use depends_on conditions
7. Health Check Timing - Use start_period
8. pgAdmin Email - Use valid domain
9. Package Dependencies - Test tools in devDeps

### impact-analyzer-agent.md
Added Battle-Tested Learnings section with 6 key patterns:
- Browser vs Server URL pattern
- Healthcheck IPv6 issue
- Database driver detection
- Package.json dependencies
- pgAdmin configuration
- Migration strategy

### sp.containerize.md
Added Critical Patterns section with concrete examples.

### auth-containerization.md
Added clear explanation of browser vs server URL needs with code examples.

## Outcome

- ✅ Impact: Learnings captured as reusable skills
- 🧪 Tests: N/A - documentation
- 📁 Files: 5 files updated
- 🔁 Next prompts: Use skills for future containerization
- 🧠 Reflection: RII (Reusable Infrastructure Intelligence) captured

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results: N/A
- Prompt variant: Post-sprint harvesting
- Next experiment: Apply skills to different project
