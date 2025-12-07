# Better Auth SSO Integration for FastAPI

Patterns for integrating FastAPI backends with Better Auth SSO using JWT/JWKS verification.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│    FastAPI      │────▶│  Neon Postgres  │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────┐
         │ Better Auth SSO │
         │  (Auth Server)  │
         └─────────────────┘
```

## Token Flow

1. User logs in via Better Auth SSO (PKCE flow)
2. Next.js receives tokens (access_token, id_token, refresh_token)
3. Next.js stores tokens in httpOnly cookies
4. Next.js calls FastAPI with `Authorization: Bearer <id_token>`
5. FastAPI verifies JWT against SSO's JWKS endpoint
6. FastAPI extracts user info from verified token

## Better Auth OIDC Configuration

The SSO server exposes these endpoints:

```
GET /.well-known/openid-configuration  # Discovery document
GET /api/auth/jwks                     # JWKS public keys
GET /api/auth/oauth2/userinfo          # User info (token required)
POST /api/auth/oauth2/token            # Token exchange
GET /api/auth/oauth2/endsession        # Logout
```

## JWT Claims from Better Auth

ID tokens from Better Auth contain:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "email_verified": true,
  "role": "user",
  "iat": 1699999999,
  "exp": 1700003599,
  "iss": "https://auth.example.com",
  "aud": "your-client-id"
}
```

Custom claims can be added via `getAdditionalUserInfoClaim`:

```typescript
// In Better Auth SSO config
oidcProvider({
  async getAdditionalUserInfoClaim(user) {
    return {
      role: user.role,
      organization_id: user.organizationId,
      permissions: user.permissions,
    };
  },
})
```

## FastAPI Integration

### Environment Variables

```env
# SSO Configuration
AUTH_SERVER_URL=http://localhost:3001
JWKS_URL=http://localhost:3001/api/auth/jwks
SSO_CLIENT_ID=your-client-id

# Optional: For M2M API calls
SSO_API_KEY=your-m2m-api-key
```

### JWKS-Based Token Verification

```python
# auth.py
import os
import time
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

security = HTTPBearer(
    scheme_name="Bearer Token",
    description="JWT from Better Auth SSO"
)

AUTH_SERVER_URL = os.getenv("AUTH_SERVER_URL", "http://localhost:3001")
JWKS_URL = f"{AUTH_SERVER_URL}/api/auth/jwks"
SSO_CLIENT_ID = os.getenv("SSO_CLIENT_ID")
JWKS_CACHE_TTL = 3600  # 1 hour

_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0


async def get_jwks() -> dict:
    """Fetch and cache JWKS from Better Auth server."""
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(JWKS_URL)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = now
            return _jwks_cache
    except httpx.HTTPError as e:
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot fetch JWKS: {str(e)}"
        )


def find_key_by_kid(jwks: dict, kid: str) -> Optional[dict]:
    """Find RSA key in JWKS by key ID."""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def verify_token(token: str) -> dict:
    """Verify JWT against Better Auth JWKS."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise credentials_exception

        jwks = await get_jwks()
        rsa_key = find_key_by_kid(jwks, kid)

        if not rsa_key:
            # Key not found - might be rotated
            global _jwks_cache_time
            _jwks_cache_time = 0
            jwks = await get_jwks()
            rsa_key = find_key_by_kid(jwks, kid)

            if not rsa_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Signing key not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Verify and decode
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=SSO_CLIENT_ID,  # Verify audience if set
            options={
                "verify_aud": bool(SSO_CLIENT_ID),
                "verify_iss": False,  # Adjust based on setup
            }
        )

        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency to extract and verify current user."""
    token = credentials.credentials
    payload = await verify_token(token)

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "user"),
        "email_verified": payload.get("email_verified", False),
    }
```

### Role-Based Access Control

```python
def require_role(required_role: str):
    """Factory for role-based access control."""
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return current_user

    return role_checker


# Usage
@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role("admin"))
):
    ...
```

### M2M API Calls (Optional)

For server-to-server calls (webhooks, background jobs):

```python
async def get_user_from_sso(user_id: str) -> Optional[dict]:
    """Fetch user details from SSO via M2M API."""
    api_key = os.getenv("SSO_API_KEY")
    if not api_key:
        return None

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{AUTH_SERVER_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        if response.status_code == 200:
            return response.json()
        return None
```

## Next.js Frontend Integration

### Forwarding Token to FastAPI

```typescript
// Next.js API route or server action
import { cookies } from 'next/headers';

export async function createTask(data: TaskCreate) {
  const cookieStore = await cookies();
  const idToken = cookieStore.get('id_token')?.value;

  const response = await fetch(`${process.env.BACKEND_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }

  return response.json();
}
```

### Client-Side API Calls

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async getAuthHeaders(): Promise<Headers> {
    // Get token from session endpoint
    const sessionResponse = await fetch('/api/auth/session');
    const session = await sessionResponse.json();

    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Token is in httpOnly cookie, forwarded by Next.js
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  }
}

export const api = new ApiClient();
```

## Testing Patterns

### Mock Authentication

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_user():
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "role": "user",
        "email_verified": True,
    }

@pytest.fixture
def authenticated_client(client, mock_user):
    """Client with mocked authentication."""
    async def mock_get_current_user():
        return mock_user

    from main import app
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_client(client):
    """Client with admin role."""
    async def mock_admin_user():
        return {
            "id": "admin-id",
            "email": "admin@example.com",
            "name": "Admin User",
            "role": "admin",
            "email_verified": True,
        }

    from main import app
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = mock_admin_user
    yield client
    app.dependency_overrides.clear()
```

### Integration Test with Real Token

```python
import pytest
import httpx

@pytest.mark.integration
async def test_real_jwt_verification():
    """Test against actual Better Auth instance."""
    # This requires a running SSO server
    sso_url = "http://localhost:3001"

    # Get token via OAuth flow (simplified)
    async with httpx.AsyncClient() as client:
        # Use test credentials
        token_response = await client.post(
            f"{sso_url}/api/auth/oauth2/token",
            data={
                "grant_type": "password",  # If enabled
                "username": "test@example.com",
                "password": "testpass",
            }
        )
        tokens = token_response.json()

        # Use token against FastAPI
        api_response = await client.get(
            "http://localhost:8000/api/tasks",
            headers={"Authorization": f"Bearer {tokens['id_token']}"}
        )
        assert api_response.status_code == 200
```

## Security Checklist

- [ ] HTTPS in production
- [ ] JWKS cached (reduces SSO load)
- [ ] Cache invalidation on key not found
- [ ] Token expiry checked (exp claim)
- [ ] Audience verified (aud claim)
- [ ] Issuer verified (iss claim) if applicable
- [ ] Role-based access for admin operations
- [ ] Tokens not logged (sensitive data)
- [ ] CORS configured for SSO origin
- [ ] Error messages don't leak token details

## Common Issues

### 1. "Invalid signature" Error

**Cause**: JWKS cache stale after key rotation
**Fix**: Force cache refresh on key not found

### 2. "Token expired" Error

**Cause**: Client using stale token
**Fix**: Implement token refresh on 401

### 3. CORS Errors

**Cause**: FastAPI not allowing SSO origin
**Fix**: Add SSO URL to CORS origins

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("AUTH_SERVER_URL"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. "Audience mismatch" Error

**Cause**: Token issued for different client
**Fix**: Verify SSO_CLIENT_ID matches token's aud claim
