"""JWT authentication middleware for MCP server.

Validates tokens from Authorization header using SSO's JWKS endpoint.
Supports both JWT (from OAuth flows) and API keys (tf_* prefix).

Usage:
    user = get_current_user()  # In MCP tools

Authentication modes:
1. JWT: Validated via SSO's JWKS endpoint (/api/auth/jwks)
2. API Key: Validated via SSO's /api/api-key/verify endpoint
3. Dev Mode: X-User-ID header bypass when TASKFLOW_DEV_MODE=true
"""

import json
import logging
import time
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm

from .config import get_config

logger = logging.getLogger(__name__)

config = get_config()

# Context variable for current authenticated user (async-safe)
_current_user_var: ContextVar["AuthenticatedUser | None"] = ContextVar(
    "current_user", default=None
)

# JWKS cache - fetched async, reused for 1 hour
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


@dataclass
class AuthenticatedUser:
    """User context extracted from validated token."""

    id: str
    email: str
    tenant_id: str | None
    name: str | None
    token: str  # Original token for API calls
    token_type: str  # "jwt", "api_key", "opaque", or "dev"
    # Client identity for audit trail (e.g., "@user via Claude Code")
    client_id: str | None = None  # OAuth client ID or API key ID
    client_name: str | None = None  # "Claude Code", "My Automation Script", etc.

    @property
    def is_authenticated(self) -> bool:
        return bool(self.id)


async def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS public keys from SSO.

    Called once per hour, not per request.
    Uses async HTTP to avoid blocking the event loop.
    """
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        logger.debug("[AUTH] Using cached JWKS (age: %.0fs)", now - _jwks_cache_time)
        return _jwks_cache

    # Better Auth exposes JWKS at /api/auth/jwks (not /.well-known/jwks.json)
    jwks_url = f"{config.sso_url}/api/auth/jwks"
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
        raise ValueError(f"Failed to fetch JWKS: {e}")


def _find_signing_key(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
    """Find the signing key in JWKS by key ID."""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def validate_jwt(token: str) -> AuthenticatedUser:
    """Validate JWT and extract user context.

    Args:
        token: JWT access token from Authorization header

    Returns:
        AuthenticatedUser with claims from token

    Raises:
        jwt.InvalidTokenError: If token is invalid or expired
    """
    try:
        # Get JWKS (cached, async fetch if needed)
        jwks = await get_jwks()

        # Get key ID from token header (without verifying yet)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg", "RS256")

        logger.debug("[AUTH] JWT header - kid: %s, alg: %s", kid, alg)

        # Find matching public key
        jwk_dict = _find_signing_key(jwks, kid)
        if not jwk_dict:
            available_kids = [k.get("kid") for k in jwks.get("keys", [])]
            logger.error("[AUTH] Key not found - token kid: %s, available: %s", kid, available_kids)
            raise jwt.InvalidTokenError(f"Signing key not found: {kid}")

        # Convert JWK dict to RSA public key using PyJWT's RSAAlgorithm
        # This is the proper way to use JWK with jwt.decode()
        rsa_key = RSAAlgorithm.from_jwk(json.dumps(jwk_dict))

        # Decode and validate token using PyJWT
        # Note: SSO uses RS256 (asymmetric)
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={
                "verify_exp": True,
                "verify_aud": False,  # MCP server accepts any valid SSO token
            },
        )

        logger.info(
            "[AUTH] JWT verified - sub: %s, email: %s, client: %s",
            payload.get("sub"),
            payload.get("email"),
            payload.get("client_name"),
        )

        return AuthenticatedUser(
            id=payload.get("sub", ""),
            email=payload.get("email", ""),
            tenant_id=payload.get("tenant_id"),
            name=payload.get("name"),
            token=token,
            token_type="jwt",
            client_id=payload.get("client_id"),
            client_name=payload.get("client_name"),
        )
    except jwt.ExpiredSignatureError:
        logger.warning("[AUTH] JWT expired")
        raise
    except jwt.InvalidTokenError as e:
        logger.warning("[AUTH] JWT validation failed: %s", e)
        raise


async def validate_opaque_token(token: str) -> AuthenticatedUser:
    """Validate opaque access token via SSO's userinfo endpoint.

    When OAuth clients (like Gemini CLI) send opaque access_tokens instead of JWTs,
    we validate them by calling the SSO's userinfo endpoint.

    Args:
        token: Opaque access token from OAuth flow

    Returns:
        AuthenticatedUser from userinfo response

    Raises:
        ValueError: If token is invalid or expired
    """
    userinfo_url = f"{config.sso_url}/api/auth/oauth2/userinfo"
    token_preview = f"{token[:15]}...{token[-10:]}" if len(token) > 30 else "[short]"
    logger.info("[AUTH] Validating opaque token via userinfo endpoint: %s", token_preview)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {token}"},
            )

            logger.debug("[AUTH] Userinfo response: status=%d", response.status_code)

            if response.status_code == 401:
                # Try to get error details from response body
                try:
                    error_body = response.json()
                    error_detail = error_body.get("error_description", error_body.get("error", ""))
                    logger.warning("[AUTH] Userinfo 401: %s", error_detail)
                except Exception:
                    error_detail = response.text[:200] if response.text else ""
                    logger.warning("[AUTH] Userinfo 401 (raw): %s", error_detail)
                raise ValueError(f"Token invalid or expired: {error_detail}" if error_detail else "Token invalid or expired")

            if response.status_code != 200:
                # Log response body for debugging
                try:
                    error_body = response.text[:500]
                    logger.error("[AUTH] Userinfo non-200: status=%d, body=%s", response.status_code, error_body)
                except Exception:
                    pass
                raise ValueError(f"Userinfo request failed: {response.status_code}")

            data = response.json()
            logger.info(
                "[AUTH] Opaque token verified - sub: %s, email: %s, client: %s",
                data.get("sub"),
                data.get("email"),
                data.get("client_name"),
            )

            return AuthenticatedUser(
                id=data.get("sub", ""),
                email=data.get("email", ""),
                tenant_id=data.get("tenant_id"),
                name=data.get("name"),
                token=token,
                token_type="opaque",
                client_id=data.get("client_id"),
                client_name=data.get("client_name"),
            )
    except httpx.RequestError as e:
        logger.error("[AUTH] Userinfo HTTP request error: %s (%s)", type(e).__name__, e)
        raise ValueError(f"Failed to validate token: {type(e).__name__}: {e}")
    except Exception as e:
        # Catch any other unexpected errors
        logger.error("[AUTH] Userinfo unexpected error: %s (%s)", type(e).__name__, e)
        raise


async def validate_api_key(api_key: str) -> AuthenticatedUser:
    """Validate API key via SSO platform.

    Args:
        api_key: API key starting with 'tf_'

    Returns:
        AuthenticatedUser from API key verification

    Raises:
        ValueError: If API key is invalid or expired
    """
    verify_url = f"{config.sso_url}/api/api-key/verify"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                verify_url,
                json={"key": api_key},
            )

            if response.status_code != 200:
                raise ValueError(f"API key verification failed: {response.status_code}")

            data = response.json()

            if not data.get("valid"):
                raise ValueError("API key not valid or expired")

            key_info = data.get("key", {})

            # API key verification returns key info, need to fetch user details
            # The key.userId tells us who owns this key
            user_id = key_info.get("userId", "")
            key_name = key_info.get("name", "")
            key_id = key_info.get("id", "")

            logger.info(
                "[AUTH] API key verified - userId: %s, keyName: %s",
                user_id,
                key_name,
            )

            # Note: API key doesn't return full user info, just userId
            # Email will be empty - caller should handle this
            return AuthenticatedUser(
                id=user_id,
                email="",  # Not available from API key verification
                tenant_id=None,  # Not available from API key verification
                name=None,
                token=api_key,
                token_type="api_key",
                client_id=key_id,  # Use key ID as client identifier
                client_name=key_name,  # Use key name (e.g., "My Automation Script")
            )
    except httpx.RequestError as e:
        logger.error("[AUTH] API key verification request failed: %s", e)
        raise ValueError(f"Failed to verify API key: {e}")


async def authenticate(authorization_header: str | None) -> AuthenticatedUser:
    """Authenticate request from Authorization header.

    Supports:
    - Bearer <jwt> - OAuth tokens
    - Bearer <api_key> - API keys (starting with 'tf_')

    Args:
        authorization_header: Value of Authorization header

    Returns:
        AuthenticatedUser with user context

    Raises:
        ValueError: If authentication fails
    """
    if not authorization_header:
        raise ValueError("Missing Authorization header")

    if not authorization_header.startswith("Bearer "):
        raise ValueError("Invalid Authorization header format. Expected: Bearer <token>")

    token = authorization_header[7:]  # Remove "Bearer "

    if not token:
        raise ValueError("Empty token in Authorization header")

    # API keys start with 'tf_'
    if token.startswith("tf_"):
        return await validate_api_key(token)

    # Try JWT first (id_token from web dashboard, ChatKit)
    # If that fails, try opaque token validation (access_token from Gemini CLI, etc.)
    token_preview = f"{token[:15]}...{token[-10:]}" if len(token) > 30 else token[:20]
    token_parts = token.count(".")
    logger.info(
        "[AUTH] Attempting token validation: %s (segments: %d, looks_like: %s)",
        token_preview,
        token_parts + 1,
        "JWT" if token_parts == 2 else "opaque/access_token" if token_parts < 2 else "unknown",
    )

    try:
        return await validate_jwt(token)
    except (jwt.InvalidTokenError, ValueError) as jwt_error:
        logger.debug("[AUTH] JWT validation failed, trying opaque token: %s", jwt_error)
        try:
            return await validate_opaque_token(token)
        except ValueError as opaque_error:
            # Both failed - log both errors for debugging
            logger.warning(
                "[AUTH] Both JWT and opaque token validation failed. "
                "JWT: %s | Opaque: %s",
                jwt_error,
                opaque_error,
            )
            # Raise combined error for better debugging
            raise ValueError(
                f"Token validation failed. JWT: {jwt_error} | Opaque: {opaque_error}"
            )


def create_dev_user(user_id: str) -> AuthenticatedUser:
    """Create a dev mode user from X-User-ID header.

    Args:
        user_id: User ID from X-User-ID header

    Returns:
        AuthenticatedUser for dev mode
    """
    return AuthenticatedUser(
        id=user_id,
        email=f"{user_id}@dev.local",
        tenant_id=None,
        name="Dev User",
        token="dev-mode-token",
        token_type="dev",
    )


def set_current_user(user: AuthenticatedUser | None) -> None:
    """Set current authenticated user (called by middleware).

    Args:
        user: Authenticated user or None to clear
    """
    _current_user_var.set(user)


def get_current_user() -> AuthenticatedUser:
    """Get current authenticated user.

    Returns:
        AuthenticatedUser for current request

    Raises:
        RuntimeError: If no authenticated user (middleware not applied)
    """
    user = _current_user_var.get()
    if user is None:
        raise RuntimeError(
            "No authenticated user - ensure auth middleware is applied "
            "and request has valid Authorization header"
        )
    return user


def get_current_user_optional() -> AuthenticatedUser | None:
    """Get current authenticated user if available.

    Returns:
        AuthenticatedUser if authenticated, None otherwise
    """
    return _current_user_var.get()

