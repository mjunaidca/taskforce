---
id: "0002"
title: Agent Container VM Isolation Design
stage: plan
date: 2025-12-13
surface: agent
model: claude-opus-4-5-20251101
feature: agent-execution-isolation
branch: main
user: mjunaidca
command: discussion
labels: ["containers", "VMs", "agent-isolation", "security", "kubernetes", "architecture"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - none
tests:
  - none
---

## Prompt

I am planning to attach some container / vm for our agents feature so agents when custom made can connect/run in vm or citnainers in yolo ode to complete the task assgined What do you think? Share all the edge cases and how can this be designed.

## Response snapshot

Provided comprehensive architectural analysis of running custom agents in isolated containers/VMs for autonomous "yolo mode" execution. Covered three design options (container-based, MicroVM-based, hybrid trust tiers), 10 critical edge cases with mitigations (runaway execution, crashes, secrets exposure, container escape, resource starvation, network failures, concurrent conflicts, audit trails, workspace persistence, agent auth), and recommended architecture using Kubernetes with gVisor for untrusted agents.

## Outcome

- ✅ Impact: Established comprehensive design framework for agent isolation with security-first approach
- 🧪 Tests: none
- 📁 Files: none (discussion phase)
- 🔁 Next prompts: Create ADR for agent-execution-isolation decision, define trust model for custom agents, design workspace persistence strategy
- 🧠 Reflection: The hybrid trust-tier approach (containers for trusted, gVisor for verified, Firecracker for untrusted) balances security with performance - one size doesn't fit all agent trust levels

## Evaluation notes (flywheel)

- Failure modes observed: None - productive architectural discussion that surfaced key design decisions
- Graders run and results (PASS/FAIL): N/A - discussion phase
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Create ADR to formalize the isolation strategy decision before implementation
