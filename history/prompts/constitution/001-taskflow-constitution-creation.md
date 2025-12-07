# PHR-001: TaskFlow Constitution Creation

**ID**: PHR-001
**Stage**: constitution
**Date**: 2025-12-06
**Title**: TaskFlow Platform Constitution Initial Creation

---

## Prompt (User Request)

```
We are building taskflow the Human and AI Agents Project Maangement
platform that breaks the data silos works as cli tool and a a cloud native ai interface where humans talk
 with AI to amange tasks and can assign different taks to agents. Taska are recursive so tasks can have a
 lot of subtasks and so on. We will use the best engineering practices to revbuild our consitituon.

[Followed by /sp.constitution command invocation with Project Constitution Wizard prompt]
```

---

## Response Summary

### Socratic Interview Conducted

**Phase 1: Soul Search Questions**

1. **Anti-Generic Vision**: Asked what makes TaskFlow fundamentally different from standard todo apps
2. **Persona**: Asked what personality should guide design decisions
3. **Non-Negotiable Rules**: Asked for 3 sacred principles
4. **Operational Mechanics**: Asked about AI behavior mode (Bold vs Timorous)

**User Answers:**
- Q1 Priority: (3) MCP-First Architecture > (2) Audit Trail > (1) Unified Interface
- Q2 Persona: Synthesis of all four → "The Accountable Orchestrator"
- Q3 Non-Negotiables: All 4 principles are sacred
- Q4 AI Behavior: Bold Engineer (default to action)
- Tooling: pnpm (frontend), uv (Python)

### Documents Created

1. **Constitution** (`.specify/memory/constitution.md` v1.0.0)
   - Complete replacement from RoboLearn educational platform
   - 4 Non-Negotiable Principles defined:
     1. Every Action MUST Be Auditable
     2. Agents Are First-Class Citizens
     3. Recursive Task Decomposition
     4. Spec-Driven Development
   - Accountable Orchestrator persona established
   - MCP-First Architecture documented
   - Platform quality standards defined
   - Agent coordination protocol specified

2. **CLAUDE.md** (New - v1.0.0)
   - Bold Engineer mode configured
   - Context loading protocol defined
   - Build/test commands (uv, pnpm)
   - Phase-specific guidance (I-V)
   - Anti-patterns documented

3. **GEMINI.md** (New - v1.0.0)
   - Aligned with CLAUDE.md
   - Same operational principles
   - Identical constitution checks

### Consistency Propagation

Templates reviewed:
- `.specify/templates/plan-template.md` — Generic, mentions "Constitution Check" (works with new constitution)
- `.specify/templates/spec-template.md` — Generic, no updates needed
- `.specify/templates/tasks-template.md` — Generic, no updates needed

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| 4 Non-Negotiables (not 3) | User specified all 4 as sacred |
| Accountable Orchestrator persona | Synthesis of all 4 personality archetypes |
| Bold Engineer mode | User preference for proactive AI |
| MCP-First as core innovation | User's priority #1 |
| API key auth for agents (not JWT) | Simpler agent authentication |

---

## Artifacts Created

| File | Version | Type |
|------|---------|------|
| `.specify/memory/constitution.md` | 1.0.0 | Constitution |
| `CLAUDE.md` | 1.0.0 | Operational Guide |
| `GEMINI.md` | 1.0.0 | Operational Guide |
| `history/prompts/constitution/001-taskflow-constitution-creation.md` | N/A | PHR |

---

## Follow-Up Actions

- [ ] Create `specs/` folder structure for Phase I features
- [ ] Begin Phase I implementation per DIRECTIVES.md
- [ ] Track all changes with audit logging from the start

---

## Commit Message

```
docs: create TaskFlow constitution v1.0.0 with CLAUDE.md and GEMINI.md

- Establish 4 Non-Negotiable Principles (Audit, Agents-First, Recursive, Spec-Driven)
- Define Accountable Orchestrator persona for reasoning activation
- Document MCP-First Architecture as core innovation
- Configure Bold Engineer mode for AI agents
- Add build/test commands (uv, pnpm)
- Create PHR-001 for constitution creation session

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
