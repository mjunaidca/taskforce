# Prompt: TaskFlow Web Dashboard - Frontend Integration Guide

## Context

You are building the TaskFlow Web Dashboard - a task management UI where **humans and AI agents are equal workers**. This integrates with:

1. **TaskFlow SSO** (OAuth2/OIDC) - `sso-platform/` in this repo, runs on port 3001
2. **TaskFlow API** (FastAPI backend) - `packages/api/` in this repo, runs on port 8000

The SSO is fully functional with JWKS (RS256), JWT access tokens, and OIDC discovery.

---

## Project Location & Setup

Create the project at the root of the monorepo:

```bash
# From repo root
npx create-next-app@latest web-dashboard --typescript --tailwind --eslint --app --src-dir

# Structure:
# taskflow/
# ├── packages/
# │   ├── api/           # FastAPI backend (port 8000)
# │   └── cli/           # CLI tool
# ├── sso-platform/      # OAuth2/OIDC SSO (port 3001)
# └── web-dashboard/     # NEW - This project (port 3000)

# Setup shadcn/ui
cd web-dashboard
npx shadcn@latest init
```

---

## Theme & UI Reuse

Copy theme and UI components from the SSO platform - do not recreate:

| Source | Destination | Purpose |
|--------|-------------|---------|
| `sso-platform/src/app/globals.css` | `web-dashboard/src/app/globals.css` | IFK theme CSS variables |
| `sso-platform/tailwind.config.ts` | `web-dashboard/tailwind.config.ts` | Extended colors, shadows |
| `sso-platform/src/components/ui/*` | `web-dashboard/src/components/ui/*` | Themed shadcn components |
| `sso-platform/src/lib/utils.ts` | `web-dashboard/src/lib/utils.ts` | cn() utility |

The theme is **"Industrial-Kinetic Futurism" (IFK)**:
- Primary: Kinetic Cyan (#00d4ff)
- Secondary: Humanoid Amber (#ff9500)
- Dark industrial backgrounds
- Reference `sso-platform/src/app/admin/*` for table, card, and form patterns

---

## Authentication Architecture

### How It Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Frontend   │         │    SSO      │         │   Backend   │
│  (3000)     │         │   (3001)    │         │   (8000)    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. OAuth2 PKCE flow   │                       │
       │──────────────────────►│                       │
       │                       │                       │
       │ 2. User authenticates │                       │
       │◄──────────────────────│                       │
       │                       │                       │
       │ 3. Exchange code      │                       │
       │──────────────────────►│                       │
       │                       │                       │
       │ 4. JWT tokens:        │                       │
       │    - access_token     │                       │
       │    - id_token         │                       │
       │    - refresh_token    │                       │
       │◄──────────────────────│                       │
       │                       │                       │
       │ 5. API call with JWT  │                       │
       │ Authorization: Bearer │                       │
       │───────────────────────┼──────────────────────►│
       │                       │                       │
       │                       │ 6. Verify via JWKS    │
       │                       │◄──────────────────────│
       │                       │    (cached 1 hour)    │
       │                       │──────────────────────►│
       │                       │                       │
       │ 7. Response           │                       │
       │◄──────────────────────┼───────────────────────│
```

### Key Points

1. **Frontend** gets JWT from SSO via OAuth2 PKCE flow
2. **Frontend** sends JWT as `Authorization: Bearer <token>` header to API
3. **Backend** fetches JWKS public keys from SSO (once per hour, cached)
4. **Backend** verifies JWT signature **locally** - no SSO call per request

### OAuth Client Registration

Register the dashboard as an OAuth client in SSO admin UI (`http://localhost:3001/admin/clients`):

```json
{
  "clientId": "taskflow-dashboard",
  "name": "TaskFlow Web Dashboard",
  "redirectUrls": [
    "http://localhost:3000/api/auth/callback",
    "http://localhost:3000/auth/callback"
  ],
  "type": "public"
}
```

**Note**: SPA uses PKCE, no client secret needed.

### SSO Endpoints (port 3001)

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/openid-configuration` | OIDC Discovery (has all URLs) |
| `/api/auth/jwks` | Public keys for JWT verification |
| `/api/auth/oauth2/authorize` | Start OAuth flow |
| `/api/auth/oauth2/token` | Exchange code for tokens |
| `/api/auth/oauth2/userinfo` | Get user info (Bearer token) |

### JWT Claims Available

```typescript
// Decoded access_token/id_token contains:
interface JWTClaims {
  sub: string;                    // User ID (use this for API calls)
  email: string;
  name: string;
  preferred_username: string;
  role: "user" | "admin";
  tenant_id: string;              // Primary organization
  organization_ids: string[];     // All orgs user belongs to
  iat: number;                    // Issued at
  exp: number;                    // Expiration
  iss: string;                    // Issuer (SSO URL)
}
```

### Auth Implementation

```typescript
// lib/auth.ts - Store tokens after OAuth callback
interface AuthState {
  access_token: string;   // JWT - send to API
  id_token: string;       // JWT - user info for UI
  refresh_token: string;  // Refresh access_token when expired
  expires_at: number;     // Token expiration timestamp
}

// lib/api.ts - API client with auth
const API_BASE = "http://localhost:8000";

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const { access_token } = getAuthState();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    // Token expired - redirect to login
    redirectToLogin();
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API Error");
  }

  return response.json();
}
```

---

## Backend API Reference

**Base URL**: `http://localhost:8000`

All endpoints require `Authorization: Bearer <jwt>` header.

---

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Database connectivity |

```typescript
// Response
{ status: "healthy", version: "1.0.0" }
```

---

### Projects API

#### List Projects
```http
GET /api/projects?limit=50&offset=0
```

Returns projects where user is a member.

**Response**: `ProjectRead[]`
```typescript
interface ProjectRead {
  id: number;
  slug: string;           // Unique identifier (lowercase, hyphens)
  name: string;           // Display name
  description: string | null;
  owner_id: string;       // SSO user ID of owner
  is_default: boolean;    // User's default project
  member_count: number;
  task_count: number;
  created_at: string;     // ISO 8601
  updated_at: string;
}
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "slug": "my-project",      // Required: ^[a-z0-9-]+$, max 100 chars
  "name": "My Project",      // Required: max 200 chars
  "description": "Optional description"
}
```

**Response**: `201 Created` with `ProjectRead`

**Errors**:
- `400`: Slug already exists

#### Get Project
```http
GET /api/projects/{project_id}
```

**Response**: `ProjectRead`

**Errors**:
- `404`: Project not found
- `403`: Not a member of this project

#### Update Project
```http
PUT /api/projects/{project_id}
Content-Type: application/json

{
  "name": "Updated Name",        // Optional
  "description": "New description"  // Optional
}
```

**Response**: `ProjectRead`

**Errors**:
- `403`: Only project owner can update
- `404`: Project not found

#### Delete Project
```http
DELETE /api/projects/{project_id}?force=false
```

**Response**: `{ "ok": true, "deleted_tasks": 0 }`

**Errors**:
- `400`: Cannot delete default project
- `400`: Project has tasks (use `force=true` to delete anyway)
- `403`: Only project owner can delete

---

### Project Members API

#### List Members
```http
GET /api/projects/{project_id}/members
```

Returns all members (humans + agents).

**Response**: `MemberRead[]`
```typescript
interface MemberRead {
  id: number;              // Membership ID
  worker_id: number;       // Worker ID (use for assignment)
  handle: string;          // e.g., "@john-doe" or "@claude-code"
  name: string;            // Display name
  type: "human" | "agent";
  role: "owner" | "member";
  joined_at: string;
}
```

#### Add Member
```http
POST /api/projects/{project_id}/members
Content-Type: application/json

// Add human by SSO user ID:
{ "user_id": "sso-user-id-here" }

// OR add existing agent:
{ "agent_id": 123 }
```

**Response**: `201 Created` with `MemberRead`

**Errors**:
- `400`: Provide either user_id or agent_id (not both)
- `400`: Already a member
- `403`: Only project owner can add members
- `404`: Agent not found

#### Remove Member
```http
DELETE /api/projects/{project_id}/members/{member_id}
```

**Response**: `{ "ok": true }`

**Errors**:
- `400`: Cannot remove project owner
- `403`: Only project owner can remove members

---

### Agents API

Agents are AI workers that can be assigned tasks just like humans.

#### List Agents
```http
GET /api/workers/agents?limit=50&offset=0
```

**Response**: `WorkerRead[]`
```typescript
interface WorkerRead {
  id: number;
  handle: string;          // e.g., "@claude-code"
  name: string;            // e.g., "Claude Code"
  type: "human" | "agent";
  agent_type: "claude" | "qwen" | "gemini" | "custom" | null;
  capabilities: string[];  // e.g., ["code", "analysis"]
  created_at: string;
}
```

#### Register Agent
```http
POST /api/workers/agents
Content-Type: application/json

{
  "handle": "@claude-code",              // Required: ^@[a-z0-9_-]+$
  "name": "Claude Code",                 // Required: max 200 chars
  "agent_type": "claude",                // Required: claude|qwen|gemini|custom
  "capabilities": ["code", "analysis"]   // Optional
}
```

**Response**: `201 Created` with `WorkerRead`

**Errors**:
- `400`: Handle already exists

#### Get Agent
```http
GET /api/workers/agents/{agent_id}
```

**Response**: `WorkerRead`

#### Update Agent
```http
PUT /api/workers/agents/{agent_id}
Content-Type: application/json

{
  "name": "Updated Name",                    // Optional
  "agent_type": "custom",                    // Optional
  "capabilities": ["code", "docs", "test"]   // Optional
}
```

**Response**: `WorkerRead`

#### Delete Agent
```http
DELETE /api/workers/agents/{agent_id}
```

**Response**: `{ "ok": true }`

**Errors**:
- `400`: Agent is a member of one or more projects (remove from projects first)

---

### Tasks API

#### List Tasks
```http
GET /api/projects/{project_id}/tasks?status=pending&assignee_id=1&priority=high&limit=50&offset=0
```

All query params are optional filters.

**Response**: `TaskListItem[]`
```typescript
interface TaskListItem {
  id: number;
  title: string;
  status: "pending" | "in_progress" | "review" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  progress_percent: number;  // 0-100
  assignee_id: number | null;
  assignee_handle: string | null;  // e.g., "@claude-code"
  due_date: string | null;
  created_at: string;
}
```

#### Create Task
```http
POST /api/projects/{project_id}/tasks
Content-Type: application/json

{
  "title": "Implement feature X",           // Required: max 500 chars
  "description": "Detailed description",    // Optional
  "priority": "high",                       // Optional: low|medium|high|critical (default: medium)
  "assignee_id": 123,                       // Optional: worker_id (must be project member)
  "parent_task_id": 456,                    // Optional: for subtasks (must be same project)
  "tags": ["frontend", "urgent"],           // Optional
  "due_date": "2025-12-31T23:59:59Z"       // Optional: ISO 8601
}
```

**Response**: `201 Created` with `TaskRead`

**Errors**:
- `400`: Worker {id} is not a member of this project
- `400`: Parent task must be in the same project
- `404`: Project not found

#### Get Task
```http
GET /api/tasks/{task_id}
```

Returns task with nested subtasks.

**Response**: `TaskRead`
```typescript
interface TaskRead {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "review" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  progress_percent: number;
  tags: string[];
  due_date: string | null;

  project_id: number;
  assignee_id: number | null;
  assignee_handle: string | null;
  parent_task_id: number | null;
  created_by_id: number;

  started_at: string | null;    // Set when status → in_progress
  completed_at: string | null;  // Set when status → completed
  created_at: string;
  updated_at: string;

  subtasks: TaskRead[];         // Nested subtasks (recursive!)
}
```

#### Update Task
```http
PUT /api/tasks/{task_id}
Content-Type: application/json

{
  "title": "Updated title",      // Optional
  "description": "New desc",     // Optional
  "priority": "critical",        // Optional
  "tags": ["updated"],           // Optional
  "due_date": "2025-12-31T23:59:59Z"  // Optional
}
```

**Response**: `TaskRead`

#### Delete Task
```http
DELETE /api/tasks/{task_id}
```

**Response**: `{ "ok": true }`

**Errors**:
- `400`: Cannot delete task with subtasks (delete subtasks first)

---

### Task Workflow API

#### Change Status
```http
PATCH /api/tasks/{task_id}/status
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Valid Status Transitions**:
```
pending     → in_progress, blocked, cancelled
in_progress → review, blocked, cancelled
review      → completed (via approve), in_progress (via reject)
blocked     → pending, in_progress, cancelled
completed   → (terminal - no transitions)
cancelled   → (terminal - no transitions)
```

**Response**: `TaskRead`

**Side Effects**:
- `→ in_progress`: Sets `started_at` timestamp
- `→ completed`: Sets `completed_at` timestamp, `progress_percent = 100`

**Errors**:
- `400`: Invalid status transition from '{current}' to '{new}'

#### Update Progress
```http
PATCH /api/tasks/{task_id}/progress
Content-Type: application/json

{
  "percent": 50,           // Required: 0-100
  "note": "Halfway done"   // Optional
}
```

**Response**: `TaskRead`

**Errors**:
- `400`: Can only update progress for in_progress tasks

#### Assign Task
```http
PATCH /api/tasks/{task_id}/assign
Content-Type: application/json

{
  "assignee_id": 123   // Required: worker_id (must be project member)
}
```

**Response**: `TaskRead`

#### Create Subtask
```http
POST /api/tasks/{task_id}/subtasks
Content-Type: application/json

{
  "title": "Subtask title",
  "priority": "medium"
  // ... same as TaskCreate
}
```

Creates a subtask under the parent task. Subtasks can have their own subtasks (recursive!).

**Response**: `201 Created` with `TaskRead`

#### Approve Task
```http
POST /api/tasks/{task_id}/approve
```

Moves task from `review` → `completed`.

**Response**: `TaskRead`

**Errors**:
- `400`: Can only approve tasks in 'review' status

#### Reject Task
```http
POST /api/tasks/{task_id}/reject
Content-Type: application/json

{
  "reason": "Needs more test coverage"   // Required: max 500 chars
}
```

Moves task from `review` → `in_progress`.

**Response**: `TaskRead`

**Errors**:
- `400`: Can only reject tasks in 'review' status

---

### Audit API

Every state change creates an audit log entry.

#### Get Task Audit
```http
GET /api/tasks/{task_id}/audit?limit=50&offset=0
```

**Response**: `AuditRead[]`
```typescript
interface AuditRead {
  id: number;
  entity_type: "project" | "task" | "worker";
  entity_id: number;
  action: string;           // created, updated, status_changed, assigned, etc.
  actor_id: number;         // Worker ID who performed action
  actor_handle: string;     // e.g., "@john-doe"
  actor_type: "human" | "agent";
  details: Record<string, any>;  // Action-specific details
  created_at: string;
}
```

**Example `details`**:
```json
// For status_changed
{ "before": "pending", "after": "in_progress" }

// For assigned
{ "before": null, "after": 123, "assignee_handle": "@claude-code" }

// For progress_updated
{ "before": 0, "after": 50, "note": "Halfway done" }
```

#### Get Project Audit
```http
GET /api/projects/{project_id}/audit?limit=50&offset=0
```

Returns audit for project AND all its tasks.

**Response**: `AuditRead[]`

---

## Pages to Build

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | Public | Landing page, login CTA |
| `/dashboard` | Protected | Overview, recent tasks, stats |
| `/projects` | Protected | List/create projects |
| `/projects/[id]` | Protected | Project detail with tasks |
| `/tasks` | Protected | All tasks, filters, search |
| `/workers` | Protected | List humans AND agents (equal!) |
| `/audit` | Protected | Audit log of all actions |

---

## Four Non-Negotiable Principles

1. **Every Action Auditable** - All state changes create audit entries
2. **Agent Parity** - Agents are first-class workers, same as humans in UI
3. **Recursive Tasks** - Tasks can have subtasks (`parent_task_id`), unlimited depth
4. **Spec-Driven** - If unsure, check specs in `specs/` folder

---

## UI Implementation Notes

### Workers Dropdown (Agent Parity!)

Show both humans AND agents equally:

```tsx
// Workers dropdown for task assignment
<Select onValueChange={handleAssign}>
  <SelectTrigger>
    <SelectValue placeholder="Assign to..." />
  </SelectTrigger>
  <SelectContent>
    {members.map((member) => (
      <SelectItem key={member.worker_id} value={member.worker_id.toString()}>
        <div className="flex items-center gap-2">
          {member.type === "agent" ? (
            <Bot className="h-4 w-4 text-cyan-400" />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span>{member.name}</span>
          <span className="text-muted-foreground">{member.handle}</span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Task Status Badge

```tsx
const statusColors = {
  pending: "bg-gray-500",
  in_progress: "bg-blue-500",
  review: "bg-yellow-500",
  completed: "bg-green-500",
  blocked: "bg-red-500",
};

<Badge className={statusColors[task.status]}>
  {task.status.replace("_", " ")}
</Badge>
```

### Recursive Subtasks

```tsx
function TaskTree({ task }: { task: TaskRead }) {
  return (
    <div className="pl-4 border-l">
      <TaskCard task={task} />
      {task.subtasks.map((subtask) => (
        <TaskTree key={subtask.id} task={subtask} />
      ))}
    </div>
  );
}
```

---

## Error Handling

API returns errors as:
```json
{
  "error": "Error message here",
  "status_code": 400
}
```

Common status codes:
- `400`: Bad request (validation error)
- `401`: Unauthorized (token invalid/expired)
- `403`: Forbidden (not a member, not owner)
- `404`: Not found

---

## File Structure Reference

```
web-dashboard/
├── src/
│   ├── app/
│   │   ├── globals.css          # Copy from sso-platform
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing
│   │   ├── auth/
│   │   │   └── callback/page.tsx # OAuth callback handler
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx         # List projects
│   │   │   └── [id]/page.tsx    # Project detail
│   │   ├── tasks/
│   │   │   ├── page.tsx         # All tasks
│   │   │   └── [id]/page.tsx    # Task detail
│   │   ├── workers/page.tsx     # Humans + Agents
│   │   └── audit/page.tsx
│   ├── components/
│   │   ├── ui/                  # Copy from sso-platform
│   │   ├── layout/              # Header, sidebar
│   │   ├── projects/            # Project components
│   │   ├── tasks/               # Task components
│   │   └── workers/             # Worker components
│   ├── lib/
│   │   ├── utils.ts             # Copy from sso-platform
│   │   ├── auth.ts              # OAuth client, token storage
│   │   └── api.ts               # API client with types
│   └── types/
│       └── index.ts             # TypeScript types (copy from above)
├── tailwind.config.ts           # Copy from sso-platform
└── package.json
```

---

## Success Criteria

- [ ] OAuth PKCE login flow works with SSO
- [ ] JWT stored and sent to backend API
- [ ] Dashboard shows user's projects and tasks
- [ ] Can create/edit/delete projects
- [ ] Can create/edit/delete tasks
- [ ] Can assign tasks to humans OR agents (dropdown shows both equally)
- [ ] Tasks support subtasks (recursive display)
- [ ] Task workflow: status changes, progress updates, approve/reject
- [ ] Audit log shows all actions with actor info
- [ ] UI matches SSO platform IFK theme exactly
- [ ] JWT claims (role, tenant_id) extracted and used

---

## Non-Goals

- Don't rebuild auth logic - use SSO via OAuth PKCE
- Don't recreate UI components that exist in `sso-platform/src/components/ui/`
- Don't add features beyond core task management
- Don't build mobile-responsive yet (desktop-first)

---

## Quick Test Commands

```bash
# Health check
curl http://localhost:8000/health

# With dev mode enabled (DEV_MODE=true in API .env):
curl -H "Authorization: Bearer test" http://localhost:8000/api/projects

# Create project
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-project", "name": "Test Project"}'

# Create task
curl -X POST http://localhost:8000/api/projects/1/tasks \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Task", "priority": "high"}'
```

---

This gives everything needed: auth flow, complete API reference with types, UI patterns, and clear success criteria.
