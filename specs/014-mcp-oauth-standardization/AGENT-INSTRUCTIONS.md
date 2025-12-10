# Agent Instructions: MCP OAuth Standardization

**Mission**: Transform TaskFlow MCP server from non-standard "token-in-body" to industry-standard OAuth 2.0 authentication.

**Time Budget**: 90-120 minutes

---

## Quick Context

### The Problem
```
Current:  CLI agents like Claude Code CANNOT authenticate
Why:      Our MCP expects tokens in tool parameters (non-standard)
Standard: MCP spec says tokens go in Authorization header
```

### The Solution
```
1. Add Device Flow to SSO Platform (for CLI agents)
2. Add JWT middleware to MCP Server (validate tokens)
3. Simplify tools (remove user_id/access_token params)
4. Update ChatKit (pass token in header)
```

---

## Files to Read First

1. **This spec**: `specs/014-mcp-oauth-standardization/prd.md`
2. **Current MCP server**: `packages/mcp-server/src/taskflow_mcp/server.py`
3. **Current MCP auth model**: `packages/mcp-server/src/taskflow_mcp/models.py`
4. **Current SSO auth**: `sso-platform/src/lib/auth.ts`

---

## Execution Order

### Phase 1: SSO Platform (30 min)

```bash
cd sso-platform
```

1. **Add Device Flow Plugin** to `src/lib/auth.ts`
   - Import: `import { deviceAuthorization } from "better-auth/plugins";`
   - Add to plugins array with config from PRD section 3.1.1

2. **Create Device Auth UI** at `src/app/auth/device/page.tsx`
   - Copy from PRD section 3.1.2
   - Create `src/app/auth/device/success/page.tsx` (simple success message)

3. **Register MCP Clients** in `src/lib/trusted-clients.ts`
   - Add Claude Code client
   - Add Cursor client
   - Add MCP Inspector client
   - See PRD section 3.1.3

4. **Test Device Flow**
   ```bash
   # Start SSO platform
   pnpm dev
   
   # Test device code request
   curl -X POST "http://localhost:3001/api/auth/device/code" \
     -H "Content-Type: application/json" \
     -d '{"client_id": "claude-code-client", "scope": "openid profile"}'
   ```

### Phase 2: MCP Server Auth (30 min)

```bash
cd packages/mcp-server
```

1. **Add PyJWT dependency**
   ```bash
   uv add PyJWT[crypto] httpx
   ```

2. **Create auth module** at `src/taskflow_mcp/auth.py`
   - Copy from PRD section 3.2.1
   - Implements JWT validation via JWKS
   - Implements API key validation
   - Provides `get_current_user()` function

3. **Update config** at `src/taskflow_mcp/config.py`
   - Add `sso_url` and `oauth_client_id` settings
   - See PRD section 3.2.3

4. **Update server** at `src/taskflow_mcp/server.py`
   - Add AuthMiddleware from PRD section 3.2.2
   - Add OAuth metadata endpoint

5. **Test auth middleware**
   ```bash
   # Start MCP server
   uv run python -m taskflow_mcp.server
   
   # Test OAuth metadata
   curl http://localhost:8001/.well-known/oauth-authorization-server
   
   # Test unauthorized access
   curl -X POST http://localhost:8001/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list"}'
   # Should return 401
   ```

### Phase 3: Simplify Tools (20 min)

1. **Update models** at `src/taskflow_mcp/models.py`
   - Remove `AuthenticatedInput` base class (or mark as deprecated)
   - Simplify input models to only have task-specific fields

2. **Update task tools** at `src/taskflow_mcp/tools/tasks.py`
   - Import: `from ..auth import get_current_user`
   - Remove `user_id` and `access_token` from all function signatures
   - Replace with `user = get_current_user()` inside each function
   - See PRD section 3.2.4 for before/after example

3. **Update project tools** at `src/taskflow_mcp/tools/projects.py`
   - Same pattern: remove auth params, use `get_current_user()`

### Phase 4: ChatKit Integration (15 min)

1. **Update chat agent** at `packages/api/src/taskflow_api/services/chat_agent.py`
   - Pass token via headers when creating MCPServerStreamableHttp
   - See PRD section 3.3

### Phase 5: Testing (25 min)

1. **Create auth tests** at `packages/mcp-server/tests/test_auth.py`
   - Test JWT validation
   - Test API key validation
   - Test header parsing

2. **Run all tests**
   ```bash
   cd packages/mcp-server
   uv run pytest -xvs
   ```

3. **End-to-end test**
   ```bash
   # 1. Get a token (via web login or device flow)
   
   # 2. Call MCP with token
   curl -X POST http://localhost:8001/mcp \
     -H "Authorization: Bearer <your-token>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'
   ```

---

## Key Decisions Already Made

1. **Device Flow over MCP Plugin**: Better Auth's MCP plugin requires browser redirect. Device Flow works for true headless clients.

2. **JWT validation via JWKS**: Don't store shared secret. Validate asymmetric tokens via SSO's JWKS endpoint.

3. **API keys still work**: `tf_` prefix keys validated via SSO's `/api/api-key/verify` endpoint.

4. **Dev mode preserved**: `X-User-ID` header still works when `TASKFLOW_DEV_MODE=true`.

5. **Backward compatible**: Old ChatKit can still pass token in params during transition.

---

## Success Criteria

- [ ] Device code request returns `user_code` and `verification_uri`
- [ ] User can approve device via `/auth/device?user_code=XXXX-XXXX`
- [ ] Device token request returns `access_token`
- [ ] MCP server validates JWT via JWKS
- [ ] MCP tools work without `user_id`/`access_token` params
- [ ] OAuth metadata endpoint returns correct URLs
- [ ] API keys (`tf_...`) authenticate successfully

---

## Common Issues

### "JWKS endpoint not found"
- Ensure SSO platform is running
- Check `TASKFLOW_SSO_URL` env var

### "Invalid audience"
- Token was issued for different client
- Check `aud` claim matches `TASKFLOW_OAUTH_CLIENT_ID`

### "Token expired"
- SSO tokens expire in 6 hours by default
- Use refresh token or re-authenticate

### "Device code expired"
- Codes expire in 15 minutes
- User must approve within this window

---

## Report Format

When done, report:

```markdown
## MCP OAuth Standardization Complete

### Implemented
- [ ] SSO: Device Flow plugin added
- [ ] SSO: Device approval UI created
- [ ] SSO: MCP clients registered
- [ ] MCP: Auth middleware added
- [ ] MCP: JWKS validation working
- [ ] MCP: OAuth metadata endpoint added
- [ ] MCP: Tools simplified (no auth params)
- [ ] ChatKit: Header-based auth

### Test Results
- Device Flow: PASS/FAIL
- JWT Validation: PASS/FAIL
- API Key Auth: PASS/FAIL
- Tool Calls: PASS/FAIL

### Files Modified
- sso-platform/src/lib/auth.ts
- sso-platform/src/lib/trusted-clients.ts
- sso-platform/src/app/auth/device/page.tsx
- packages/mcp-server/src/taskflow_mcp/auth.py
- packages/mcp-server/src/taskflow_mcp/server.py
- packages/mcp-server/src/taskflow_mcp/config.py
- packages/mcp-server/src/taskflow_mcp/tools/tasks.py
- packages/mcp-server/src/taskflow_mcp/tools/projects.py
- packages/mcp-server/src/taskflow_mcp/models.py

### Notes
[Any issues, decisions, or follow-ups]
```

