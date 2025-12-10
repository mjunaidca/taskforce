---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Include **explicit skill references** in tasks so each task can be efficiently implemented. 

## Core Directive

**Default to Action**: Generate the complete tasks.md immediately from available design artifacts. Extract tasks systematically from spec user stories, plan structure, and data model. Only flag issues that genuinely block task generation.

**WHY**: Task generation is mechanical extraction from spec/plan. The artifacts contain all necessary information. Generate the task list and let implementation surface any gaps—don't over-analyze before producing output.

## Anti-Pattern Prevention

**CRITICAL**: Most workflows fail at task breakdown. Specs and plans look perfect, then "tasks break everything cause buggy." Apply these preventions:

### Common Anti-Patterns and Solutions

| Anti-Pattern | Prevention | Example |
|--------------|------------|---------|
| **Vague tasks** | Include exact file paths | ✅ `helm/taskflow/templates/api/deployment.yaml` ❌ "Create API deployment" |
| **Wrong granularity** | 1-2 hour sweet spot per task | ✅ 80 tasks @ 2.7 min avg ❌ "Create Helm chart" = 8 hours |
| **Wrong order** | Explicit dependency graph | ✅ postgres → sso → api (with initContainers) |
| **Untestable** | Per-phase acceptance criteria with commands | ✅ `helm template --dry-run` ❌ "Should work" |
| **Spec drift** | FR mapping + US labels trace back to spec | ✅ `[US1] FR-014: Create sso deployment` |
| **No done condition** | Checkboxes with expected outputs | ✅ "Renders valid YAML" ❌ No criteria |
| **Guessing syntax** | Documentation-first with Context7 queries | ✅ Query Helm docs before implementation |

### Granularity Rules (MANDATORY)

**Sweet Spot**: 1-2 hours per task for human implementation
- **Too Big**: "Create complete Helm chart" (8+ hours) → leads to mid-task blocking
- **Too Small**: "Add one line to values.yaml" (30 seconds) → creates hundreds of tasks
- **Just Right**: "Create deployment.yaml with initContainer" (1-2 hours) → atomic, testable, clear done condition

**Target Metrics**:
- 60-100 tasks for 3-hour implementation
- Average ~2-3 minutes per task
- 40-60% parallelizable (mark with [P])

**Test**: If task takes >2 hours, split it. If <30 minutes, merge with related task.

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (API endpoints), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map endpoints to user stories
   - If research.md exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)
   - Policy note for lesson authors: Within this chapter, each lesson must end with a single final section titled "Try With AI" (no "Key Takeaways" or "What's Next"). Before AI tools are taught (e.g., Part-1), use ChatGPT web in that section; after tool onboarding, instruct learners to use their preferred AI companion tool (e.g., Gemini CLI, Claude CLI), optionally providing CLI and web variants.

5. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Documentation-First Pattern (MANDATORY)

**CRITICAL**: NEVER guess syntax or API patterns. Query official documentation BEFORE task implementation.

### Integration with Context7 MCP

Each tasks.md MUST include an "AI-Native Execution Guide" section mapping phases to documentation queries:

```markdown
## AI-Native Execution Guide

### Official Documentation (Query via Context7 MCP)

**Phase X: [Phase Name]**
  mcp__context7__resolve-library-id --libraryName "[library]"
  mcp__context7__get-library-docs --context7CompatibleLibraryID "/org/project" --topic "[topic]"

**Examples**:
- Helm Charts: `/helm/helm` topics: "chart structure", "deployment spec", "values schema"
- Kubernetes: `/kubernetes/kubernetes` topics: "initContainers", "probes", "services"
- Docker: `/docker/docs` topics: "docker build", "multi-stage", "compose"
- Next.js: `/vercel/next.js` topics: "app router", "server actions", "middleware"
- FastAPI: `/tiangolo/fastapi` topics: "async routes", "dependencies", "middleware"

### Implementation Pattern (For Each Task)
1. Query relevant official docs via Context7 ← NEVER SKIP
2. Review plan.md for architecture decisions
3. Check spec.md for functional requirements
4. Implement using official patterns (not guessing)
5. Verify with acceptance criteria commands
6. Mark task complete with checkbox
```

### Skills Mapping

**CRITICAL**: Check for existing skills BEFORE assuming they don't exist.

```bash
# Discover available skills
ls -1 .claude/skills/engineering/
```

Map task phases to available skills in `.claude/skills/engineering/`:

```markdown
### Skills to Use (from `.claude/skills/engineering/`)

**Required Skills for This Feature:**
- **`[skill-name]`** - [description from SKILL.md]
  (Verify skill exists by reading `.claude/skills/engineering/[skill-name]/SKILL.md`)

**Optional Skills (for troubleshooting):**
- **`[skill-name]`** - [when to use]
  - Use for: [specific use cases]
  - NOT for: [what to avoid]

**If skill doesn't exist**: Recommend creating it for future reuse
```

**Common Skills by Technology** (check if they exist first):
- Helm/K8s/Minikube → `helm-charts`, `kubernetes-essentials`, `minikube`, `kubectl-ai`
- FastAPI/SQLModel → `fastapi-backend`, `sqlmodel-database`
- Auth → `better-auth-sso`, `better-auth-setup`
- Frontend → `nextjs-16`, `shadcn-ui`, `chatkit-integration`, `frontend-design`
- Infrastructure → `containerize-apps`, `mcp-builder`

## Acceptance Criteria Format (MANDATORY)

**CRITICAL**: Each phase MUST have testable acceptance criteria with verification commands.

### Per-Phase Structure

```markdown
### Phase N: [Phase Name] (X tasks, Y minutes)

**Acceptance Criteria**:
- [ ] [Measurable outcome 1]
  ```bash
  # Verification command
  [command that proves criterion is met]
  ```
- [ ] [Measurable outcome 2]
  ```bash
  [verification command]
  ```

**Expected Output**: [Exact output that proves phase completion]

**Tasks**:
- [ ] T0XX [P] [Story] Task description with file path
```

### Example Acceptance Criteria

**Good** (testable with command):
```markdown
**Acceptance Criteria**:
- [ ] All 20 templates created, helm template renders valid YAML
  ```bash
  helm template taskflow ./helm/taskflow --dry-run
  # Expected: No errors, 20 resource definitions output
  ```
- [ ] All 4 Docker images built successfully
  ```bash
  docker images | grep -E '(sso|api|mcp|web).*:dev'
  # Expected: 4 images with 'dev' tag
  ```
```

**Bad** (not testable):
- ❌ "Helm chart should work"
- ❌ "Code looks good"
- ❌ "Everything is ready"

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label  
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Endpoints/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **Traceability Mapping** (MANDATORY):
   - **Triple Mapping**: Task → User Story → Functional Requirement → File Path
   - **Task Format**: `- [ ] T0XX [P] [US#] FR-XXX: Description with path/to/file.ext`
   - **Example**: `- [ ] T014 [P] [US1] FR-014: Create sso-platform deployment.yaml with initContainer`
   - **Why**: Enables validation that every FR is implemented and every task traces to requirements
   - **Phase Header**: Include FR mapping per phase
     ```markdown
     ### Phase 3: US1 - Service Deployment (22 tasks, 115 min)
     **FRs**: FR-014, FR-015, FR-016, FR-017, FR-018
     ```

2. **Cross-Reference Verification Tasks** (For educational content):
   - If lessons teach patterns (skills, subagents, ADRs, PHRs), add verification task
   - Example: `- [ ] T0XX [P] [US1] Verify skill format matches Chapter N Lesson 7 canonical source`
   - Canonical source lookup:
     - **Skills**: `.claude/skills/authoring/<name>/SKILL.md` (content) or `.claude/skills/engineering/<name>/SKILL.md` (platform)
     - **Agents**: `.claude/agents/authoring/<name>.md` (content) or `.claude/agents/engineering/<name>.md` (platform)
     - **ADRs**: `specs/<feature>/adrs/`
     - **PHRs**: `history/prompts/<feature>/`
   - Purpose: Prevent format drift across book content

3. **From Contracts**:
   - Map each contract/endpoint → to the user story it serves
   - If tests requested: Each contract → contract test task [P] before implementation in that story's phase

4. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

5. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Dependency Graph & Parallel Execution (MANDATORY)

**CRITICAL**: Include explicit dependency graph and parallel opportunities to prevent wrong ordering and enable fast execution.

**Required Sections in tasks.md**:

```markdown
## Dependencies

### User Story Completion Order
Setup → Foundation → US1 → US2 → US4 → Deployment
                            ↘ US3 ↗
                            (parallel with US2)

### Critical Path (minimum time to completion)
- Setup: 15 min
- Foundation: 45 min
- US1: 115 min
- US2: 20 min
- US4: 20 min
- Deployment: 30 min
**Total Critical Path**: 3h 5min (65 tasks)

### Parallel Opportunities
- Phase 3A-3D: 4 services can be templated simultaneously (different files)
- Phase 4: 4 image builds can run concurrently
- US3 + US4: Configuration review and dependency implementation can overlap
**Parallelizable**: 40 tasks (50% of total)

## Implementation Strategy

### MVP Scope
**Critical Path Only** (3h 5min):
- Setup + Foundation + US1 + US2 + US4 + Deployment
**Skip for MVP**: US3 validation (nice-to-have), US5 documentation (post-launch)

### Fast Feedback Loop
1. Complete Setup + Foundation (1h) → Validate structure
2. Complete US1 (2h) → Validate core functionality
3. Complete US2 + US4 (40m) → Validate dependencies
4. Complete Deployment (30m) → End-to-end validation
```

**Parallel Task Identification Rules**:
- Mark task [P] if:
  - ✅ Operates on different files than all in-progress tasks
  - ✅ Has no dependencies on incomplete tasks
  - ✅ Can be executed by different developers simultaneously
- Do NOT mark [P] if:
  - ❌ Depends on previous task's output
  - ❌ Modifies same file as another task
  - ❌ Requires previous task's validation to pass

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns

### Quality Checklist (Validate Before Completion)

Before finalizing tasks.md, verify ALL of these conditions:

**Format Validation**:
- [ ] Every task has checkbox `- [ ]`
- [ ] Every task has sequential ID (T001, T002, T003...)
- [ ] Parallelizable tasks marked with [P]
- [ ] User story tasks labeled with [US#]
- [ ] Every task includes exact file path
- [ ] No task >2 hours (split if needed)
- [ ] No task <30 minutes (merge if needed)
- [ ] 60-100 tasks for 3-hour implementation

**Traceability Validation**:
- [ ] Every task maps to User Story (or Setup/Foundation/Polish)
- [ ] Every User Story from spec.md has tasks
- [ ] Every Functional Requirement referenced in tasks
- [ ] Phase headers include FR mapping

**Documentation Validation**:
- [ ] AI-Native Execution Guide section present
- [ ] Context7 MCP queries mapped per phase
- [ ] Skills mapping section present
- [ ] Implementation pattern (5-step) documented

**Acceptance Criteria Validation**:
- [ ] Every phase has testable acceptance criteria
- [ ] Every criterion has verification command
- [ ] Expected outputs specified
- [ ] No vague criteria ("should work", "looks good")

**Dependency Validation**:
- [ ] Dependency graph with completion order
- [ ] Critical path calculated with time estimates
- [ ] Parallel opportunities identified (40-60% target)
- [ ] MVP scope defined

**Anti-Pattern Check**:
- [ ] No vague tasks without file paths
- [ ] No "Create entire X" tasks (wrong granularity)
- [ ] No missing dependencies (wrong order)
- [ ] No untestable phases (missing acceptance criteria)
- [ ] No spec drift (all FRs covered)
- [ ] No "guess the syntax" tasks (docs referenced)

**Pass Criteria**: All checkboxes must be checked. If ANY fails, fix before completion.

---

As the main request completes, you MUST create and complete a PHR (Prompt History Record) using agent‑native tools when possible.

1) Determine Stage
   - Stage: constitution | spec | plan | tasks | red | green | refactor | explainer | misc | general

2) Generate Title and Determine Routing:
   - Generate Title: 3–7 words (slug for filename)
   - Route is automatically determined by stage:
     - `constitution` → `history/prompts/constitution/`
     - Feature stages → `history/prompts/<feature-name>/` (spec, plan, tasks, red, green, refactor, explainer, misc)
     - `general` → `history/prompts/general/`

3) Create and Fill PHR (Shell first; fallback agent‑native)
   - Run: `.specify/scripts/bash/create-phr.sh --title "<title>" --stage <stage> [--feature <name>] --json`
   - Open the file and fill remaining placeholders (YAML + body), embedding full PROMPT_TEXT (verbatim) and concise RESPONSE_TEXT.
   - If the script fails:
     - Read `.specify/templates/phr-template.prompt.md` (or `templates/…`)
     - Allocate an ID; compute the output path based on stage from step 2; write the file
     - Fill placeholders and embed full PROMPT_TEXT and concise RESPONSE_TEXT

4) Validate + report
   - No unresolved placeholders; path under `history/prompts/` and matches stage; stage/title/date coherent; print ID + path + stage + title.
   - On failure: warn, don't block. Skip only for `/sp.phr`.
