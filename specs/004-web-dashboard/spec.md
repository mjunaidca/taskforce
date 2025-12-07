# Feature Specification: TaskFlow Web Dashboard

**Feature Branch**: `004-web-dashboard`
**Created**: 2025-12-07
**Status**: Approved
**Input**: User description: "TaskFlow Web Dashboard - Task management UI where humans and AI agents are equal workers. Integrates with TaskFlow SSO (OAuth2/OIDC) on port 3001 and TaskFlow API (FastAPI backend) on port 8000."

---

## Executive Summary

The TaskFlow Web Dashboard is a Next.js web application that provides a visual interface for managing tasks, projects, and workers (both human and AI agents). It embodies TaskFlow's core principle: **AI agents are first-class citizens**, appearing alongside humans in assignment dropdowns with full parity.

**Key Differentiator**: Unlike traditional task managers, TaskFlow treats AI agents as equal workers who can be assigned tasks, tracked, and audited identically to human team members.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Dashboard Overview (Priority: P1)

As a logged-in user, I want to see a dashboard overview showing my projects, recent tasks, and key statistics so I can quickly understand my current workload.

**Why this priority**: The dashboard is the entry point - users need immediate visibility into their work after login. This validates the entire auth flow and data fetching pipeline.

**Independent Test**: Can be fully tested by logging in and verifying the dashboard displays projects, tasks counts, and recent activity. Delivers immediate value by providing work visibility.

**Acceptance Scenarios**:

1. **Given** I am authenticated, **When** I navigate to `/dashboard`, **Then** I see my projects listed in a sidebar, task statistics (total, in-progress, completed), and recent task activity.
2. **Given** I have no projects, **When** I view the dashboard, **Then** I see an empty state with a prompt to create my first project.
3. **Given** I am not authenticated, **When** I try to access `/dashboard`, **Then** I am redirected to the SSO login page.

---

### User Story 2 - Authenticate via SSO (Priority: P1)

As a user, I want to log in using the TaskFlow SSO system so I can access my projects and tasks securely.

**Why this priority**: Authentication is foundational - no other features work without it. This validates OAuth2 PKCE integration with the SSO platform.

**Independent Test**: Can be fully tested by clicking "Sign In", completing OAuth flow, and verifying JWT is stored and sent to API. Delivers secure access to the platform.

**Acceptance Scenarios**:

1. **Given** I am on the landing page, **When** I click "Sign In", **Then** I am redirected to the SSO authorization page.
2. **Given** I complete authentication at SSO, **When** the callback is processed, **Then** I receive JWT tokens and am redirected to `/dashboard`.
3. **Given** my access token expires, **When** I make an API call, **Then** the system refreshes the token automatically or redirects to login.
4. **Given** I click "Sign Out", **When** the action completes, **Then** my tokens are cleared and I am redirected to the landing page.

---

### User Story 3 - Manage Projects (Priority: P2)

As a user, I want to create, view, update, and delete projects so I can organize my work into logical groups.

**Why this priority**: Projects are the container for all work - users need them before creating tasks. This validates CRUD operations and ownership.

**Independent Test**: Can be fully tested by creating a project, viewing its details, updating the name, and deleting it. Delivers organizational capability.

**Acceptance Scenarios**:

1. **Given** I am on the projects page, **When** I click "New Project" and fill the form, **Then** a new project is created and appears in the list.
2. **Given** I own a project, **When** I click edit and change the name, **Then** the project name is updated.
3. **Given** I own an empty project, **When** I delete it, **Then** the project is removed from my list.
4. **Given** a project has tasks, **When** I try to delete it, **Then** I am warned and must confirm force deletion.

---

### User Story 4 - Create and View Tasks (Priority: P2)

As a user, I want to create tasks within a project and view them in a list so I can track work items.

**Why this priority**: Tasks are the core work unit. Users need to create and view them to derive value from the platform.

**Independent Test**: Can be fully tested by creating a task, viewing it in the list, and opening its detail page. Delivers task tracking capability.

**Acceptance Scenarios**:

1. **Given** I am viewing a project, **When** I click "New Task" and enter title, **Then** a task is created with status "pending".
2. **Given** tasks exist in a project, **When** I view the project, **Then** I see a list of tasks with title, status, priority, and assignee.
3. **Given** I click on a task, **When** the detail page loads, **Then** I see full task details including description, subtasks, and audit history.

---

### User Story 5 - Assign Tasks to Humans OR Agents (Priority: P2)

As a user, I want to assign tasks to any project member - whether human or AI agent - so that work gets distributed appropriately.

**Why this priority**: This is TaskFlow's core differentiator - agent parity. Agents and humans appear equally in assignment UI. This validates the worker abstraction.

**Independent Test**: Can be fully tested by opening the assignment dropdown, seeing both humans and agents listed, and assigning to each type. Delivers agent parity.

**Acceptance Scenarios**:

1. **Given** a project has human and agent members, **When** I open the assignee dropdown, **Then** I see both humans and agents listed equally with distinguishing icons (User icon for humans, Bot icon for agents).
2. **Given** I assign a task to @claude-code (agent), **When** the assignment is saved, **Then** the task shows @claude-code as assignee with agent icon.
3. **Given** I assign a task to @john-doe (human), **When** the assignment is saved, **Then** the task shows @john-doe as assignee with user icon.

---

### User Story 6 - Update Task Status and Progress (Priority: P2)

As a user, I want to update task status and progress so I can track work completion.

**Why this priority**: Status updates are essential for work tracking. This validates the workflow API endpoints.

**Independent Test**: Can be fully tested by changing task status, updating progress percentage, and verifying audit entries are created.

**Acceptance Scenarios**:

1. **Given** a task is "pending", **When** I click "Start", **Then** status changes to "in_progress" and started_at is set.
2. **Given** a task is "in_progress", **When** I update progress to 50%, **Then** the progress bar reflects 50% and an audit entry is created.
3. **Given** a task is "in_progress", **When** I click "Submit for Review", **Then** status changes to "review".
4. **Given** a task is in "review", **When** I click "Approve", **Then** status changes to "completed" and completed_at is set.

---

### User Story 7 - View Recursive Subtasks (Priority: P3)

As a user, I want to see tasks with their nested subtasks in a tree view so I understand work decomposition.

**Why this priority**: Recursive tasks are a constitutional principle. Users need to visualize task hierarchies.

**Independent Test**: Can be fully tested by creating a task with subtasks, viewing the tree structure, and expanding/collapsing nodes.

**Acceptance Scenarios**:

1. **Given** a task has subtasks, **When** I view the task, **Then** subtasks are displayed in a nested tree structure.
2. **Given** subtasks have their own subtasks, **When** I view the hierarchy, **Then** I see all levels of nesting with proper indentation.
3. **Given** I click "Add Subtask" on a task, **When** I fill the form, **Then** a new subtask is created with parent_task_id set.

---

### User Story 8 - View Audit Trail (Priority: P3)

As a user, I want to view the audit history for tasks and projects so I can see who did what and when.

**Why this priority**: Audit is a constitutional requirement. Every action must be traceable to an actor (human or agent).

**Independent Test**: Can be fully tested by performing actions on a task, then viewing its audit log to verify entries.

**Acceptance Scenarios**:

1. **Given** I view a task's audit log, **When** actions have been performed, **Then** I see entries with actor (handle), action type, timestamp, and details.
2. **Given** an agent completed a task, **When** I view the audit, **Then** I see "@claude-code" with agent type clearly indicated.
3. **Given** I view project audit, **When** multiple tasks have been modified, **Then** I see aggregated audit entries for all project activity.

---

### User Story 9 - Manage Project Members (Priority: P3)

As a project owner, I want to add and remove members (humans and agents) from my project so I can control who can work on tasks.

**Why this priority**: Member management enables collaboration. Supports adding both human users and AI agents.

**Independent Test**: Can be fully tested by adding a member (human or agent), verifying they appear in members list, then removing them.

**Acceptance Scenarios**:

1. **Given** I own a project, **When** I add a human member by user ID, **Then** they appear in the members list with "member" role.
2. **Given** I own a project, **When** I add an agent by agent ID, **Then** the agent appears in members list equally.
3. **Given** I own a project with members, **When** I remove a non-owner member, **Then** they are removed from the project.
4. **Given** I try to remove the project owner, **When** the action is attempted, **Then** it is prevented with an error message.

---

### User Story 10 - Register AI Agents (Priority: P3)

As a user, I want to register new AI agents so they can be added to projects and assigned tasks.

**Why this priority**: Agents must be registered before they can participate. This enables the agent ecosystem.

**Independent Test**: Can be fully tested by registering an agent with handle, name, type, and capabilities, then seeing it in the agents list.

**Acceptance Scenarios**:

1. **Given** I am on the workers page, **When** I click "Register Agent" and fill the form, **Then** a new agent is created with the specified handle (e.g., @my-agent).
2. **Given** an agent is registered, **When** I view the workers list, **Then** I see the agent with its type (claude/qwen/gemini/custom) and capabilities.
3. **Given** I edit an agent, **When** I update capabilities, **Then** the changes are persisted.

---

### Edge Cases

- **Token Expiration During Action**: If access token expires mid-operation, the system should attempt refresh or prompt re-login gracefully without losing user's work.
- **Network Failure**: API calls should show loading states and retry on transient failures with user-friendly error messages.
- **Concurrent Edits**: If two users edit the same task, last-write-wins with audit trail showing both edits.
- **Empty States**: All list views should handle zero-item states with helpful prompts.
- **Invalid Task Status Transitions**: UI should prevent invalid transitions (e.g., pending → completed) with disabled buttons and tooltips.
- **Recursive Task Deletion**: Deleting a task with subtasks should warn user and require confirmation.
- **Agent Deletion with Memberships**: Cannot delete an agent that is a member of projects (must remove from projects first).
- **Circular Parent Prevention**: System must validate that setting a parent task doesn't create a cycle (task cannot become ancestor of itself).
- **Cross-Project Parent Prevention**: System must reject subtask creation if specified parent belongs to a different project.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST authenticate users via OAuth2 PKCE flow with TaskFlow SSO on port 3001.
- **FR-002**: System MUST store JWT tokens (access_token, id_token, refresh_token) securely in browser storage.
- **FR-003**: System MUST include Bearer token in all API requests to backend on port 8000.
- **FR-004**: System MUST redirect unauthenticated users to SSO login for protected routes.
- **FR-005**: System MUST handle token refresh automatically when access_token expires.
- **FR-006**: System MUST extract and display user claims (name, email, role, tenant_id) from JWT.

#### Projects

- **FR-010**: System MUST allow users to create projects with slug, name, and optional description.
- **FR-011**: System MUST display only projects where the current user is a member.
- **FR-012**: System MUST allow project owners to update project name and description.
- **FR-013**: System MUST allow project owners to delete projects (with force option for projects with tasks).
- **FR-014**: System MUST display member count and task count for each project.

#### Project Members

- **FR-020**: System MUST allow project owners to add members by SSO user ID (humans) or agent ID (agents).
- **FR-021**: System MUST display all members (humans and agents) in a unified list.
- **FR-022**: System MUST allow project owners to remove non-owner members.
- **FR-023**: System MUST prevent removal of the project owner.

#### Tasks

- **FR-030**: System MUST allow users to create tasks with title, optional description, priority, and optional assignee.
- **FR-031**: System MUST display tasks with title, status, priority, progress, assignee, and due date.
- **FR-032**: System MUST allow task updates (title, description, priority, tags, due_date).
- **FR-033**: System MUST allow task deletion (blocked if task has subtasks).
- **FR-034**: System MUST support task filtering by status, priority, and assignee.

#### Task Workflow

- **FR-040**: System MUST support status transitions: pending → in_progress → review → completed.
- **FR-041**: System MUST set started_at when task moves to in_progress.
- **FR-042**: System MUST set completed_at and progress to 100% when task moves to completed.
- **FR-043**: System MUST allow progress updates (0-100%) for in_progress tasks.
- **FR-044**: System MUST support task approval (review → completed) and rejection (review → in_progress with reason).

#### Task Assignment (Agent Parity)

- **FR-050**: System MUST display only current project members (humans AND agents) in assignment dropdown (not global workers).
- **FR-051**: System MUST visually distinguish humans (User icon) and agents (Bot icon) in UI.
- **FR-052**: System MUST allow assigning tasks to any project member regardless of type.
- **FR-052a**: System MUST prevent assigning tasks to workers who are not members of the task's project.
- **FR-053**: System MUST show assignee handle and type consistently throughout UI.

#### Subtasks (Recursive)

- **FR-060**: System MUST allow creating subtasks under any task within the same project.
- **FR-060a**: System MUST prevent creating subtasks with parent in a different project.
- **FR-061**: System MUST display subtasks in a tree/nested structure.
- **FR-062**: System MUST support unlimited nesting depth for subtasks.
- **FR-063**: System MUST prevent circular parent relationships (task cannot be its own ancestor).

#### Agents

- **FR-070**: System MUST allow users to register new agents with handle, name, type, and capabilities.
- **FR-071**: System MUST display all registered agents in the workers page.
- **FR-072**: System MUST allow updating agent name, type, and capabilities.
- **FR-073**: System MUST prevent deletion of agents that are project members.

#### Audit Trail

- **FR-080**: System MUST display audit logs for individual tasks.
- **FR-081**: System MUST display aggregated audit logs for projects.
- **FR-082**: System MUST show actor (handle), actor type (human/agent), action, details, and timestamp.

#### UI/UX

- **FR-090**: System MUST implement Industrial-Kinetic Futurism (IFK) theme matching SSO platform.
- **FR-091**: System MUST be desktop-first (mobile-responsive is non-goal for this phase).
- **FR-092**: System MUST show loading states for async operations.
- **FR-093**: System MUST display user-friendly error messages for API failures.
- **FR-094**: System MUST provide empty states with actionable prompts for empty lists.

---

### Key Entities

- **User Session**: Authenticated user with JWT tokens, profile info (id, name, email, role, tenant_id)
- **Project**: Container for tasks with owner, members, and metadata
- **Member**: Association of a worker (human or agent) to a project with role
- **Task**: Work item with status, priority, progress, assignee, parent relationship
- **Worker**: Abstract entity representing either a human or AI agent
- **Agent**: AI worker with handle, name, type (claude/qwen/gemini/custom), capabilities
- **Audit Entry**: Immutable record of actions with actor, action, details, timestamp

---

## Constraints

- **Desktop-First**: No mobile-responsive design required for Phase II.
- **No Offline Mode**: Requires active network connection to API and SSO.
- **No Real-Time Updates**: Page refresh required to see changes from other users.
- **Single Tenant View**: Dashboard shows only current tenant's data (based on JWT claims).
- **No Notifications**: Push notifications and email alerts are out of scope.

---

## Non-Goals

- Rebuilding authentication logic (use existing SSO via OAuth PKCE)
- Recreating UI components that exist in SSO platform
- Building features beyond core task management
- Mobile-responsive design
- Real-time WebSocket updates
- Email/push notifications
- Bulk operations (bulk assign, bulk status change)
- Reporting and analytics dashboards
- Calendar view of tasks

---

## Assumptions

- **SSO Availability**: TaskFlow SSO platform is running on port 3001 with OAuth2/OIDC endpoints working.
- **API Availability**: TaskFlow FastAPI backend is running on port 8000 with all endpoints implemented.
- **OAuth Client Registered**: Dashboard is registered as OAuth client in SSO with clientId "taskflow-dashboard".
- **Theme Assets Available**: IFK theme CSS and UI components can be copied from sso-platform.
- **Dev Mode**: API supports DEV_MODE=true for testing without real JWT validation during development.
- **Browser Storage**: localStorage or sessionStorage is available for token persistence.
- **Modern Browsers**: Users use modern browsers supporting ES2022+ (Chrome 90+, Firefox 88+, Safari 15+).

---

## Dependencies

- **TaskFlow SSO** (sso-platform): OAuth2/OIDC provider, JWKS endpoint, user authentication
- **TaskFlow API** (packages/api): FastAPI backend with all CRUD, workflow, and audit endpoints
- **shadcn/ui**: React component library (subset already exists in sso-platform)
- **Tailwind CSS**: Styling framework with IFK theme configuration
- **Next.js 15+**: React framework with App Router

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete OAuth login and reach dashboard in under 10 seconds.
- **SC-002**: Users can create a project and first task in under 2 minutes.
- **SC-003**: Task assignment dropdown shows both humans and agents with equal visual treatment.
- **SC-004**: All task status transitions create corresponding audit entries within 1 second.
- **SC-005**: Subtask tree displays correctly up to 5 levels of nesting.
- **SC-006**: UI theme matches SSO platform visually (same colors, fonts, component styles).
- **SC-007**: All protected routes redirect to SSO login when unauthenticated.
- **SC-008**: Error messages are displayed for all API failures (no silent failures).
- **SC-009**: Empty states provide clear guidance for first-time users.
- **SC-010**: 100% of audit entries display actor handle and type correctly.

---

## Pages Summary

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | Public | Landing page with login CTA |
| `/auth/callback` | Public | OAuth callback handler |
| `/dashboard` | Protected | Overview, recent tasks, stats |
| `/projects` | Protected | List/create projects |
| `/projects/[id]` | Protected | Project detail with tasks |
| `/tasks` | Protected | All tasks with filters |
| `/tasks/[id]` | Protected | Task detail with subtasks and audit |
| `/workers` | Protected | List humans AND agents |
| `/audit` | Protected | Audit log of all actions |

---

## Technical Boundaries

This specification describes **WHAT** the system does, not **HOW** it is implemented. Technical decisions about:
- State management approach
- API client implementation
- Component architecture
- File structure
- Third-party libraries

...are deferred to the planning phase (`/sp.plan`).
