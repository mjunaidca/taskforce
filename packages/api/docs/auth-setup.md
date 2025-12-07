# Authentication Setup Guide

This guide covers authentication for the TaskFlow API.

---

## Quick Start (Dev Mode)

For local development, use Dev Mode to bypass authentication:

```bash
# In packages/api/.env
DEV_MODE=true
DEV_USER_ID=your-sso-user-id
DEV_USER_EMAIL=your.email@example.com
DEV_USER_NAME=Your Name
```

Then any Bearer token works:

```bash
curl -H "Authorization: Bearer anything" http://localhost:8000/api/projects
```

---

## How Authentication Works

### The Complete Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Frontend   │         │    SSO      │         │   Backend   │
│  (3000)     │         │   (3001)    │         │   (8000)    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. OAuth2 PKCE flow   │                       │
       │──────────────────────►│                       │
       │                       │                       │
       │ 2. JWT access_token   │                       │
       │◄──────────────────────│                       │
       │                       │                       │
       │ 3. Authorization: Bearer <JWT>                │
       │──────────────────────────────────────────────►│
       │                       │                       │
       │                       │ 4. GET /api/auth/jwks │
       │                       │◄──────────────────────│
       │                       │    (cached 1 hour)    │
       │                       │──────────────────────►│
       │                       │                       │
       │                       │ 5. Verify JWT locally │
       │                       │    (no SSO call!)     │
       │                       │                       │
       │ 6. Response                                   │
       │◄──────────────────────────────────────────────│
```

### Key Points

1. **Frontend** gets JWT from SSO via OAuth2 PKCE flow
2. **Frontend** sends JWT as `Authorization: Bearer <token>` header
3. **Backend** fetches JWKS public keys from SSO (once per hour, cached)
4. **Backend** verifies JWT signature locally using cryptography
5. **No SSO call per request** - verification is local after JWKS is cached

---

## Authentication Modes

### 1. Dev Mode (DEV_MODE=true)

**Purpose**: Skip auth for local development

**How it works**:
- All token validation is bypassed
- Uses the user configured in environment variables
- Any Bearer token value is accepted

**Configuration**:
```bash
DEV_MODE=true
DEV_USER_ID=bNpp1HxnULPmByLFAzAwum02g5OZKzRx
DEV_USER_EMAIL=mr.junaidshaukat@gmail.com
DEV_USER_NAME=Muhammad Junaid
```

**Security**: ⚠️ Never enable in production!

---

### 2. Production Mode (DEV_MODE=false)

**Purpose**: Secure JWT verification

**How it works**:
1. Frontend sends JWT from OAuth2 flow
2. Backend fetches JWKS public keys (cached 1 hour)
3. Backend verifies JWT signature locally (RS256)
4. Backend extracts user claims from token

**Configuration**:
```bash
DEV_MODE=false
SSO_URL=http://localhost:3001
```

**Backend makes only ONE call to SSO**:
- `GET /api/auth/jwks` - Fetches public keys (cached 1 hour)
- After that, all JWT verification is done locally

**JWT Structure**:
```json
{
  "header": {
    "alg": "RS256",
    "kid": "key-id-from-jwks",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "tenant_id": "org-id",
    "iat": 1733564400,
    "exp": 1733568000,
    "iss": "http://localhost:3001"
  }
}
```

---

## SSO Integration Details

### Better Auth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/openid-configuration` | OIDC Discovery |
| `/api/auth/jwks` | Public keys (JWKS) |
| `/api/auth/oauth2/authorize` | Start OAuth2 flow |
| `/api/auth/oauth2/token` | Get tokens |
| `/api/auth/oauth2/userinfo` | Get user info |
| `/api/auth/sign-in/email` | Direct login (session token) |

### JWKS Response Example

```json
{
  "keys": [
    {
      "alg": "RS256",
      "kty": "RSA",
      "n": "h7yUvn3jPPVv4hjX...",
      "e": "AQAB",
      "kid": "IVPOpxYOjJoJ8hWoKrysfjIy5Pzs06fu"
    }
  ]
}
```

### OIDC Discovery

```bash
curl http://localhost:3001/.well-known/openid-configuration
```

```json
{
  "issuer": "http://localhost:3001",
  "authorization_endpoint": "http://localhost:3001/api/auth/oauth2/authorize",
  "token_endpoint": "http://localhost:3001/api/auth/oauth2/token",
  "userinfo_endpoint": "http://localhost:3001/api/auth/oauth2/userinfo",
  "jwks_uri": "http://localhost:3001/api/auth/jwks",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code"],
  "id_token_signing_alg_values_supported": ["RS256", "EdDSA", "none"]
}
```

---

## OAuth2 Client Registration

To get JWT tokens from the SSO, register the API as an OAuth2 client:

### Step 1: Register Client in SSO

Access the SSO admin panel and create a new OAuth2 client:

| Field | Value |
|-------|-------|
| Client ID | `taskflow-api` |
| Client Secret | (generated) |
| Redirect URIs | `http://localhost:8000/auth/callback` |
| Allowed Scopes | `openid profile email` |
| Grant Types | `authorization_code`, `refresh_token` |

### Step 2: Implement OAuth2 Flow

```python
# Example: Exchange authorization code for tokens

import httpx

async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:3001/api/auth/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": "http://localhost:8000/auth/callback",
                "client_id": "taskflow-api",
                "client_secret": "your-client-secret",
            },
        )
        return response.json()
        # Returns: {"access_token": "...", "id_token": "...", "token_type": "Bearer"}
```

### Step 3: Use Tokens

```bash
# Use the access_token or id_token as Bearer token
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8000/api/projects
```

---

## Implementation Details

### auth.py Overview

```python
# Simplified auth flow

async def get_current_user(credentials) -> CurrentUser:
    token = credentials.credentials

    # Mode 1: Dev bypass
    if settings.dev_mode:
        return CurrentUser({
            "sub": settings.dev_user_id,
            "email": settings.dev_user_email,
            "name": settings.dev_user_name,
            "role": "admin",
        })

    # Mode 2: Try JWT verification
    try:
        jwks = await get_jwks()  # Cached for 1 hour
        payload = jwt.decode(token, jwks_key, algorithms=["RS256"])
        return CurrentUser(payload)
    except JWTError:
        pass

    # Mode 3: Fallback to userinfo
    response = await httpx.get(
        f"{SSO_URL}/api/auth/oauth2/userinfo",
        headers={"Authorization": f"Bearer {token}"}
    )
    return CurrentUser(response.json())
```

### CurrentUser Class

```python
class CurrentUser:
    id: str      # From "sub" claim
    email: str   # From "email" claim
    name: str    # From "name" claim
    role: str    # From "role" claim (default: "user")
```

### JWKS Caching

- Keys are cached for **1 hour** (3600 seconds)
- If SSO is unavailable, cached keys are used
- Cache is refreshed on next request after TTL expires

---

## Troubleshooting

### "Invalid token" Error

1. **Check token format**: Must be `Authorization: Bearer <token>`
2. **Check token validity**: Token may be expired
3. **Check SSO connectivity**: API must reach SSO's JWKS endpoint

```bash
# Test JWKS endpoint
curl http://localhost:3001/api/auth/jwks
```

### "Authentication service unavailable" Error

- SSO server is not running or not reachable
- Check `SSO_URL` in environment variables
- Verify network connectivity

```bash
# Test SSO health
curl http://localhost:3001/api/auth/ok
# Should return: {"ok": true}
```

### "Token signing key not found" Error

- JWT was signed with a key not in JWKS
- Key may have been rotated
- Clear JWKS cache by restarting API

### Dev Mode Not Working

1. Ensure `DEV_MODE=true` (not `"true"` or `True`)
2. Restart the API server after changing `.env`
3. Check logs for settings loading

```bash
# Verify settings
uv run python -c "from taskflow_api.config import settings; print(settings.dev_mode)"
```

---

## Security Best Practices

### Production Checklist

- [ ] `DEV_MODE=false`
- [ ] HTTPS enabled (SSL/TLS)
- [ ] SSO_URL uses HTTPS
- [ ] Short token expiration times
- [ ] Refresh token rotation enabled
- [ ] CORS restricted to known origins
- [ ] Rate limiting configured

### Token Handling

- Never log full tokens
- Store tokens securely (httpOnly cookies for web)
- Use short-lived access tokens (15 min - 1 hour)
- Implement token refresh for long sessions

### JWKS Security

- JWKS endpoint should be HTTPS in production
- Keys are rotated every 90 days (configured in SSO)
- 30-day grace period for old keys
