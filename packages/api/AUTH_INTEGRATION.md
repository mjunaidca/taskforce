# Backend Auth Integration Guide for Frontend Team

## Overview

The TaskFlow API uses JWT/JWKS authentication against the Better Auth SSO. This document explains how auth works so you can verify your frontend implementation aligns correctly.

---

## Auth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │   SSO    │     │ Backend  │
│  (Next)  │     │ (Better  │     │ (FastAPI)│
│          │     │   Auth)  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. OAuth PKCE  │                │
     │ ──────────────>│                │
     │                │                │
     │ 2. JWT Token   │                │
     │ <──────────────│                │
     │                │                │
     │ 3. API Request │                │
     │ ───────────────────────────────>│
     │ Authorization: Bearer <JWT>     │
     │                │                │
     │                │ 4. Fetch JWKS  │
     │                │ <──────────────│
     │                │   (cached 1hr) │
     │                │                │
     │                │ 5. Return keys │
     │                │ ──────────────>│
     │                │                │
     │ 6. Response    │                │
     │ <───────────────────────────────│
     │                │                │
```

---

## What Backend Expects

### Authorization Header

Every API request (except `/health` and `/`) must include:

```
Authorization: Bearer <JWT_TOKEN>
```

### JWT Requirements

The JWT must be signed with **RS256** algorithm and contain:

| Claim | Required | Description |
|-------|----------|-------------|
| `sub` | Yes | User ID (used as `user.id` in backend) |
| `email` | Yes | User email |
| `name` | No | Display name |
| `role` | No | `"user"` or `"admin"` (defaults to `"user"`) |
| `tenant_id` | No | Primary organization ID |
| `kid` | Yes (header) | Key ID matching a key in JWKS |

### JWKS Endpoint

Backend fetches public keys from:
```
{SSO_URL}/api/auth/jwks
```

For local development with SSO at `http://localhost:3001`:
```
http://localhost:3001/api/auth/jwks
```

---

## Error Responses

### 401 Unauthorized

**Missing or invalid token:**
```json
{
  "error": "Invalid JWT: <reason>",
  "status_code": 401
}
```

**Key not found (kid mismatch):**
```json
{
  "error": "Token signing key not found in JWKS",
  "status_code": 401
}
```

### 503 Service Unavailable

**SSO unreachable (no cached keys):**
```json
{
  "error": "Authentication service unavailable: <details>",
  "status_code": 503
}
```

---

## Frontend Checklist

Please verify your implementation:

- [ ] **Token Storage**: JWT stored securely (httpOnly cookie or secure storage)
- [ ] **Authorization Header**: Every API call includes `Authorization: Bearer <token>`
- [ ] **Token Refresh**: Handle token expiration and refresh before it expires
- [ ] **PKCE Flow**: Using OAuth2 PKCE (not implicit flow)
- [ ] **JWT Claims**: Token includes `sub`, `email`, and `kid` in header
- [ ] **Error Handling**: Handle 401 by redirecting to login or refreshing token
- [ ] **SSO URL**: Configured to same SSO as backend (`SSO_URL` env var)

---

## Debug Logging (Backend)

I've added debug logging to help troubleshoot auth issues. When testing, check backend logs for:

```
[AUTH] Fetching JWKS from http://localhost:3001/api/auth/jwks
[AUTH] JWKS fetched successfully: 2 keys
[AUTH] JWT header - kid: abc123, alg: RS256
[AUTH] JWT verified - sub: user-123, email: user@example.com
[AUTH] Authenticated user: CurrentUser(id='user-123', email='user@example.com')
```

**If auth fails, logs will show:**
- JWKS fetch errors (SSO connection issues)
- Key ID mismatches (shows expected vs available kids)
- JWT verification errors (expired, malformed, bad signature)

To enable verbose logging, set `DEBUG=true` or `LOG_LEVEL=DEBUG` in backend `.env`.

---

## Dev Mode (Local Testing Without SSO)

For local development without SSO running, backend supports dev mode:

```env
DEV_MODE=true
DEV_USER_ID=dev-user-123
DEV_USER_EMAIL=dev@localhost
DEV_USER_NAME=Dev User
```

In dev mode, any `Authorization: Bearer <anything>` header is accepted and returns the dev user. This is **only for local development** - never enable in production.

---

## Example: Fetch with Auth (Frontend)

```typescript
// Example using fetch
const response = await fetch('http://localhost:8000/api/projects', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

if (response.status === 401) {
  // Token expired or invalid - refresh or redirect to login
  await refreshToken();
  // Retry request...
}
```

```typescript
// Example with axios interceptor
axios.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## Questions?

If you see auth failures, please share:
1. The error response from backend
2. Backend logs (with DEBUG=true)
3. JWT token (you can decode at jwt.io - don't share in public channels)

We can debug together to identify if the issue is:
- Token generation (SSO/frontend)
- Token transmission (frontend)
- Token verification (backend)
