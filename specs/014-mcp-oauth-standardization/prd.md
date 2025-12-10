# PRD: MCP OAuth Standardization

**Phase**: V (Advanced Cloud Deployment)  
**Owner**: Agent 5 (MCP Auth Specialist)  
**Estimated Time**: 90-120 minutes  
**Priority**: CRITICAL (Enables AI agents as first-class citizens)  
**Dependency**: None (can run in parallel with other agents)

---

## Executive Summary

Transform TaskFlow's MCP server from a non-standard "token-in-body" implementation to **industry-standard OAuth 2.0** that any MCP client (Claude Code, Cursor, Windsurf, etc.) can authenticate with.

### The Problem

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT STATE (Non-Standard)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Web User → Better Auth → JWT Cookie → Works ✅                  │
│  Chat UI → Token in body → Works (but non-standard) ⚠️          │
│  CLI Agent (Claude Code) → ??? → CANNOT AUTHENTICATE ❌          │
│                                                                 │
│  Problem: Tokens passed in tool parameters, not headers         │
│  Result: No MCP client can actually connect to TaskFlow         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Solution

```
┌─────────────────────────────────────────────────────────────────┐
│ TARGET STATE (Standards-Compliant)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Web User → Better Auth → JWT Cookie → Works ✅                  │
│  Chat UI → OAuth → JWT in Header → Works ✅                      │
│  CLI Agent → Device Flow → JWT in Header → Works ✅              │
│  API Key → Bearer Token → Works ✅                               │
│                                                                 │
│  ALL clients use standard Authorization: Bearer <token>         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Success Criteria

- [ ] Claude Code can configure TaskFlow MCP server via OAuth Device Flow
- [ ] Cursor can authenticate via OAuth Device Flow
- [ ] MCP Inspector works with OAuth authentication
- [ ] Existing ChatKit integration continues to work (backward compatible)
- [ ] API keys work for headless automation (CI/CD, scripts)
- [ ] All tokens flow via `Authorization: Bearer` header, not tool params

---

## 1. Why This Matters

### 1.1 The Constitution Principle

> **"Agents Are First-Class Citizens"** - If humans can do it, agents can do it.

Currently, only **humans with browsers** can use TaskFlow. CLI agents like Claude Code **cannot authenticate** because:

1. They don't have a browser for OAuth consent
2. Our MCP server expects tokens in tool parameters (non-standard)
3. No OAuth Device Flow support for headless clients

### 1.2 Industry Standard Compliance

| What MCP Spec Says | What We Do | Gap |
|-------------------|-----------|-----|
| OAuth 2.1 with PKCE | OIDC Provider ✅ | None |
| Authorization header | Token in params ❌ | **Critical** |
| Device Authorization Flow (RFC 8628) | Not implemented ❌ | **Critical** |
| Dynamic Client Registration | Disabled ❌ | **Critical** |
| `.well-known/oauth-authorization-server` | Not exposed | **Medium** |

### 1.3 What This Unlocks

```
After implementation:

┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE CODE WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User adds to .mcp.json:                                     │
│     {                                                           │
│       "taskflow": {                                             │
│         "url": "https://mcp.taskflow.app",                      │
│         "transport": "streamable-http",                         │
│         "oauth": {                                              │
│           "client_id": "claude-code-client",                    │
│           "auth_server": "https://sso.taskflow.app"             │
│         }                                                       │
│       }                                                         │
│     }                                                           │
│                                                                 │
│  2. Claude Code sees OAuth config → triggers Device Flow        │
│                                                                 │
│  3. User opens browser, visits device URL, approves             │
│                                                                 │
│  4. Claude Code receives token, stores securely                 │
│                                                                 │
│  5. All MCP tool calls include: Authorization: Bearer <token>   │
│                                                                 │
│  6. MCP server validates token → user context available         │
│                                                                 │
│  RESULT: Claude Code is now a first-class TaskFlow user! 🎉     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 High-Level Flow

```
                    ┌──────────────────────────────────────────────────────┐
                    │                  SSO PLATFORM                          │
                    │               (Better Auth)                            │
                    │                                                        │
                    │  ┌────────────────┐    ┌────────────────────────────┐│
                    │  │ Device Flow    │    │ OIDC Provider              ││
                    │  │ /device/code   │    │ /oauth2/authorize          ││
                    │  │ /device/token  │    │ /oauth2/token              ││
                    │  └───────┬────────┘    └────────────┬───────────────┘│
                    │          │                           │                │
                    │          ▼                           ▼                │
                    │  ┌─────────────────────────────────────────────────┐ │
                    │  │              JWT (with tenant_id)                │ │
                    │  │  { sub: "user-123", tenant_id: "org-456", ... }  │ │
                    │  └─────────────────────────────────────────────────┘ │
                    └──────────────────────────────────────────────────────┘
                                              │
                                              │ Authorization: Bearer <jwt>
                                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            MCP SERVER                                       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Auth Middleware                                                       │ │
│  │                                                                       │ │
│  │  if header["Authorization"]:                                          │ │
│  │      token = header["Authorization"].replace("Bearer ", "")           │ │
│  │      user = validate_jwt(token)  # via SSO's JWKS endpoint            │ │
│  │      request.state.user = user                                        │ │
│  │  else:                                                                │ │
│  │      raise 401 Unauthorized                                           │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                              │                             │
│                                              ▼                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ MCP Tools (Simplified!)                                               │ │
│  │                                                                       │ │
│  │  @mcp.tool()                                                          │ │
│  │  def list_tasks(project_id: int):                                     │ │
│  │      user = get_current_user()  # From middleware, not params!        │ │
│  │      return api.list_tasks(user.id, project_id, user.token)           │ │
│  │                                                                       │ │
│  │  # NO MORE: user_id, access_token parameters!                         │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Authentication Methods Matrix

| Method | Client Type | Flow | Use Case |
|--------|-------------|------|----------|
| **Device Flow** | CLI (Claude Code, Cursor) | RFC 8628 | Headless agents |
| **Authorization Code + PKCE** | Web/Desktop with browser | OAuth 2.1 | ChatKit, Browser tools |
| **API Key** | Automated services | Bearer token | CI/CD, Scripts, Bots |
| **Session Cookie** | Web dashboard | Cookie | Human users |

### 2.3 Component Changes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CHANGES REQUIRED                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SSO PLATFORM (sso-platform/)                                           │
│  ─────────────────────────────                                          │
│  • Add: Device Authorization Flow plugin                                │
│  • Add: MCP OAuth metadata endpoint                                     │
│  • Add: Dynamic client registration (controlled)                        │
│  • Modify: OIDC Provider config for MCP clients                         │
│                                                                         │
│  MCP SERVER (packages/mcp-server/)                                      │
│  ─────────────────────────────────                                      │
│  • Add: JWT validation middleware                                       │
│  • Add: User context injection                                          │
│  • Modify: Tool signatures (remove user_id, access_token params)        │
│  • Add: OAuth metadata discovery endpoint                               │
│  • Add: PKCE support for authorization code flow                        │
│                                                                         │
│  CHAT SERVER (chatkit integration in API)                               │
│  ─────────────────────────────────────────                              │
│  • Modify: Pass token via Authorization header to MCP                   │
│  • Remove: Token in tool call parameters                                │
│                                                                         │
│  DOCUMENTATION                                                          │
│  ─────────────                                                          │
│  • Add: Claude Code setup guide                                         │
│  • Add: Cursor setup guide                                              │
│  • Add: API key usage guide                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Details

### 3.1 SSO Platform Changes

#### 3.1.1 Add Device Authorization Flow Plugin

**File**: `sso-platform/src/lib/auth.ts`

```typescript
import { deviceAuthorization } from "better-auth/plugins";

// Add to plugins array:
plugins: [
  // ... existing plugins ...
  
  // Device Authorization Flow (RFC 8628) for CLI agents
  // Enables Claude Code, Cursor, and other headless MCP clients
  deviceAuthorization({
    // Device code validity (default: 15 minutes)
    deviceCodeExpiresIn: 60 * 15,
    // How often client should poll (seconds)
    pollingInterval: 5,
    // User code format (default: "XXXX-XXXX")
    userCodeLength: 8,
    // Verification URI shown to user
    verificationUri: `${process.env.BETTER_AUTH_URL}/auth/device`,
    // Complete URI with code pre-filled
    verificationUriComplete: (code) => 
      `${process.env.BETTER_AUTH_URL}/auth/device?user_code=${code}`,
  }),
],
```

#### 3.1.2 Add Device Authorization UI

**File**: `sso-platform/src/app/auth/device/page.tsx` (NEW)

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function DeviceAuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userCode, setUserCode] = useState(searchParams.get("user_code") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    clientName: string;
    scopes: string[];
  } | null>(null);

  // Verify code and get device info
  const verifyCode = async () => {
    if (!userCode || userCode.length < 8) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SSO_URL}/api/auth/device/verify?user_code=${userCode}`
      );
      
      if (!response.ok) {
        throw new Error("Invalid or expired code");
      }
      
      const data = await response.json();
      setDeviceInfo({
        clientName: data.client_name || "Unknown Device",
        scopes: data.scopes || ["openid", "profile"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Approve device authorization
  const approveDevice = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SSO_URL}/api/auth/device/authorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_code: userCode, approved: true }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Authorization failed");
      }
      
      // Success - redirect to success page
      router.push("/auth/device/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if code in URL
  useEffect(() => {
    if (userCode.length >= 8) {
      verifyCode();
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Device Authorization</CardTitle>
          <CardDescription>
            Authorize a device or CLI tool to access your TaskFlow account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!deviceInfo ? (
            // Step 1: Enter code
            <>
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Enter the code shown on your device
                </label>
                <Input
                  id="code"
                  placeholder="XXXX-XXXX"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  maxLength={9}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button 
                onClick={verifyCode} 
                disabled={loading || userCode.length < 8}
                className="w-full"
              >
                {loading ? "Verifying..." : "Continue"}
              </Button>
            </>
          ) : (
            // Step 2: Approve device
            <>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{deviceInfo.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  wants to access your TaskFlow account
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {deviceInfo.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1"
                >
                  Deny
                </Button>
                <Button
                  onClick={approveDevice}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Authorizing..." : "Authorize"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3.1.3 Register MCP Clients

**File**: `sso-platform/src/lib/trusted-clients.ts` (MODIFY)

```typescript
// Add MCP client registrations
export const TRUSTED_CLIENTS = [
  // ... existing clients ...
  
  // Claude Code (Anthropic's CLI)
  {
    clientId: "claude-code-client",
    name: "Claude Code",
    // No secret for public clients (PKCE required)
    type: "public" as const,
    redirectURIs: [],  // Not used for device flow
    allowedScopes: ["openid", "profile", "email", "taskflow:read", "taskflow:write"],
    allowedGrantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
  },
  
  // Cursor IDE
  {
    clientId: "cursor-client",
    name: "Cursor",
    type: "public" as const,
    redirectURIs: [],
    allowedScopes: ["openid", "profile", "email", "taskflow:read", "taskflow:write"],
    allowedGrantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
  },
  
  // MCP Inspector (for testing)
  {
    clientId: "mcp-inspector",
    name: "MCP Inspector",
    type: "public" as const,
    redirectURIs: ["http://localhost:5173/callback"],  // Inspector's callback
    allowedScopes: ["openid", "profile", "email", "taskflow:read", "taskflow:write"],
    allowedGrantTypes: ["authorization_code", "refresh_token"],
  },
];
```

### 3.2 MCP Server Changes

#### 3.2.1 Add JWT Validation Middleware

**File**: `packages/mcp-server/src/taskflow_mcp/auth.py` (NEW)

```python
"""JWT authentication middleware for MCP server.

Validates tokens from Authorization header using SSO's JWKS endpoint.
Supports both JWT (from OAuth flows) and API keys.
"""

import logging
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from .config import get_config

logger = logging.getLogger(__name__)

config = get_config()

# JWKS client for JWT verification (caches keys automatically)
_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    """Get or create JWKS client for SSO platform."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{config.sso_url}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
        logger.info("Initialized JWKS client: %s", jwks_url)
    return _jwks_client


@dataclass
class AuthenticatedUser:
    """User context extracted from validated token."""
    
    id: str
    email: str
    tenant_id: str | None
    name: str | None
    token: str  # Original token for API calls
    token_type: str  # "jwt" or "api_key"
    
    @property
    def is_authenticated(self) -> bool:
        return bool(self.id)


async def validate_jwt(token: str) -> AuthenticatedUser:
    """Validate JWT and extract user context.
    
    Args:
        token: JWT access token from Authorization header
        
    Returns:
        AuthenticatedUser with claims from token
        
    Raises:
        jwt.InvalidTokenError: If token is invalid
    """
    jwks_client = get_jwks_client()
    
    # Get signing key from JWKS
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    
    # Decode and validate token
    # Note: SSO uses RS256 (asymmetric)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=config.oauth_client_id,  # Validate audience
        options={"verify_exp": True},
    )
    
    return AuthenticatedUser(
        id=payload.get("sub", ""),
        email=payload.get("email", ""),
        tenant_id=payload.get("tenant_id"),
        name=payload.get("name"),
        token=token,
        token_type="jwt",
    )


async def validate_api_key(api_key: str) -> AuthenticatedUser:
    """Validate API key via SSO platform.
    
    Args:
        api_key: API key starting with 'tf_'
        
    Returns:
        AuthenticatedUser from API key verification
        
    Raises:
        ValueError: If API key is invalid
    """
    verify_url = f"{config.sso_url}/api/api-key/verify"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            verify_url,
            json={"key": api_key},
        )
        
        if response.status_code != 200:
            raise ValueError("Invalid API key")
        
        data = response.json()
        
        if not data.get("valid"):
            raise ValueError("API key not valid or expired")
        
        user = data.get("user", {})
        
        return AuthenticatedUser(
            id=user.get("id", ""),
            email=user.get("email", ""),
            tenant_id=user.get("tenant_id"),
            name=user.get("name"),
            token=api_key,
            token_type="api_key",
        )


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
        raise ValueError("Invalid Authorization header format")
    
    token = authorization_header[7:]  # Remove "Bearer "
    
    if not token:
        raise ValueError("Empty token")
    
    # API keys start with 'tf_'
    if token.startswith("tf_"):
        return await validate_api_key(token)
    
    # Otherwise, assume JWT
    return await validate_jwt(token)


# Context variable for current user (set by middleware)
_current_user: AuthenticatedUser | None = None


def set_current_user(user: AuthenticatedUser | None) -> None:
    """Set current authenticated user (called by middleware)."""
    global _current_user
    _current_user = user


def get_current_user() -> AuthenticatedUser:
    """Get current authenticated user.
    
    Returns:
        AuthenticatedUser for current request
        
    Raises:
        RuntimeError: If no authenticated user
    """
    if _current_user is None:
        raise RuntimeError("No authenticated user - ensure auth middleware is applied")
    return _current_user
```

#### 3.2.2 Update Server with Auth Middleware

**File**: `packages/mcp-server/src/taskflow_mcp/server.py` (MODIFY)

```python
"""FastMCP server for TaskFlow with OAuth authentication.

Main entry point for the MCP server with Stateless Streamable HTTP transport.
Implements MCP specification authentication:
- OAuth 2.1 via Authorization header
- API keys for automated access
- JWKS validation against SSO platform
"""

import logging
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.requests import Request

from taskflow_mcp.app import mcp
from taskflow_mcp.config import get_config
from taskflow_mcp.auth import authenticate, set_current_user, AuthenticatedUser

# Import all tool modules to register their @mcp.tool() decorators
import taskflow_mcp.tools.tasks  # noqa: F401
import taskflow_mcp.tools.projects  # noqa: F401

logger = logging.getLogger(__name__)
config = get_config()

# Use FastMCP's built-in streamable_http_app
_mcp_app = mcp.streamable_http_app()


class AuthMiddleware:
    """Authentication middleware for MCP server.
    
    Validates Authorization header and sets user context.
    Allows unauthenticated access to health and OAuth metadata endpoints.
    """
    
    # Paths that don't require authentication
    PUBLIC_PATHS = {"/health", "/.well-known/oauth-authorization-server"}
    
    def __init__(self, app: ASGIApp):
        self.app = app
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        path = scope["path"]
        
        # Health check - no auth
        if path == "/health":
            response = JSONResponse({"status": "healthy", "service": "taskflow-mcp"})
            await response(scope, receive, send)
            return
        
        # OAuth metadata - no auth
        if path == "/.well-known/oauth-authorization-server":
            response = JSONResponse({
                "issuer": config.sso_url,
                "authorization_endpoint": f"{config.sso_url}/api/auth/oauth2/authorize",
                "token_endpoint": f"{config.sso_url}/api/auth/oauth2/token",
                "device_authorization_endpoint": f"{config.sso_url}/api/auth/device/code",
                "jwks_uri": f"{config.sso_url}/.well-known/jwks.json",
                "scopes_supported": ["openid", "profile", "email", "taskflow:read", "taskflow:write"],
                "response_types_supported": ["code"],
                "grant_types_supported": [
                    "authorization_code",
                    "refresh_token",
                    "urn:ietf:params:oauth:grant-type:device_code"
                ],
                "code_challenge_methods_supported": ["S256"],
            })
            await response(scope, receive, send)
            return
        
        # Dev mode bypass (for local development without OAuth)
        if config.dev_mode:
            # Check for X-User-ID header (legacy dev mode)
            request = Request(scope)
            user_id = request.headers.get("x-user-id")
            if user_id:
                set_current_user(AuthenticatedUser(
                    id=user_id,
                    email=f"{user_id}@dev.local",
                    tenant_id=None,
                    name="Dev User",
                    token="dev-mode",
                    token_type="dev",
                ))
                await self.app(scope, receive, send)
                return
        
        # Require authentication for MCP endpoints
        request = Request(scope)
        auth_header = request.headers.get("authorization")
        
        try:
            user = await authenticate(auth_header)
            set_current_user(user)
            logger.debug("Authenticated user: %s", user.id)
        except Exception as e:
            logger.warning("Authentication failed: %s", e)
            # Return 401 with OAuth challenge
            response = JSONResponse(
                {"error": "unauthorized", "message": str(e)},
                status_code=401,
                headers={
                    "WWW-Authenticate": f'Bearer realm="taskflow", authorization_uri="{config.sso_url}/api/auth/oauth2/authorize"'
                },
            )
            await response(scope, receive, send)
            return
        
        try:
            await self.app(scope, receive, send)
        finally:
            # Clear user context after request
            set_current_user(None)


# Apply middleware stack
app_with_auth = AuthMiddleware(_mcp_app)

# CORS middleware for MCP Inspector and browser-based clients
streamable_http_app = CORSMiddleware(
    app_with_auth,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization"],  # Explicitly allow Authorization
    expose_headers=["Mcp-Session-Id", "WWW-Authenticate"],
)


if __name__ == "__main__":
    import uvicorn
    
    print("TaskFlow MCP Server (OAuth Enabled)")
    print(f"SSO Platform: {config.sso_url}")
    print(f"Server: http://{config.mcp_host}:{config.mcp_port}/mcp")
    print(f"OAuth Metadata: http://{config.mcp_host}:{config.mcp_port}/.well-known/oauth-authorization-server")
    
    uvicorn.run(
        "taskflow_mcp.server:streamable_http_app",
        host=config.mcp_host,
        port=config.mcp_port,
        reload=True,
    )
```

#### 3.2.3 Update Config

**File**: `packages/mcp-server/src/taskflow_mcp/config.py` (MODIFY)

```python
"""Configuration for TaskFlow MCP Server."""

import os
from dataclasses import dataclass, field


@dataclass
class Config:
    """MCP Server configuration."""
    
    # API connection
    api_url: str = field(default_factory=lambda: os.getenv("TASKFLOW_API_URL", "http://localhost:8000"))
    api_timeout: float = field(default_factory=lambda: float(os.getenv("TASKFLOW_API_TIMEOUT", "30")))
    
    # MCP server settings
    mcp_host: str = field(default_factory=lambda: os.getenv("TASKFLOW_MCP_HOST", "0.0.0.0"))
    mcp_port: int = field(default_factory=lambda: int(os.getenv("TASKFLOW_MCP_PORT", "8001")))
    
    # OAuth/SSO settings
    sso_url: str = field(default_factory=lambda: os.getenv("TASKFLOW_SSO_URL", "http://localhost:3001"))
    oauth_client_id: str = field(default_factory=lambda: os.getenv("TASKFLOW_OAUTH_CLIENT_ID", "taskflow-mcp"))
    
    # Development mode
    dev_mode: bool = field(default_factory=lambda: os.getenv("TASKFLOW_DEV_MODE", "false").lower() == "true")
    
    # Service token (for internal calls)
    service_token: str | None = field(default_factory=lambda: os.getenv("TASKFLOW_SERVICE_TOKEN"))


_config: Config | None = None


def get_config() -> Config:
    """Get singleton config instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config
```

#### 3.2.4 Simplify Tool Signatures

**File**: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py` (MODIFY)

Transform from:
```python
# BEFORE: Token in every tool parameter (non-standard)
@mcp.tool()
async def list_tasks(
    user_id: str,
    access_token: str | None,
    project_id: int,
    status: str | None = None,
) -> str:
    """List tasks in a project."""
    api = get_api_client()
    tasks = await api.list_tasks(user_id, project_id, status, access_token=access_token)
    return json.dumps(tasks)
```

To:
```python
# AFTER: User context from middleware (standard)
from ..auth import get_current_user

@mcp.tool()
async def list_tasks(
    project_id: int,
    status: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str | None = None,
) -> str:
    """List tasks in a project.
    
    Args:
        project_id: Project ID to list tasks from
        status: Filter by status (pending, in_progress, completed, etc.)
        search: Search tasks by title (case-insensitive)
        sort_by: Sort field (created_at, due_date, priority, title)
        sort_order: Sort order (asc, desc)
    
    Returns:
        JSON array of tasks
    """
    user = get_current_user()
    api = get_api_client()
    
    tasks = await api.list_tasks(
        user_id=user.id,
        project_id=project_id,
        status=status,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        access_token=user.token,
    )
    
    return json.dumps(tasks)
```

### 3.3 Chat Server Changes

**File**: `packages/api/src/taskflow_api/services/chat_agent.py` (MODIFY)

When using MCPServerStreamableHttp from OpenAI Agents SDK:

```python
from agents.mcp import MCPServerStreamableHttp

# Pass token via headers (standard), not tool parameters
mcp_server = MCPServerStreamableHttp(
    url=f"{MCP_SERVER_URL}/mcp",
    headers={
        "Authorization": f"Bearer {user_access_token}",
    },
)
```

---

## 4. Backward Compatibility

### 4.1 Migration Path

| Current Behavior | New Behavior | Migration |
|-----------------|--------------|-----------|
| `user_id` in tool params | User from auth context | Remove param |
| `access_token` in tool params | Token from header | Remove param |
| Dev mode: X-User-ID header | Still works | No change |
| ChatKit: Token in params | ChatKit: Token in header | Update ChatKit |

### 4.2 Deprecation Timeline

```
Week 1: Ship with both modes (params + header)
        - New OAuth flow works
        - Old param-based flow logs deprecation warning
        
Week 2: ChatKit updated to use header
        - All internal clients use new flow
        
Week 3: Remove param-based auth
        - Clean tool signatures
        - Breaking change for anyone using old flow
```

---

## 5. Configuration Examples

### 5.1 Claude Code Configuration

**File**: `~/.mcp/claude-code.json`

```json
{
  "mcpServers": {
    "taskflow": {
      "url": "https://mcp.taskflow.app/mcp",
      "transport": "streamable-http",
      "oauth": {
        "clientId": "claude-code-client",
        "scopes": ["openid", "profile", "taskflow:read", "taskflow:write"],
        "authorizationServer": "https://sso.taskflow.app"
      }
    }
  }
}
```

### 5.2 Cursor Configuration

**File**: `.cursor/mcp.json`

```json
{
  "servers": {
    "taskflow": {
      "url": "https://mcp.taskflow.app/mcp",
      "transport": "streamable-http",
      "auth": {
        "type": "oauth",
        "clientId": "cursor-client",
        "authorizationEndpoint": "https://sso.taskflow.app/api/auth/device/code",
        "tokenEndpoint": "https://sso.taskflow.app/api/auth/device/token"
      }
    }
  }
}
```

### 5.3 API Key for Automation

```bash
# Get API key from SSO Platform dashboard
# Keys start with 'tf_' prefix

# Use in scripts:
curl -X POST https://mcp.taskflow.app/mcp \
  -H "Authorization: Bearer tf_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_tasks","arguments":{"project_id":1}}}'
```

---

## 6. Implementation Checklist

### Phase 1: SSO Platform (30 min)

- [ ] Add Device Authorization Flow plugin
- [ ] Create `/auth/device` UI page
- [ ] Add `/auth/device/success` confirmation page
- [ ] Register MCP clients (Claude Code, Cursor, Inspector)
- [ ] Test device flow end-to-end

### Phase 2: MCP Server Auth (30 min)

- [ ] Create `auth.py` with JWT validation
- [ ] Add JWKS client for SSO
- [ ] Implement API key validation
- [ ] Update `server.py` with auth middleware
- [ ] Add OAuth metadata endpoint

### Phase 3: Simplify Tools (20 min)

- [ ] Remove `user_id` from all tool signatures
- [ ] Remove `access_token` from all tool signatures
- [ ] Update tools to use `get_current_user()`
- [ ] Update tool docstrings

### Phase 4: ChatKit Integration (15 min)

- [ ] Update ChatKit to pass token in header
- [ ] Remove token from tool parameters
- [ ] Test ChatKit flow

### Phase 5: Testing & Docs (25 min)

- [ ] Test Device Flow with mock client
- [ ] Test API key authentication
- [ ] Test ChatKit backward compatibility
- [ ] Create Claude Code setup guide
- [ ] Create Cursor setup guide

---

## 7. Testing Plan

### 7.1 Unit Tests

```python
# packages/mcp-server/tests/test_auth.py

import pytest
from taskflow_mcp.auth import authenticate, validate_jwt, validate_api_key

@pytest.mark.asyncio
async def test_jwt_validation():
    """Test JWT validation with mock JWKS."""
    # Create test JWT signed with test key
    token = create_test_jwt({"sub": "user-123", "tenant_id": "org-456"})
    
    user = await validate_jwt(token)
    
    assert user.id == "user-123"
    assert user.tenant_id == "org-456"
    assert user.token_type == "jwt"

@pytest.mark.asyncio
async def test_api_key_validation():
    """Test API key validation."""
    # Mock SSO verify endpoint
    user = await validate_api_key("tf_test_key")
    
    assert user.token_type == "api_key"

@pytest.mark.asyncio
async def test_auth_header_parsing():
    """Test Authorization header parsing."""
    user = await authenticate("Bearer eyJhbG...")
    assert user.is_authenticated
    
    with pytest.raises(ValueError, match="Missing"):
        await authenticate(None)
    
    with pytest.raises(ValueError, match="Invalid"):
        await authenticate("Basic abc123")
```

### 7.2 Integration Tests

```bash
# Test Device Flow
# 1. Start device authorization
curl -X POST "http://localhost:3001/api/auth/device/code" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code-client", "scope": "openid profile taskflow:read"}'

# Response: { device_code, user_code, verification_uri }

# 2. User visits verification_uri and approves

# 3. Exchange device code for token
curl -X POST "http://localhost:3001/api/auth/device/token" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code-client", "device_code": "..."}'

# Response: { access_token, refresh_token, expires_in }

# 4. Use token with MCP
curl -X POST "http://localhost:8001/mcp" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_projects","arguments":{}}}'
```

---

## 8. Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Device Flow works | User can auth via code | Manual test |
| Token in header | 100% of MCP calls | Logging |
| No token in params | 0 tool params for auth | Code review |
| JWKS validation | Tokens verified via JWKS | Unit test |
| Backward compat | ChatKit still works | Integration test |
| API keys work | tf_ keys authenticate | Manual test |

---

## 9. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking ChatKit | HIGH | Ship with both modes, migrate gradually |
| JWKS endpoint down | MEDIUM | Cache keys, graceful degradation |
| Token expiry UX | MEDIUM | Clear error messages, refresh flow |
| Claude Code doesn't support device flow | LOW | Verify before implementation |

---

## 10. Definition of Done

### P0 (Must Have)
- [ ] Device Authorization Flow works end-to-end
- [ ] JWT validation via JWKS
- [ ] API key authentication
- [ ] Tools use `get_current_user()` instead of params
- [ ] OAuth metadata endpoint at `/.well-known/oauth-authorization-server`

### P1 (Should Have)
- [ ] ChatKit migrated to header-based auth
- [ ] Deprecation warnings for param-based auth
- [ ] Claude Code setup documentation

### P2 (Nice to Have)
- [ ] Cursor setup documentation
- [ ] MCP Inspector setup documentation
- [ ] Token refresh flow

---

## 11. Future Considerations

### Option C: Agent Identity Tracking

Once OAuth is implemented, we can track **which agent** performed actions:

```python
# In audit log:
{
    "action": "task.completed",
    "actor_id": "user-123",
    "actor_type": "agent",  # vs "human"
    "client_id": "claude-code-client",
    "client_name": "Claude Code",
    "session_id": "oauth-session-xyz",
}
```

This enables:
- "Who completed this task? Claude Code on behalf of user@example.com"
- Agent-specific rate limiting
- Agent vs human activity dashboards
- Revoke specific agent access without affecting others

