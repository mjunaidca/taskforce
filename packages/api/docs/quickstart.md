# TaskFlow API - Quick Start

Get the API running in 2 minutes.

---

## Prerequisites

- Python 3.13+
- [uv](https://github.com/astral-sh/uv) package manager
- PostgreSQL database (or Neon account)
- Better Auth SSO running on port 3001

---

## Setup

### 1. Install Dependencies

```bash
cd packages/api
uv sync
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# SSO Server
SSO_URL=http://localhost:3001

# Enable dev mode for easy testing
DEV_MODE=true
DEV_USER_ID=your-sso-user-id
DEV_USER_EMAIL=your@email.com
DEV_USER_NAME=Your Name
```

### 3. Start the Server

```bash
uv run uvicorn taskflow_api.main:app --reload
```

Server runs at http://localhost:8000

---

## Verify It Works

### Health Check

```bash
curl http://localhost:8000/health
# {"status": "healthy", "version": "0.1.0"}
```

### Database Check

```bash
curl http://localhost:8000/health/ready
# {"status": "ready", "database": "connected"}
```

### Authenticated Request

```bash
curl -H "Authorization: Bearer test" http://localhost:8000/api/projects
# [] (empty list)
```

---

## Create Your First Project

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-project", "name": "My First Project"}'
```

Response:
```json
{
  "id": 1,
  "slug": "my-project",
  "name": "My First Project",
  "description": null,
  "owner_id": "your-user-id",
  "is_default": false,
  "created_at": "2025-12-07T10:00:00Z",
  "updated_at": "2025-12-07T10:00:00Z"
}
```

---

## Create a Task

```bash
curl -X POST http://localhost:8000/api/projects/1/tasks \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"title": "My first task", "priority": "high"}'
```

---

## Task Workflow

```bash
# Start the task
curl -X PATCH http://localhost:8000/api/tasks/1/status \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# Update progress
curl -X PATCH http://localhost:8000/api/tasks/1/progress \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"percent": 50}'

# Submit for review
curl -X PATCH http://localhost:8000/api/tasks/1/status \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"status": "review"}'

# Approve
curl -X POST http://localhost:8000/api/tasks/1/approve \
  -H "Authorization: Bearer test"
```

---

## Interactive Docs

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Run Tests

```bash
uv run pytest
# 41 passed
```

---

## Next Steps

- Read [Authentication Setup](./auth-setup.md) for production auth
- Read [Full Documentation](./README.md) for architecture details
- Check `/docs` endpoint for complete API reference
