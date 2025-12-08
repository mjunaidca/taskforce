# Better Auth + Docker Containerization Guide

## The Problem

Better Auth validates request origins against `trustedOrigins`. When running in Docker:
- Browser makes requests from `http://localhost:3000` (your machine)
- But internal service-to-service calls use Docker service names: `http://web:3000`
- If origins don't match, auth fails

## Configuration Locations

### 1. Better Auth Server Config
**File:** `sso-platform/src/lib/auth.ts` (or similar)

```typescript
export const auth = betterAuth({
  // Base URL where Better Auth is hosted
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",

  // Origins allowed to make auth requests
  trustedOrigins: [
    // Local development
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:3001",

    // Docker Compose (service names)
    "http://web:3000",
    "http://api:8000",
    "http://sso:3001",

    // Kubernetes (service names)
    "http://frontend-svc:3000",
    "http://backend-svc:8000",

    // Production (actual domain)
    process.env.FRONTEND_URL,
    process.env.API_URL,
  ].filter(Boolean),

  // ... rest of config
});
```

### 2. Backend CORS Config
**File:** `packages/api/src/taskflow_api/main.py`

```python
from fastapi.middleware.cors import CORSMiddleware
import os

# Parse CORS origins from env (comma-separated)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [
    # Always include localhost for dev
    "http://localhost:3000",
    "http://localhost:3001",

    # Docker service names
    "http://web:3000",
    "http://sso:3001",
]

# Add env-configured origins
if cors_origins_env:
    cors_origins.extend(cors_origins_env.split(","))

# Add frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Frontend Auth Client
**File:** `web-dashboard/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Must point to SSO service
  // In Docker: environment variable set at build time or runtime
  baseURL: process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001",
});
```

## Docker Compose Configuration

```yaml
services:
  sso:
    build:
      context: ./sso-platform
    environment:
      - BETTER_AUTH_URL=http://sso:3001
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      # Trusted origins for Docker networking
      - TRUSTED_ORIGINS=http://localhost:3000,http://web:3000,http://api:8000
    ports:
      - "3001:3001"

  web:
    build:
      context: ./web-dashboard
      args:
        # Build-time: baked into Next.js
        - NEXT_PUBLIC_SSO_URL=http://localhost:3001  # For browser access
        - NEXT_PUBLIC_API_URL=http://localhost:8000  # For browser access
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - sso
      - api

  api:
    build:
      context: ./packages/api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_URL=http://sso:3001  # Internal Docker network
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - FRONTEND_URL=http://web:3000
      - CORS_ORIGINS=http://localhost:3000,http://web:3000
    ports:
      - "8000:8000"
```

## Key Insight: Browser vs Server URLs

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR MACHINE                              │
│                                                                  │
│   Browser                                                        │
│   ├── http://localhost:3000  →  web container (mapped port)     │
│   ├── http://localhost:8000  →  api container (mapped port)     │
│   └── http://localhost:3001  →  sso container (mapped port)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      DOCKER NETWORK                              │
│                                                                  │
│   web container (Next.js API routes = server-side!)             │
│   ├── http://api:8000       →  api container (internal)         │
│   └── http://sso:3001       →  sso container (internal)         │
│                                                                  │
│   api container                                                  │
│   ├── http://web:3000       →  web container (internal)         │
│   └── http://sso:3001       →  sso container (internal)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Why Different URLs for Browser vs Server?

**The Problem:**
```
Browser (your machine)     → needs localhost:8000 (port mapped to host)
Server routes (container)  → needs api:8000 (Docker network)
```

**The Solution:** Use separate variable names - cleaner and no confusion:

```yaml
services:
  web:
    build:
      args:
        # BROWSER: baked into JS bundle, runs on YOUR machine
        - NEXT_PUBLIC_API_URL=http://localhost:8000
        - NEXT_PUBLIC_SSO_URL=http://localhost:3001
    environment:
      # SERVER: read at runtime, runs IN container
      - SERVER_API_URL=http://api:8000
      - SERVER_SSO_URL=http://sso-platform:3001
```

**Code change (one-liner in each route):**
```typescript
const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
```

**Why this is better:**
- Each variable has ONE value - no confusion
- Clear intent: `SERVER_*` = container names, `NEXT_PUBLIC_*` = browser URLs
- Easy to understand for future maintainers

## Common Issues & Solutions

### Issue: "Invalid origin" Error
**Cause:** Request origin not in trustedOrigins
**Solution:** Add Docker service name to trustedOrigins

### Issue: CORS Error in Browser
**Cause:** Backend CORS doesn't include request origin
**Solution:** Add origin to FastAPI CORS middleware

### Issue: Auth Callback Fails
**Cause:** Callback URL uses wrong host
**Solution:** Ensure BETTER_AUTH_URL matches how service is accessed

### Issue: JWT Verification Fails Between Services
**Cause:** Different BETTER_AUTH_SECRET values
**Solution:** Share same secret via environment variable

## Checklist Before Docker Build

- [ ] trustedOrigins includes: localhost, Docker service names, production domain
- [ ] Backend CORS includes: localhost, Docker service names
- [ ] BETTER_AUTH_SECRET is same across all services
- [ ] BETTER_AUTH_URL uses Docker service name for internal calls
- [ ] NEXT_PUBLIC_* URLs use localhost (for browser access)
- [ ] Server-side URLs use Docker service names
