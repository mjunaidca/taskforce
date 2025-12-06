---
id: 012
title: Post-Phase3-MCP-Architecture
stage: design
date: 2025-12-06
surface: claude.ai
model: claude-opus-4-5
feature: computer-use
branch: main
user: muhammad
command: chat
labels: [mcp, architecture, agent-connection]
links:
  spec: # none yet
  ticket: # none
  adr: # none
  pr: # none
files:
  # none
tests:
  # none
---
## Prompt
Q: So afer phase 3 we have it working locally or i connect claude with with an mcp server it logins using sso token and can see which tasks are assigned and start working. You mentioned priject repors sharing i was not thinking this maybe we want to share repos or maybe not as blueprints only.....

## Response snapshot
 Great clarifying question. Let me think through this carefully.

---

## After Phase 3: What Actually Works

Yes, after Phase 3 you have:

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR MACHINE                              │
│                                                                  │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Claude Code │    │         TaskFlow Backend                 │ │
│  │   (CLI)     │───▶│  - FastAPI (localhost:8000)             │ │
│  │             │MCP │  - MCP Server (localhost:3001)          │ │
│  └─────────────┘    │  - Neon DB (cloud, but accessed local)  │ │
│                     └─────────────────────────────────────────┘ │
│                                    │                             │
│                                    ▼                             │
│                     ┌─────────────────────────────────────────┐ │
│                     │         Hackathon 1 SSO                  │ │
│                     │  (Vercel, validates JWT)                 │ │
│                     └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**The flow:**

1. Claude Code connects to TaskFlow MCP server (localhost:3001)
2. Claude authenticates with an API key (we generate this in TaskFlow UI, tied to agent identity)
3. Claude calls `list_my_tasks` → sees tasks assigned to `@claude-code`
4. Claude calls `claim_task` → starts working
5. Claude calls `update_progress`, `add_subtask`, `request_review`
6. Everything is logged in audit trail

**Human auth is separate:** You login via SSO in the web UI. Agents use API keys.

---

## The Repo/Specs Question: Let's Think About This

You raised something important. I said tasks could "link to specs in multiple repos" but let's be precise about what we actually need:

### Option A: TaskFlow Stores Links Only (Simpler)

```python
Task(
    title="Implement JWKS verification",
    linked_specs=[
        "https://github.com/muhammad/hackathon-sso/blob/main/specs/auth.md",
        "https://github.com/muhammad/taskflow/blob/main/specs/api/security.md"
    ]
)
```

**TaskFlow doesn't fetch or store the specs.** It just stores URLs. When an agent needs context:
- Agent sees the links
- Agent fetches them itself (Claude Code can read GitHub URLs)
- Agent works with that context

**Pros:** Simple. No repo access management. No sync issues.
**Cons:** Agent needs GitHub access. Links can break if files move.

---

### Option B: TaskFlow Fetches & Caches Specs (Medium)

```python
Task(
    title="Implement JWKS verification",
    context=TaskContext(
        specs=[
            SpecReference(
                url="https://github.com/muhammad/hackathon-sso/blob/main/specs/auth.md",
                cached_content="# Auth Spec\n...",  # Fetched at task creation
                cached_at="2025-12-06T10:00:00Z"
            )
        ]
    )
)


[...truncated for readability - full response in transcript...]

## Outcome
- ✅ Impact: Clarified MCP server flow and agent authentication patterns
- 🧪 Tests: none
- 📁 Files: 0 files
- 🔁 Next prompts: Project isolation
- 🧠 Reflection: Design decision captured - architectural choice with rationale preserved

## Evaluation notes (flywheel)
- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (design phase)
- Prompt variant (if applicable): original
- Next experiment (smallest change to try): continue conversation flow
