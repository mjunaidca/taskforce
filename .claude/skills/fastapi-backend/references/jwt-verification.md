# JWT/JWKS Verification with Better Auth

Detailed patterns for verifying JWTs from Better Auth in FastAPI backends.

## Overview

Better Auth with the OIDC Provider plugin exposes a JWKS endpoint for RS256-signed tokens. FastAPI backends verify these tokens without calling the auth server for each request.

## JWKS Endpoint

```
GET {AUTH_SERVER_URL}/api/auth/jwks
```

Response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "unique-key-id",
      "use": "sig",
      "alg": "RS256",
      "n": "base64url-encoded-modulus",
      "e": "AQAB"
    }
  ]
}
```

## Complete Verification Module

```python
# auth.py - Complete JWT verification for Better Auth
import os
import time
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

# Security scheme - adds "Authorize" button to Swagger UI
security = HTTPBearer(
    scheme_name="Bearer Token",
    description="JWT from Better Auth SSO"
)

# Configuration
AUTH_SERVER_URL = os.getenv("AUTH_SERVER_URL", "http://localhost:3001")
JWKS_URL = f"{AUTH_SERVER_URL}/api/auth/jwks"
JWKS_CACHE_TTL = 3600  # 1 hour

# JWKS cache
_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0


async def get_jwks() -> dict:
    """
    Fetch and cache JWKS from Better Auth server.

    Caches keys for JWKS_CACHE_TTL seconds to minimize network calls.
    Falls back to cached keys if fetch fails and cache exists.
    """
    global _jwks_cache, _jwks_cache_time

    now = time.time()

    # Return cached if valid
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
        # If we have a cache, use it even if expired
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
    """
    Verify JWT against Better Auth JWKS.

    Args:
        token: JWT string (without "Bearer " prefix)

    Returns:
        Decoded JWT payload

    Raises:
        HTTPException: If token is invalid or verification fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Get unverified header to extract key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise credentials_exception

        # Fetch JWKS and find matching key
        jwks = await get_jwks()
        rsa_key = find_key_by_kid(jwks, kid)

        if not rsa_key:
            # Key not found - might be rotated, try refreshing cache
            global _jwks_cache_time
            _jwks_cache_time = 0  # Force refresh
            jwks = await get_jwks()
            rsa_key = find_key_by_kid(jwks, kid)

            if not rsa_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Signing key not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Verify and decode token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,  # Better Auth may not set audience
                "verify_iss": False,  # Adjust based on your setup
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
    """
    FastAPI dependency to extract and verify current user.

    Usage:
        @app.get("/api/tasks")
        def list_tasks(current_user: dict = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials
    payload = await verify_token(token)

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "user"),
    }


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """
    Optional authentication - returns None if no token provided.

    Useful for endpoints that work differently for authenticated users.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(required_role: str):
    """
    Factory for role-based access control dependency.

    Usage:
        @app.delete("/api/admin/users/{user_id}")
        def delete_user(
            user_id: int,
            current_user: dict = Depends(require_role("admin"))
        ):
            ...
    """
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
```

## Token Structure

Better Auth OIDC tokens typically contain:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "iat": 1699999999,
  "exp": 1700003599,
  "iss": "https://auth.example.com"
}
```

## Testing Strategies

### 1. Mock Authentication in Tests

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
```

### 2. Generate Test Tokens

```python
# tests/utils.py
from jose import jwt
from datetime import datetime, timedelta

# Test RSA keys (DO NOT use in production)
TEST_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
... test key ...
-----END RSA PRIVATE KEY-----"""

TEST_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
... test key ...
-----END PUBLIC KEY-----"""

def create_test_token(
    user_id: str = "test-user",
    email: str = "test@example.com",
    role: str = "user",
    expires_delta: timedelta = timedelta(hours=1),
) -> str:
    """Create a test JWT for testing purposes."""
    expire = datetime.utcnow() + expires_delta

    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    return jwt.encode(
        payload,
        TEST_PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": "test-key-id"}
    )
```

### 3. Integration Test with Real Token

```python
# tests/test_auth_integration.py
import pytest
import httpx

@pytest.mark.integration
async def test_real_jwt_verification():
    """Test against actual Better Auth instance."""
    # Get real token from SSO
    async with httpx.AsyncClient() as client:
        # Login to get token
        login_response = await client.post(
            "http://localhost:3001/api/auth/sign-in/email",
            json={"email": "test@example.com", "password": "testpass"}
        )
        token = login_response.json().get("token")

        # Use token against FastAPI
        api_response = await client.get(
            "http://localhost:8000/api/tasks",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert api_response.status_code == 200
```

## Error Handling

| Error | HTTP Status | Cause |
|-------|-------------|-------|
| Missing token | 401 | No Authorization header |
| Invalid format | 401 | Malformed JWT |
| Expired token | 401 | Token past expiration |
| Invalid signature | 401 | Token tampered or wrong key |
| Key not found | 401 | Key ID not in JWKS |
| JWKS unavailable | 503 | Auth server unreachable |
| Insufficient role | 403 | User lacks required role |

## Security Checklist

- [ ] HTTPS in production (tokens in headers)
- [ ] Short access token expiry (1-6 hours)
- [ ] JWKS cached to reduce auth server load
- [ ] Cache invalidation on key not found
- [ ] Graceful degradation if JWKS unavailable
- [ ] Role-based access control for admin operations
- [ ] Token not logged (sensitive data)
- [ ] CORS configured to allow auth server origin
