# Plan: MCP OAuth Standardization

**Feature**: 014-mcp-oauth-standardization  
**Spec**: `spec.md`  
**Created**: 2025-12-11

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOKEN FLOW ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                    ┌─────────────────────────────────┐│
│  │  CLI AGENT      │                    │         SSO PLATFORM             ││
│  │  (Claude Code)  │                    │        (Better Auth)             ││
│  │                 │                    │                                  ││
│  │  1. Request     │───device/code────▶│  Device Flow Plugin              ││
│  │     device code │                    │  - deviceCodeExpiresIn: 15min    ││
│  │                 │                    │  - pollingInterval: 5sec         ││
│  │  2. Display     │◀──user_code───────│                                  ││
│  │     user code   │                    │                                  ││
│  │                 │                    │  ┌──────────────────────────┐   ││
│  │  3. Poll for    │───device/token───▶│  │  /auth/device UI         │   ││
│  │     token       │                    │  │  - Enter code            │   ││
│  │                 │                    │  │  - Approve/Deny          │   ││
│  │  4. Receive     │◀──access_token────│  └──────────────────────────┘   ││
│  │     JWT         │                    │                                  ││
│  └────────┬────────┘                    │  JWKS: /.well-known/jwks.json    ││
│           │                             └─────────────────────────────────┘│
│           │                                              ▲                  │
│           │ Authorization: Bearer <jwt>                  │ Validate        │
│           ▼                                              │                  │
│  ┌─────────────────────────────────────────────────────┐ │                  │
│  │                   MCP SERVER                         │ │                  │
│  │                                                      │ │                  │
│  │  ┌────────────────────────────────────────────────┐ │ │                  │
│  │  │ AuthMiddleware                                 │ │ │                  │
│  │  │                                                │ │ │                  │
│  │  │  1. Extract token from Authorization header   │ │ │                  │
│  │  │  2. If tf_* → validate via SSO API key verify │◀┘ │                  │
│  │  │  3. Else → validate JWT via JWKS              │───┘                  │
│  │  │  4. Set user context (thread-local or async)  │                       │
│  │  │  5. Pass to MCP tools                         │                       │
│  │  └────────────────────────────────────────────────┘                      │
│  │                         │                                                │
│  │                         ▼                                                │
│  │  ┌────────────────────────────────────────────────┐                      │
│  │  │ MCP Tools (Simplified)                         │                      │
│  │  │                                                │                      │
│  │  │  @mcp.tool()                                   │                      │
│  │  │  def list_tasks(project_id: int):              │                      │
│  │  │      user = get_current_user()  # From context │                      │
│  │  │      api.list_tasks(user.id, project_id, ...)  │                      │
│  │  └────────────────────────────────────────────────┘                      │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: SSO Platform (30 min)

**Goal**: Add Device Authorization Flow support

#### 1.1 Add Device Flow Plugin
- File: `sso-platform/src/lib/auth.ts`
- Add: `deviceAuthorization` plugin from `better-auth/plugins`
- Config: 15min expiry, 5sec polling, verification URI

#### 1.2 Register MCP Clients  
- File: `sso-platform/src/lib/trusted-clients.ts`
- Add: `claude-code-client`, `cursor-client`, `mcp-inspector`
- Type: Public clients (no secret, PKCE for web)

#### 1.3 Create Device Approval UI
- File: `sso-platform/src/app/auth/device/page.tsx` (NEW)
- Features: Code input, device info display, approve/deny buttons
- File: `sso-platform/src/app/auth/device/success/page.tsx` (NEW)
- Features: Success confirmation message

---

### Phase 2: MCP Server Auth (30 min)

**Goal**: Add JWT validation middleware

#### 2.1 Create Auth Module
- File: `packages/mcp-server/src/taskflow_mcp/auth.py` (NEW)
- Components:
  - `AuthenticatedUser` dataclass
  - `validate_jwt()` - JWKS-based JWT validation
  - `validate_api_key()` - SSO API key verification
  - `authenticate()` - Main entry point
  - `get_current_user()` - Context accessor
  - `set_current_user()` - Context setter

#### 2.2 Update Server with Middleware
- File: `packages/mcp-server/src/taskflow_mcp/server.py`
- Add: `AuthMiddleware` class
- Add: OAuth metadata endpoint at `/.well-known/oauth-authorization-server`
- Update: CORS to expose Authorization header

#### 2.3 Update Config
- File: `packages/mcp-server/src/taskflow_mcp/config.py`
- Add: `sso_url`, `oauth_client_id` settings

#### 2.4 Add Dependencies
```bash
cd packages/mcp-server && uv add "PyJWT[crypto]" httpx
```

---

### Phase 3: Simplify Tools (20 min)

**Goal**: Remove auth params from tool signatures

#### 3.1 Update Task Tools
- File: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`
- Remove: `user_id`, `access_token` from all tool signatures
- Add: `user = get_current_user()` at start of each tool

#### 3.2 Update Project Tools
- File: `packages/mcp-server/src/taskflow_mcp/tools/projects.py`
- Same pattern as task tools

#### 3.3 Update Models (Optional Deprecation)
- File: `packages/mcp-server/src/taskflow_mcp/models.py`
- Option A: Remove `AuthenticatedInput` base class
- Option B: Mark as deprecated, keep for backward compat

---

### Phase 4: ChatKit Integration (15 min)

**Goal**: Update ChatKit to use header-based auth

#### 4.1 Update Chat Agent
- File: `packages/api/src/taskflow_api/services/chat_agent.py`
- Change: Pass token via `headers` dict to MCPServerStreamableHttp
- Remove: Token from tool parameter passing

---

### Phase 5: Testing & Validation (25 min)

#### 5.1 Unit Tests
- File: `packages/mcp-server/tests/test_auth.py` (NEW)
- Tests: JWT validation, API key validation, header parsing

#### 5.2 Integration Tests
- Device Flow end-to-end
- MCP tool calls with valid/invalid tokens
- Backward compatibility (dev mode)

#### 5.3 Manual Testing
- Claude Code configuration (if available)
- MCP Inspector authentication

---

## File Structure (New/Modified)

```
sso-platform/
├── src/
│   ├── lib/
│   │   ├── auth.ts                    # MODIFY: Add device flow plugin
│   │   └── trusted-clients.ts         # MODIFY: Add MCP clients
│   └── app/
│       └── auth/
│           └── device/
│               ├── page.tsx           # NEW: Device approval UI
│               └── success/
│                   └── page.tsx       # NEW: Success page

packages/mcp-server/
├── src/
│   └── taskflow_mcp/
│       ├── auth.py                    # NEW: Auth module
│       ├── server.py                  # MODIFY: Add middleware
│       ├── config.py                  # MODIFY: Add SSO config
│       ├── models.py                  # MODIFY: Deprecate auth params
│       └── tools/
│           ├── tasks.py               # MODIFY: Simplify signatures
│           └── projects.py            # MODIFY: Simplify signatures
├── tests/
│   └── test_auth.py                   # NEW: Auth tests
└── pyproject.toml                     # MODIFY: Add dependencies

packages/api/
└── src/
    └── taskflow_api/
        └── services/
            └── chat_agent.py          # MODIFY: Header-based auth
```

---

## Dependencies

### Python (MCP Server)
```toml
[project.dependencies]
PyJWT = {version = ">=2.8.0", extras = ["crypto"]}
httpx = ">=0.27.0"
```

### TypeScript (SSO Platform)
Already has Better Auth with device authorization support.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking ChatKit | Support both modes during transition |
| JWKS endpoint unavailable | Cache keys, graceful degradation |
| Token expiry confusion | Clear error messages |
| Dev mode breaks | Explicit dev mode check preserved |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Device Flow E2E | User code → approval → token |
| JWT validation | Valid token = 200, invalid = 401 |
| API key auth | `tf_*` keys work |
| Tool simplification | 0 tools with auth params |
| Backward compat | Dev mode still works |

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: SSO Platform | 30 min | 30 min |
| Phase 2: MCP Auth | 30 min | 60 min |
| Phase 3: Simplify Tools | 20 min | 80 min |
| Phase 4: ChatKit | 15 min | 95 min |
| Phase 5: Testing | 25 min | 120 min |

**Total: ~2 hours**

