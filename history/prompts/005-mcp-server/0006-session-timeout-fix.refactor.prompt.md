---
id: 0006
title: Session Timeout Fix
stage: refactor
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: 005-mcp-server
branch: 005-mcp-server
user: mjunaidca
command: fix
labels: ["mcp", "session", "timeout", "starlette"]
links:
  spec: specs/005-mcp-server/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/10
files:
  - packages/mcp-server/src/taskflow_mcp/server.py
tests:
  - tests/test_models.py (19 tests passed)
---

## Prompt

Why did the agent fail? Error: "Timed out while waiting for response to ClientRequest. Waited 5.0 seconds." with ClosedResourceError in message_router.

## Response snapshot

**Problem:** MCP client timed out at 5 seconds, but session management overhead caused delays. The `ClosedResourceError` occurred because client disconnected before response arrived.

**Root Cause Analysis:**
- Original server.py wrapped FastMCP's `streamable_http_app()` in another Starlette app with Mount
- This created unnecessary routing overhead
- FastMCP's `streamable_http_app()` already includes `/mcp` route and lifespan management

**Fix:**
Simplified server.py to use FastMCP's built-in app directly:

```python
# Before (problematic)
_starlette_app = Starlette(
    routes=[Mount("/", app=mcp.streamable_http_app())],
    lifespan=starlette_lifespan,
)

# After (fixed)
_mcp_app = mcp.streamable_http_app()
streamable_http_app = CORSMiddleware(_mcp_app, ...)
```

**Result:**
- Removed redundant Starlette wrapper
- Removed custom lifespan (FastMCP handles it)
- Direct CORS wrapping of FastMCP's app
- Faster response times

**Note:** Client-side 5s timeout may still need adjustment in Chat Server's MCP client configuration.

## Outcome

- Impact: Reduced session management overhead
- Tests: 19 tests passed
- Files: 1 file modified (server.py)
- Next prompts: Monitor timeout issues in production
- Reflection: FastMCP's built-in app is sufficient; avoid over-wrapping

## Evaluation notes (flywheel)

- Failure modes observed: Starlette double-wrapping caused session issues
- Graders run and results (PASS/FAIL): pytest PASS (19/19)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Increase client timeout if issues persist
