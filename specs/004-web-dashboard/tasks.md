# Implementation Tasks: TaskFlow Web Dashboard

**Feature Branch**: `004-web-dashboard`
**Created**: 2025-12-07
**Status**: Ready for Implementation
**Spec**: `specs/004-web-dashboard/spec.md`
**Plan**: `specs/004-web-dashboard/plan.md`

---

## Task Format Legend

- `[P]` = Setup/Prerequisite task
- `[B]` = Blocking - must complete before dependent tasks
- `[US#]` = Maps to User Story from spec
- File paths are relative to `web-dashboard/`

---

## Phase 1: Project Setup & Theme Migration [P]

**Goal**: Scaffold Next.js 16 app with IFK theme from sso-platform

### Setup Tasks

- [ ] T001 [P] Create Next.js 16 project with TypeScript at `web-dashboard/`
  - `pnpm create next-app@latest web-dashboard --typescript --tailwind --eslint --app --src-dir`
  - Target: `web-dashboard/`

- [ ] T002 [P] Configure package.json with correct dependencies
  - Add: react@19, react-dom@19, tailwindcss@3.4+, lucide-react, class-variance-authority, clsx, tailwind-merge
  - Add: jose@5, pkce-challenge@4 (auth)
  - Dev: vitest, @testing-library/react
  - File: `package.json`

- [ ] T003 [P] Copy IFK theme assets from sso-platform
  - Source: `sso-platform/src/app/globals.css` → `src/app/globals.css`
  - Source: `sso-platform/tailwind.config.ts` → `tailwind.config.ts`
  - Verify: IFK colors (cyan #00d4ff, amber #ff9500), dark mode support

- [ ] T004 [P] Copy utility functions from sso-platform
  - Source: `sso-platform/src/lib/utils.ts` → `src/lib/utils.ts`
  - Ensure: `cn()` function for Tailwind class merging

- [ ] T005 [P] Copy shadcn/ui components from sso-platform
  - Source: `sso-platform/src/components/ui/*` → `src/components/ui/`
  - Components: button, card, badge, dialog, select, input, label, dropdown-menu, avatar, separator, skeleton, toast, progress
  - Verify: No TypeScript errors after copy

- [ ] T006 [P] Create environment configuration
  - File: `.env.local`
  - Variables: NEXT_PUBLIC_SSO_URL, NEXT_PUBLIC_OAUTH_CLIENT_ID, NEXT_PUBLIC_OAUTH_REDIRECT_URI, NEXT_PUBLIC_API_URL

- [ ] T007 [P] Verify project runs with IFK theme
  - Run: `pnpm dev`
  - Test: Landing page displays with IFK styling (dark bg, cyan accents)
  - Test: shadcn/ui Button component renders correctly

### Phase 1 Acceptance Criteria
- [ ] Next.js 16 dev server runs on port 3000
- [ ] IFK theme visible (cyan/amber colors, dark mode)
- [ ] shadcn/ui Button component renders correctly
- [ ] No TypeScript errors
- [ ] Tailwind classes applied correctly

---

## Phase 2: Auth Flow Implementation [B] [US2]

**Goal**: OAuth2 PKCE login with SSO, token storage, protected routes
**Blocks**: All subsequent phases (auth required)

### Auth Library Tasks

- [ ] T008 [B] [US2] Implement PKCE utilities
  - File: `src/lib/auth/pkce.ts`
  - Functions: generateRandomString(), sha256(), generatePKCE()
  - Use: Web Crypto API for cryptographic operations

- [ ] T009 [B] [US2] Implement OAuth flow functions
  - File: `src/lib/auth/oauth.ts`
  - Functions: startOAuthFlow(), exchangeCodeForTokens(), logout()
  - Endpoints: SSO authorize, token
  - Config: client_id, redirect_uri, scopes

- [ ] T010 [B] [US2] Implement token storage with refresh
  - File: `src/lib/auth/storage.ts`
  - Class: TokenStorage (singleton)
  - Methods: setTokens(), getAccessToken(), refreshAccessToken(), clearTokens()
  - Storage: access_token (memory), refresh_token (localStorage)

- [ ] T011 [B] [US2] Create auth hooks
  - File: `src/lib/auth/hooks.ts`
  - Hooks: useAuth(), useUser()
  - Returns: { user, isAuthenticated, loading, login, logout }

### Auth Component Tasks

- [ ] T012 [B] [US2] Create AuthProvider context
  - File: `src/components/auth/AuthProvider.tsx`
  - Context: user, isAuthenticated, loading, login, logout
  - Behavior: Initialize from stored refresh token on mount

- [ ] T013 [B] [US2] Create ProtectedRoute component
  - File: `src/components/layout/ProtectedRoute.tsx`
  - Behavior: Redirect to `/` if not authenticated
  - Show: Loading state while checking auth

- [ ] T014 [US2] Create LoginButton component
  - File: `src/components/auth/LoginButton.tsx`
  - Behavior: Calls startOAuthFlow() on click
  - Style: IFK theme button

- [ ] T015 [US2] Create UserMenu component
  - File: `src/components/auth/UserMenu.tsx`
  - Display: User name, email, avatar from JWT claims
  - Actions: Sign Out (clears tokens, redirects)

### Auth Page Tasks

- [ ] T016 [B] [US2] Create OAuth callback page
  - File: `src/app/auth/callback/page.tsx`
  - Behavior: Extract code from URL, exchange for tokens, redirect to /dashboard
  - Error: Display auth errors, provide retry

- [ ] T017 [US2] Update landing page with Sign In button
  - File: `src/app/page.tsx`
  - Add: LoginButton component
  - Style: IFK theme landing page

- [ ] T018 [B] [US2] Create root layout with AuthProvider
  - File: `src/app/layout.tsx`
  - Wrap: All routes in AuthProvider
  - Include: Toast provider for notifications

### Phase 2 Acceptance Criteria
- [ ] Clicking "Sign In" redirects to SSO login page (SC-001 partial)
- [ ] After SSO auth, callback page exchanges code for tokens
- [ ] Tokens stored (refresh in localStorage, access in memory)
- [ ] Dashboard redirects to landing if not authenticated (SC-007)
- [ ] UserMenu displays user name and email from JWT claims
- [ ] Logout clears tokens and redirects to landing

---

## Phase 3: Core Layout & Navigation [US1]

**Goal**: App shell with sidebar, header, navigation

### Layout Component Tasks

- [ ] T019 [US1] Create AppShell layout component
  - File: `src/components/layout/AppShell.tsx`
  - Structure: Sidebar (left) + Main content (right)
  - Style: IFK dark theme, full height

- [ ] T020 [US1] Create Sidebar navigation component
  - File: `src/components/layout/Sidebar.tsx`
  - Links: Dashboard, Projects, Tasks, Workers, Audit
  - Icons: Use lucide-react icons
  - Active state: Cyan highlight for current route
  - Logo: TaskFlow branding

- [ ] T021 [US1] Create Header component
  - File: `src/components/layout/Header.tsx`
  - Display: Page title, UserMenu
  - Style: IFK theme with subtle border

- [ ] T022 [US1] Create dashboard layout wrapper
  - File: `src/app/(dashboard)/layout.tsx`
  - Wrap: ProtectedRoute + AppShell
  - Apply: To all dashboard pages

### Dashboard Page Tasks

- [ ] T023 [US1] Create dashboard overview page
  - File: `src/app/(dashboard)/dashboard/page.tsx`
  - Display: Welcome message, project count, task stats
  - Stats: Total tasks, in-progress, completed, pending
  - FR: FR-090 (IFK theme), FR-094 (empty states)

- [ ] T024 [US1] Create DashboardStats component
  - File: `src/components/dashboard/DashboardStats.tsx`
  - Cards: Total Projects, Total Tasks, In Progress, Completed
  - Style: IFK cards with icons

- [ ] T025 [US1] Create RecentActivity component
  - File: `src/components/dashboard/RecentActivity.tsx`
  - Display: Recent task updates, audit entries
  - Limit: Last 10 entries

### Phase 3 Acceptance Criteria
- [ ] Sidebar renders with all navigation links
- [ ] Active link highlighted with cyan accent
- [ ] Header shows current page title and user menu
- [ ] Layout is desktop-responsive (1280px+)
- [ ] IFK theme applied (dark backgrounds, cyan/amber accents)
- [ ] All protected pages wrapped in ProtectedRoute (SC-007)

---

## Phase 4: Projects Module [US3]

**Goal**: Full CRUD for projects, member management

### API Client Tasks

- [ ] T026 Create API types for projects
  - File: `src/lib/api/types.ts`
  - Types: ProjectRead, ProjectCreate, ProjectUpdate, ProjectListResponse
  - Types: MemberRead, MemberCreate

- [ ] T027 [B] Create base API client with auth
  - File: `src/lib/api/client.ts`
  - Class: APIClient (singleton)
  - Methods: fetchWithAuth(), automatic 401 handling
  - Error: APIError class with status code

- [ ] T028 Implement project API methods
  - File: `src/lib/api/client.ts`
  - Methods: getProjects(), getProject(), createProject(), updateProject(), deleteProject()
  - Methods: getProjectMembers(), addProjectMember(), removeProjectMember()

### Project Component Tasks

- [ ] T029 [US3] Create ProjectList component
  - File: `src/components/projects/ProjectList.tsx`
  - Display: Grid of ProjectCard components
  - Empty: "No projects yet" with create CTA (FR-094)

- [ ] T030 [US3] Create ProjectCard component
  - File: `src/components/projects/ProjectCard.tsx`
  - Display: Name, description, member count, task count
  - Actions: Click to navigate to detail
  - Style: IFK card with hover glow

- [ ] T031 [US3] Create ProjectForm component
  - File: `src/components/projects/ProjectForm.tsx`
  - Fields: slug, name, description (optional)
  - Validation: Required fields, slug format
  - FR: FR-010 (create projects)

- [ ] T032 [US3] Create ProjectHeader component
  - File: `src/components/projects/ProjectHeader.tsx`
  - Display: Project name, owner, created date
  - Actions: Edit, Delete (with confirmation)
  - FR: FR-012, FR-013

- [ ] T033 [US9] Create MemberList component
  - File: `src/components/projects/MemberList.tsx`
  - Display: Human and agent members with icons (FR-021)
  - Actions: Remove member (not owner - FR-023)
  - Icons: User for humans, Bot for agents (FR-051)

- [ ] T034 [US9] Create AddMemberDialog component
  - File: `src/components/projects/AddMemberDialog.tsx`
  - Fields: Member type (human/agent), ID
  - FR: FR-020 (add members)

### Project Page Tasks

- [ ] T035 [US3] Create projects list page
  - File: `src/app/(dashboard)/projects/page.tsx`
  - Display: ProjectList, "New Project" button
  - FR: FR-011 (display user's projects)

- [ ] T036 [US3] Create project detail page
  - File: `src/app/(dashboard)/projects/[id]/page.tsx`
  - Display: ProjectHeader, MemberList, TaskList (project tasks)
  - FR: FR-014 (member count, task count)

- [ ] T037 [US3] Create new project page
  - File: `src/app/(dashboard)/projects/new/page.tsx`
  - Form: ProjectForm with submit handler
  - Redirect: To project detail on success

### Phase 4 Acceptance Criteria
- [ ] Can create project with slug, name, description (SC-002 partial)
- [ ] Projects list shows all user's projects
- [ ] Project detail page shows members (humans + agents)
- [ ] Can add human or agent as member
- [ ] Cannot remove project owner (FR-023)
- [ ] Delete project warns if tasks exist
- [ ] All API errors displayed with toast notifications (SC-008)

---

## Phase 5: Tasks Module [US4] [US5] [US6] [US7]

**Goal**: Task CRUD, workflow, recursive subtasks, assignment

### Task API Tasks

- [ ] T038 Create API types for tasks
  - File: `src/lib/api/types.ts`
  - Types: TaskRead, TaskListItem, TaskCreate, TaskUpdate
  - Types: TaskStatus (pending, in_progress, review, completed)
  - Types: TaskPriority (low, medium, high, critical)
  - Types: SubtaskCreate

- [ ] T039 Implement task API methods
  - File: `src/lib/api/client.ts`
  - Methods: getTasks(), getTask(), createTask(), updateTask(), deleteTask()
  - Methods: startTask(), updateProgress(), submitForReview(), approveTask(), rejectTask()
  - Methods: createSubtask()

### Task Component Tasks

- [ ] T040 [US4] Create TaskList component
  - File: `src/components/tasks/TaskList.tsx`
  - Display: Table with title, status, priority, assignee, progress
  - Sort: By created date, priority
  - FR: FR-031

- [ ] T041 [US4] Create TaskCard component
  - File: `src/components/tasks/TaskCard.tsx`
  - Display: Title, StatusBadge, PriorityBadge, assignee avatar
  - Actions: Click to navigate to detail

- [ ] T042 [US4] Create TaskForm component
  - File: `src/components/tasks/TaskForm.tsx`
  - Fields: title, description, priority, assignee (WorkerDropdown), due_date
  - Validation: Title required
  - FR: FR-030

- [ ] T043 [US6] Create StatusBadge component
  - File: `src/components/tasks/StatusBadge.tsx`
  - States: pending (gray), in_progress (cyan), review (amber), completed (green)
  - Style: IFK colored badges

- [ ] T044 [US6] Create PriorityBadge component
  - File: `src/components/tasks/PriorityBadge.tsx`
  - Levels: low, medium, high, critical
  - Style: Color-coded badges

- [ ] T045 [US6] Create ProgressBar component
  - File: `src/components/tasks/ProgressBar.tsx`
  - Display: 0-100% visual bar with percentage text
  - Style: IFK cyan gradient

- [ ] T046 [US6] Create TaskWorkflow component
  - File: `src/components/tasks/TaskWorkflow.tsx`
  - Buttons: Start, Update Progress, Submit for Review, Approve, Reject
  - Logic: Show valid transitions only (FR-040)
  - FR: FR-041, FR-042, FR-043, FR-044

- [ ] T047 [US4] Create TaskFilters component
  - File: `src/components/tasks/TaskFilters.tsx`
  - Filters: status, priority, assignee
  - FR: FR-034

- [ ] T048 [US7] Create TaskTree component (recursive)
  - File: `src/components/tasks/TaskTree.tsx`
  - Display: Nested subtask tree with indentation
  - Behavior: Expandable/collapsible nodes
  - Depth: Support unlimited nesting (FR-062)
  - FR: FR-060, FR-061, FR-063 (cycle prevention in UI)

- [ ] T049 [US7] Create SubtaskForm component
  - File: `src/components/tasks/SubtaskForm.tsx`
  - Fields: title (required), assignee (optional)
  - Parent: Passed via props
  - FR: FR-060 (same project only)

- [ ] T050 [US5] Create WorkerDropdown component
  - File: `src/components/workers/WorkerDropdown.tsx`
  - Display: Project members (humans + agents) with icons
  - Icons: User for humans, Bot for agents (FR-051)
  - Filter: Current project members only (FR-050, FR-052a)
  - FR: FR-052, FR-053

### Task Page Tasks

- [ ] T051 [US4] Create tasks list page
  - File: `src/app/(dashboard)/tasks/page.tsx`
  - Display: All tasks with TaskFilters, TaskList
  - Empty state: "No tasks yet" (FR-094)

- [ ] T052 [US4] [US7] Create task detail page
  - File: `src/app/(dashboard)/tasks/[id]/page.tsx`
  - Display: Full task info, TaskWorkflow, TaskTree (subtasks), AuditLog
  - Actions: Edit, Delete, Add Subtask
  - FR: FR-032, FR-033

- [ ] T053 [US4] Create new task page (in project context)
  - File: `src/app/(dashboard)/projects/[id]/tasks/new/page.tsx`
  - Form: TaskForm with project_id preset
  - Redirect: To task detail on success

### Phase 5 Acceptance Criteria
- [ ] Can create task with title, description, priority, assignee, due date (SC-002)
- [ ] Task list shows all tasks with filters
- [ ] Task detail shows full info + subtasks in tree (SC-005)
- [ ] Can change task status via workflow buttons (SC-004)
- [ ] Can update progress percentage
- [ ] Can create subtasks under any task
- [ ] Subtask tree displays correctly up to 5 levels deep (SC-005)
- [ ] Assignee dropdown shows humans AND agents with icons (SC-003)
- [ ] Cannot assign to non-member workers (FR-052a)

---

## Phase 6: Workers Module [US9] [US10]

**Goal**: Worker management (humans + agents registry)

### Worker API Tasks

- [ ] T054 Create API types for workers/agents
  - File: `src/lib/api/types.ts`
  - Types: WorkerRead, AgentCreate, AgentUpdate
  - Types: AgentType (claude, qwen, gemini, custom)

- [ ] T055 Implement worker/agent API methods
  - File: `src/lib/api/client.ts`
  - Methods: getWorkers(), getAgents(), getAgent()
  - Methods: registerAgent(), updateAgent(), deleteAgent()

### Worker Component Tasks

- [ ] T056 [US9] [US10] Create WorkerList component
  - File: `src/components/workers/WorkerList.tsx`
  - Display: Humans and agents in unified list (FR-021)
  - Columns: Handle, Name, Type (human/agent), Projects

- [ ] T057 [US5] Create WorkerAvatar component
  - File: `src/components/workers/WorkerAvatar.tsx`
  - Icons: User for humans, Bot for agents (FR-051)
  - Handle: Display @handle text

- [ ] T058 [US10] Create AgentForm component
  - File: `src/components/workers/AgentForm.tsx`
  - Fields: handle, name, type (dropdown), capabilities
  - Validation: Handle format (@name-format)
  - FR: FR-070, FR-072

### Worker Page Tasks

- [ ] T059 [US9] [US10] Create workers list page
  - File: `src/app/(dashboard)/workers/page.tsx`
  - Display: WorkerList with "Register Agent" button
  - Tabs: All Workers, Agents Only
  - FR: FR-071

- [ ] T060 [US10] Create register agent page
  - File: `src/app/(dashboard)/workers/register/page.tsx`
  - Form: AgentForm with submit handler
  - Redirect: To workers list on success

### Phase 6 Acceptance Criteria
- [ ] Can register new agent with handle, name, type, capabilities
- [ ] Agents list shows all registered agents (FR-071)
- [ ] Can edit agent (name, type, capabilities) (FR-072)
- [ ] Cannot delete agent that is a project member (FR-073)
- [ ] WorkerDropdown shows humans and agents with distinguishing icons (SC-003)

---

## Phase 7: Audit Module [US8]

**Goal**: Audit log viewing for tasks and projects

### Audit API Tasks

- [ ] T061 Create API types for audit
  - File: `src/lib/api/types.ts`
  - Types: AuditRead, AuditAction

- [ ] T062 Implement audit API methods
  - File: `src/lib/api/client.ts`
  - Methods: getAuditLogs(), getTaskAudit(), getProjectAudit()

### Audit Component Tasks

- [ ] T063 [US8] Create AuditLog component
  - File: `src/components/audit/AuditLog.tsx`
  - Display: Timeline of audit entries (FR-080)
  - Show: Actor (with icon), action, timestamp, details

- [ ] T064 [US8] Create AuditEntry component
  - File: `src/components/audit/AuditEntry.tsx`
  - Display: Actor handle with human/agent icon (FR-082)
  - Details: Action type, before/after values, context
  - FR: FR-051 (icons)

- [ ] T065 [US8] Create AuditFilters component
  - File: `src/components/audit/AuditFilters.tsx`
  - Filters: Entity type, actor, date range

### Audit Page Tasks

- [ ] T066 [US8] Create audit log page
  - File: `src/app/(dashboard)/audit/page.tsx`
  - Display: Global audit with filters (FR-081)
  - Empty state: "No audit entries yet"

- [ ] T067 [US8] Integrate audit into task detail
  - File: `src/app/(dashboard)/tasks/[id]/page.tsx`
  - Add: AuditLog section showing task-specific audit
  - FR: FR-080

### Phase 7 Acceptance Criteria
- [ ] Audit log page shows all audit entries (SC-010)
- [ ] Can filter by entity type, actor, date range
- [ ] Task detail page shows task-specific audit trail
- [ ] Audit entries display actor handle with human/agent icon (SC-010)
- [ ] Action details (before/after values) displayed clearly

---

## Phase 8: Integration Testing & Polish

**Goal**: End-to-end testing, error handling, loading states, empty states

### Loading & Error State Tasks

- [ ] T068 Create loading skeleton components
  - Files: `src/components/ui/skeleton.tsx` (if not copied)
  - Skeletons: ProjectCardSkeleton, TaskCardSkeleton, TableRowSkeleton
  - FR: FR-092

- [ ] T069 Implement toast notifications
  - File: `src/components/ui/toast.tsx`, `src/lib/toast.ts`
  - Types: success, error, warning, info
  - FR: FR-093

- [ ] T070 Add error boundaries
  - File: `src/components/ErrorBoundary.tsx`
  - Fallback: User-friendly error UI with retry
  - FR: FR-093

- [ ] T071 Create empty state components
  - File: `src/components/shared/EmptyState.tsx`
  - Props: title, description, actionLabel, onAction
  - FR: FR-094 (actionable prompts)

### Polish Tasks

- [ ] T072 Add hover states and transitions
  - Files: All card components
  - Style: IFK glow effects, subtle animations
  - FR: FR-090

- [ ] T073 Add keyboard navigation
  - Components: All interactive elements
  - Support: Tab, Enter, Escape
  - Accessibility: Focus visible states

- [ ] T074 Add ARIA labels and roles
  - Components: All interactive elements
  - Compliance: WCAG 2.1 AA

### Integration Testing Tasks

- [ ] T075 Test US1: Dashboard Overview
  - Verify: Projects in sidebar, task stats, recent activity
  - Verify: Empty state for new users (SC-009)
  - Verify: IFK theme matches SSO (SC-006)

- [ ] T076 Test US2: Authentication Flow
  - Verify: Login redirects to SSO (SC-001)
  - Verify: Callback exchanges code for tokens
  - Verify: Protected routes redirect when unauthenticated (SC-007)
  - Verify: Logout clears tokens

- [ ] T077 Test US3: Project Management
  - Verify: Create project with slug, name, description (SC-002)
  - Verify: Projects list shows user's projects
  - Verify: Delete project with tasks warns

- [ ] T078 Test US4: Task Management
  - Verify: Create task with all fields
  - Verify: Task list with filters
  - Verify: Task detail page

- [ ] T079 Test US5: Agent Parity Assignment
  - Verify: Dropdown shows humans AND agents (SC-003)
  - Verify: Both types assignable
  - Verify: Icons distinguish types

- [ ] T080 Test US6: Task Workflow
  - Verify: Status transitions create audit (SC-004)
  - Verify: Progress updates work
  - Verify: Review/approve flow

- [ ] T081 Test US7: Recursive Subtasks
  - Verify: Create subtask under task
  - Verify: Tree displays 5+ levels (SC-005)
  - Verify: Expand/collapse works

- [ ] T082 Test US8: Audit Trail
  - Verify: All entries show actor handle (SC-010)
  - Verify: Actor type (human/agent) visible
  - Verify: Task detail shows task audit

- [ ] T083 Test US9: Member Management
  - Verify: Add human member
  - Verify: Add agent member
  - Verify: Cannot remove owner

- [ ] T084 Test US10: Agent Registration
  - Verify: Register agent with handle
  - Verify: Agent appears in workers list
  - Verify: Cannot delete agent in project

### Edge Case Testing

- [ ] T085 Test token expiration handling
  - Simulate: Expired access token
  - Verify: Automatic refresh or re-login prompt

- [ ] T086 Test network failure handling
  - Simulate: API unavailable
  - Verify: User-friendly error message (SC-008)

- [ ] T087 Test concurrent edit handling
  - Simulate: Two users editing same task
  - Verify: Last write wins, audit shows both

- [ ] T088 Test invalid status transitions
  - Verify: UI prevents invalid transitions (e.g., pending → completed)
  - Verify: Disabled buttons with tooltips

### Phase 8 Acceptance Criteria
- [ ] All user stories pass manual testing
- [ ] No console errors or warnings
- [ ] All loading states display correctly (FR-092)
- [ ] All empty states provide clear CTAs (FR-094, SC-009)
- [ ] API errors displayed with user-friendly messages (FR-093, SC-008)
- [ ] UI matches SSO platform visually (SC-006)

---

## Task Summary

| Phase | Tasks | Priority | Dependencies |
|-------|-------|----------|--------------|
| Phase 1 | T001-T007 (7 tasks) | P0 | None |
| Phase 2 | T008-T018 (11 tasks) | P0 | Phase 1 |
| Phase 3 | T019-T025 (7 tasks) | P1 | Phase 2 |
| Phase 4 | T026-T037 (12 tasks) | P1 | Phase 3 |
| Phase 5 | T038-T053 (16 tasks) | P1 | Phase 4 |
| Phase 6 | T054-T060 (7 tasks) | P2 | Phase 5 |
| Phase 7 | T061-T067 (7 tasks) | P2 | Phase 5 |
| Phase 8 | T068-T088 (21 tasks) | P3 | All above |
| **Total** | **88 tasks** | | |

---

## Constitutional Compliance Matrix

| Principle | Relevant Tasks | Verification |
|-----------|---------------|--------------|
| **Audit Trail** | T063-T067, T080, T082 | All actions create audit entries |
| **Agent Parity** | T033, T050, T056-T058, T079 | Humans and agents equal in UI |
| **Recursive Tasks** | T048-T049, T081 | TaskTree supports unlimited depth |
| **Spec-Driven** | All tasks | Tasks trace to FRs and USs |

---

## Success Criteria Mapping

| SC ID | Criterion | Verification Tasks |
|-------|-----------|-------------------|
| SC-001 | OAuth login < 10 seconds | T076 |
| SC-002 | Create project + task < 2 minutes | T077, T078 |
| SC-003 | Assignment dropdown parity | T079 |
| SC-004 | Audit entries < 1 second | T080 |
| SC-005 | Subtask tree 5+ levels | T081 |
| SC-006 | UI theme match | T075 |
| SC-007 | Protected route redirect | T076 |
| SC-008 | Error messages displayed | T086 |
| SC-009 | Empty states with CTAs | T075 |
| SC-010 | Audit actor display | T082 |

---

**End of Implementation Tasks**

Execute tasks in phase order. Each phase must complete before the next begins. Run `pnpm test` and verify acceptance criteria after each phase.
