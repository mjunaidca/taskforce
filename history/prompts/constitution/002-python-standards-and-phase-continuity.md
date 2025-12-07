---
id: 002
title: Python Standards and Phase Data Continuity
stage: constitution
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: main
user: mjs
command: direct-request
labels: ["python", "standards", "data-model", "phase-continuity"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - null
---

## Prompt

Update constitution to add we use 3.13+ python and follow standard PEP8 and python guidelines including the modern typing system

Another important point is the design system shall be carefully planned at each hackathon phase. The data modeling at p1 will directly get embedded in p2 etc.

## Response snapshot

Updated constitution v1.0.0 → v1.0.3 with three additions:

**1. Python Standards (v1.0.1):**
```
| **Python** | Python 3.13+, UV for package management, PEP 8 style, modern typing system (generics, `|` union, `TypedDict`, `Literal`) |
```

**2. Principle 5: Phase Continuity (v1.0.2):**
- Data models in P1 → directly embed in P2, P3, P4, P5
- No "throwaway" code — everything compounds forward
- Pydantic (P1) → SQLModel (P2) → same schema
- Validation: "Will this exact structure work in Phase 5?"

**3. Formal Verification Guidance (v1.0.3):**
- Reference: Daniel Jackson's *Software Abstractions: Logic, Language, and Analysis*
- Small Scope Hypothesis: Most bugs found with 3-5 instances
- Invariant Identification, Counterexample Generation, Relational Constraints
- Points to `spec-architect` agent for detailed implementation

## Outcome

- ✅ Impact: Constitution v1.0.3 now includes Python standards, Phase Continuity principle, and Formal Verification guidance
- 🧪 Tests: N/A (documentation change)
- 📁 Files: `.specify/memory/constitution.md` updated
- 🔁 Next prompts: None — all requested changes complete
- 🧠 Reflection: Formal methods (Alloy-style) kept as guidance, not principle — appropriate level for TaskFlow's complexity

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A — changes complete
