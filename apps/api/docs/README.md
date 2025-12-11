# TaskFlow API Documentation

**Version**: 1.0.0
**Base URL**: `http://localhost:8000`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Setup](#authentication-setup)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Development Guide](#development-guide)
7. [Deployment](#deployment)

---

## Overview

TaskFlow API is the backend service for the TaskFlow platform - a human-agent collaborative task management system. It provides RESTful endpoints for managing projects, tasks, workers (humans and AI agents), and maintains a complete audit trail of all operations.

### Key Features

- **Project Management**: Create and manage projects with team members
- **Task Workflow**: Full lifecycle management (pending → in_progress → review → completed)
- **Agent Parity**: AI agents are first-class citizens, same API for humans and agents
- **Recursive Tasks**: Tasks can have subtasks (infinite nesting)
- **Audit Trail**: Every state change is logged for traceability
- **SSO Integration**: Authenticates via Better Auth SSO using JWT/JWKS

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python 3.13+) |
| ORM | SQLModel (SQLAlchemy + Pydantic) |
| Database | PostgreSQL (Neon) |
| Auth | Better Auth SSO (JWT/JWKS) |
| Package Manager | uv |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Frontend  │   CLI (Phase 1) │   AI Agents (MCP)           │
│   (Next.js)     │   (Python)      │   (Claude, etc.)            │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         │     All use Bearer token authentication│
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TaskFlow API (:8000)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Routers   │  │  Services   │  │    Auth     │              │
│  │  /projects  │  │   audit     │  │  JWT/JWKS   │              │
│  │  /tasks     │  │   auth      │  │  verify     │              │
│  │  /workers   │  │ validation  │  │             │              │
│  │  /health    │  │             │  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SQLModel Models                          ││
│  │  Project │ Task │ Worker │ AuditLog │ ProjectMember         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────┐                    ┌─────────────────┐
│   PostgreSQL    │                    │   Better Auth   │
│   (Neon)        │                    │   SSO (:3001)   │
│                 │                    │                 │
│  - projects     │                    │  - /api/auth/*  │
│  - tasks        │                    │  - /jwks        │
│  - workers      │                    │  - /oauth2/*    │
│  - audit_logs   │                    │                 │
└─────────────────┘                    └─────────────────┘
```

### Request Flow

```
1. Client sends request with Bearer token
         │
         ▼
2. Auth middleware extracts token
         │
         ▼
3. Token verification:
   ├── Try JWT verification (JWKS) ──► Success ──► Extract claims
   │
   └── Fallback to userinfo endpoint ──► Success ──► Get user data
         │
         ▼
4. CurrentUser injected into route handler
         │
         ▼
5. Route handler executes business logic
         │
         ▼
6. Audit log entry created (for state changes)
         │
         ▼
7. Response returned to client
```

### Directory Structure

```
packages/api/
├── src/taskflow_api/
│   ├── __init__.py          # Package version
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment settings
│   ├── database.py          # Async PostgreSQL connection
│   ├── auth.py              # JWT/JWKS authentication
│   ├── models/              # SQLModel data models
│   │   ├── __init__.py
│   │   ├── base.py          # Timestamp mixin
│   │   ├── project.py       # Project, ProjectMember
│   │   ├── worker.py        # Worker (human/agent)
│   │   ├── task.py          # Task (recursive)
│   │   └── audit.py         # AuditLog
│   ├── routers/             # API route handlers
│   │   ├── __init__.py
│   │   ├── health.py        # Health checks
│   │   ├── projects.py      # Project CRUD
│   │   ├── members.py       # Project membership
│   │   ├── agents.py        # Agent registration
│   │   ├── tasks.py         # Task CRUD + workflow
│   │   └── audit.py         # Audit trail queries
│   └── tests/               # Pytest test suite
│       ├── conftest.py      # Test fixtures
│       ├── test_health.py
│       ├── test_projects.py
│       ├── test_agents.py
│       ├── test_tasks.py
│       └── test_workflow.py
├── docs/                    # Documentation
├── pyproject.toml           # Dependencies
├── .env                     # Environment variables
└── .env.example             # Template
```

---

## Authentication Setup

### Overview

The API supports multiple authentication modes:

| Mode | Use Case | How It Works |
|------|----------|--------------|
| **JWT/JWKS** | Production | Verifies JWT tokens using SSO's public keys |
| **Userinfo** | Fallback | Validates tokens via SSO's userinfo endpoint |
| **Dev Mode** | Local Development | Bypasses auth, uses configured mock user |

### Mode 1: Dev Mode (Local Development)

**Recommended for local development.** Bypasses all token verification.

#### Setup

1. Set environment variables in `.env`:

```bash
# Enable dev mode
DEV_MODE=true

# Configure the mock user (use your actual SSO user ID for data consistency)
DEV_USER_ID=bNpp1HxnULPmByLFAzAwum02g5OZKzRx
DEV_USER_EMAIL=your.email@example.com
DEV_USER_NAME=Your Name
```

2. Restart the API server:

```bash
uv run uvicorn taskflow_api.main:app --reload
```

3. Make requests with any Bearer token:

```bash
# Token value is ignored in dev mode
curl -H "Authorization: Bearer anything" http://localhost:8000/api/projects

# Create a project
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-project", "name": "My Project"}'
```

#### Security Note

⚠️ **Never enable DEV_MODE in production!** It completely bypasses authentication.

---

### Mode 2: JWT/JWKS (Production)

**Standard OAuth2/OIDC flow.** Tokens are JWTs signed with RS256, verified using SSO's JWKS.

#### How It Works

```
┌──────────┐                           ┌──────────┐
│  Client  │                           │   SSO    │
└────┬─────┘                           └────┬─────┘
     │                                      │
     │  1. OAuth2 Authorization Request     │
     │ ────────────────────────────────────►│
     │                                      │
     │  2. User authenticates               │
     │                                      │
     │  3. Authorization code               │
     │ ◄────────────────────────────────────│
     │                                      │
     │  4. Exchange code for tokens         │
     │     POST /api/auth/oauth2/token      │
     │ ────────────────────────────────────►│
     │                                      │
     │  5. JWT access_token + id_token      │
     │ ◄────────────────────────────────────│
     │                                      │
└────┴─────┐                           └────┴─────┘
           │
           │  6. API request with Bearer token
           ▼
┌──────────────────┐                   ┌──────────┐
│   TaskFlow API   │                   │   SSO    │
└────────┬─────────┘                   └────┬─────┘
         │                                  │
         │  7. Fetch JWKS (cached 1 hour)   │
         │     GET /api/auth/jwks           │
         │ ────────────────────────────────►│
         │                                  │
         │  8. Public keys                  │
         │ ◄────────────────────────────────│
         │                                  │
         │  9. Verify JWT signature locally │
         │                                  │
         │  10. Extract claims (sub, email) │
         │                                  │
         ▼
   Request processed
```

#### SSO Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/openid-configuration` | OIDC Discovery document |
| `/api/auth/jwks` | Public keys for JWT verification |
| `/api/auth/oauth2/authorize` | Start OAuth2 flow |
| `/api/auth/oauth2/token` | Exchange code for tokens |
| `/api/auth/oauth2/userinfo` | Get user info (fallback) |

#### JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "kid": "IVPOpxYOjJoJ8hWoKrysfjIy5Pzs06fu",
    "typ": "JWT"
  },
  "payload": {
    "sub": "bNpp1HxnULPmByLFAzAwum02g5OZKzRx",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "iat": 1733564400,
    "exp": 1733568000,
    "iss": "http://localhost:3001"
  }
}
```

#### Configuration

```bash
# .env
DEV_MODE=false
SSO_URL=http://localhost:3001
```

#### Registering as OAuth2 Client

To use JWT auth, register the API as an OAuth2 client in the SSO:

1. Access SSO admin panel
2. Create new OAuth2 client:
   - **Client ID**: `taskflow-api`
   - **Redirect URI**: `http://localhost:8000/auth/callback`
   - **Scopes**: `openid profile email`
3. Store client credentials securely

---

### Mode 3: Userinfo Fallback

If JWT verification fails (e.g., token is an opaque access token), the API falls back to calling the SSO's userinfo endpoint.

```
API                                    SSO
 │                                      │
 │  GET /api/auth/oauth2/userinfo       │
 │  Authorization: Bearer <token>       │
 │ ────────────────────────────────────►│
 │                                      │
 │  { "sub": "...", "email": "..." }    │
 │ ◄────────────────────────────────────│
```

This is automatic - no configuration needed.

---

### Authentication Flow in Code

```python
# auth.py - simplified flow

async def get_current_user(credentials) -> CurrentUser:
    # 1. Dev mode bypass
    if settings.dev_mode:
        return CurrentUser(dev_user_config)

    # 2. Try JWT verification
    try:
        payload = await verify_jwt(token)  # Uses JWKS
        return CurrentUser(payload)
    except JWTError:
        pass

    # 3. Fallback to userinfo
    payload = await verify_via_userinfo(token)
    return CurrentUser(payload)
```

---

### Testing Authentication

#### Test Dev Mode

```bash
# Should work with any token
curl -H "Authorization: Bearer test" http://localhost:8000/api/projects
```

#### Test JWT Mode

```bash
# Get a real JWT from SSO OAuth2 flow first
TOKEN="eyJhbGciOiJSUzI1NiIs..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/projects
```

#### Test Invalid Token

```bash
# With DEV_MODE=false, this should return 401
curl -H "Authorization: Bearer invalid" http://localhost:8000/api/projects
# {"error": "Invalid token", "status_code": 401}
```

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Database connectivity check |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/members` | List project members |
| POST | `/api/projects/{id}/members` | Add member |
| DELETE | `/api/projects/{id}/members/{mid}` | Remove member |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers/agents` | List all agents |
| POST | `/api/workers/agents` | Register agent |
| GET | `/api/workers/agents/{id}` | Get agent details |
| PUT | `/api/workers/agents/{id}` | Update agent |
| DELETE | `/api/workers/agents/{id}` | Delete agent |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/tasks` | List project tasks |
| POST | `/api/projects/{id}/tasks` | Create task |
| GET | `/api/tasks/{id}` | Get task with subtasks |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| PATCH | `/api/tasks/{id}/status` | Change status |
| PATCH | `/api/tasks/{id}/progress` | Update progress |
| PATCH | `/api/tasks/{id}/assign` | Assign to worker |
| POST | `/api/tasks/{id}/subtasks` | Create subtask |
| POST | `/api/tasks/{id}/approve` | Approve (review→completed) |
| POST | `/api/tasks/{id}/reject` | Reject (review→in_progress) |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{id}/audit` | Task audit trail |
| GET | `/api/projects/{id}/audit` | Project audit trail |

---

## Data Models

### Task Status Flow

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      ┌─────────┐  ┌───────────┐  ┌─────────┐
      │ blocked │  │in_progress│  │cancelled│
      └────┬────┘  └─────┬─────┘  └─────────┘
           │             │
           │             ▼
           │       ┌──────────┐
           └──────►│  review  │
                   └────┬─────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
        ┌───────────┐      ┌───────────┐
        │ completed │      │in_progress│ (rejected)
        └───────────┘      └───────────┘
```

### Valid Status Transitions

```python
VALID_TRANSITIONS = {
    "pending": ["in_progress", "blocked", "cancelled"],
    "in_progress": ["review", "blocked", "cancelled"],
    "review": ["completed", "in_progress"],  # approve or reject
    "blocked": ["pending", "in_progress", "cancelled"],
    "completed": [],  # terminal state
    "cancelled": [],  # terminal state
}
```

---

## Development Guide

### Setup

```bash
cd packages/api

# Install dependencies
uv sync --extra dev

# Copy environment template
cp .env.example .env
# Edit .env with your settings

# Run server
uv run uvicorn taskflow_api.main:app --reload
```

### Running Tests

```bash
# All tests
uv run pytest

# With coverage
uv run pytest --cov=taskflow_api

# Specific test file
uv run pytest src/taskflow_api/tests/test_tasks.py

# Stop on first failure
uv run pytest -x
```

### Linting

```bash
# Check
uv run ruff check .

# Fix
uv run ruff check --fix .

# Format
uv run ruff format .
```

### API Documentation

With the server running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Deployment

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SSO_URL` | Yes | - | Better Auth SSO base URL |
| `ALLOWED_ORIGINS` | No | `localhost:3000,3001` | CORS origins |
| `DEBUG` | No | `false` | Enable debug mode |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `DEV_MODE` | No | `false` | Bypass authentication |

### Production Checklist

- [ ] `DEV_MODE=false`
- [ ] `DEBUG=false`
- [ ] SSL/TLS enabled
- [ ] `DATABASE_URL` uses `?sslmode=require`
- [ ] `ALLOWED_ORIGINS` set to production domains
- [ ] OAuth2 client registered in SSO
- [ ] Health checks configured in load balancer
