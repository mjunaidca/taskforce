# Agent 5 Prompt: MCP OAuth Standardization

Copy everything below the line to give to the implementing agent:

---

## /sp.orchestrate

You are **Agent 5** for Phase V of TaskFlow. Your mission is to implement **standards-compliant OAuth 2.0 authentication** for the MCP server, enabling CLI agents like Claude Code and Cursor to authenticate and work with TaskFlow.

## Context

TaskFlow is a task management platform where **AI agents are first-class citizens**. Currently, our MCP server uses a non-standard approach where `user_id` and `access_token` are passed as tool parameters. This means:

- ❌ Claude Code cannot connect (no way to get/pass tokens)
- ❌ Cursor cannot connect (same issue)  
- ❌ No standard MCP client works

After your implementation:

- ✅ Any MCP client can authenticate via OAuth Device Flow
- ✅ Tokens passed via standard `Authorization: Bearer` header
- ✅ API keys work for automation
- ✅ Agent actions are auditable

## Required Reading (IN ORDER)

1. **Execution Checklist**: `specs/014-mcp-oauth-standardization/AGENT-INSTRUCTIONS.md`
2. **Full PRD**: `specs/014-mcp-oauth-standardization/prd.md`
3. **Current MCP Server**: `packages/mcp-server/src/taskflow_mcp/server.py`
4. **Current Auth Model**: `packages/mcp-server/src/taskflow_mcp/models.py`
5. **SSO Auth Config**: `sso-platform/src/lib/auth.ts`

## Time Budget

**90-120 minutes** total:
- Phase 1: SSO Platform (30 min)
- Phase 2: MCP Auth Middleware (30 min)
- Phase 3: Simplify Tools (20 min)
- Phase 4: ChatKit Update (15 min)
- Phase 5: Testing (25 min)

## Key Deliverables

### 1. SSO Platform - Device Authorization Flow

Add Better Auth's Device Flow plugin for headless CLI authentication:

```typescript
// sso-platform/src/lib/auth.ts
import { deviceAuthorization } from "better-auth/plugins";

plugins: [
  // ... existing plugins ...
  deviceAuthorization({
    deviceCodeExpiresIn: 60 * 15,
    pollingInterval: 5,
    verificationUri: `${process.env.BETTER_AUTH_URL}/auth/device`,
  }),
]
```

Create device approval UI at `sso-platform/src/app/auth/device/page.tsx`.

Register MCP clients in `sso-platform/src/lib/trusted-clients.ts`:
- `claude-code-client` (Device Flow)
- `cursor-client` (Device Flow)
- `mcp-inspector` (Auth Code + PKCE)

### 2. MCP Server - Auth Middleware

Create `packages/mcp-server/src/taskflow_mcp/auth.py`:
- JWT validation via SSO's JWKS endpoint
- API key validation via SSO's verify endpoint
- `get_current_user()` function for tools

Update `packages/mcp-server/src/taskflow_mcp/server.py`:
- Add `AuthMiddleware` class
- Validate `Authorization: Bearer` header
- Add OAuth metadata endpoint at `/.well-known/oauth-authorization-server`

### 3. Simplify Tool Signatures

Transform all tools from:
```python
# BEFORE (non-standard)
@mcp.tool()
def list_tasks(user_id: str, access_token: str, project_id: int): ...
```

To:
```python
# AFTER (standard)
@mcp.tool()
def list_tasks(project_id: int):
    user = get_current_user()  # From auth middleware
    ...
```

### 4. ChatKit Integration

Update `packages/api/src/taskflow_api/services/chat_agent.py` to pass token via header instead of tool parameters.

## Success Criteria

- [ ] Device code request returns `user_code` and `verification_uri`
- [ ] User can approve device at `/auth/device?user_code=XXXX-XXXX`
- [ ] Device token exchange returns `access_token`
- [ ] MCP server validates JWT via JWKS
- [ ] MCP tools work without `user_id`/`access_token` params
- [ ] OAuth metadata endpoint returns correct URLs
- [ ] API keys (`tf_...`) authenticate successfully
- [ ] All tests pass

## Testing Commands

```bash
# 1. Test Device Flow
curl -X POST "http://localhost:3001/api/auth/device/code" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "claude-code-client", "scope": "openid profile"}'

# 2. Test OAuth Metadata
curl http://localhost:8001/.well-known/oauth-authorization-server

# 3. Test MCP with Token
curl -X POST "http://localhost:8001/mcp" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 4. Run MCP tests
cd packages/mcp-server && uv run pytest -xvs
```

## Dependencies to Add

```bash
# MCP Server
cd packages/mcp-server
uv add "PyJWT[crypto]" httpx
```

## Report Format

When complete, report:

```markdown
## MCP OAuth Standardization Complete

### Implemented
- [ ] SSO: Device Flow plugin added
- [ ] SSO: Device approval UI created  
- [ ] SSO: MCP clients registered (claude-code, cursor, inspector)
- [ ] MCP: Auth middleware with JWKS validation
- [ ] MCP: OAuth metadata endpoint
- [ ] MCP: Tools simplified (no auth params)
- [ ] ChatKit: Header-based auth

### Test Results
- Device Flow: PASS/FAIL
- JWT Validation: PASS/FAIL
- API Key Auth: PASS/FAIL
- Tool Calls: PASS/FAIL

### Files Created
- sso-platform/src/app/auth/device/page.tsx
- sso-platform/src/app/auth/device/success/page.tsx
- packages/mcp-server/src/taskflow_mcp/auth.py
- packages/mcp-server/tests/test_auth.py

### Files Modified
- sso-platform/src/lib/auth.ts
- sso-platform/src/lib/trusted-clients.ts
- packages/mcp-server/src/taskflow_mcp/server.py
- packages/mcp-server/src/taskflow_mcp/config.py
- packages/mcp-server/src/taskflow_mcp/tools/tasks.py
- packages/mcp-server/src/taskflow_mcp/tools/projects.py
- packages/mcp-server/src/taskflow_mcp/models.py
- packages/api/src/taskflow_api/services/chat_agent.py

### Notes
[Any issues, decisions, or follow-ups]
```

## Important Notes

1. **Dev Mode Preserved**: `X-User-ID` header still works when `TASKFLOW_DEV_MODE=true`
2. **Backward Compatible**: Keep old param-based auth during transition (log deprecation warning)
3. **No Breaking Changes**: ChatKit continues to work throughout migration
4. **Follow TDD**: Write tests first, then implement

## Constitution Reminder

> **"Agents Are First-Class Citizens"** - If humans can do it, agents can do it.

This feature is what makes that principle real. Without it, TaskFlow is just another task manager. With it, TaskFlow is a platform where AI agents can autonomously work alongside humans.

---

**Bold Engineer Mode: Default to action. Ship fast. Make agents first-class citizens.**

