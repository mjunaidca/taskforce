---
id: 005
title: RoboLearn genericOAuth Redirect URI Fix
stage: green
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20250114
feature: 008-social-login-providers
branch: 008-social-login-providers
user: mjs
command: debugging/fix
labels: ["bugfix", "oauth", "genericOAuth", "redirect-uri", "robolearn"]
links:
  spec: specs/008-social-login-providers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - sso-platform/src/lib/auth.ts
  - sso-platform/docs/social-login-providers.md
  - sso-platform/.env.example
tests: []
---

## Prompt

User encountered INVALID_REDIRECT_URI error when testing RoboLearn SSO integration:

```
https://robolearn-sso.vercel.app/api/auth/oauth2/authorize?response_type=code&client_id=NHFT-n2IdTC5FnVO9ZFxheQjFSLeYCxI&state=dwnm1qatYDPaiH4AuRdhEIYF2pdAiGDB&scope=openid+profile+email&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Foauth2%2Fcallback%2Frobolearn

{"code":"INVALID_REDIRECT_URI","message":"Invalid redirect URI"}
```

## Response snapshot

**Root Cause Identified**: Better Auth's `genericOAuth` plugin uses a different callback path pattern than built-in social providers:

| Provider Type | Callback Path Pattern |
|---------------|----------------------|
| Built-in (Google, GitHub) | `/api/auth/callback/{provider}` |
| genericOAuth (RoboLearn) | `/api/auth/oauth2/callback/{providerId}` |

The documentation and .env.example incorrectly showed `/api/auth/callback/robolearn` when the actual path is `/api/auth/oauth2/callback/robolearn`.

**Fix Applied**: Updated documentation and code comments to reflect the correct callback URL pattern:

1. `auth.ts` - Updated comment to clarify genericOAuth callback path
2. `docs/social-login-providers.md` - Fixed redirect URI tables and added explanatory notes
3. `.env.example` - Updated RoboLearn section with correct callback URL

**Action Required**: User needs to update RoboLearn SSO's registered redirect URI from:
- OLD: `http://localhost:3001/api/auth/callback/robolearn`
- NEW: `http://localhost:3001/api/auth/oauth2/callback/robolearn`

## Outcome

- Impact: Fixed documentation to reflect correct genericOAuth callback URL pattern
- Tests: TypeScript compilation PASS
- Files: 3 files modified (auth.ts, social-login-providers.md, .env.example)
- Next prompts: User to update redirect URI in RoboLearn SSO admin panel, then retest
- Reflection: Better Auth's genericOAuth plugin has different callback path than socialProviders - this distinction wasn't clear in initial implementation

## Evaluation notes (flywheel)

- Failure modes observed: Documentation showed wrong callback URL for genericOAuth providers
- Graders run and results (PASS/FAIL): TypeScript compilation PASS
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add automated callback URL validation in dev mode
