# Next.js Environment Variables in Docker/Kubernetes

## The Critical Distinction

Next.js has TWO types of environment variables that behave completely differently:

| Type | Prefix | When Resolved | Can Change After Build? |
|------|--------|---------------|-------------------------|
| **Build-time** | `NEXT_PUBLIC_*` | During `next build` | NO - Baked into JS bundle |
| **Runtime** | No prefix | At request time | YES - Read from process.env |

## Why This Matters for Docker

```dockerfile
# This does NOTHING for NEXT_PUBLIC_* variables!
ENV NEXT_PUBLIC_API_URL=https://api.example.com

# The variable was already baked in during build
# Setting ENV at runtime is too late
```

## Correct Dockerfile Pattern

```dockerfile
# ----- Stage 2: Builder -----
FROM node:22-alpine AS builder
WORKDIR /app

# Declare build-time arguments
ARG NEXT_PUBLIC_SSO_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convert ARGs to ENVs (required for next build to see them)
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build with variables baked in
RUN pnpm build
```

## CI/CD Build Args

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    build-args: |
      NEXT_PUBLIC_SSO_URL=https://sso.${{ vars.DOMAIN }}
      NEXT_PUBLIC_API_URL=https://api.${{ vars.DOMAIN }}
      NEXT_PUBLIC_APP_URL=https://${{ vars.DOMAIN }}
```

## Common Mistakes

### Mistake 1: Setting NEXT_PUBLIC_* in Kubernetes ConfigMap

```yaml
# WRONG - These will be ignored!
apiVersion: v1
kind: ConfigMap
data:
  NEXT_PUBLIC_API_URL: "https://api.example.com"
```

The ConfigMap value is only available at runtime, but `NEXT_PUBLIC_*` was already baked in at build time.

### Mistake 2: Setting NEXT_PUBLIC_* in docker-compose environment

```yaml
# WRONG - Too late!
services:
  web:
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
```

### Mistake 3: Expecting runtime configuration

```typescript
// This value was determined at BUILD time, not runtime
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Hybrid Pattern: Server Components

For Server Components (not browser code), you CAN use runtime env vars:

```typescript
// This works in Server Components / API routes
// NOT available in client components
const serverApiUrl = process.env.SERVER_API_URL;
```

### Dual-URL Pattern

```dockerfile
# Build-time: For browser
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

# Runtime: For server-side
ENV SERVER_API_URL=http://api:8000
```

```typescript
// In server component or API route
function getApiUrl() {
  // Server-side: use internal K8s service name
  if (typeof window === 'undefined') {
    return process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
  }
  // Client-side: use public URL (baked in)
  return process.env.NEXT_PUBLIC_API_URL;
}
```

## Finding All NEXT_PUBLIC_* Variables

Before building, audit what variables your app needs:

```bash
# Find all NEXT_PUBLIC_* usage
grep -r "NEXT_PUBLIC_" apps/web/src --include="*.ts" --include="*.tsx" | \
  grep -oE "NEXT_PUBLIC_[A-Z_]+" | sort -u

# Example output:
# NEXT_PUBLIC_API_URL
# NEXT_PUBLIC_APP_URL
# NEXT_PUBLIC_CHATKIT_DOMAIN_KEY
# NEXT_PUBLIC_OAUTH_REDIRECT_URI
# NEXT_PUBLIC_SSO_URL
```

## Checklist for Docker Deployment

- [ ] All `NEXT_PUBLIC_*` vars listed in Dockerfile as ARG
- [ ] All ARGs converted to ENV in builder stage
- [ ] CI/CD passes all vars as `--build-arg`
- [ ] Default values point to localhost (for local dev)
- [ ] Production values passed at build time

## What About Next.js Output: Standalone?

With `output: 'standalone'`, the behavior is the same:
- `NEXT_PUBLIC_*` is still build-time only
- Server-side env vars work at runtime
- The standalone server.js reads runtime env vars

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  // NEXT_PUBLIC_* still baked in at build time
};
```
