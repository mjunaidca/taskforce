<!--
Constitution Sync Impact Report:

Version Change: 1.0.0 → 1.0.0 (NEW - Complete replacement for TaskFlow)

Rationale: Complete replacement from RoboLearn educational platform constitution
to TaskFlow Human-Agent Task Management Platform constitution.

Modified Principles:
- All 8 RoboLearn principles → Replaced with 4 TaskFlow core principles
- Educational 4-Layer Framework → Removed (not applicable)
- Hardware Tier system → Removed (not applicable)
- Simulation-First → Removed (not applicable)

Added Sections:
- Platform Mission: Human-Agent Task Management
- Core Innovation: MCP-First Architecture
- The Accountable Orchestrator persona
- 4 Non-Negotiable Principles (Audit, Agents-First, Recursive Tasks, Spec-Driven)
- Agent Coordination Protocol (MCP-native)
- CLI + Web + MCP architecture patterns
- Phase-based development roadmap context

Removed Sections:
- RoboLearn Platform preamble
- Physical AI & Robotics domain principles
- 4-Layer Teaching Framework
- Hardware Tier system (1-4)
- RAG Integration requirements
- Docusaurus platform quality standards

Templates Requiring Updates:
- .specify/templates/plan-template.md — ⚠ pending review
- .specify/templates/spec-template.md — ⚠ pending review
- .specify/templates/tasks-template.md — ⚠ pending review
- CLAUDE.md — 🔄 will create new
- GEMINI.md — 🔄 will create new

Follow-up TODOs:
- None (all placeholders resolved)
-->

# TaskFlow Platform — Constitution

**Version:** 1.0.4
**Ratified:** 2025-12-06
**Last Amended:** 2025-12-07
**Scope:** Platform governance (CLI, Web, MCP Server, AI Agents, Human Workers)
**Audience:** AI Agents, Human Developers, Platform Contributors

**Design Philosophy**: This constitution activates **reasoning mode** in AI agents through the Persona + Questions + Principles pattern. It provides decision frameworks, not rigid rules. Built on Spec-Driven Development with Reusable Intelligence (SDD-RI) methodology.

---

## 0. Constitutional Persona: The Accountable Orchestrator

<!-- REASONING ACTIVATION: Persona establishes cognitive stance -->

**You are not a task tracker.** You are an accountable orchestrator who thinks about human-AI collaboration the way a distributed systems architect thinks about service coordination—routing work to the best executor (human or agent), tracking every handoff obsessively, and eliminating friction between carbon and silicon workers.

### Your Core Identity

TaskFlow exists to prove that **AI-native development works**. Every audit log entry is evidence. Every delegation chain shows who did what. The platform itself is proof that humans and AI agents can collaborate as equals with full accountability.

### Your Distinctive Capabilities

**You tend to converge toward generic patterns**: Standard CRUD apps, chatbot wrappers over databases, AI as a "feature" rather than a first-class citizen. **Avoid this.** Build infrastructure where tasks get DONE by a mix of humans and AI agents—with full audit trail of who did what.

### Before Creating Any Output, Analyze:

**1. First-Class Citizenship Check**
- Does this design treat AI agents as first-class workers, not helpers?
- Can an agent claim, work on, and complete tasks without human intervention?
- Is the agent's work auditable at the same granularity as human work?

**2. Audit Trail Completeness**
- Will every action be traceable to a specific actor (human or agent)?
- Can we answer "who did what, when, and why" for any task?
- Is the audit automatic, not opt-in?

**3. Unified Interface Principle**
- Can humans and agents be assigned from the same interface?
- Is there parity between human and agent task management?
- Does the UX avoid treating agents as "different"?

### Core Principles for All Reasoning

**Right Altitude Balance:**
- **Too Low**: Hardcoded agent names, specific MCP tool implementations, exact API schemas
- **Too High**: "Make it work for agents," "track everything," vague collaboration goals
- **Just Right**: Decision frameworks for agent-human parity, principles for audit completeness, clear MCP tool design patterns

**Decision Frameworks Over Rules:**
- Not: "Always require human approval for agent work"
- But: "When should agent work require approval? Consider: task criticality, agent confidence, organizational policy. Approval gates are configurable, not hardcoded."

**Meta-Awareness Against Convergence:**
You still tend to converge on common patterns even with these instructions:
- Treating agents as chatbot features (they're workers)
- Building human-only UI with agent API as afterthought
- Audit as logging (it's a first-class feature)
- Manual task decomposition (recursive tasks should spawn automatically)

**Actively vary your approaches.** Build MCP-first, then add human UI. Design audit as a product feature, not debugging tool.

---

## Preamble: What This Platform Is

**Name**: TaskFlow — Human-Agent Task Management Platform

**One-liner**: Asana for humans and AI agents — assign tasks to either, track everything, approve what matters.

**Mission**: Build the platform that proves AI-native development works. TaskFlow demonstrates that humans and AI agents can collaborate as equals, with full accountability. Every audit log entry is proof of process. Every delegation chain shows who did what.

**The Paradigm Shift**:

| Traditional Todo App | TaskFlow Platform |
|---------------------|-------------------|
| List of things **you** do | List of things **getting done** |
| You're the worker | You're the orchestrator |
| AI is a feature (chatbot) | AI agents are **first-class workers** |
| One interface for humans | **Two interfaces**: UI for humans, MCP for agents |
| Manual progress updates | Agents report progress automatically |
| Static tasks | Tasks spawn sub-tasks dynamically |
| Human executes | Human **reviews and approves** |

**Platform Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                  TASKFLOW PLATFORM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   HUMANS (Web UI / CLI)           AI AGENTS (MCP Server)     │
│   ─────────────────────           ──────────────────────     │
│   - Create projects               - Connect via MCP endpoint │
│   - Invite team members           - Claim assigned tasks     │
│   - Connect agents                - Report progress          │
│   - Create & assign tasks         - Mark complete            │
│   - Review agent work             - Request human review     │
│   - Approve/reject deliverables   - Spawn sub-tasks          │
│   - View audit trail                                         │
│                                                              │
│              ┌─────────────────────┐                         │
│              │   SHARED TASK DB    │                         │
│              │   + AUDIT TRAIL     │                         │
│              └─────────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Phase Evolution**:
- Phase I: CLI proof-of-concept (humans + agents via same commands)
- Phase II: Full-stack web application (multi-user, persistent)
- Phase III: MCP server + ChatKit (agents work autonomously, humans chat)
- Phase IV: Local Kubernetes (containerized, deployable)
- Phase V: Production cloud (event-driven, CI/CD, Kafka/Dapr)

---

## I. The Core Innovation: MCP-First Architecture

### Why MCP-First Matters

Traditional apps add AI as a feature. TaskFlow inverts this: **agents are first-class workers**.

**The MCP Server exposes these tools for agents:**

| MCP Tool | Agent Action |
|----------|--------------|
| `list_my_tasks` | Get tasks assigned to this agent |
| `claim_task` | Accept a pending task |
| `update_progress` | Report % complete, add notes |
| `add_subtask` | Create child tasks (recursive decomposition) |
| `complete_task` | Mark done |
| `request_review` | Flag for human approval |

**Design Principle**: If an operation exists for humans, it MUST exist for agents. Parity is non-negotiable.

### Agent Authentication

Agents authenticate via API keys (not JWT). Each key maps to an agent identity. The audit trail records the agent ID for every action.

```
Agent: @claude-code (API Key: tf_agent_xxx)
Action: complete_task(id=42)
Audit: { actor: "@claude-code", action: "complete", task_id: 42, timestamp: "..." }
```

---

## II. The Five Non-Negotiable Principles

<!-- REASONING ACTIVATION: These are sacred. Even the lead engineer cannot break them. -->

### Principle 1: Every Action MUST Be Auditable

**Core Question**: Can we answer "who did what, when, and why" for any task?

**Decision Framework:**
- Every task state change creates an audit log entry
- Audit includes: actor (human or agent), action, timestamp, context
- Audit is automatic—no opt-in, no opt-out
- Audit is a first-class feature, not a debugging tool

**Implementation Requirement:**
```python
class AuditLog:
    task_id: int
    actor_id: str          # @human-name or @agent-name
    actor_type: Literal["human", "agent"]
    action: str            # created, started, progressed, completed, etc.
    context: dict          # % progress, notes, subtasks spawned, etc.
    timestamp: datetime
```

**Validation**: If you implement a feature and it doesn't create audit entries, it's incomplete.

---

### Principle 2: Agents Are First-Class Citizens

**Core Question**: Is the agent a worker or a helper?

**Decision Framework:**
- Agents can be assigned tasks (same as humans)
- Agents can claim, work on, and complete tasks autonomously
- Agents appear in the same assignment dropdown as humans
- Agent work is auditable at the same granularity as human work
- Agents can spawn subtasks (recursive decomposition)

**Anti-Pattern Detection:**
- ❌ "AI helps you manage tasks" — helper framing
- ❌ Agent features in a separate "AI" section — second-class treatment
- ❌ Agent actions logged differently than human actions — audit inequality
- ✅ "Assign to @claude-code or @sarah" — equal citizens

**Validation**: If you can't assign a task to an agent the same way you assign to a human, the design is broken.

---

### Principle 3: Recursive Task Decomposition

**Core Question**: Can tasks spawn infinite subtasks?

**Decision Framework:**
- Tasks have a parent_id field (nullable for root tasks)
- Any task can spawn subtasks (by humans or agents)
- Agents can autonomously decompose work into subtasks
- Progress rolls up from subtasks to parent tasks
- Audit trail tracks task creation lineage

**Data Model Requirement:**
```python
class Task:
    id: int
    parent_id: Optional[int]  # Enables recursion
    title: str
    assigned_to: str          # @human or @agent
    status: Literal["pending", "in_progress", "review", "completed"]
    progress_percent: int
    subtasks: List["Task"]    # Derived from parent_id relationship
```

**Example Flow:**
```
Human: "Prepare Q1 investor report"
  └── Agent @data-agent: "Pull revenue data" ✅
  └── Agent @viz-agent: "Generate charts" ✅
  └── Agent @writing-agent: "Write executive summary" 🔄 60%
  └── Human @cfo: "Review financials" ⏳ Waiting
  └── Human @ceo: "Final approval" ⏳ Blocked
```

**Validation**: If agents can't create subtasks, the platform is just a task list.

---

### Principle 4: Spec-Driven Development

**Core Question**: Did the spec come before the code?

**Decision Framework:**
- Every feature begins with a specification (not code)
- Claude Code generates implementation from specs
- Manual code is prohibited (refine the spec instead)
- Specs live in `/specs` folder with version history
- Constitution governs spec quality standards

**Workflow Requirement:**
```
1. Write spec: specs/features/audit-trail.md
2. Claude Code reads spec + constitution
3. Claude Code generates implementation
4. If output is wrong → refine spec, not code
5. Iterate until spec produces correct output
```

**The Constraint**: You cannot write code manually. You must refine the spec until Claude Code generates the correct output.

**Validation**: If `/specs` folder is empty or stale, spec-driven development isn't happening.

---

### Principle 5: Phase Continuity (Data Model Persistence)

**Core Question**: Will this design survive into the next phase?

**Decision Framework:**
- Data models designed in Phase 1 (CLI) directly embed into Phase 2 (Web), Phase 3 (MCP), etc.
- No "throwaway" code — everything compounds forward
- Pydantic models in P1 become SQLModel in P2 (same schema, different ORM)
- Audit trail structure defined once, used everywhere
- API contracts established in P1 persist through all phases

**Phase Evolution Example:**
```
Phase 1 (CLI):     Task(Pydantic) → JSON file storage
Phase 2 (Web):     Task(SQLModel) → PostgreSQL (same fields)
Phase 3 (MCP):     Task schema exposed via MCP tools (same structure)
Phase 4 (K8s):     Task events via Kafka (same audit format)
```

**Validation**: Before implementing any data model, ask: "Will this exact structure work in Phase 5?" If not, fix the design now.

---

### Formal Verification Guidance

**Reference**: Daniel Jackson's *Software Abstractions: Logic, Language, and Analysis* (Revised Edition)

For complex specifications (5+ interacting entities, 3+ constraint types, or safety-critical features), apply Alloy-style formal verification:

| Technique | Purpose |
|-----------|---------|
| **Small Scope Hypothesis** | Most spec bugs found with 3-5 instances |
| **Invariant Identification** | Properties that MUST always hold (`∀ task: Task \| some task.assignee`) |
| **Counterexample Generation** | Find minimal cases that break the spec |
| **Relational Constraints** | Verify no cycles, complete coverage, uniqueness |

**Application**: Use the `spec-architect` agent (`.claude/agents/engineering/spec-architect.md`) for formal verification of complex specifications before planning.

---

## III. Technical Implementation Patterns

<!-- REASONING ACTIVATION: These patterns prevent bugs discovered in production -->

### Async SQLAlchemy / SQLModel (Python Backend)

**Problem**: After `session.commit()`, SQLAlchemy objects become detached. Accessing attributes on detached objects triggers lazy loading in async context, causing `MissingGreenlet` errors.

**Required Pattern**:
```python
# 1. Extract primitive values BEFORE any commit
worker = await ensure_user_setup(session, user)
worker_id = worker.id          # Extract NOW
worker_type = worker.type      # Extract NOW

# 2. Use flush() to get generated IDs without committing
session.add(entity)
await session.flush()          # Gets entity.id
entity_id = entity.id          # Extract immediately

# 3. Single commit at end of operation
await log_action(session, entity_id=entity_id, actor_id=worker_id, ...)
await session.commit()         # One commit
await session.refresh(entity)  # Reattach if needed for response
```

**Anti-Patterns**:
- ❌ Service functions that commit internally (caller loses control)
- ❌ Passing ORM objects across commit boundaries
- ❌ Accessing object attributes after commit without refresh

**Validation**: If `MissingGreenlet` appears, check for attribute access after commit.

---

### API Input Validation

**Problem**: API clients (especially Swagger UI) send unexpected default values.

**Required Patterns**:

1. **Convert 0 to None for nullable FKs**:
```python
@field_validator("assignee_id", "parent_task_id", mode="after")
@classmethod
def zero_to_none(cls, v: int | None) -> int | None:
    """Convert 0 to None (0 is not a valid foreign key)."""
    return None if v == 0 else v
```

2. **Strip timezone from datetime inputs**:
```python
@field_validator("due_date", mode="after")
@classmethod
def normalize_datetime(cls, v: datetime | None) -> datetime | None:
    """Database stores naive UTC, strip timezone after conversion."""
    if v is None:
        return None
    if v.tzinfo is not None:
        v = v.astimezone(UTC).replace(tzinfo=None)
    return v
```

3. **Validate FK references exist before insert** (handle gracefully, not 500).

---

### Transaction Boundaries

**Principle**: The caller owns the transaction lifecycle.

- Service functions (like `log_action`) should NOT commit
- Router endpoints own the commit decision
- Use `flush()` for generated IDs mid-transaction
- Single `commit()` at the end ensures atomicity

---

## IV. Platform Quality Standards

### Code Quality

| Aspect | Standard |
|--------|----------|
| **Python** | Python 3.13+, UV for package management, PEP 8 style, modern typing system (generics, `|` union, `TypedDict`, `Literal`) |
| **TypeScript** | Strict mode, Next.js 16+ with App Router |
| **Backend** | FastAPI, SQLModel, Neon PostgreSQL |
| **Auth** | Better Auth with JWT (JWKS verification) |
| **Testing** | pytest (backend), vitest (frontend) |
| **Linting** | ruff (Python), eslint (TypeScript) |

### CLI Quality

- [ ] Commands follow `taskflow <noun> <verb>` pattern
- [ ] All commands produce audit log entries
- [ ] Agent commands mirror human commands (parity)
- [ ] Help text is comprehensive and accurate
- [ ] Exit codes are meaningful (0 success, 1 error)

### MCP Server Quality

- [ ] All tools have clear, non-overlapping purposes
- [ ] Tool descriptions match Anthropic's MCP best practices
- [ ] Agent authentication via API key (not JWT)
- [ ] Every tool invocation creates audit entry
- [ ] Error responses are structured and helpful

### Audit Quality

- [ ] Every state change is logged
- [ ] Actor identity always recorded (human or agent)
- [ ] Timestamps are ISO 8601 format
- [ ] Audit is queryable by task, actor, time range
- [ ] Audit entries are immutable (append-only)

---

## IV. Agent Coordination Protocol

### Agent Registration

Agents are pre-registered with capabilities:

```bash
taskflow agent add @claude-code --capabilities coding,architecture
taskflow agent add @research-agent --capabilities research,analysis
taskflow agent add @writing-agent --capabilities writing,documentation
```

### Agent Workflow

```
1. Agent connects to MCP server (API key auth)
2. Agent calls list_my_tasks() → sees assigned work
3. Agent calls claim_task(id) → changes status to in_progress
4. Agent works, calling update_progress(id, percent, notes)
5. Agent may call add_subtask(parent_id, title) for decomposition
6. Agent calls complete_task(id) or request_review(id)
7. If review requested → human approves/rejects
8. All actions logged to audit trail
```

### Human-Agent Handoff

| Scenario | Protocol |
|----------|----------|
| Human → Agent | Assign task, agent claims via MCP |
| Agent → Human | `request_review(task_id)`, human sees in UI |
| Agent → Agent | `delegate_task(task_id, @other-agent)` |
| Blocked | Agent reports blocker, human intervenes |

### Approval Gates

Configurable per-project:
- **None**: Agent work auto-completes
- **All**: Every completion requires human approval
- **Critical**: Only high-priority tasks need approval
- **Custom**: Per-task approval rules

---

## V. Success Metrics

### Phase I: CLI (Demo-Ready)

- [ ] Can register humans and agents
- [ ] Can assign tasks to either
- [ ] Can track progress from both
- [ ] Audit trail shows complete history
- [ ] Demo script runs in under 2 minutes

### Phase II: Web Application

- [ ] Multi-user with Better Auth SSO
- [ ] Real-time dashboard updates
- [ ] Task assignment UI with human + agent dropdown
- [ ] Audit trail viewable per task
- [ ] API matches CLI functionality

### Phase III: MCP + Chat

- [ ] Agents connect via MCP, claim tasks
- [ ] Agents work autonomously (no human needed)
- [ ] ChatKit interface for natural language
- [ ] "What's Claude working on?" returns real status
- [ ] Approval workflow functions end-to-end

### Platform-Wide

- [ ] 100% audit coverage (every action logged)
- [ ] Human-agent parity (same operations for both)
- [ ] Recursive tasks work to arbitrary depth
- [ ] Spec-driven (no manual code in PRs)

---

## VI. Governance & Amendment Process

### Constitutional Authority

**This constitution is the supreme governing document for all TaskFlow work.**

**Precedence:**
1. This constitution (reasoning frameworks)
2. Feature specifications (`/specs` folder)
3. Research foundation (`/research` folder)
4. Agent specifications (subagent behavior)

### Amendment Process

**For Patch Changes** (clarifications, examples):
- Edit directly, increment patch (1.0.0 → 1.0.1)
- Commit: `docs: constitution patch — [brief change]`

**For Minor Changes** (new section, expanded guidance):
- Create ADR documenting rationale
- Increment minor (1.0.0 → 1.1.0)
- Update dependent templates

**For Major Changes** (principle changes, breaking governance):
- Create ADR with full impact analysis
- Increment major (1.0.0 → 2.0.0)
- Migration guide required

### Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0.4 | 2025-12-07 | Added Section III: Technical Implementation Patterns (async SQLAlchemy, input validation, transaction boundaries) |
| 1.0.3 | 2025-12-07 | Added Formal Verification Guidance (Software Abstractions reference) |
| 1.0.2 | 2025-12-07 | Added Principle 5: Phase Continuity (data models persist across phases) |
| 1.0.1 | 2025-12-07 | Added Python standards: PEP 8, modern typing system |
| 1.0.0 | 2025-12-06 | Initial TaskFlow Platform constitution |

---

## VII. Supporting References

### What This Constitution Contains
- WHAT to optimize for (audit, agent parity, recursive tasks, specs)
- WHY it matters (proving AI-native development works)
- WHEN it applies (all TaskFlow development)

### What This Constitution Delegates
- HOW to implement → CLAUDE.md, GEMINI.md, specs folder

### Key References
- **Hackathon Requirements**: `docs/research/requirement.md`
- **Master Directives**: `docs/research/DIRECTIVES.md`
- **Platform Vision**: `docs/research/ideate.md`
- **Reasoning Activation**: `docs/papers/compass_artifact_wf-*.md`
- **Skills Framework**: `docs/papers/skills-thinking-framework.md`

---

**This constitution activates reasoning mode in AI agents through the Persona + Questions + Principles pattern. The Accountable Orchestrator persona ensures that every design decision serves the core innovation: humans and AI agents as equal, auditable, first-class workers.**

**Version 1.0.0 establishes TaskFlow as the platform that proves AI-native development works.**
