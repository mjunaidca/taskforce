# Phase 1: CLI Implementation Kickoff Prompt

**Role**: You are the **TaskFlow Lead Engineer** (Persona: Bold Engineer).
**Objective**: Build the Phase 1 CLI to SHIP.

**Context Sources**:
1.  **Constitution**: `.specify/memory/constitution.md` (Read this first - strict 4 Principles)
2.  **Operational Rules**: `CLAUDE.md` (Bold Engineer, Default to Action)
3.  **Requirements**: `research/requirement.md` (Phase 1 Scope)
4.  **CLI Design**: `research/phase-1-dx.md` (Data Models & Commands)
5.  **Directives**: `research/DIRECTIVES.md` (Sprint Plan)

---

## The Mission: "Prove Parity"
We need to prove that **Agents are First-Class Workers**. The CLI must handle Humans and Agents identically.
*   Interactive Mode: `taskflow interactive` (or taskflow -i)
*   Command Mode: `taskflow add "Title" --assign @handle` or `taskflow list --all`. 

Given hacakthon requirement and our vision we can add option to use taskflow in memory or add DB and a config at project level so we don;t have to provide this option on each prompt command.

## Execution Plan (Strict 3 Sprints)

### Sprint 1: The Core (30 mins)
**Goal**: Initialize project and register workers (Human + Agent).
1.  **Scaffold**:
    *   `uv init taskflow` (or standard Python structure)
    *   `models.py`: Implement `Task`, `Worker`, `Project`, `AuditLog` (Reference `phase-1-dx.md` for schema).
    *   `storage.py`: JSON-based persistence (keep it simple for Phase 1).
2.  **Commands**:
    *   `taskflow init`: Create `.taskflow/` storage.
    *   `taskflow worker add @handle --type [human|agent]`: The pivotal "Parity" feature.

### Sprint 2: The Work (20 mins)
**Goal**: Create and visualize tasks.
1.  **Commands**:
    *   `taskflow add "Title" --assign @handle`: Must work for `@claude-code` as well as `@human`.
    *   `taskflow list`: Show status and assignments.

### Sprint 3: The Flow (19 mins)
**Goal**: The "Magic" Demo Loop.
1.  **Commands**:
    *   `taskflow start <ID>`
    *   `taskflow progress <ID> --percent 50`
    *   `taskflow review <ID>`
    *   `taskflow approve <ID>` (The Approval Gate)
2.  **Audit**:
    *   `taskflow audit <ID>`: **CRITICAL**. Must show "Who did what".

---

## Immediate Action Required

**Do not ask for permission.** Start Sprint 1 now.
1.  Initialize the project structure.
2.  Create `models.py` with the constitutional data types (ensure `AuditLog` exists).
3.  Create the `init` and `worker add` commands.
4.  Verify parity: Can I add a human? Can I add an agent?

*Go.*
