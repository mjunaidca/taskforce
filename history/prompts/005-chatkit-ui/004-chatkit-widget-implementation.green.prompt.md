---
id: 004
title: ChatKit Widget Implementation with ChatKit React
stage: green
date: 2025-12-07
surface: agent
model: claude-opus-4
feature: 005-chatkit-ui
branch: 005-chatkit-ui
user: mjunaidca
command: manual implementation
labels: [chatkit, widget, implementation, openai-chatkit-react]
links:
  spec: specs/005-chatkit-ui/spec.md
  ticket: null
  adr: null
  pr: https://github.com/mjunaidca/taskforce/pull/8
files:
  - web-dashboard/src/components/chat/ChatKitWidget.tsx
  - web-dashboard/src/components/chat/index.tsx
  - web-dashboard/src/components/chat/styles.module.css
  - web-dashboard/src/app/layout.tsx
  - web-dashboard/src/app/dashboard/layout.tsx
  - web-dashboard/src/app/projects/layout.tsx
  - web-dashboard/package.json
tests:
  - pnpm build (PASS)
---

## Prompt

Implement ChatKit UI using @openai/chatkit-react library following robolearn-interface pattern, integrated into TaskFlow web-dashboard

## Response snapshot

Implemented ChatKitWidget with full feature set:

**Package Installation:**
- Added @openai/chatkit-react to web-dashboard

**ChatKitWidget.tsx (650+ lines):**
- useChatKit hook integration with custom fetch
- Script loading via Next.js Script (beforeInteractive)
- Floating chat button (bottom-right)
- Auth integration with AuthProvider
- Project context from URL (usePathname, useParams)
- Text selection "Ask" feature
- Page context extraction (URL, title, headings)
- Custom fetch with context metadata injection
- Personalize menu with quick actions
- Login prompt for unauthenticated users

**Script Loading Strategy:**
- Initial attempt: Client component with Script afterInteractive
- Issue: 404 errors, "ChatKit web component unavailable"
- Solution: Move to layout.tsx with beforeInteractive strategy
- Result: Script loads in <head> before React hydration

**Layout Integration:**
- Added ChatKitWidget to dashboard/layout.tsx
- Added ChatKitWidget to projects/layout.tsx
- Added Script to root layout.tsx

**Styling:**
- IFK-themed CSS module (styles.module.css)
- Dark theme matching dashboard

## Outcome

- Impact: Functional floating chat widget on all dashboard pages
- Tests: pnpm build PASS
- Files: 7 files created/modified
- Next prompts: Fix auth token issue (httpOnly cookies)
- Reflection: Script loading in Next.js App Router requires beforeInteractive in layout

## Evaluation notes (flywheel)

- Failure modes observed: Script 404 with afterInteractive strategy
- Graders run and results (PASS/FAIL): Build PASS, Runtime needs auth fix
- Prompt variant (if applicable): Implementation based on robolearn-interface
- Next experiment: Route through proxy for httpOnly cookie auth
