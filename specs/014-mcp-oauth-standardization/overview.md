# Spec 014: MCP OAuth Standardization

**Status**: Ready for Implementation  
**Created**: 2025-12-11  
**Priority**: CRITICAL

---

## Summary

This specification transforms TaskFlow's MCP server from a non-standard implementation to industry-standard OAuth 2.0 authentication, enabling any MCP-compliant client (Claude Code, Cursor, Windsurf, etc.) to authenticate and work with TaskFlow.

---

## The Problem

```
Current Reality:
├── Web users → Better Auth → JWT → Works ✅
├── Chat UI → Token in body → Works (non-standard) ⚠️
└── CLI Agents → ??? → CANNOT AUTHENTICATE ❌
```

TaskFlow passes `user_id` and `access_token` as tool parameters instead of using the standard `Authorization: Bearer` header. This means:

1. **Claude Code can't connect** - No way to obtain/pass tokens
2. **Cursor can't connect** - Same issue
3. **No agent tracking** - Can't tell which agent performed actions
4. **Security concerns** - Tokens visible in tool call logs

---

## The Solution

Implement three complementary authentication methods:

| Method | Use Case | Standard |
|--------|----------|----------|
| **Device Flow** | CLI agents (Claude Code, Cursor) | RFC 8628 |
| **Authorization Code + PKCE** | Browser-based tools | OAuth 2.1 |
| **API Keys** | Automation, CI/CD | Bearer token |

All methods result in tokens passed via `Authorization: Bearer` header.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SSO PLATFORM                                    │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ Device Flow     │  │ OIDC Provider   │  │ API Key Plugin          │ │
│  │ /device/code    │  │ /oauth2/*       │  │ /api-key/verify         │ │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘ │
│           │                     │                        │              │
│           └──────────┬──────────┴────────────────────────┘              │
│                      │                                                  │
│                      ▼                                                  │
│              ┌───────────────┐                                          │
│              │ JWT/API Key   │                                          │
│              └───────┬───────┘                                          │
└──────────────────────┼──────────────────────────────────────────────────┘
                       │
                       │ Authorization: Bearer <token>
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MCP SERVER                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Auth Middleware                                                  │   │
│  │ - Extract token from header                                      │   │
│  │ - Validate JWT via JWKS                                          │   │
│  │ - Validate API key via SSO                                       │   │
│  │ - Set user context                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                       │                                                 │
│                       ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ MCP Tools (Simplified)                                           │   │
│  │                                                                  │   │
│  │ @mcp.tool()                                                      │   │
│  │ def list_tasks(project_id: int):  # No user_id/token params!    │   │
│  │     user = get_current_user()     # From middleware              │   │
│  │     ...                                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `prd.md` | Full Product Requirements Document |
| `AGENT-INSTRUCTIONS.md` | Execution guide for implementing agent |

---

## Implementation Phases

| Phase | Time | Scope |
|-------|------|-------|
| 1. SSO Platform | 30 min | Device Flow plugin, UI, client registration |
| 2. MCP Auth | 30 min | JWT middleware, JWKS validation |
| 3. Simplify Tools | 20 min | Remove auth params from tools |
| 4. ChatKit | 15 min | Update to header-based auth |
| 5. Testing | 25 min | E2E tests, documentation |

**Total**: 90-120 minutes

---

## Success Criteria

- [ ] Claude Code can authenticate via Device Flow
- [ ] JWT validated via SSO's JWKS endpoint
- [ ] API keys work for automation
- [ ] Tools don't require `user_id`/`access_token` params
- [ ] OAuth metadata at `/.well-known/oauth-authorization-server`
- [ ] Backward compatible during transition

---

## Why This Matters

This is **the feature** that makes TaskFlow a real human-agent collaboration platform:

> "Without this, we built a task manager only humans can use.  
> With this, we built a platform where AI agents are first-class citizens."

After implementation:
- Claude Code can autonomously work on tasks
- Cursor can access TaskFlow context
- Any MCP client can integrate
- Agent actions are auditable
- Token revocation works per-client

