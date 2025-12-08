---
id: 002
title: Defensive Epistemology and Guardrails Added
stage: general
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: main
user: mjs
command: edit
labels: ["claude-md", "defensive-epistemology", "implementation-guardrails", "phr-hardening"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - CLAUDE.md
  - history/claude-md/002-defensive-epistemology-guardrails-added.general.prompt.md
tests:
  - null
---

## Prompt

Makes sens let's add a new section and shall we add on top """# Working with Q — Coding Agent Protocol

## What This Is

Applied rationality for a coding agent. Defensive epistemology: minimize false beliefs, catch errors early, avoid compounding mistakes.
[...full defensive epistemology intro...]
""" Alseo ahrden it to record all frustation prompts as phrs currently we loose a lot of promtping

## Response snapshot

Added three major enhancements to CLAUDE.md:

### 1. Defensive Epistemology Intro (Top of file)
- "Working with Q — Coding Agent Protocol" section
- Rationalist principles table (Make beliefs pay rent, Notice confusion, Map vs territory, etc.)
- The One Rule: "Reality doesn't care about your model"
- Framing: defensive mode for code (hard edges, compounding mistakes) vs generative mode for creative work

### 2. Section XI: Implementation Guardrails
- **Checkpoint Protocol**: Max 3 actions before verification
- **Explicit Reasoning Protocol**: DOING/EXPECT/IF pattern
- **Rule 0: Stop on Failure**: 6-step failure handling
- **Context Reconnection**: Every ~10 actions reconnect to goals
- **Chesterton's Fence**: Understand WHY before modifying
- **Epistemic Standards**: Beliefs vs observations, "I don't know" available
- **Investigation Protocol**: Competing hypotheses, 5 Whys
- **Handoff Protocol**: Document state when pausing

### 3. PHR Hardening for Frustration Prompts
Added MANDATORY capture for:
- Frustration prompts (user expresses frustration)
- Correction prompts (user corrects agent)
- Clarification prompts (agent misunderstood)
- Iteration prompts (multiple attempts needed)
- Failure prompts (implementation fails)

New stages added: frustration | correction | clarification | iteration | failure

Rationale: "Frustration prompts are HIGHEST PRIORITY for PHR capture" — they reveal gaps in understanding and patterns of failure.

## Outcome

- Impact: CLAUDE.md v1.1.0 now balances "Bold Engineer" speed with verification guardrails
- Tests: N/A (documentation change)
- Files: CLAUDE.md updated with 3 major additions
- Next prompts: Test guardrails on next implementation task
- Reflection: The tension between speed and accuracy is now explicitly managed via checkpointing

## Evaluation notes (flywheel)

- Failure modes observed: Previous version encouraged action without verification checkpoints
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Monitor if "Rule 0: Stop on Failure" reduces cascading errors in next implementation session
