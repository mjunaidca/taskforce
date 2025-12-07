"""JWT/JWKS authentication against Better Auth SSO.

Flow:
1. Frontend gets JWT via OAuth2 PKCE from SSO
2. Frontend sends: Authorization: Bearer <JWT>
3. Backend fetches JWKS public keys from SSO (cached 1 hour)
4. Backend verifies JWT signature locally (no SSO call per request)
"""

import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import settings

security = HTTPBearer()

# JWKS cache - fetched once, reused for 1 hour
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS public keys from SSO.

    Called once per hour, not per request.
    Keys are used to verify JWT signatures locally.
    """
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    jwks_url = f"{settings.sso_url}/api/auth/jwks"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = now
            return _jwks_cache
    except httpx.HTTPError as e:
        # If we have cached keys, use them even if expired
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {e}",
        ) from e


async def verify_jwt(token: str) -> dict[str, Any]:
    """Verify JWT signature using JWKS public keys.

    This is done locally - no SSO call per request.
    """
    try:
        jwks = await get_jwks()

        # Get key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find matching public key
        rsa_key: dict[str, Any] | None = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found in JWKS",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify signature and decode payload
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Audience varies by client
        )
        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


class CurrentUser:
    """Authenticated user extracted from JWT claims.

    JWT from SSO contains:
    - sub: User ID
    - email: User email
    - name: Display name
    - role: "user" | "admin"
    - tenant_id: Primary organization (optional)
    """

    def __init__(self, payload: dict[str, Any]) -> None:
        self.id: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.name: str = payload.get("name", "")
        self.role: str = payload.get("role", "user")
        self.tenant_id: str | None = payload.get("tenant_id")

    def __repr__(self) -> str:
        return f"CurrentUser(id={self.id!r}, email={self.email!r})"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """FastAPI dependency to get authenticated user from JWT.

    Usage in routes:
        @router.get("/api/projects")
        async def list_projects(user: CurrentUser = Depends(get_current_user)):
            ...
    """
    # Dev mode bypass for local development
    if settings.dev_mode:
        return CurrentUser({
            "sub": settings.dev_user_id,
            "email": settings.dev_user_email,
            "name": settings.dev_user_name,
            "role": "admin",
        })

    # Production: Verify JWT using JWKS
    payload = await verify_jwt(credentials.credentials)
    return CurrentUser(payload)
