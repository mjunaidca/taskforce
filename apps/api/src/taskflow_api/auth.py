"""JWT/JWKS authentication against Better Auth SSO.

Supports two token types:
1. JWT (id_token) - Verified locally using JWKS public keys
2. Opaque (access_token) - Verified via SSO userinfo endpoint

Flow for JWT:
1. Frontend/MCP gets JWT via OAuth2 PKCE from SSO
2. Sends: Authorization: Bearer <JWT>
3. Backend fetches JWKS public keys from SSO (cached 1 hour)
4. Backend verifies JWT signature locally (no SSO call per request)

Flow for Opaque Token (e.g., Gemini CLI bug sends access_token):
1. MCP client gets access_token via OAuth2 from SSO
2. Sends: Authorization: Bearer <opaque_token>
3. Backend validates via SSO userinfo endpoint
"""

import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request, status
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
    """Fetch and cache JWKS public keys from SSO.

    Called once per hour, not per request.
    Keys are used to verify JWT signatures locally.
    """
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        logger.debug("[AUTH] Using cached JWKS (age: %.0fs)", now - _jwks_cache_time)
        return _jwks_cache

    jwks_url = f"{settings.sso_url}/api/auth/jwks"
    logger.info("[AUTH] Fetching JWKS from %s", jwks_url)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = now
            key_count = len(_jwks_cache.get("keys", []))
            logger.info("[AUTH] JWKS fetched successfully: %d keys", key_count)
            return _jwks_cache
    except httpx.HTTPError as e:
        logger.error("[AUTH] JWKS fetch failed: %s", e)
        # If we have cached keys, use them even if expired
        if _jwks_cache:
            logger.warning("[AUTH] Using expired JWKS cache as fallback")
            return _jwks_cache
        logger.error("[AUTH] No cached JWKS available, auth will fail")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {e}",
        ) from e


async def verify_jwt(token: str) -> dict[str, Any]:
    """Verify JWT signature using JWKS public keys.

    This is done locally - no SSO call per request.
    """
    # Log token preview (first/last 10 chars for debugging without exposing full token)
    token_preview = f"{token[:10]}...{token[-10:]}" if len(token) > 25 else "[short]"
    logger.debug("[AUTH] Verifying JWT: %s", token_preview)

    try:
        jwks = await get_jwks()

        # Get key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")
        logger.debug("[AUTH] JWT header - kid: %s, alg: %s", kid, alg)

        # Find matching public key
        rsa_key: dict[str, Any] | None = None
        available_kids = []
        for key in jwks.get("keys", []):
            available_kids.append(key.get("kid"))
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            logger.error(
                "[AUTH] Key not found - token kid: %s, available kids: %s",
                kid,
                available_kids,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found in JWKS",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.debug("[AUTH] Found matching key, verifying signature...")

        # Verify signature and decode payload
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Audience varies by client
        )

        # Log successful verification (safe claims only)
        logger.info(
            "[AUTH] JWT verified - sub: %s, email: %s",
            payload.get("sub"),
            payload.get("email"),
        )
        return payload

    except JWTError as e:
        logger.error("[AUTH] JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def verify_opaque_token(token: str) -> dict[str, Any]:
    """Verify opaque access token via SSO userinfo endpoint.

    When OAuth clients (like Gemini CLI) send opaque access_tokens instead of JWTs,
    we validate them by calling the SSO's userinfo endpoint.

    Args:
        token: Opaque access token from OAuth flow

    Returns:
        User claims from userinfo response

    Raises:
        HTTPException: If token is invalid or expired
    """
    userinfo_url = f"{settings.sso_url}/api/auth/oauth2/userinfo"
    token_preview = f"{token[:10]}...{token[-10:]}" if len(token) > 25 else "[short]"
    logger.info("[AUTH] Validating opaque token via userinfo: %s", token_preview)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 401:
                logger.warning("[AUTH] Userinfo returned 401 - token invalid or expired")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token invalid or expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if response.status_code != 200:
                logger.error("[AUTH] Userinfo returned %d", response.status_code)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Userinfo request failed: {response.status_code}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            data = response.json()
            logger.info(
                "[AUTH] Opaque token verified - sub: %s, email: %s, client: %s",
                data.get("sub"),
                data.get("email"),
                data.get("client_name"),
            )
            return data

    except httpx.RequestError as e:
        logger.error("[AUTH] Userinfo request failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {e}",
        ) from e


class CurrentUser:
    """Authenticated user extracted from JWT claims.

    JWT from SSO contains:
    - sub: User ID
    - email: User email
    - name: Display name
    - role: "user" | "admin"
    - tenant_id: Primary organization (optional)
    - organization_id: Alternative tenant claim (optional)
    - client_id: OAuth client ID (for audit: which tool was used)
    - client_name: OAuth client name (e.g., "Claude Code")
    """

    def __init__(self, payload: dict[str, Any]) -> None:
        self.id: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.name: str = payload.get("name", "")
        self.role: str = payload.get("role", "user")
        # Extract tenant from multiple possible JWT claims
        # organization_ids is an array, take the first one as active tenant
        org_ids = payload.get("organization_ids") or []
        self.tenant_id: str | None = (
            payload.get("tenant_id")
            or payload.get("organization_id")
            or (org_ids[0] if org_ids else None)
        )
        self.organization_ids: list[str] = org_ids if isinstance(org_ids, list) else []
        # OAuth client identity for audit trail (e.g., "@user via Claude Code")
        self.client_id: str | None = payload.get("client_id")
        self.client_name: str | None = payload.get("client_name")

    def __repr__(self) -> str:
        client_info = f", client={self.client_name!r}" if self.client_name else ""
        return f"CurrentUser(id={self.id!r}, email={self.email!r}{client_info})"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """FastAPI dependency to get authenticated user from token.

    Supports both JWT (id_token) and opaque (access_token) tokens.
    Tries JWT first, falls back to opaque token validation via userinfo.

    Usage in routes:
        @router.get("/api/projects")
        async def list_projects(user: CurrentUser = Depends(get_current_user)):
            ...
    """
    # Dev mode bypass for local development
    if settings.dev_mode:
        logger.debug("[AUTH] Dev mode enabled, bypassing token verification")
        return CurrentUser(
            {
                "sub": settings.dev_user_id,
                "email": settings.dev_user_email,
                "name": settings.dev_user_name,
                "role": "admin",
            }
        )

    token = credentials.credentials
    token_parts = token.count(".")

    # Detect token type: JWT has 3 dot-separated segments
    logger.debug(
        "[AUTH] Token validation - segments: %d, type: %s",
        token_parts + 1,
        "JWT" if token_parts == 2 else "opaque",
    )

    # Try JWT first if it looks like a JWT
    if token_parts == 2:
        try:
            payload = await verify_jwt(token)
            user = CurrentUser(payload)
            logger.info("[AUTH] Authenticated via JWT: %s, tenant_id=%s, org_ids=%s",
                       user, user.tenant_id, user.organization_ids)
            return user
        except HTTPException:
            # JWT validation failed, try opaque as fallback
            logger.debug("[AUTH] JWT validation failed, trying opaque token...")

    # Opaque token validation via userinfo endpoint
    payload = await verify_opaque_token(token)
    user = CurrentUser(payload)
    logger.info("[AUTH] Authenticated via opaque token: %s", user)
    return user


def get_tenant_id(user: CurrentUser, request: Request | None = None) -> str:
    """Extract tenant context from JWT or request headers.

    Priority:
    1. JWT claim: tenant_id or organization_id
    2. X-Tenant-ID header (dev mode only)
    3. Default: "taskflow"

    Args:
        user: Authenticated user from JWT
        request: FastAPI request (for header access in dev mode)

    Returns:
        Tenant identifier string (never empty)
    """
    # Priority 1: JWT claim
    if user.tenant_id:
        tenant = user.tenant_id.strip()
        if tenant:
            logger.debug("[TENANT] Using JWT tenant_id: %s", tenant)
            return tenant

    # Priority 2: Dev mode header override
    if request and settings.dev_mode:
        header_tenant = request.headers.get("X-Tenant-ID", "").strip()
        if header_tenant:
            logger.debug("[TENANT] Using dev mode header: %s", header_tenant)
            return header_tenant

    # Priority 3: Default tenant
    logger.debug("[TENANT] Using default tenant: taskflow-default-org-id")
    return "taskflow-default-org-id"
