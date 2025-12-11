---
id: 0001
title: MCP OAuth 2.0 Standardization Implementation
stage: green
date: 2025-12-11
surface: agent
model: Claude Opus 4.5
feature: 014-mcp-oauth-standardization
branch: main
user: mjs
command: /sp.orchestrate /sp.specify
labels: [oauth, mcp, device-flow, api-keys, authentication, agents]
links:
  spec: specs/014-mcp-oauth-standardization/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - sso-platform/src/lib/auth.ts
  - sso-platform/src/lib/trusted-clients.ts
  - sso-platform/src/app/auth/device/page.tsx
  - sso-platform/src/app/auth/device/success/page.tsx
  - packages/mcp-server/src/taskflow_mcp/auth.py
  - packages/mcp-server/src/taskflow_mcp/config.py
  - packages/mcp-server/src/taskflow_mcp/models.py
  - packages/mcp-server/src/taskflow_mcp/server.py
  - packages/mcp-server/src/taskflow_mcp/tools/tasks.py
  - packages/mcp-server/tests/test_auth.py
  - packages/mcp-server/tests/test_models.py
  - packages/api/src/taskflow_api/services/chatkit_server.py
  - packages/api/src/taskflow_api/services/chat_agent.py
tests:
  - packages/mcp-server/tests/test_auth.py (12 tests)
  - packages/mcp-server/tests/test_models.py (17 tests)
---

## Prompt

Implement OAuth 2.0 Device Flow for MCP server to enable Claude Code, Cursor, and any MCP client to authenticate using standard HTTP Authorization headers instead of embedding access_token in tool parameters.

Key requirements:
1. SSO Platform: Enable Device Authorization Flow plugin, register MCP clients
2. MCP Server: Add auth middleware extracting JWT from Authorization header
3. MCP Server: Add OAuth metadata and JWKS endpoints
4. Tool Signatures: Remove user_id/access_token from tool params
5. ChatKit: Update to pass Authorization header to MCP calls

## Response snapshot

Successfully implemented OAuth 2.0 Device Flow standardization for MCP authentication:

**SSO Platform Changes:**
- Enabled Device Authorization Flow plugin in Better Auth config
- Registered 4 MCP clients: Claude Code, Cursor, MCP Inspector, Windsurf
- Created Device Flow UI pages at /auth/device and /auth/device/success

**MCP Server Changes:**
- Created new auth.py module with JWT/API key validation via JWKS
- Implemented AuthMiddleware extracting tokens from Authorization header
- Added /.well-known/oauth-authorization-server metadata endpoint
- Added /.well-known/jwks.json endpoint
- Updated config.py with sso_url for JWKS discovery
- Refactored models.py: Removed AuthenticatedInput, created V2 models without auth params
- Updated all tool functions to use get_current_user() from auth middleware

**ChatKit Integration:**
- Updated MCPServerStreamableHttp initialization to pass Authorization header
- Migrated all direct mcp_server.call_tool() calls to use _call_mcp_tool() helper
- Removed redundant user_id/access_token from tool arguments
- Cleaned up system prompt - no longer instructs agent to pass auth params
- Fixed bug: priority and assignee_id now properly passed in task creation

**Tests:**
- 29 tests pass (12 auth tests + 17 model tests)
- All lint checks pass

## Outcome

- ✅ Impact: MCP server now accepts standard OAuth 2.0 tokens via Authorization header, enabling CLI agents (Claude Code, Cursor) to authenticate
- 🧪 Tests: 29 passed (test_auth.py: 12, test_models.py: 17)
- 📁 Files: 13 files modified/created
- 🔁 Next prompts: Integration testing with actual Claude Code/Cursor clients
- 🧠 Reflection: Token standardization (body → header) is a critical step for MCP ecosystem compatibility

## Evaluation notes (flywheel)

- Failure modes observed: MCPServerStreamableHttp SDK requires headers in params dict, not separate argument
- Graders run and results (PASS/FAIL): Lint PASS, pytest PASS (29/29)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test Device Flow end-to-end with MCP Inspector

