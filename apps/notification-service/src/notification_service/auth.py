"""JWT/JWKS authentication against Better Auth SSO.

Copied from TaskFlow API - same auth pattern for microservice consistency.
"""

import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

# JWKS cache - fetched once, reused for 1 hour
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS public keys from SSO."""
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    jwks_url = f"{settings.sso_url}/api/auth/jwks"
    logger.info("[AUTH] Fetching JWKS from %s", jwks_url)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = now
            return _jwks_cache
    except httpx.HTTPError as e:
        logger.error("[AUTH] JWKS fetch failed: %s", e)
        if _jwks_cache:
            logger.warning("[AUTH] Using expired JWKS cache as fallback")
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {e}",
        ) from e


async def verify_jwt(token: str) -> dict[str, Any]:
    """Verify JWT signature using JWKS public keys."""
    try:
        jwks = await get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        rsa_key: dict[str, Any] | None = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload

    except JWTError as e:
        logger.error("[AUTH] JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


class CurrentUser:
    """Authenticated user from JWT claims."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.id: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.name: str = payload.get("name", "")

    def __repr__(self) -> str:
        return f"CurrentUser(id={self.id!r}, email={self.email!r})"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """FastAPI dependency to get authenticated user from JWT."""
    # Dev mode bypass
    if settings.dev_mode:
        return CurrentUser({
            "sub": "dev-user-id",
            "email": "dev@taskflow.local",
            "name": "Dev User",
        })

    payload = await verify_jwt(credentials.credentials)
    return CurrentUser(payload)
