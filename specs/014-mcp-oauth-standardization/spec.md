# Spec: MCP OAuth Standardization

**Feature**: 014-mcp-oauth-standardization  
**Status**: Ready for Implementation  
**Created**: 2025-12-11  
**Author**: Agent 5 (MCP Auth Specialist)

---

## Intent

Transform TaskFlow's MCP server from non-standard "token-in-body" authentication to **industry-standard OAuth 2.0**, enabling CLI agents (Claude Code, Cursor, Windsurf) to authenticate via Device Authorization Flow (RFC 8628).

### Why This Matters

**Constitution Principle**: "Agents Are First-Class Citizens"

Currently, only humans with browsers can authenticate. CLI agents cannot connect because:
1. No OAuth Device Flow support for headless clients
2. MCP server expects tokens in tool parameters (non-standard)
3. No `Authorization: Bearer` header support

### Target State

```
Web User   → Better Auth → JWT Cookie    → Works ✅
Chat UI    → OAuth       → JWT in Header → Works ✅
CLI Agent  → Device Flow → JWT in Header → Works ✅
API Key    → Bearer      → Validated     → Works ✅
```

---

## Evals (Success Criteria)

### E1: Device Flow Works End-to-End
```bash
# Request device code
curl -X POST "https://sso.taskflow.app/api/auth/device/code" \
  -d '{"client_id": "claude-code-client", "scope": "openid profile"}'
# Returns: { device_code, user_code, verification_uri }

# User approves at verification_uri

# Exchange for token
curl -X POST "https://sso.taskflow.app/api/auth/device/token" \
  -d '{"client_id": "claude-code-client", "device_code": "..."}'
# Returns: { access_token, refresh_token, expires_in }
```
**Pass**: Token returned after user approval  
**Fail**: Any step returns error or no token

### E2: JWT Validation via JWKS
```bash
curl -X POST "http://localhost:8001/mcp" \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# Returns: List of tools (authenticated)

curl -X POST "http://localhost:8001/mcp" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# Returns: 401 Unauthorized
```
**Pass**: Valid JWT returns tools, missing/invalid returns 401  
**Fail**: No auth check or wrong status codes

### E3: API Key Authentication
```bash
curl -X POST "http://localhost:8001/mcp" \
  -H "Authorization: Bearer tf_test_api_key_123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# Returns: List of tools (authenticated via API key)
```
**Pass**: API keys starting with `tf_` authenticate successfully  
**Fail**: API keys rejected or not validated

### E4: Simplified Tool Signatures
```python
# BEFORE (non-standard)
@mcp.tool()
def list_tasks(user_id: str, access_token: str, project_id: int): ...

# AFTER (standard)
@mcp.tool()
def list_tasks(project_id: int):
    user = get_current_user()  # From middleware
    ...
```
**Pass**: No tool has `user_id` or `access_token` parameters  
**Fail**: Auth params still in tool signatures

### E5: OAuth Metadata Endpoint
```bash
curl http://localhost:8001/.well-known/oauth-authorization-server
# Returns: { issuer, authorization_endpoint, token_endpoint, ... }
```
**Pass**: Returns valid OAuth metadata JSON  
**Fail**: 404 or malformed response

### E6: Backward Compatibility (Dev Mode)
```bash
# Dev mode still works
TASKFLOW_DEV_MODE=true
curl -X POST "http://localhost:8001/mcp" \
  -H "X-User-ID: test-user" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# Returns: Tools (dev mode bypass)
```
**Pass**: X-User-ID header works when dev mode enabled  
**Fail**: Dev mode broken

### E7: ChatKit Integration Preserved
**Pass**: ChatKit can authenticate MCP calls via Authorization header  
**Fail**: ChatKit integration broken

---

## Constraints

### C1: No Breaking Changes to ChatKit
ChatKit must continue working throughout migration. Support both:
- Old: Token in tool parameters (deprecated, log warning)
- New: Token in Authorization header (preferred)

### C2: Preserve Dev Mode
`TASKFLOW_DEV_MODE=true` must still work with `X-User-ID` header for local development without OAuth.

### C3: Use Existing Better Auth Infrastructure
Must use the existing SSO Platform (`sso-platform/`) with Better Auth. No new auth providers.

### C4: JWT Validation via JWKS
Must validate JWTs using SSO's JWKS endpoint (`/.well-known/jwks.json`), not shared secrets.

### C5: API Key Format
API keys must start with `tf_` prefix and be validated via SSO's `/api/api-key/verify` endpoint.

### C6: No Hardcoded Secrets
All configuration via environment variables:
- `TASKFLOW_SSO_URL`
- `TASKFLOW_OAUTH_CLIENT_ID`
- `TASKFLOW_DEV_MODE`

---

## Non-Goals

### NG1: Token Refresh in MCP Server
MCP server does not handle token refresh. Clients are responsible for refreshing tokens.

### NG2: User Registration via MCP
Users must register via web UI. MCP only authenticates existing users.

### NG3: Custom Token Format
Use standard JWTs from Better Auth. No custom token formats.

### NG4: Full OIDC Discovery
Only implement `.well-known/oauth-authorization-server`. Full OIDC discovery is out of scope.

### NG5: Rate Limiting in MCP
Rate limiting handled by SSO Platform, not MCP server.

---

## Acceptance Tests

### AT1: Claude Code Configuration
User can add TaskFlow to `.mcp.json` with OAuth config and authenticate via Device Flow.

### AT2: Cursor Configuration  
User can configure Cursor to use TaskFlow MCP server with OAuth authentication.

### AT3: MCP Inspector
MCP Inspector can connect and authenticate to TaskFlow MCP server.

### AT4: Existing Functionality Preserved
All existing MCP tools continue to work for authenticated users.

### AT5: Audit Trail
All MCP operations create audit entries with correct user identity from token.

---

## Technical Context

### Current Implementation
- MCP Server: `packages/mcp-server/src/taskflow_mcp/`
- SSO Platform: `sso-platform/src/lib/auth.ts`
- ChatKit: `packages/api/src/taskflow_api/services/chat_agent.py`

### Key Files to Modify
1. `sso-platform/src/lib/auth.ts` - Add Device Flow plugin
2. `sso-platform/src/lib/trusted-clients.ts` - Register MCP clients
3. `sso-platform/src/app/auth/device/page.tsx` - Device approval UI (NEW)
4. `packages/mcp-server/src/taskflow_mcp/auth.py` - Auth module (NEW)
5. `packages/mcp-server/src/taskflow_mcp/server.py` - Auth middleware
6. `packages/mcp-server/src/taskflow_mcp/tools/*.py` - Simplify signatures

### Dependencies to Add
```bash
# MCP Server
uv add "PyJWT[crypto]" httpx
```

---

## References

- **PRD**: `specs/014-mcp-oauth-standardization/prd.md` (full implementation details)
- **OAuth Device Flow**: RFC 8628
- **Better Auth Docs**: Device Authorization plugin
- **MCP Spec**: Authorization section
- **Constitution**: Section II, Principle 2 (Agents Are First-Class Citizens)

