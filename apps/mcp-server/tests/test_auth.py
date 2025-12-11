"""Tests for MCP server authentication module.

Tests JWT validation, API key validation, and middleware behavior.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from taskflow_mcp.auth import (
    AuthenticatedUser,
    authenticate,
    create_dev_user,
    get_current_user,
    set_current_user,
    validate_api_key,
)


class TestAuthenticatedUser:
    """Test AuthenticatedUser dataclass."""

    def test_is_authenticated_with_id(self):
        """User with ID is authenticated."""
        user = AuthenticatedUser(
            id="user-123",
            email="test@example.com",
            tenant_id="tenant-1",
            name="Test User",
            token="test-token",
            token_type="jwt",
        )
        assert user.is_authenticated is True

    def test_is_not_authenticated_without_id(self):
        """User without ID is not authenticated."""
        user = AuthenticatedUser(
            id="",
            email="",
            tenant_id=None,
            name=None,
            token="",
            token_type="jwt",
        )
        assert user.is_authenticated is False


class TestDevUser:
    """Test dev mode user creation."""

    def test_create_dev_user(self):
        """Dev user is created with expected values."""
        user = create_dev_user("dev-user-123")

        assert user.id == "dev-user-123"
        assert user.email == "dev-user-123@dev.local"
        assert user.tenant_id is None
        assert user.name == "Dev User"
        assert user.token == "dev-mode-token"
        assert user.token_type == "dev"


class TestUserContext:
    """Test user context management."""

    def test_set_and_get_current_user(self):
        """Can set and get current user."""
        user = AuthenticatedUser(
            id="user-456",
            email="user@example.com",
            tenant_id="tenant-1",
            name="User",
            token="token",
            token_type="jwt",
        )

        set_current_user(user)
        retrieved = get_current_user()

        assert retrieved.id == user.id
        assert retrieved.email == user.email

        # Clean up
        set_current_user(None)

    def test_get_current_user_raises_without_user(self):
        """RuntimeError raised when no user is set."""
        set_current_user(None)

        with pytest.raises(RuntimeError) as exc_info:
            get_current_user()

        assert "No authenticated user" in str(exc_info.value)


class TestAuthenticate:
    """Test authenticate function."""

    def test_missing_authorization_header(self):
        """ValueError raised for missing header."""
        with pytest.raises(ValueError) as exc_info:
            import asyncio
            asyncio.get_event_loop().run_until_complete(authenticate(None))

        assert "Missing Authorization header" in str(exc_info.value)

    def test_invalid_authorization_format(self):
        """ValueError raised for non-Bearer format."""
        with pytest.raises(ValueError) as exc_info:
            import asyncio
            asyncio.get_event_loop().run_until_complete(authenticate("Basic abc123"))

        assert "Invalid Authorization header format" in str(exc_info.value)

    def test_empty_token(self):
        """ValueError raised for empty token."""
        with pytest.raises(ValueError) as exc_info:
            import asyncio
            asyncio.get_event_loop().run_until_complete(authenticate("Bearer "))

        assert "Empty token" in str(exc_info.value)


class TestApiKeyValidation:
    """Test API key validation."""

    @pytest.mark.asyncio
    async def test_validate_api_key_success(self):
        """API key validation succeeds with valid key.

        SSO returns response format:
        {
            "valid": true,
            "key": {
                "id": "key-id",
                "userId": "user-id",
                "name": "My Script"
            }
        }
        """
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "valid": True,
            "key": {
                "id": "key-abc123",
                "userId": "user-789",
                "name": "My Automation Script",
            },
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.post.return_value = mock_response
            mock_client.return_value = mock_instance

            user = await validate_api_key("tf_test_key_123")

            assert user.id == "user-789"
            assert user.email == ""  # Not available from API key verification
            assert user.token_type == "api_key"
            assert user.client_id == "key-abc123"
            assert user.client_name == "My Automation Script"

    @pytest.mark.asyncio
    async def test_validate_api_key_invalid(self):
        """ValueError raised for invalid API key."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"valid": False}

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.post.return_value = mock_response
            mock_client.return_value = mock_instance

            with pytest.raises(ValueError) as exc_info:
                await validate_api_key("tf_invalid_key")

            assert "not valid or expired" in str(exc_info.value)


class TestAuthenticateRouting:
    """Test token type routing in authenticate."""

    @pytest.mark.asyncio
    async def test_api_key_routing(self):
        """API keys (tf_*) route to API key validation."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "valid": True,
            "key": {
                "id": "key-xyz",
                "userId": "api-user",
                "name": "Test Key",
            },
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_instance.post.return_value = mock_response
            mock_client.return_value = mock_instance

            user = await authenticate("Bearer tf_my_api_key_456")

            assert user.token_type == "api_key"
            assert user.id == "api-user"

    @pytest.mark.asyncio
    async def test_jwt_routing(self):
        """Non-tf_ tokens route to JWT validation and fail with invalid token."""
        # This should fail because there's no valid JWKS
        # We patch get_jwks to return a mock JWKS
        mock_jwks = {"keys": []}  # Empty JWKS - no matching key

        with patch("taskflow_mcp.auth.get_jwks", return_value=mock_jwks):
            with pytest.raises(ValueError) as exc_info:
                await authenticate("Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5In0.invalid.signature")

            # The error should mention token validation failed
            assert "Token validation failed" in str(exc_info.value)

