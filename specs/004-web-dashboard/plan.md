# Implementation Plan: TaskFlow Web Dashboard

**Feature Branch**: `004-web-dashboard`
**Created**: 2025-12-07
**Status**: Ready for Implementation
**Spec**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/specs/004-web-dashboard/spec.md`

---

## Executive Summary

This plan details the implementation of the TaskFlow Web Dashboard - a Next.js 16 application that provides a visual interface for managing tasks, projects, and workers (humans and AI agents). The dashboard integrates with TaskFlow SSO (OAuth2/OIDC) on port 3001 and TaskFlow API (FastAPI backend) on port 8000.

**Key Differentiator**: AI agents are first-class citizens, appearing alongside humans in assignment dropdowns with full parity.

**Estimated Timeline**: 16-20 hours
**Target Completion**: Phase II milestone

---

## 1. Technical Context

### Language & Runtime
- **Language**: TypeScript 5.x
- **Framework**: Next.js 16.0+ (App Router, React 19)
- **Node Version**: 20.x or 22.x
- **Package Manager**: pnpm (consistent with monorepo)

### Dependencies

**Core Framework**:
```json
{
  "next": "^16.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.6.0"
}
```

**UI & Styling**:
```json
{
  "tailwindcss": "^3.4.0",
  "tailwindcss-animate": "^1.0.7",
  "@radix-ui/react-*": "latest",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.0",
  "lucide-react": "^0.263.1"
}
```

**Authentication & API**:
```json
{
  "jose": "^5.0.0",
  "pkce-challenge": "^4.0.0"
}
```

**Development**:
```json
{
  "vitest": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "eslint": "^9.0.0",
  "prettier": "^3.0.0"
}
```

### Testing Strategy
- **Unit Tests**: Vitest + React Testing Library
- **Component Tests**: Vitest with jsdom
- **Integration Tests**: Manual testing with live SSO/API
- **E2E**: Deferred to Phase III (after MCP integration)

### Target Platform
- **Primary**: Desktop Web (1280px+)
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 15+
- **Mobile**: Not required for Phase II

---

## 2. Architecture Decisions

### 2.1 OAuth2 PKCE Implementation

**Decision**: Client-side PKCE flow with token storage in localStorage.

**Rationale**:
- Next.js SSR incompatible with session cookies for SPA-style auth flow
- PKCE (Proof Key for Code Exchange) required for public clients
- localStorage allows token persistence across page refreshes
- Industry-standard pattern for SPAs (Vercel, Netlify, Auth0)

**Implementation**:
```typescript
// lib/auth/pkce.ts
export async function generatePKCE() {
  const verifier = generateRandomString(64);
  const challenge = await sha256(verifier);
  return { verifier, challenge };
}

// lib/auth/oauth.ts
export function startOAuthFlow() {
  const { verifier, challenge } = generatePKCE();
  sessionStorage.setItem('pkce_verifier', verifier);

  const authUrl = new URL('http://localhost:3001/api/auth/oauth2/authorize');
  authUrl.searchParams.set('client_id', 'taskflow-dashboard');
  authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/auth/callback');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('scope', 'openid profile email');

  window.location.href = authUrl.toString();
}
```

**Trade-offs**:
- ✅ Security: PKCE prevents code interception attacks
- ✅ UX: Seamless redirect flow
- ❌ XSS Risk: localStorage accessible to scripts (mitigated by CSP)
- ❌ No SSR: Auth state unavailable on server

**Alternative Considered**: NextAuth.js / Auth.js
- **Rejected**: Adds unnecessary complexity, we already have a working SSO
- **Rejected**: Requires backend API routes for session management
- **Rejected**: Constitution mandates no rebuilding existing auth logic

---

### 2.2 Token Storage Strategy

**Decision**: Hybrid approach - access token in memory, refresh token in localStorage, ID token in memory.

**Rationale**:
- Access token is short-lived (15 min), storing in memory reduces XSS risk
- Refresh token is long-lived (7 days), needs persistence
- ID token contains user claims, kept in memory for session
- Follows OAuth2 best practices for public clients

**Implementation**:
```typescript
// lib/auth/storage.ts
interface AuthTokens {
  access_token: string;  // In-memory only
  id_token: string;      // In-memory only
  refresh_token: string; // localStorage
  expires_at: number;
}

class TokenStorage {
  private tokens: AuthTokens | null = null;

  setTokens(tokens: AuthTokens) {
    this.tokens = {
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };

    // Only persist refresh token
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  getAccessToken(): string | null {
    if (!this.tokens || Date.now() >= this.tokens.expires_at) {
      return null; // Token expired, trigger refresh
    }
    return this.tokens.access_token;
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch('http://localhost:3001/api/auth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'taskflow-dashboard'
      })
    });

    const data = await response.json();
    this.setTokens(data);
    return data.access_token;
  }

  clearTokens() {
    this.tokens = null;
    localStorage.removeItem('refresh_token');
  }
}

export const tokenStorage = new TokenStorage();
```

**Trade-offs**:
- ✅ Security: Access token in memory, not accessible via localStorage
- ✅ UX: Automatic token refresh without re-login
- ❌ Session Loss: Page refresh loses access token, requires immediate refresh
- ❌ Complexity: Manual token lifecycle management

---

### 2.3 API Client Structure

**Decision**: Singleton API client with automatic auth injection and error handling.

**Rationale**:
- Centralized token management
- Automatic 401 handling (refresh or redirect to login)
- Type-safe API calls with TypeScript
- Consistent error handling across app

**Implementation**: See section 5.2 for full implementation.

**Trade-offs**:
- ✅ DRY: Single source of truth for API calls
- ✅ Type Safety: Full TypeScript coverage
- ✅ Automatic Retry: Handles token refresh transparently
- ❌ Bundle Size: All endpoints bundled (mitigated by tree-shaking)
- ❌ Server-Side: Cannot use in React Server Components (client-only)

---

### 2.4 State Management Approach

**Decision**: React Server Components + Client Components with URL state, no global state library.

**Rationale**:
- Next.js 16 defaults to Server Components (performance)
- URL as single source of truth for filters/pagination
- Client Components only where interactivity needed
- Avoids complexity of Redux/Zustand for CRUD app

**Trade-offs**:
- ✅ Simple: No global state management library needed
- ✅ SEO: Server Components render on server
- ✅ URL State: Shareable, bookmarkable filtered views
- ❌ Loading States: More client-side loading compared to SSR with auth
- ❌ Flash: Potential FOUC (Flash of Unauthenticated Content)

**Mitigation for FOUC**: Protect routes with client-side auth check in layout.

---

### 2.5 Component Organization

**Decision**: Feature-based component structure with shared UI library.

**Directory Structure**:
```
web-dashboard/
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Landing page
    │   ├── auth/
    │   │   └── callback/page.tsx # OAuth callback
    │   ├── dashboard/
    │   │   └── page.tsx          # Dashboard overview
    │   ├── projects/
    │   │   ├── page.tsx          # List projects
    │   │   └── [id]/
    │   │       └── page.tsx      # Project detail
    │   ├── tasks/
    │   │   ├── page.tsx          # All tasks
    │   │   └── [id]/page.tsx     # Task detail
    │   ├── workers/page.tsx      # Workers list (humans + agents)
    │   └── audit/page.tsx        # Audit log
    ├── components/
    │   ├── ui/                   # shadcn/ui components (copied from sso-platform)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── badge.tsx
    │   │   ├── dialog.tsx
    │   │   ├── select.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   └── ... (20+ components)
    │   ├── layout/               # Layout components
    │   │   ├── AppShell.tsx      # Main app layout
    │   │   ├── Sidebar.tsx       # Navigation sidebar
    │   │   ├── Header.tsx        # Top header bar
    │   │   └── ProtectedRoute.tsx # Auth guard
    │   ├── auth/                 # Auth components
    │   │   ├── LoginButton.tsx
    │   │   ├── UserMenu.tsx
    │   │   └── AuthProvider.tsx  # Context provider
    │   ├── projects/             # Project feature
    │   │   ├── ProjectList.tsx
    │   │   ├── ProjectCard.tsx
    │   │   ├── ProjectForm.tsx
    │   │   └── ProjectHeader.tsx
    │   ├── tasks/                # Task feature
    │   │   ├── TaskList.tsx
    │   │   ├── TaskCard.tsx
    │   │   ├── TaskForm.tsx
    │   │   ├── TaskTree.tsx      # Recursive subtask display
    │   │   ├── StatusBadge.tsx
    │   │   ├── PriorityBadge.tsx
    │   │   ├── ProgressBar.tsx
    │   │   ├── TaskFilters.tsx
    │   │   └── TaskWorkflow.tsx  # Status change buttons
    │   ├── workers/              # Worker feature
    │   │   ├── WorkerList.tsx
    │   │   ├── WorkerDropdown.tsx # Assignment dropdown (human + agent)
    │   │   ├── WorkerAvatar.tsx   # Human/Agent icon
    │   │   └── AgentForm.tsx
    │   └── audit/                # Audit feature
    │       ├── AuditLog.tsx
    │       ├── AuditEntry.tsx
    │       └── AuditFilters.tsx
    ├── lib/
    │   ├── auth/                 # Auth utilities
    │   │   ├── pkce.ts           # PKCE generation
    │   │   ├── oauth.ts          # OAuth flow functions
    │   │   ├── storage.ts        # Token storage
    │   │   └── hooks.ts          # useAuth, useUser hooks
    │   ├── api/                  # API client
    │   │   ├── client.ts         # Main API client
    │   │   └── types.ts          # API type definitions
    │   └── utils.ts              # cn() and helpers
    ├── types/
    │   └── index.ts              # Global types
    └── hooks/
        ├── useProjects.ts        # Project data hooks
        ├── useTasks.ts           # Task data hooks
        └── useWorkers.ts         # Worker data hooks
```

**Rationale**:
- **Feature Folders**: Collocates related components (tasks/, projects/, workers/)
- **Shared UI**: Copy shadcn/ui components from sso-platform (consistency)
- **Separation of Concerns**: API layer, auth layer, UI layer clearly separated
- **Next.js Conventions**: App Router structure, file-based routing

---

## 3. Implementation Phases (Dependency-Ordered)

### Phase 1: Project Setup & Theme Migration (2 hours)

**Goal**: Scaffold Next.js 16 app with IFK theme and UI components from sso-platform.

**Tasks**:
1. Initialize Next.js Project at `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/web-dashboard`
2. Copy Theme Assets from sso-platform:
   - `sso-platform/src/app/globals.css` → `web-dashboard/src/app/globals.css`
   - `sso-platform/tailwind.config.ts` → `web-dashboard/tailwind.config.ts`
   - `sso-platform/src/lib/utils.ts` → `web-dashboard/src/lib/utils.ts`
3. Install Dependencies (shadcn/ui, auth libraries)
4. Copy shadcn/ui Components from `sso-platform/src/components/ui/` → `web-dashboard/src/components/ui/`
5. Configure Environment Variables (`.env.local`)
6. Verify Theme (create landing page with IFK styling)

**Acceptance Criteria**:
- ✅ Next.js 16 dev server runs on port 3000
- ✅ IFK theme visible (cyan/amber colors, dark mode)
- ✅ shadcn/ui Button component renders correctly
- ✅ No TypeScript errors
- ✅ Tailwind classes applied correctly

---

### Phase 2: Auth Flow Implementation (4 hours)

**Goal**: Implement OAuth2 PKCE login flow with SSO, token storage, and protected routes.

**Tasks**:
1. Implement PKCE Utilities (`lib/auth/pkce.ts`)
2. Implement OAuth Flow (`lib/auth/oauth.ts`)
3. Implement Token Storage (`lib/auth/storage.ts`)
4. Create Auth Hooks (`lib/auth/hooks.ts`)
5. Create Auth Context Provider (`components/auth/AuthProvider.tsx`)
6. Create Protected Route Component (`components/layout/ProtectedRoute.tsx`)
7. Create OAuth Callback Page (`app/auth/callback/page.tsx`)
8. Create Login UI Components (LoginButton, UserMenu)
9. Update Landing Page with "Sign In" button

**Acceptance Criteria**:
- ✅ Clicking "Sign In" redirects to SSO login page
- ✅ After SSO auth, callback page exchanges code for tokens
- ✅ Tokens stored in localStorage (refresh) and memory (access/id)
- ✅ Dashboard redirects to landing if not authenticated
- ✅ UserMenu displays user name and email from JWT claims
- ✅ Logout clears tokens and redirects to landing

**Constitutional Compliance**:
- ✅ **Audit**: All auth events (login, logout) logged to browser console

---

### Phase 3: Core Layout & Navigation (3 hours)

**Goal**: Build app shell with sidebar navigation, header, and responsive layout.

**Tasks**:
1. Create AppShell Component (`components/layout/AppShell.tsx`)
2. Create Sidebar Component (`components/layout/Sidebar.tsx`)
3. Create Header Component (`components/layout/Header.tsx`)
4. Create Dashboard Layout (`app/dashboard/layout.tsx`)
5. Apply Layout to All Protected Routes

**Acceptance Criteria**:
- ✅ Sidebar renders with all navigation links
- ✅ Active link highlighted with cyan accent
- ✅ Header shows current page title and user menu
- ✅ Layout is desktop-responsive (1280px+)
- ✅ IFK theme applied (dark backgrounds, cyan/amber accents)
- ✅ All protected pages wrapped in ProtectedRoute

**Constitutional Compliance**:
- ✅ **Agent Parity**: Sidebar includes "Workers" (not "Team Members")

---

### Phase 4: Projects Module (3 hours)

**Goal**: Implement full CRUD for projects with member management.

**Tasks**:
1. Create API Client Methods (getProjects, createProject, etc.)
2. Create Type Definitions (`lib/api/types.ts`)
3. Create Projects List Page (`app/projects/page.tsx`)
4. Create ProjectCard Component
5. Create ProjectForm Component
6. Create Project Detail Page (`app/projects/[id]/page.tsx`)
7. Create ProjectHeader Component
8. Create Member Management UI

**Acceptance Criteria**:
- ✅ Can create project with slug, name, description
- ✅ Projects list shows all user's projects
- ✅ Project detail page shows members (humans + agents)
- ✅ Can add human or agent as member
- ✅ Cannot remove project owner
- ✅ Delete project warns if tasks exist
- ✅ All API errors displayed with toast notifications

**Constitutional Compliance**:
- ✅ **Agent Parity**: Members list shows humans and agents equally with icons
- ✅ **Audit**: Create/update/delete actions create audit entries

---

### Phase 5: Tasks Module (4 hours)

**Goal**: Implement task CRUD, workflow, recursive subtasks, and assignment.

**Tasks**:
1. Create API Client Methods (getTasks, createTask, etc.)
2. Create Type Definitions (TaskRead, TaskStatus, etc.)
3. Create Tasks List Page
4. Create TaskCard Component
5. Create TaskForm Component
6. Create StatusBadge, PriorityBadge, ProgressBar Components
7. Create Task Detail Page
8. Create TaskTree Component (recursive subtask display)
9. Create TaskWorkflow Component (status change buttons)
10. Create TaskFilters Component

**Acceptance Criteria**:
- ✅ Can create task with title, description, priority, assignee, due date
- ✅ Task list shows all tasks with filters
- ✅ Task detail shows full task info + subtasks in tree
- ✅ Can change task status via workflow buttons
- ✅ Can update progress percentage
- ✅ Can create subtasks under any task
- ✅ Subtask tree displays correctly up to 5 levels deep
- ✅ Assignee dropdown shows humans AND agents with icons
- ✅ Cannot assign to non-member workers

**Constitutional Compliance**:
- ✅ **Agent Parity**: Assignment dropdown shows humans and agents equally
- ✅ **Recursive Tasks**: TaskTree component supports unlimited nesting
- ✅ **Audit**: All status changes, progress updates create audit entries

---

### Phase 6: Workers Module (2 hours)

**Goal**: Implement worker management (humans + agents registry).

**Tasks**:
1. Create API Client Methods (getAgents, registerAgent, etc.)
2. Create Type Definitions (WorkerRead, AgentCreate)
3. Create Workers List Page
4. Create WorkerList Component
5. Create WorkerAvatar Component
6. Create AgentForm Component
7. Create WorkerDropdown Component (for task assignment)

**Acceptance Criteria**:
- ✅ Can register new agent with handle, name, type, capabilities
- ✅ Agents list shows all registered agents
- ✅ Can edit agent (name, type, capabilities)
- ✅ Cannot delete agent that is a project member
- ✅ WorkerDropdown shows humans and agents with distinguishing icons

**Constitutional Compliance**:
- ✅ **Agent Parity**: Agents displayed equally in workers list and dropdowns
- ✅ **First-Class Citizens**: Agents have full CRUD operations

---

### Phase 7: Audit Module (1 hour)

**Goal**: Implement audit log viewing for tasks and projects.

**Tasks**:
1. Create API Client Methods (getTaskAudit, getProjectAudit)
2. Create Type Definitions (AuditRead)
3. Create Audit Log Page
4. Create AuditLog Component
5. Create AuditEntry Component
6. Create AuditFilters Component
7. Integrate Audit into Task Detail Page

**Acceptance Criteria**:
- ✅ Audit log page shows all audit entries
- ✅ Can filter by entity type, actor, date range
- ✅ Task detail page shows task-specific audit trail
- ✅ Audit entries display actor handle with human/agent icon
- ✅ Action details (before/after values) displayed clearly

**Constitutional Compliance**:
- ✅ **Every Action Auditable**: All state changes visible in audit log
- ✅ **Actor Identity**: Every entry shows actor handle and type

---

### Phase 8: Integration Testing & Polish (2 hours)

**Goal**: End-to-end testing, error handling, loading states, empty states.

**Tasks**:
1. Test Complete User Flow (sign in → create project → create task → audit)
2. Test Edge Cases (token expiry, network failures, validation errors)
3. Implement Loading States (skeletons, spinners)
4. Implement Empty States (helpful CTAs)
5. Error Handling (toast notifications, fallback UI)
6. Polish UI/UX (hover states, transitions, IFK glow effects)
7. Accessibility (keyboard nav, ARIA labels, focus states)
8. Performance (lazy loading, debounce, memoization)

**Acceptance Criteria**:
- ✅ All user stories (spec.md) pass manual testing
- ✅ No console errors or warnings
- ✅ All loading states display correctly
- ✅ All empty states provide clear CTAs
- ✅ API errors displayed with user-friendly messages
- ✅ UI matches SSO platform visually
- ✅ Lighthouse score > 90

**Constitutional Compliance**:
- ✅ **Agent Parity**: All features work identically for humans and agents
- ✅ **Recursive Tasks**: Subtask tree renders correctly at any depth
- ✅ **Audit Trail**: Every action creates audit entries visible in UI

---

## 4. Component Breakdown

### 4.1 Layout Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **AppShell** | Main app layout with sidebar + header | `children` | None |
| **Sidebar** | Navigation menu | None | Active route |
| **Header** | Top bar with title + user menu | `title?: string` | None |
| **ProtectedRoute** | Auth guard, redirects if not authed | `children` | `isAuthenticated` |

### 4.2 Auth Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **LoginButton** | Triggers OAuth flow | None | None |
| **UserMenu** | Dropdown with user info + logout | None | `isOpen` |
| **AuthProvider** | Context provider for auth state | `children` | `user, isAuthenticated, loading` |

### 4.3 Project Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **ProjectList** | Grid of project cards | `projects: ProjectRead[]` | None |
| **ProjectCard** | Single project card | `project: ProjectRead` | None |
| **ProjectForm** | Create/edit project form | `onSubmit, initialData?` | `formData, errors` |
| **ProjectHeader** | Project detail header | `project: ProjectRead` | None |

### 4.4 Task Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **TaskList** | Table/grid of tasks | `tasks: TaskListItem[]` | None |
| **TaskCard** | Single task card | `task: TaskListItem` | None |
| **TaskForm** | Create/edit task form | `projectId, onSubmit, initialData?` | `formData, errors` |
| **TaskTree** | Recursive subtask tree | `task: TaskRead` | None (recursive) |
| **StatusBadge** | Task status indicator | `status: TaskStatus` | None |
| **PriorityBadge** | Priority indicator | `priority: TaskPriority` | None |
| **ProgressBar** | Visual progress bar | `percent: number` | None |
| **TaskFilters** | Filter controls | `onFilterChange` | `filters` |
| **TaskWorkflow** | Status change buttons | `task: TaskRead, onStatusChange` | None |

### 4.5 Worker Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **WorkerList** | Table of workers | `workers: WorkerRead[]` | None |
| **WorkerDropdown** | Assignment dropdown (humans + agents) | `projectId, onSelect` | `members, isOpen` |
| **WorkerAvatar** | Icon for human/agent | `type: 'human' \| 'agent'` | None |
| **AgentForm** | Register/edit agent form | `onSubmit, initialData?` | `formData, errors` |

### 4.6 Audit Components

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **AuditLog** | Timeline of audit entries | `entries: AuditRead[]` | None |
| **AuditEntry** | Single audit entry | `entry: AuditRead` | None |
| **AuditFilters** | Filter controls | `onFilterChange` | `filters` |

---

## 5. API Client Design

### 5.1 Type Definitions (`lib/api/types.ts`)

Full type definitions for all API entities (see spec integration guide for complete reference):
- ProjectRead, ProjectCreate, ProjectUpdate
- MemberRead, MemberCreate
- TaskRead, TaskListItem, TaskCreate, TaskUpdate, TaskFilters
- WorkerRead, AgentCreate, AgentUpdate
- AuditRead
- UserClaims (JWT)

### 5.2 Fetch Wrapper with Auth (`lib/api/client.ts`)

```typescript
import { tokenStorage } from '@/lib/auth/storage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private async fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
    let accessToken = tokenStorage.getAccessToken();

    // Refresh if expired
    if (!accessToken) {
      accessToken = await tokenStorage.refreshAccessToken();
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      // Token invalid, try refresh once
      try {
        accessToken = await tokenStorage.refreshAccessToken();
        return this.fetchWithAuth(endpoint, options); // Retry
      } catch {
        tokenStorage.clearTokens();
        window.location.href = '/'; // Redirect to login
        throw new Error('Unauthorized');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error || 'API Error', response.status);
    }

    return response.json();
  }

  // Projects, Tasks, Workers, Audit methods...
}

export const apiClient = new APIClient();
```

### 5.3 Error Handling

```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

---

## 6. Constitutional Compliance

### 6.1 Principle 1: Every Action MUST Be Auditable

**Verification**:
- ✅ All API endpoints create audit entries (backend)
- ✅ Frontend displays audit logs in task detail, project detail, global audit pages
- ✅ Audit entries show: actor (handle), actor type (human/agent), action, timestamp, details

### 6.2 Principle 2: Agents Are First-Class Citizens

**Verification**:
- ✅ WorkerDropdown shows humans and agents equally with distinguishing icons
- ✅ Audit shows agent actions with same prominence as human actions
- ✅ No UI copy says "AI helps you" (agents are workers, not helpers)

### 6.3 Principle 3: Recursive Task Decomposition

**Verification**:
- ✅ TaskTree component recursively renders subtasks to unlimited depth
- ✅ Can create subtask under any task
- ✅ Progress rolls up from subtasks (backend logic, displayed in UI)

### 6.4 Principle 4: Spec-Driven Development

**Verification**:
- ✅ Plan derived directly from spec (`specs/004-web-dashboard/spec.md`)
- ✅ All functional requirements traced to implementation tasks
- ✅ API contracts match integration guide exactly

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)
- PKCE generation and SHA-256
- Token storage and refresh logic
- API client methods (mocked fetch)

### 7.2 Component Tests
- Badge rendering (StatusBadge, PriorityBadge)
- Icon display (WorkerAvatar)
- Recursive rendering (TaskTree)

### 7.3 Integration Testing (Manual)
- All 10 user stories from spec.md
- Edge cases: token expiry, network failures, validation errors

### 7.4 E2E Testing
- Deferred to Phase III (after MCP integration)

---

## 8. Environment Setup

### 8.1 Environment Variables (`.env.local`)

```env
# SSO Configuration
NEXT_PUBLIC_SSO_URL=http://localhost:3001
NEXT_PUBLIC_OAUTH_CLIENT_ID=taskflow-dashboard
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_SCOPE=openid profile email

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# App Configuration
NEXT_PUBLIC_APP_NAME=TaskFlow Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8.2 Prerequisites

**Services**:
- TaskFlow SSO running on port 3001
- TaskFlow API running on port 8000
- OAuth Client registered in SSO with `clientId: taskflow-dashboard`

**SSO Client Configuration**:
```json
{
  "clientId": "taskflow-dashboard",
  "name": "TaskFlow Web Dashboard",
  "type": "public",
  "redirectUrls": [
    "http://localhost:3000/auth/callback"
  ],
  "allowedScopes": ["openid", "profile", "email"]
}
```

### 8.3 Development Workflow

```bash
# 1. Ensure SSO and API are running
cd sso-platform && pnpm dev           # Port 3001
cd packages/api && uv run uvicorn ... # Port 8000

# 2. Start dashboard
cd web-dashboard
pnpm install
pnpm dev                              # Port 3000

# 3. Open browser
open http://localhost:3000
```

---

## 9. Success Criteria

| SC ID | Criterion | Target | Verification |
|-------|-----------|--------|--------------|
| SC-001 | OAuth login time | < 10 seconds | Manual test with timer |
| SC-002 | Create project + task | < 2 minutes | Manual test with timer |
| SC-003 | Assignment dropdown parity | Equal visual treatment | Visual inspection |
| SC-004 | Audit entries created | < 1 second | Network tab: audit POST |
| SC-005 | Subtask tree depth | 5+ levels | Create deep tree, verify render |
| SC-006 | UI theme match | Visual match with SSO | Side-by-side comparison |
| SC-007 | Unauthenticated redirect | All routes protected | Test all routes without auth |
| SC-008 | Error messages displayed | 100% API failures | Trigger errors, verify toasts |
| SC-009 | Empty states with CTAs | All zero-item lists | Clear data, verify prompts |
| SC-010 | Audit actor display | 100% entries show handle/type | View audit, verify all entries |

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **PKCE implementation error** | High | Medium | Use battle-tested library (`pkce-challenge`) |
| **Token refresh race condition** | Medium | Medium | Implement refresh lock/queue in TokenStorage |
| **CORS issues** | High | Low | API already configured, verify origin |
| **Recursive task depth crash** | Medium | Low | Limit depth to 10 levels, warn user |
| **SSO client not registered** | High | Medium | Document registration in setup guide |

---

## 11. Timeline & Estimates

| Phase | Description | Estimated Hours | Dependencies |
|-------|-------------|-----------------|--------------|
| **Phase 1** | Project Setup & Theme | 2 hours | None |
| **Phase 2** | Auth Flow (OAuth PKCE) | 4 hours | Phase 1 |
| **Phase 3** | Core Layout | 3 hours | Phase 2 |
| **Phase 4** | Projects Module | 3 hours | Phase 3 |
| **Phase 5** | Tasks Module | 4 hours | Phase 4 |
| **Phase 6** | Workers Module | 2 hours | Phase 5 |
| **Phase 7** | Audit Module | 1 hour | Phase 5 |
| **Phase 8** | Integration Testing | 2 hours | All above |
| **Total** | | **21 hours** | |

**Estimated Completion**: 8 working days (at 2-3 hours/day) or 3-4 days (at 5-6 hours/day)

---

## 12. References

- **Spec**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/specs/004-web-dashboard/spec.md`
- **Integration Guide**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/specs/003-backend-api/frontend-integration-prompt.md`
- **Constitution**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/.specify/memory/constitution.md`
- **SSO Platform**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/sso-platform/`
- **Backend API**: `/Users/mjs/Documents/code/mjunaidca/taskflow-sso/packages/api/`

---

**End of Implementation Plan**

This plan is ready for execution via `/sp.implement` or manual development following the phase order.
