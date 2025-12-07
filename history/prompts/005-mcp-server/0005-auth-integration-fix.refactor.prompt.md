---
id: 0005
title: Auth Integration Fix
stage: refactor
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 005-mcp-server
branch: 005-mcp-server
user: mjunaidca
command: fix
labels: ["mcp", "auth", "jwt", "api-client"]
links:
  spec: specs/005-mcp-server/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/10
files:
  - packages/mcp-server/src/taskflow_mcp/models.py
  - packages/mcp-server/src/taskflow_mcp/api_client.py
  - packages/mcp-server/tests/test_models.py
tests:
  - tests/test_models.py (19 tests passed after adding auth tests)
---

## Prompt

Is the schema and everything perfect? (User questioned auth approach)

Why add auth is it working how - MCP has it's own special auth? M2M auth like in sample panaversity-fs or what?

## Response snapshot

Discovered and fixed authentication mismatch:

**Problem:** Initial implementation used `X-User-ID` header which REST API doesn't recognize. API requires JWT via `Authorization: Bearer` header.

**Analysis:**
- panaversity-fs uses MCP's built-in `token_verifier` for direct M2M auth
- TaskFlow MCP is internal service (only Chat Server calls it)
- Chat Server already validates user JWT, so MCP doesn't need its own auth

**Solution - Three Auth Modes:**

1. **Dev Mode** (`TASKFLOW_DEV_MODE=true`):
   - API must also have `DEV_MODE=true`
   - Sends `X-User-ID` header
   - No tokens required

2. **Production Mode**:
   - Chat Server passes JWT via `access_token` parameter
   - MCP forwards as `Authorization: Bearer` header

3. **Service Token Mode**:
   - `TASKFLOW_SERVICE_TOKEN=xxx` for M2M calls
   - Used for all API requests

**Changes:**
- Added `access_token` field to AuthenticatedInput base model
- Updated API client `_get_headers()` with three-mode logic
- Added 5 new tests for auth scenarios

## Outcome

- Impact: Fixed 401 auth errors when calling REST API
- Tests: 19 tests passed (added 5 auth tests)
- Files: 3 files modified
- Next prompts: Test with Chat Server integration
- Reflection: Should have analyzed API auth requirements during spec phase

## Evaluation notes (flywheel)

- Failure modes observed: Auth mode mismatch between MCP and API
- Graders run and results (PASS/FAIL): pytest PASS (19/19)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Consider service token as default for internal services
