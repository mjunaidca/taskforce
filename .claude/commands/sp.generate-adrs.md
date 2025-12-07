---
description: Generate Architecture Decision Records by analyzing specs and actual implementations for each phase.
---

# COMMAND: Generate ADRs from Specs and Implementations

## CONTEXT

Generate ADRs for the TaskFlow platform by analyzing both specifications and actual implementations. This is a comprehensive review to capture architecturally significant decisions that were made during development.

**Target Phases:**
- 001-cli-core → packages/cli/
- 002-sso-platform → Better Auth SSO integration
- 003-backend-api → packages/api/
- 004-web-dashboard → Next.js frontend
- 005-chatkit-ui → ChatKit integration
- 005-mcp-server → packages/mcp-server/
- 006-chat-server → Chat backend

$ARGUMENTS

## YOUR ROLE

Act as a senior architect performing a post-implementation architectural review. Your goal is to document decisions that:
- Have long-term architectural impact
- Involved meaningful tradeoffs between alternatives
- Will help future engineers understand "why" not just "what"

## EXECUTION WORKFLOW

### Step 0: Setup ADR Directory

```bash
mkdir -p history/adr
```

### Step 1: Analyze Each Phase Sequentially

For each phase (001 through 006), perform this analysis:

#### 1.1 Load Context
- Read `specs/{phase}/spec.md`
- Read `specs/{phase}/plan.md` (if exists)
- Scan implementation directory for key architectural patterns

#### 1.2 Identify Decision Clusters

**What to look for:**
- **Technology Stack**: Framework + tooling + deployment choices that work together
- **Data Architecture**: Database, ORM, caching, storage patterns
- **Authentication/Security**: Auth approach, token strategy, security model
- **API Design**: REST vs GraphQL, versioning, error handling patterns
- **Agent Architecture**: How agents are modeled, their parity with humans
- **State Management**: Client state, server state, sync patterns
- **Testing Strategy**: Test approach, mocking strategy, CI/CD choices

**Clustering Rules:**
- Group technologies that change together (e.g., "Frontend Stack" not separate Next.js, Tailwind, Vercel ADRs)
- Separate decisions that could evolve independently (e.g., Frontend vs Backend stacks)
- Typical project has 3-5 major decision clusters per phase, not 15+ atomic choices

#### 1.3 Apply Significance Test

For each potential decision cluster, answer:
1. **Impact**: Does this affect how engineers structure code long-term?
2. **Alternatives**: Were there viable alternatives with meaningful tradeoffs?
3. **Cross-cutting**: Does this affect multiple components or just one file?

**Only document decisions where ALL THREE are true.**

### Step 2: Create ADRs

For each qualifying decision cluster:

1. Generate a concise title (e.g., "CLI Framework and Command Structure")
2. Create file: `history/adr/ADR-{NNN}-{slug}.md`
3. Fill using this template:

```markdown
# ADR-{NNN}: {Title}

- **Status:** Accepted
- **Date:** {YYYY-MM-DD}
- **Feature:** {phase-name}
- **Context:** {spec-link}

## Decision

{What was decided and why. For technology stacks, list all components:}
- Component A: Choice (reasoning)
- Component B: Choice (reasoning)

## Consequences

### Positive
- {Benefit 1}
- {Benefit 2}

### Negative
- {Tradeoff 1}
- {Tradeoff 2}

## Alternatives Considered

### Alternative A: {Name}
- Pros: ...
- Cons: ...
- Why rejected: ...

### Alternative B: {Name}
- Pros: ...
- Cons: ...
- Why rejected: ...

## References
- Spec: specs/{phase}/spec.md
- Implementation: {path to key files}
```

### Step 3: Phase-Specific Guidance

#### 001-cli-core (Expect 2-3 ADRs)
Look for decisions about:
- CLI framework choice (Typer vs Click vs Argparse)
- Data storage strategy (JSON files vs SQLite vs both)
- Command structure and UX patterns
- Human-agent parity modeling

#### 002-sso-platform (Expect 1-2 ADRs)
Look for decisions about:
- SSO provider choice (Better Auth vs alternatives)
- Token/session strategy
- Multi-tenant architecture

#### 003-backend-api (Expect 2-3 ADRs)
Look for decisions about:
- API framework (FastAPI vs alternatives)
- Database and ORM choices (SQLModel, async patterns)
- Authentication integration approach
- Audit logging architecture

#### 004-web-dashboard (Expect 2-3 ADRs)
Look for decisions about:
- Frontend framework and deployment
- UI component strategy (shadcn vs others)
- State management approach
- API integration patterns

#### 005-chatkit-ui (Expect 1-2 ADRs)
Look for decisions about:
- Chat UI framework choice
- Real-time communication approach
- Component architecture

#### 005-mcp-server (Expect 1-2 ADRs)
Look for decisions about:
- MCP protocol implementation approach
- Tool design patterns
- Agent communication architecture

#### 006-chat-server (Expect 1-2 ADRs)
Look for decisions about:
- Chat backend architecture
- Message storage and retrieval
- AI integration patterns

## OUTPUT FORMAT

After completing all phases, output:

```
# ADR Generation Complete

## Summary
| Phase | ADRs Created | Key Decisions |
|-------|--------------|---------------|
| 001-cli-core | 2 | CLI Framework, Data Storage |
| 002-sso-platform | 1 | Authentication Architecture |
| ... | ... | ... |

## Created ADRs

### ADR-001: {Title}
Path: history/adr/ADR-001-{slug}.md
Phase: 001-cli-core
Summary: {one-line summary}

### ADR-002: {Title}
...

## Decisions NOT documented as ADRs
(Decisions that didn't pass significance test - captured here for reference)

- {Phase}: {Decision} - Why not ADR: {reason}
```

## QUALITY CHECKLIST

Before finalizing each ADR, verify:
- [ ] Title describes a cluster, not atomic choice
- [ ] At least 2 alternatives listed with genuine tradeoffs
- [ ] Both positive AND negative consequences documented
- [ ] References link to actual spec and implementation files
- [ ] Would be useful to an engineer joining 6 months from now

## ANTI-PATTERNS TO AVOID

**Over-granular ADRs (DO NOT create):**
- "Use Typer for CLI" (too narrow - should be part of CLI Framework ADR)
- "Use Tailwind CSS" (too narrow - should be part of Frontend Stack ADR)
- "Add type hints" (not architecturally significant)

**Missing context (DO NOT do):**
- Listing a decision without explaining WHY
- Skipping alternatives that were genuinely considered
- Ignoring negative consequences

**Invented decisions (DO NOT do):**
- Creating ADRs for decisions not actually reflected in the code
- Speculating about alternatives that weren't actually considered
