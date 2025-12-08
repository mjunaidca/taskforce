# Containerization

**Project**: Taskflow SSO Platform

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for Next.js 15 standalone |

## Usage

```bash
# Build
docker build -t sso-platform .

# Run (pass your existing env vars)
docker run -p 3001:3001 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -e ALLOWED_ORIGINS="http://localhost:3000" \
  sso-platform

# Or use .env.local
docker run -p 3001:3001 --env-file .env.local sso-platform
```

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | JWT signing secret (32+ chars) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

## Health Check

Endpoint: `/api/health` - Returns 200 if database connected.

## Code Changes

- `next.config.ts`: Added `output: "standalone"`
