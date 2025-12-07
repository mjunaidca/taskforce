---
id: 006
title: ChatKit Script Loading Fix for Next.js
stage: refactor
date: 2025-12-07
surface: agent
model: claude-opus-4
feature: 005-chatkit-ui
branch: 005-chatkit-ui
user: mjunaidca
command: debugging and fix
labels: [chatkit, script, nextjs, beforeInteractive]
links:
  spec: specs/005-chatkit-ui/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/8
files:
  - web-dashboard/src/app/layout.tsx
  - web-dashboard/src/components/chat/ChatKitWidget.tsx
tests:
  - pnpm build (PASS)
---

## Prompt

Fix ChatKit script loading - 404 error and "ChatKit web component is unavailable"

## Response snapshot

**Problem:**
Console showed:
- `Failed to load resource: 404 (Not Found)`
- `ChatKit web component is unavailable. Verify that the script URL is reachable.`

**Investigation:**
1. Verified script URL is accessible: `curl -sI https://cdn.platform.openai.com/deployments/chatkit/chatkit.js` → HTTP 200
2. Compared with openai-chatkit-advanced-samples (Vite project)
3. Compared with robolearn-interface (Docusaurus)

**Key Insight:**
- Vite: Script in `index.html <head>` loads synchronously before React
- Docusaurus: Script via config with `defer: true`
- Next.js: Need `strategy="beforeInteractive"` in `<head>`

**Initial Approach (Failed):**
- Created `ChatKitScript.tsx` client component with `afterInteractive`
- Script loaded too late, custom element not defined when ChatKit renders

**Solution:**
Updated `layout.tsx` to load script in `<head>` with `beforeInteractive`:

```tsx
<head>
  <Script
    src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
    strategy="beforeInteractive"
  />
</head>
```

**Widget Simplification:**
- Removed manual script injection from ChatKitWidget
- Simplified to just wait for `customElements.whenDefined("openai-chatkit")`

## Outcome

- Impact: Script loads before React hydration, ChatKit renders correctly
- Tests: pnpm build PASS
- Files: 2 files modified
- Next prompts: Test full chat flow
- Reflection: Next.js Script strategy is critical for web component dependencies

## Evaluation notes (flywheel)

- Failure modes observed: afterInteractive too late for web components
- Graders run and results (PASS/FAIL): Build PASS
- Prompt variant (if applicable): Reference-driven debugging
- Next experiment: Verify ChatKit opens on button click
