---
id: 001
title: CLAUDE.md Improvement Analysis
stage: general
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: main
user: mjs
command: review
labels: ["claude-md", "implementation-guardrails", "defensive-epistemology"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - history/claude-md/001-claude-md-improvement-analysis.general.prompt.md
tests:
  - null
---

## Prompt

Now let's review our CLAUDE.md we have found our planning is realy good but implementation always go rougue wasting time. To improve this I found a sample CLAUDE.md online and it connectes. Do you see any opportunity to improve current claude.md For this record the phr in @history/claude-md/ https://gist.github.com/ctoth/d8e629209ff1d9748185b9830fa4e79f

## Response snapshot

Identified 6 critical gaps between current CLAUDE.md (optimized for speed/boldness) and the sample "Defensive Epistemology" approach (optimized for accuracy/verification):

1. **Checkpointing** - No action limits in current; sample enforces max 3 actions before verification
2. **Explicit Predictions** - No DOING/EXPECT/IF protocol to force prediction before action
3. **Stop Conditions** - "Fix proactively" encourages action; sample's Rule 0 requires STOP on failure
4. **Epistemic Humility** - "Bold Engineer" vs "I don't know beats confident guessing"
5. **Context Reconnection** - No periodic goal check; sample requires reconnection every ~10 actions
6. **Chesterton's Fence** - "Read before editing" insufficient; must articulate WHY code exists before modifying

Recommended adding new section "XI. Implementation Guardrails" with:
- Checkpoint Protocol (max 3 actions)
- Explicit Reasoning (DOING/EXPECT/IF)
- Rule 0: Stop on Failure
- Context Reconnection protocol
- Chesterton's Fence requirement

## Outcome

- Impact: Analysis completed - identified root cause of "rogue implementation" as missing verification checkpoints
- Tests: N/A (analysis only)
- Files: Created PHR in history/claude-md/
- Next prompts: User to decide which guardrails to add to CLAUDE.md
- Reflection: The tension between "Bold Engineer Mode" (speed) and "Defensive Epistemology" (accuracy) needs balancing

## Evaluation notes (flywheel)

- Failure modes observed: Current CLAUDE.md optimizes for speed over verification, causing implementation drift
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add Checkpoint Protocol section and test on next implementation task
