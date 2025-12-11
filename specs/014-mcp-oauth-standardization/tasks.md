# Tasks: MCP OAuth Standardization

**Feature**: 014-mcp-oauth-standardization  
**Plan**: `plan.md`  
**Created**: 2025-12-11

---

## Phase 1: SSO Platform (30 min)

### T1.1 Add Device Flow Plugin
- [ ] **File**: `sso-platform/src/lib/auth.ts`
- [ ] Import `deviceAuthorization` from `better-auth/plugins`
- [ ] Add to plugins array with config:
  ```typescript
  deviceAuthorization({
    deviceCodeExpiresIn: 60 * 15,  // 15 minutes
    pollingInterval: 5,             // 5 seconds
    verificationUri: `${process.env.BETTER_AUTH_URL}/auth/device`,
  })
  ```

### T1.2 Register MCP Clients
- [ ] **File**: `sso-platform/src/lib/trusted-clients.ts`
- [ ] Add `claude-code-client` (public, device flow)
- [ ] Add `cursor-client` (public, device flow)
- [ ] Add `mcp-inspector` (public, auth code + PKCE)
- [ ] Set scopes: `openid`, `profile`, `email`, `taskflow:read`, `taskflow:write`

### T1.3 Create Device Approval UI
- [ ] **File**: `sso-platform/src/app/auth/device/page.tsx` (NEW)
- [ ] Code input field (XXXX-XXXX format)
- [ ] Device info display after code verification
- [ ] Approve/Deny buttons
- [ ] Loading and error states

### T1.4 Create Success Page
- [ ] **File**: `sso-platform/src/app/auth/device/success/page.tsx` (NEW)
- [ ] Success message
- [ ] "You can close this window" text

---

## Phase 2: MCP Server Auth (30 min)

### T2.1 Add Dependencies
- [ ] `cd packages/mcp-server && uv add "PyJWT[crypto]" httpx`

### T2.2 Create Auth Module
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/auth.py` (NEW)
- [ ] `AuthenticatedUser` dataclass with fields: id, email, tenant_id, name, token, token_type
- [ ] `get_jwks_client()` - PyJWKClient with caching
- [ ] `validate_jwt(token)` - Decode and validate via JWKS
- [ ] `validate_api_key(api_key)` - Call SSO `/api/api-key/verify`
- [ ] `authenticate(authorization_header)` - Main entry, routes to JWT or API key
- [ ] `get_current_user()` / `set_current_user()` - Context management

### T2.3 Update Config
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/config.py`
- [ ] Add `sso_url` (default: `http://localhost:3001`)
- [ ] Add `oauth_client_id` (default: `taskflow-mcp`)

### T2.4 Add Auth Middleware to Server
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/server.py`
- [ ] Create `AuthMiddleware` class
- [ ] Handle public paths: `/health`, `/.well-known/oauth-authorization-server`
- [ ] Extract `Authorization: Bearer` header
- [ ] Call `authenticate()`, set user context
- [ ] Return 401 with WWW-Authenticate header on failure
- [ ] Preserve dev mode: `X-User-ID` header when `TASKFLOW_DEV_MODE=true`

### T2.5 Add OAuth Metadata Endpoint
- [ ] Add to `AuthMiddleware` or separate route
- [ ] Path: `/.well-known/oauth-authorization-server`
- [ ] Return JSON with issuer, endpoints, scopes, grant types

---

## Phase 3: Simplify Tools (20 min)

### T3.1 Update Task Tools
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/tools/tasks.py`
- [ ] Import `get_current_user` from `..auth`
- [ ] Remove `user_id: str` param from all tools
- [ ] Remove `access_token: str | None` param from all tools
- [ ] Add `user = get_current_user()` at start of each tool function
- [ ] Use `user.id` and `user.token` in API calls

**Tools to update:**
- [ ] `list_tasks`
- [ ] `add_task`
- [ ] `get_task`
- [ ] `update_task`
- [ ] `delete_task`
- [ ] `start_task`
- [ ] `complete_task`
- [ ] `request_review`
- [ ] `update_progress`
- [ ] `assign_task`

### T3.2 Update Project Tools
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/tools/projects.py`
- [ ] Same pattern: remove auth params, use `get_current_user()`

**Tools to update:**
- [ ] `list_projects`

### T3.3 Update/Deprecate Models
- [ ] **File**: `packages/mcp-server/src/taskflow_mcp/models.py`
- [ ] Option A: Remove `AuthenticatedInput` class
- [ ] Option B: Keep but add deprecation comment
- [ ] Update input models to remove inherited auth fields

---

## Phase 4: ChatKit Integration (15 min)

### T4.1 Update Chat Agent
- [ ] **File**: `packages/api/src/taskflow_api/services/chat_agent.py`
- [ ] Find MCPServerStreamableHttp initialization
- [ ] Add `headers={"Authorization": f"Bearer {token}"}` parameter
- [ ] Ensure token is available in chat context
- [ ] Remove any token-in-params logic

---

## Phase 5: Testing & Validation (25 min)

### T5.1 Create Auth Tests
- [ ] **File**: `packages/mcp-server/tests/test_auth.py` (NEW)
- [ ] Test `validate_jwt` with mock JWKS
- [ ] Test `validate_api_key` with mock SSO endpoint
- [ ] Test `authenticate` header parsing
- [ ] Test error cases (missing header, invalid token)

### T5.2 Update Existing Tests
- [ ] Update any tests that pass `user_id`/`access_token` to tools
- [ ] Mock `get_current_user()` in tool tests

### T5.3 Run Test Suite
- [ ] `cd packages/mcp-server && uv run pytest -xvs`
- [ ] Fix any failures

### T5.4 Manual Testing Checklist
- [ ] Start SSO Platform: `cd sso-platform && pnpm dev`
- [ ] Start MCP Server: `cd packages/mcp-server && uv run python -m taskflow_mcp.server`
- [ ] Test OAuth metadata: `curl http://localhost:8001/.well-known/oauth-authorization-server`
- [ ] Test 401 without token: `curl -X POST http://localhost:8001/mcp -d '{}'`
- [ ] Test dev mode: `curl -X POST http://localhost:8001/mcp -H "X-User-ID: test" -d '{}'`
- [ ] Test Device Flow (if SSO running)

---

## Checkpoint Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1 | T1.1-T1.4 | 30 min |
| Phase 2 | T2.1-T2.5 | 30 min |
| Phase 3 | T3.1-T3.3 | 20 min |
| Phase 4 | T4.1 | 15 min |
| Phase 5 | T5.1-T5.4 | 25 min |

**Total**: ~120 min

---

## Definition of Done

- [x] Device Flow plugin added to SSO Platform
- [x] MCP clients registered in trusted-clients.ts
- [x] Device approval UI created and functional
- [x] Auth middleware validates JWT via JWKS
- [x] Auth middleware validates API keys via SSO
- [x] OAuth metadata endpoint returns correct JSON
- [x] All tools use `get_current_user()` instead of params
- [x] ChatKit passes token via Authorization header
- [x] All tests pass (29 tests)
- [x] Dev mode backward compatibility preserved

## Implementation Complete

**Date**: 2025-12-11
**Tests**: 29 passed
**Files Created**:
- `sso-platform/src/app/auth/device/page.tsx` (Device approval UI)
- `sso-platform/src/app/auth/device/success/page.tsx` (Success page)
- `packages/mcp-server/src/taskflow_mcp/auth.py` (Auth module)
- `packages/mcp-server/tests/test_auth.py` (Auth tests)

**Files Modified**:
- `sso-platform/src/lib/auth.ts` (Device Flow plugin)
- `sso-platform/src/lib/trusted-clients.ts` (MCP clients)
- `packages/mcp-server/src/taskflow_mcp/server.py` (Auth middleware)
- `packages/mcp-server/src/taskflow_mcp/config.py` (SSO config)
- `packages/mcp-server/src/taskflow_mcp/models.py` (Simplified)
- `packages/mcp-server/src/taskflow_mcp/tools/tasks.py` (Auth removed)
- `packages/mcp-server/src/taskflow_mcp/tools/projects.py` (Auth removed)
- `packages/mcp-server/tests/test_models.py` (Updated for new models)
- `packages/api/src/taskflow_api/services/chat_agent.py` (System prompt)
- `packages/api/src/taskflow_api/services/chatkit_server.py` (Header auth)

