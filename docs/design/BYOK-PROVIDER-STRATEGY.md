# BYOK Multi-Provider Strategy

**Status**: Draft
**Created**: 2025-12-15
**Depends On**: [AGENT-CLOUD-EXECUTION.md](./AGENT-CLOUD-EXECUTION.md)

---

## Overview

BYOK (Bring Your Own Key) enables users to connect their own AI provider accounts to TaskFlow. This shifts API costs from the platform to users while providing flexibility in provider choice, failover capabilities, and cost control.

**Key Benefits**:
- Zero API cost pressure on platform margins
- User controls their own costs and usage
- Multi-provider flexibility and redundancy
- Enterprise customers can use existing accounts

---

## 1. Supported Providers

### 1.1 Provider Matrix

| Provider | Auth Type | Context Window | Strengths | Status |
|----------|-----------|----------------|-----------|--------|
| **Claude** (Anthropic) | API Key | 200K tokens | Best coding, tool use | Priority 1 |
| **Gemini** (Google) | OAuth + API Key | 1M tokens | Largest context, fast | Priority 1 |
| **GPT-4** (OpenAI) | API Key | 128K tokens | Most widely used | Priority 2 |
| **Qwen** (Alibaba) | API Key | 32K tokens | Chinese language, cost | Priority 2 |
| **Mistral** | API Key | 32K tokens | European, fast | Priority 3 |
| **DeepSeek** | API Key | 64K tokens | Coding focus, cheap | Priority 3 |

### 1.2 Provider Capabilities

```python
PROVIDER_CAPABILITIES = {
    "claude": {
        "models": {
            "claude-sonnet-4-20250514": {
                "context": 200_000,
                "output": 64_000,
                "input_price": 3.00,    # per 1M tokens
                "output_price": 15.00,
                "supports_tools": True,
                "supports_vision": True,
                "supports_computer_use": True,
            },
            "claude-3-5-haiku-20241022": {
                "context": 200_000,
                "output": 8_192,
                "input_price": 0.80,
                "output_price": 4.00,
                "supports_tools": True,
                "supports_vision": True,
            },
        },
        "features": ["tool_use", "vision", "computer_use", "streaming"],
        "rate_limits": {
            "requests_per_minute": 50,
            "tokens_per_minute": 40_000,
        }
    },
    "gemini": {
        "models": {
            "gemini-1.5-pro": {
                "context": 1_000_000,
                "output": 8_192,
                "input_price": 1.25,
                "output_price": 5.00,
                "supports_tools": True,
                "supports_vision": True,
            },
            "gemini-1.5-flash": {
                "context": 1_000_000,
                "output": 8_192,
                "input_price": 0.075,
                "output_price": 0.30,
                "supports_tools": True,
                "supports_vision": True,
            },
        },
        "features": ["function_calling", "vision", "grounding", "streaming"],
        "rate_limits": {
            "requests_per_minute": 60,
            "tokens_per_minute": 1_000_000,
        }
    },
    "openai": {
        "models": {
            "gpt-4-turbo": {
                "context": 128_000,
                "output": 4_096,
                "input_price": 10.00,
                "output_price": 30.00,
                "supports_tools": True,
                "supports_vision": True,
            },
            "gpt-4o": {
                "context": 128_000,
                "output": 16_384,
                "input_price": 2.50,
                "output_price": 10.00,
                "supports_tools": True,
                "supports_vision": True,
            },
        },
        "features": ["function_calling", "vision", "code_interpreter", "streaming"],
        "rate_limits": {
            "requests_per_minute": 500,
            "tokens_per_minute": 30_000,
        }
    },
    "qwen": {
        "models": {
            "qwen-max": {
                "context": 32_000,
                "output": 8_192,
                "input_price": 0.40,
                "output_price": 1.20,
                "supports_tools": True,
                "supports_vision": False,
            },
        },
        "features": ["function_calling", "streaming"],
        "rate_limits": {
            "requests_per_minute": 60,
            "tokens_per_minute": 100_000,
        }
    },
}
```

---

## 2. Authentication Flows

### 2.1 API Key Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Key Connection Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User                    TaskFlow                   Provider     │
│    │                        │                          │         │
│    │  Click "Connect"       │                          │         │
│    │───────────────────────▶│                          │         │
│    │                        │                          │         │
│    │  Show API key form     │                          │         │
│    │◀───────────────────────│                          │         │
│    │  + link to provider    │                          │         │
│    │    docs/console        │                          │         │
│    │                        │                          │         │
│    │  [User gets API key from provider console]        │         │
│    │                        │                          │         │
│    │  Submit API key        │                          │         │
│    │───────────────────────▶│                          │         │
│    │                        │                          │         │
│    │                        │  Validate key            │         │
│    │                        │─────────────────────────▶│         │
│    │                        │                          │         │
│    │                        │  200 OK / 401 Invalid    │         │
│    │                        │◀─────────────────────────│         │
│    │                        │                          │         │
│    │                        │  Encrypt & store         │         │
│    │                        │  in Vault                │         │
│    │                        │                          │         │
│    │  Success / Error       │                          │         │
│    │◀───────────────────────│                          │         │
│    │                        │                          │         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 OAuth Flow (Gemini/Google)

```
┌─────────────────────────────────────────────────────────────────┐
│                        OAuth Connection Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User            TaskFlow              Google                    │
│    │                │                     │                      │
│    │  Click         │                     │                      │
│    │  "Connect"     │                     │                      │
│    │───────────────▶│                     │                      │
│    │                │                     │                      │
│    │  Redirect to   │                     │                      │
│    │  Google OAuth  │                     │                      │
│    │◀───────────────│                     │                      │
│    │                │                     │                      │
│    │  Login + Grant │                     │                      │
│    │  permissions   │                     │                      │
│    │────────────────────────────────────▶│                      │
│    │                │                     │                      │
│    │                │  Redirect with code │                      │
│    │◀────────────────────────────────────│                      │
│    │                │                     │                      │
│    │  Follow        │                     │                      │
│    │  redirect      │                     │                      │
│    │───────────────▶│                     │                      │
│    │                │                     │                      │
│    │                │  Exchange code      │                      │
│    │                │  for tokens         │                      │
│    │                │────────────────────▶│                      │
│    │                │                     │                      │
│    │                │  access_token +     │                      │
│    │                │  refresh_token      │                      │
│    │                │◀────────────────────│                      │
│    │                │                     │                      │
│    │                │  Encrypt & store    │                      │
│    │                │                     │                      │
│    │  Success       │                     │                      │
│    │◀───────────────│                     │                      │
│    │                │                     │                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Implementation

```python
# src/api/providers/routes.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/providers", tags=["providers"])

# Provider configurations
PROVIDERS = {
    "claude": {
        "name": "Claude (Anthropic)",
        "auth_type": "api_key",
        "key_format": r"^sk-ant-[a-zA-Z0-9-]+$",
        "docs_url": "https://console.anthropic.com/settings/keys",
        "test_endpoint": "https://api.anthropic.com/v1/messages",
        "test_model": "claude-3-haiku-20240307",
    },
    "gemini": {
        "name": "Gemini (Google)",
        "auth_type": "oauth",
        "oauth_config": {
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "scopes": [
                "https://www.googleapis.com/auth/generative-language",
                "https://www.googleapis.com/auth/cloud-platform",
            ],
        },
        "api_key_fallback": True,  # Also supports API key
        "docs_url": "https://aistudio.google.com/app/apikey",
    },
    "openai": {
        "name": "GPT-4 (OpenAI)",
        "auth_type": "api_key",
        "key_format": r"^sk-[a-zA-Z0-9]+$",
        "docs_url": "https://platform.openai.com/api-keys",
        "test_endpoint": "https://api.openai.com/v1/models",
    },
    "qwen": {
        "name": "Qwen (Alibaba)",
        "auth_type": "api_key",
        "key_format": r"^sk-[a-zA-Z0-9]+$",
        "docs_url": "https://dashscope.console.aliyun.com/apiKey",
        "test_endpoint": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    },
}


@router.get("")
async def list_providers(user: User = Depends(get_current_user)):
    """List all providers with connection status"""
    connections = await vault.get_user_connections(user.id)

    return [
        {
            "id": provider_id,
            "name": config["name"],
            "auth_type": config["auth_type"],
            "connected": provider_id in connections,
            "connected_at": connections.get(provider_id, {}).get("connected_at"),
            "usage_this_month": await get_usage(user.id, provider_id),
            "docs_url": config["docs_url"],
        }
        for provider_id, config in PROVIDERS.items()
    ]


@router.get("/{provider}/connect")
async def initiate_connection(
    provider: str,
    user: User = Depends(get_current_user)
):
    """Initiate provider connection"""
    if provider not in PROVIDERS:
        raise HTTPException(404, f"Unknown provider: {provider}")

    config = PROVIDERS[provider]

    if config["auth_type"] == "api_key":
        return {
            "auth_type": "api_key",
            "provider": provider,
            "name": config["name"],
            "docs_url": config["docs_url"],
            "key_format_hint": "API key from provider console",
        }

    # OAuth flow
    state = create_secure_state(user.id, provider)
    oauth_config = config["oauth_config"]

    params = {
        "client_id": settings.oauth_clients[provider]["client_id"],
        "redirect_uri": f"{settings.api_url}/providers/{provider}/callback",
        "scope": " ".join(oauth_config["scopes"]),
        "state": state,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"{oauth_config['auth_url']}?{urlencode(params)}"
    return {"auth_type": "oauth", "auth_url": auth_url}


@router.post("/{provider}/api-key")
async def save_api_key(
    provider: str,
    body: ApiKeyRequest,
    user: User = Depends(get_current_user)
):
    """Save API key for provider"""
    if provider not in PROVIDERS:
        raise HTTPException(404, f"Unknown provider: {provider}")

    config = PROVIDERS[provider]

    # Validate format
    if config.get("key_format"):
        if not re.match(config["key_format"], body.api_key):
            raise HTTPException(400, "Invalid API key format")

    # Test the key
    is_valid, error = await test_api_key(provider, body.api_key)
    if not is_valid:
        raise HTTPException(400, f"API key validation failed: {error}")

    # Store encrypted
    await vault.store_credentials(
        user_id=user.id,
        provider=provider,
        credentials=ProviderCredentials(
            provider=provider,
            auth_type="api_key",
            api_key=body.api_key,
            connected_at=datetime.utcnow(),
        )
    )

    # Create audit entry
    await audit.log(
        actor_id=user.id,
        action="provider.connected",
        resource=f"provider/{provider}",
        details={"auth_type": "api_key"}
    )

    return {"status": "connected", "provider": provider}


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str,
    state: str,
):
    """Handle OAuth callback"""
    # Verify state
    user_id = verify_secure_state(state, provider)
    if not user_id:
        raise HTTPException(400, "Invalid or expired state")

    config = PROVIDERS[provider]
    oauth_config = config["oauth_config"]

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            oauth_config["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": f"{settings.api_url}/providers/{provider}/callback",
                "client_id": settings.oauth_clients[provider]["client_id"],
                "client_secret": settings.oauth_clients[provider]["client_secret"],
            }
        )

        if response.status_code != 200:
            raise HTTPException(400, f"Token exchange failed: {response.text}")

        tokens = response.json()

    # Calculate expiry
    expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

    # Store credentials
    await vault.store_credentials(
        user_id=user_id,
        provider=provider,
        credentials=ProviderCredentials(
            provider=provider,
            auth_type="oauth",
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            token_expiry=expires_at,
            connected_at=datetime.utcnow(),
        )
    )

    # Redirect to frontend
    return RedirectResponse(
        f"{settings.frontend_url}/settings/providers?connected={provider}"
    )


@router.delete("/{provider}")
async def disconnect_provider(
    provider: str,
    user: User = Depends(get_current_user)
):
    """Disconnect provider"""
    await vault.delete_credentials(user.id, provider)

    await audit.log(
        actor_id=user.id,
        action="provider.disconnected",
        resource=f"provider/{provider}",
    )

    return {"status": "disconnected"}


# Helper functions
async def test_api_key(provider: str, api_key: str) -> tuple[bool, Optional[str]]:
    """Test if API key is valid"""
    config = PROVIDERS[provider]

    try:
        async with httpx.AsyncClient() as client:
            if provider == "claude":
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}]
                    }
                )
            elif provider == "openai":
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
            elif provider == "qwen":
                response = await client.post(
                    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "qwen-turbo",
                        "input": {"messages": [{"role": "user", "content": "hi"}]},
                        "parameters": {"max_tokens": 1}
                    }
                )

            if response.status_code in [200, 201]:
                return True, None
            elif response.status_code == 401:
                return False, "Invalid API key"
            elif response.status_code == 403:
                return False, "API key does not have required permissions"
            else:
                return False, f"Unexpected response: {response.status_code}"

    except Exception as e:
        return False, str(e)
```

---

## 3. Credential Management

### 3.1 Secure Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Credential Storage Architecture               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     HashiCorp Vault                         ││
│  │                                                             ││
│  │  /secret/taskflow/providers/                                ││
│  │  ├── user_123/                                              ││
│  │  │   ├── claude                                             ││
│  │  │   │   └── { api_key: "sk-ant-...", connected_at: ... }  ││
│  │  │   ├── gemini                                             ││
│  │  │   │   └── { access_token: "...", refresh_token: "..." } ││
│  │  │   └── openai                                             ││
│  │  │       └── { api_key: "sk-...", connected_at: ... }      ││
│  │  └── user_456/                                              ││
│  │      └── ...                                                ││
│  │                                                             ││
│  │  Access Policies:                                           ││
│  │  - taskflow-api: read user/*/provider/*                    ││
│  │  - agent-scheduler: read user/*/provider/*                 ││
│  │  - agent-worker: read specific user/provider only          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Dapr Secrets Component                         ││
│  │                                                             ││
│  │  Abstracts Vault access for Kubernetes workloads            ││
│  │  - Automatic secret injection                               ││
│  │  - Scoped access per service                                ││
│  │  - Secret caching with TTL                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Vault Implementation

```python
# src/core/vault.py
from hvac import Client as VaultClient
from cryptography.fernet import Fernet

class CredentialVault:
    """Secure credential storage using HashiCorp Vault"""

    def __init__(self):
        self.client = VaultClient(
            url=settings.vault_url,
            token=settings.vault_token,
        )
        self.base_path = "secret/data/taskflow/providers"

    async def store_credentials(
        self,
        user_id: str,
        provider: str,
        credentials: ProviderCredentials
    ) -> None:
        """Store credentials securely"""
        path = f"{self.base_path}/{user_id}/{provider}"

        # Encrypt sensitive fields
        encrypted = {
            "api_key": self._encrypt(credentials.api_key) if credentials.api_key else None,
            "access_token": self._encrypt(credentials.access_token) if credentials.access_token else None,
            "refresh_token": self._encrypt(credentials.refresh_token) if credentials.refresh_token else None,
            "token_expiry": credentials.token_expiry.isoformat() if credentials.token_expiry else None,
            "auth_type": credentials.auth_type,
            "connected_at": credentials.connected_at.isoformat(),
        }

        await asyncio.to_thread(
            self.client.secrets.kv.v2.create_or_update_secret,
            path=path,
            secret=encrypted,
        )

    async def get_credentials(
        self,
        user_id: str,
        provider: str
    ) -> Optional[ProviderCredentials]:
        """Retrieve credentials"""
        path = f"{self.base_path}/{user_id}/{provider}"

        try:
            response = await asyncio.to_thread(
                self.client.secrets.kv.v2.read_secret_version,
                path=path,
            )
            data = response["data"]["data"]

            return ProviderCredentials(
                provider=provider,
                auth_type=data["auth_type"],
                api_key=self._decrypt(data["api_key"]) if data.get("api_key") else None,
                access_token=self._decrypt(data["access_token"]) if data.get("access_token") else None,
                refresh_token=self._decrypt(data["refresh_token"]) if data.get("refresh_token") else None,
                token_expiry=datetime.fromisoformat(data["token_expiry"]) if data.get("token_expiry") else None,
                connected_at=datetime.fromisoformat(data["connected_at"]),
            )
        except Exception:
            return None

    async def delete_credentials(self, user_id: str, provider: str) -> None:
        """Delete credentials"""
        path = f"{self.base_path}/{user_id}/{provider}"
        await asyncio.to_thread(
            self.client.secrets.kv.v2.delete_metadata_and_all_versions,
            path=path,
        )

    async def get_user_connections(self, user_id: str) -> dict:
        """List all connected providers for a user"""
        path = f"{self.base_path}/{user_id}"

        try:
            response = await asyncio.to_thread(
                self.client.secrets.kv.v2.list_secrets,
                path=path,
            )
            providers = response["data"]["keys"]

            connections = {}
            for provider in providers:
                creds = await self.get_credentials(user_id, provider)
                if creds:
                    connections[provider] = {
                        "connected_at": creds.connected_at,
                        "auth_type": creds.auth_type,
                    }

            return connections
        except Exception:
            return {}

    async def refresh_oauth_token(
        self,
        user_id: str,
        provider: str
    ) -> ProviderCredentials:
        """Refresh OAuth token"""
        creds = await self.get_credentials(user_id, provider)

        if not creds or not creds.refresh_token:
            raise ValueError("No refresh token available")

        config = PROVIDERS[provider]["oauth_config"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": creds.refresh_token,
                    "client_id": settings.oauth_clients[provider]["client_id"],
                    "client_secret": settings.oauth_clients[provider]["client_secret"],
                }
            )

            if response.status_code != 200:
                raise ValueError(f"Token refresh failed: {response.text}")

            tokens = response.json()

        # Update stored credentials
        creds.access_token = tokens["access_token"]
        creds.token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

        if tokens.get("refresh_token"):
            creds.refresh_token = tokens["refresh_token"]

        await self.store_credentials(user_id, provider, creds)

        return creds

    def _encrypt(self, value: str) -> str:
        """Encrypt sensitive value"""
        if not value:
            return None
        f = Fernet(settings.encryption_key)
        return f.encrypt(value.encode()).decode()

    def _decrypt(self, value: str) -> str:
        """Decrypt sensitive value"""
        if not value:
            return None
        f = Fernet(settings.encryption_key)
        return f.decrypt(value.encode()).decode()
```

### 3.3 Token Refresh Strategy

```python
# src/agents/credentials/refresh.py

class TokenRefreshManager:
    """Proactively refresh OAuth tokens before expiry"""

    REFRESH_BUFFER = timedelta(minutes=10)  # Refresh 10 min before expiry

    async def ensure_valid_token(
        self,
        user_id: str,
        provider: str
    ) -> ProviderCredentials:
        """Ensure token is valid, refreshing if needed"""
        creds = await vault.get_credentials(user_id, provider)

        if not creds:
            raise NoCredentialsError(f"No {provider} credentials found")

        if creds.auth_type == "api_key":
            return creds  # API keys don't expire

        # Check if refresh needed
        if creds.token_expiry:
            if creds.token_expiry - datetime.utcnow() < self.REFRESH_BUFFER:
                # Needs refresh
                try:
                    creds = await vault.refresh_oauth_token(user_id, provider)
                except Exception as e:
                    # Refresh failed - token might be revoked
                    raise CredentialsExpiredError(
                        f"{provider} session expired. Please reconnect.",
                        reauth_url=f"/settings/providers/{provider}/connect"
                    )

        return creds

    async def schedule_proactive_refresh(self, user_id: str, provider: str):
        """Schedule refresh before expiry (background job)"""
        creds = await vault.get_credentials(user_id, provider)

        if not creds or creds.auth_type == "api_key":
            return

        if creds.token_expiry:
            refresh_at = creds.token_expiry - self.REFRESH_BUFFER

            if refresh_at > datetime.utcnow():
                # Schedule refresh job
                await job_scheduler.schedule(
                    job_type="refresh_oauth_token",
                    run_at=refresh_at,
                    params={"user_id": user_id, "provider": provider}
                )
```

---

## 4. Unified Provider Client

### 4.1 Client Interface

```python
# src/agents/providers/client.py
from abc import ABC, abstractmethod
from typing import AsyncIterator

class ProviderClient(ABC):
    """Abstract interface for AI provider clients"""

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        **kwargs
    ) -> ChatResponse:
        """Send chat completion request"""
        ...

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        **kwargs
    ) -> AsyncIterator[ChatChunk]:
        """Stream chat completion"""
        ...

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        ...


class UnifiedProviderClient:
    """Unified interface across all providers"""

    def __init__(self, provider: str, credentials: ProviderCredentials):
        self.provider = provider
        self.credentials = credentials
        self._client = self._create_client()

    def _create_client(self) -> ProviderClient:
        match self.provider:
            case "claude":
                return ClaudeClient(self.credentials.api_key)
            case "gemini":
                return GeminiClient(self.credentials.access_token)
            case "openai":
                return OpenAIClient(self.credentials.api_key)
            case "qwen":
                return QwenClient(self.credentials.api_key)
            case _:
                raise ValueError(f"Unknown provider: {self.provider}")

    async def get_next_action(
        self,
        task: Task,
        context: AgentContext,
        history: list[ActionRecord]
    ) -> AgentAction:
        """Get next action from AI - unified across providers"""

        # Build messages
        messages = self._build_messages(task, context, history)

        # Get available tools
        tools = self._get_tools(task)

        # Call provider
        response = await self._client.chat(
            messages=messages,
            tools=tools,
            max_tokens=4096,
        )

        # Parse response into action
        return self._parse_response(response)

    def _build_messages(
        self,
        task: Task,
        context: AgentContext,
        history: list[ActionRecord]
    ) -> list[Message]:
        """Build messages for the provider"""

        messages = [
            Message(
                role="system",
                content=self._get_system_prompt(task)
            ),
            Message(
                role="user",
                content=f"Task: {task.title}\n\nDescription: {task.description}"
            )
        ]

        # Add history
        for record in history[-20:]:  # Last 20 actions
            messages.append(Message(
                role="assistant",
                content=f"Action: {record.action.type}\nResult: {record.result}"
            ))

        # Add context
        if context.files_read:
            messages.append(Message(
                role="user",
                content=f"Files in context:\n{context.files_read}"
            ))

        return messages

    def _get_tools(self, task: Task) -> list[Tool]:
        """Get tools available for this task"""
        return [
            Tool(
                name="read_file",
                description="Read contents of a file",
                parameters={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "File path"}
                    },
                    "required": ["path"]
                }
            ),
            Tool(
                name="write_file",
                description="Write contents to a file",
                parameters={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "content": {"type": "string"}
                    },
                    "required": ["path", "content"]
                }
            ),
            Tool(
                name="execute_command",
                description="Execute a shell command",
                parameters={
                    "type": "object",
                    "properties": {
                        "command": {"type": "string"}
                    },
                    "required": ["command"]
                }
            ),
            Tool(
                name="create_subtask",
                description="Create a subtask for this task",
                parameters={
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "assigned_to": {"type": "string", "description": "@human:name or @agent:type"}
                    },
                    "required": ["title"]
                }
            ),
            Tool(
                name="complete_task",
                description="Mark the task as complete",
                parameters={
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "files_modified": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["summary"]
                }
            ),
        ]
```

### 4.2 Provider-Specific Implementations

```python
# src/agents/providers/claude.py
import anthropic

class ClaudeClient(ProviderClient):
    """Claude/Anthropic provider client"""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        **kwargs
    ) -> ChatResponse:
        # Convert to Anthropic format
        anthropic_messages = [
            {"role": m.role, "content": m.content}
            for m in messages if m.role != "system"
        ]

        system = next((m.content for m in messages if m.role == "system"), None)

        # Convert tools to Anthropic format
        anthropic_tools = None
        if tools:
            anthropic_tools = [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.parameters,
                }
                for t in tools
            ]

        response = await self.client.messages.create(
            model=kwargs.get("model", "claude-sonnet-4-20250514"),
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system,
            messages=anthropic_messages,
            tools=anthropic_tools,
        )

        return ChatResponse(
            content=self._extract_content(response),
            tool_calls=self._extract_tool_calls(response),
            usage=Usage(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
            ),
            stop_reason=response.stop_reason,
        )

    async def stream_chat(self, messages, tools=None, **kwargs):
        async with self.client.messages.stream(...) as stream:
            async for chunk in stream:
                yield ChatChunk(...)

    async def count_tokens(self, text: str) -> int:
        return await self.client.count_tokens(text)


# src/agents/providers/gemini.py
import google.generativeai as genai

class GeminiClient(ProviderClient):
    """Gemini/Google provider client"""

    def __init__(self, access_token: str):
        genai.configure(api_key=access_token)
        self.model = genai.GenerativeModel("gemini-1.5-pro")

    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        **kwargs
    ) -> ChatResponse:
        # Convert to Gemini format
        contents = self._convert_messages(messages)

        # Convert tools
        gemini_tools = None
        if tools:
            gemini_tools = [
                genai.Tool(function_declarations=[
                    {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    }
                    for t in tools
                ])
            ]

        response = await self.model.generate_content_async(
            contents,
            tools=gemini_tools,
            generation_config=genai.GenerationConfig(
                max_output_tokens=kwargs.get("max_tokens", 4096),
            )
        )

        return ChatResponse(
            content=response.text,
            tool_calls=self._extract_function_calls(response),
            usage=Usage(
                input_tokens=response.usage_metadata.prompt_token_count,
                output_tokens=response.usage_metadata.candidates_token_count,
            ),
        )


# src/agents/providers/openai.py
from openai import AsyncOpenAI

class OpenAIClient(ProviderClient):
    """OpenAI provider client"""

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        **kwargs
    ) -> ChatResponse:
        # Convert to OpenAI format
        openai_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
        ]

        # Convert tools
        openai_tools = None
        if tools:
            openai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    }
                }
                for t in tools
            ]

        response = await self.client.chat.completions.create(
            model=kwargs.get("model", "gpt-4-turbo"),
            max_tokens=kwargs.get("max_tokens", 4096),
            messages=openai_messages,
            tools=openai_tools,
        )

        choice = response.choices[0]

        return ChatResponse(
            content=choice.message.content,
            tool_calls=self._extract_tool_calls(choice.message),
            usage=Usage(
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
            ),
            stop_reason=choice.finish_reason,
        )
```

---

## 5. Provider Failover

### 5.1 Failover Strategy

```python
# src/agents/providers/failover.py

class ProviderFailover:
    """Handle provider failover when primary fails"""

    # Failover priority (if user has multiple providers)
    FAILOVER_PRIORITY = ["claude", "gemini", "openai", "qwen"]

    async def get_available_provider(
        self,
        user_id: str,
        preferred: Optional[str] = None,
        exclude: Optional[list[str]] = None
    ) -> tuple[str, ProviderCredentials]:
        """Get best available provider for user"""
        exclude = exclude or []

        # Try preferred first
        if preferred and preferred not in exclude:
            creds = await vault.get_credentials(user_id, preferred)
            if creds:
                return preferred, creds

        # Try in priority order
        for provider in self.FAILOVER_PRIORITY:
            if provider in exclude:
                continue

            creds = await vault.get_credentials(user_id, provider)
            if creds:
                return provider, creds

        raise NoProviderAvailableError("No AI providers connected")

    async def handle_provider_error(
        self,
        user_id: str,
        current_provider: str,
        error: Exception,
        task_id: int
    ) -> Optional[tuple[str, ProviderCredentials]]:
        """Handle provider error with potential failover"""

        if isinstance(error, RateLimitError):
            # Try failover
            try:
                provider, creds = await self.get_available_provider(
                    user_id,
                    exclude=[current_provider]
                )

                await audit.log(
                    actor_id="system",
                    action="provider.failover",
                    resource=f"task/{task_id}",
                    details={
                        "from": current_provider,
                        "to": provider,
                        "reason": "rate_limit"
                    }
                )

                return provider, creds

            except NoProviderAvailableError:
                # No failover available - must wait
                return None

        elif isinstance(error, (InvalidCredentialsError, CredentialsExpiredError)):
            # Cannot failover for auth errors - need user action
            return None

        elif isinstance(error, QuotaExceededError):
            # Try failover
            try:
                return await self.get_available_provider(
                    user_id,
                    exclude=[current_provider]
                )
            except NoProviderAvailableError:
                return None

        return None
```

### 5.2 User-Configured Backup

```python
# Allow users to configure backup provider preferences

class ProviderPreferences(BaseModel):
    """User's provider preferences"""
    primary_provider: str
    backup_providers: list[str]  # Ordered by preference
    auto_failover: bool = True
    failover_on_rate_limit: bool = True
    failover_on_error: bool = True
    max_cost_per_task: Decimal = Decimal("10.00")


@router.put("/providers/preferences")
async def update_preferences(
    body: ProviderPreferences,
    user: User = Depends(get_current_user)
):
    """Update provider preferences"""
    # Validate all providers are connected
    connections = await vault.get_user_connections(user.id)

    if body.primary_provider not in connections:
        raise HTTPException(400, f"Primary provider {body.primary_provider} not connected")

    for provider in body.backup_providers:
        if provider not in connections:
            raise HTTPException(400, f"Backup provider {provider} not connected")

    await db.update_user_preferences(user.id, body)

    return {"status": "updated"}
```

---

## 6. Usage Tracking & Cost Estimation

### 6.1 Usage Tracking

```python
# src/agents/usage/tracker.py

class UsageTracker:
    """Track API usage per user/provider"""

    async def record_usage(
        self,
        user_id: str,
        provider: str,
        task_id: int,
        usage: Usage
    ):
        """Record API usage"""
        # Calculate cost
        pricing = PROVIDER_CAPABILITIES[provider]["models"][usage.model]
        cost = (
            (usage.input_tokens / 1_000_000) * pricing["input_price"] +
            (usage.output_tokens / 1_000_000) * pricing["output_price"]
        )

        record = UsageRecord(
            user_id=user_id,
            provider=provider,
            task_id=task_id,
            model=usage.model,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cost=cost,
            timestamp=datetime.utcnow(),
        )

        await db.insert(record)

        # Update aggregates
        await self._update_aggregates(user_id, provider, record)

    async def get_usage(
        self,
        user_id: str,
        provider: Optional[str] = None,
        period: str = "month"  # day, week, month
    ) -> UsageSummary:
        """Get usage summary"""
        start_date = self._get_period_start(period)

        query = select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.timestamp >= start_date
        )

        if provider:
            query = query.where(UsageRecord.provider == provider)

        records = await db.execute(query)

        return UsageSummary(
            total_tokens=sum(r.input_tokens + r.output_tokens for r in records),
            total_cost=sum(r.cost for r in records),
            by_provider={
                p: sum(r.cost for r in records if r.provider == p)
                for p in set(r.provider for r in records)
            },
            period=period,
            start_date=start_date,
        )


@router.get("/providers/{provider}/usage")
async def get_provider_usage(
    provider: str,
    period: str = "month",
    user: User = Depends(get_current_user)
):
    """Get usage for a specific provider"""
    return await usage_tracker.get_usage(user.id, provider, period)


@router.get("/providers/usage/summary")
async def get_usage_summary(
    period: str = "month",
    user: User = Depends(get_current_user)
):
    """Get usage summary across all providers"""
    return await usage_tracker.get_usage(user.id, period=period)
```

### 6.2 Cost Estimation

```python
# src/agents/usage/estimator.py

class CostEstimator:
    """Estimate task costs before execution"""

    async def estimate_task_cost(
        self,
        task: Task,
        provider: str,
        model: str = None
    ) -> CostEstimate:
        """Estimate cost for a task"""

        # Analyze task complexity
        complexity = await self._analyze_complexity(task)

        # Get model pricing
        if not model:
            model = self._get_default_model(provider)

        pricing = PROVIDER_CAPABILITIES[provider]["models"][model]

        # Estimate tokens based on complexity
        estimated_tokens = self._estimate_tokens(complexity)

        estimated_cost = (
            (estimated_tokens["input"] / 1_000_000) * pricing["input_price"] +
            (estimated_tokens["output"] / 1_000_000) * pricing["output_price"]
        )

        return CostEstimate(
            provider=provider,
            model=model,
            estimated_input_tokens=estimated_tokens["input"],
            estimated_output_tokens=estimated_tokens["output"],
            estimated_cost_low=estimated_cost * 0.5,
            estimated_cost_high=estimated_cost * 2.0,
            estimated_cost_mid=estimated_cost,
            confidence=complexity.confidence,
        )

    def _analyze_complexity(self, task: Task) -> TaskComplexity:
        """Analyze task complexity"""
        # Simple heuristics based on task description
        description_length = len(task.description or "")
        has_code = any(
            indicator in (task.description or "").lower()
            for indicator in ["implement", "code", "function", "class", "api"]
        )

        if description_length < 100 and not has_code:
            return TaskComplexity(level="simple", confidence=0.8)
        elif description_length < 500:
            return TaskComplexity(level="medium", confidence=0.6)
        else:
            return TaskComplexity(level="complex", confidence=0.4)

    def _estimate_tokens(self, complexity: TaskComplexity) -> dict:
        """Estimate tokens based on complexity"""
        estimates = {
            "simple": {"input": 5000, "output": 2000},
            "medium": {"input": 20000, "output": 10000},
            "complex": {"input": 100000, "output": 50000},
        }
        return estimates[complexity.level]
```

---

## 7. Frontend Integration

### 7.1 Provider Settings Component

```tsx
// frontend/src/components/settings/ProviderSettings.tsx

export function ProviderSettings() {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.get('/providers'),
  });

  const connectMutation = useMutation({
    mutationFn: (provider: string) => api.get(`/providers/${provider}/connect`),
    onSuccess: (data) => {
      if (data.auth_type === 'oauth') {
        window.location.href = data.auth_url;
      }
    },
  });

  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI Providers</h2>
        <p className="text-sm text-muted-foreground">
          Connect your AI accounts to enable autonomous agents.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onConnect={() => connectMutation.mutate(provider.id)}
          />
        ))}
      </div>

      <Separator />

      <BudgetLimitsSection />
    </div>
  );
}

function ProviderCard({ provider, onConnect }) {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <ProviderIcon provider={provider.id} />
          <div>
            <h3 className="font-medium">{provider.name}</h3>
            {provider.connected ? (
              <p className="text-sm text-muted-foreground">
                Connected {formatDate(provider.connected_at)}
                {provider.usage_this_month > 0 && (
                  <> · ${provider.usage_this_month.toFixed(2)} this month</>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>

        {provider.connected ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Manage</Button>
            <DisconnectButton provider={provider.id} />
          </div>
        ) : (
          <Button onClick={onConnect}>Connect</Button>
        )}
      </CardContent>

      <ApiKeyDialog
        open={showApiKeyDialog}
        provider={provider}
        onClose={() => setShowApiKeyDialog(false)}
      />
    </Card>
  );
}
```

### 7.2 API Key Dialog

```tsx
// frontend/src/components/settings/ApiKeyDialog.tsx

export function ApiKeyDialog({ open, provider, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (key: string) =>
      api.post(`/providers/${provider.id}/api-key`, { api_key: key }),
    onSuccess: () => {
      queryClient.invalidateQueries(['providers']);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {provider.name}</DialogTitle>
          <DialogDescription>
            Enter your API key to connect your {provider.name} account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Get your API key from{' '}
              <a
                href={provider.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {provider.name} console
              </a>
              . Your key is encrypted and never shared.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate(apiKey)}
            disabled={!apiKey || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Validating...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Security Considerations

### 8.1 Credential Security Checklist

- [ ] All credentials encrypted at rest (AES-256-GCM)
- [ ] Credentials never logged or exposed in errors
- [ ] Vault access audited
- [ ] Short-lived access tokens where possible
- [ ] Automatic token refresh before expiry
- [ ] Scoped access (services only access needed credentials)
- [ ] Credential deletion on disconnect
- [ ] Rate limiting on credential endpoints

### 8.2 Audit Trail

```python
# All credential operations are audited
AUDIT_EVENTS = [
    "provider.connected",      # User connected provider
    "provider.disconnected",   # User disconnected provider
    "provider.token_refreshed", # OAuth token refreshed
    "provider.credential_accessed", # Credential retrieved for task
    "provider.failover",       # Automatic failover occurred
]
```

---

## References

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Google AI Studio](https://aistudio.google.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [AGENT-CLOUD-EXECUTION.md](./AGENT-CLOUD-EXECUTION.md) - Parent design document
