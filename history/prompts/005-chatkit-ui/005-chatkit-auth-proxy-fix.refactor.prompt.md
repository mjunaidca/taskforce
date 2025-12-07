---
id: 005
title: ChatKit Auth Proxy Integration Fix
stage: refactor
date: 2025-12-07
surface: agent
model: claude-opus-4
feature: 005-chatkit-ui
branch: 005-chatkit-ui
user: mjunaidca
command: debugging and fix
labels: [chatkit, auth, proxy, httponly-cookies]
links:
  spec: specs/005-chatkit-ui/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/8
files:
  - web-dashboard/src/app/api/chatkit/route.ts
  - web-dashboard/src/components/chat/ChatKitWidget.tsx
tests:
  - pnpm build (PASS)
---

## Prompt

Fix ChatKit authentication - id_token not accessible from JavaScript due to httpOnly cookies

## Response snapshot

**Problem Identified:**
Console logs showed: `[ChatKit] No id_token found in cookies`

Root cause: `taskflow_id_token` cookie is set with `httpOnly: true` in callback route, making it inaccessible to JavaScript (security best practice).

**Initial Attempt (Failed):**
- Tried to read cookie via `document.cookie` - doesn't work for httpOnly
- Error: "Authentication token not found"

**Solution: Dedicated ChatKit Proxy Route**

Created `/api/chatkit/route.ts` that:
1. Reads `taskflow_id_token` from httpOnly cookies (server-side)
2. Adds `Authorization: Bearer ${idToken}` header
3. Forwards to backend `/chatkit` endpoint (not `/api/chatkit`)
4. Handles SSE streaming responses properly
5. Forwards custom headers (X-User-ID, X-Page-URL, etc.)

**Key Differences from /api/proxy:**
- Existing proxy adds `/api/` prefix: `/api/proxy/x` → `/api/x`
- ChatKit endpoint is at `/chatkit` not `/api/chatkit`
- ChatKit needs streaming response passthrough

**Widget Update:**
- Changed from `proxyUrl = "/api/proxy"` to `chatkitProxyUrl = "/api/chatkit"`
- Removed direct id_token cookie reading attempt
- Added `credentials: "include"` to fetch

## Outcome

- Impact: ChatKit now routes through authenticated proxy
- Tests: pnpm build PASS
- Files: 1 new route, 1 widget update
- Next prompts: Test full flow with backend
- Reflection: httpOnly cookies require server-side proxy for auth

## Evaluation notes (flywheel)

- Failure modes observed: Can't read httpOnly cookies from JS (expected)
- Graders run and results (PASS/FAIL): Build PASS
- Prompt variant (if applicable): Debug-driven fix
- Next experiment: Verify backend /chatkit endpoint handles request
