---
id: 0001
title: Social Login Providers Implementation Plan
stage: plan
date: 2025-12-08
surface: agent
model: claude-sonnet-4-5-20250929
feature: 008-social-login-providers
branch: 008-social-login-providers
user: mjs
command: Create implementation plan
labels: ["social-login", "oauth", "better-auth", "planning"]
links:
  spec: /Users/mjs/Documents/code/mjunaidca/tf-k8/tf-sso/specs/008-social-login-providers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/008-social-login-providers/plan.md
tests:
  - Manual testing checklist defined
---

## Prompt

Create an implementation plan for the 008-social-login-providers feature.

**Specification**: /Users/mjs/Documents/code/mjunaidca/tf-k8/tf-sso/specs/008-social-login-providers/spec.md

**Feature Summary**:
Add optional social login providers (Google, GitHub, RoboLearn SSO) to Taskflow SSO Platform:
- Google OAuth 2.0 via Better Auth socialProviders
- GitHub OAuth via Better Auth socialProviders
- RoboLearn SSO via Better Auth genericOAuth plugin
- All providers toggleable via environment variables
- No schema changes required (uses existing account/user tables)

**Existing Architecture** (from previous analysis):
- SSO Platform: sso-platform/ directory
- Auth config: src/lib/auth.ts (Better Auth with OIDC provider, JWT, admin, organization plugins)
- Auth client: src/lib/auth-client.ts
- Schema: auth-schema.ts (account table already has providerId, accountId fields)

**Planning Requirements**:
1. **Technical Architecture**: How to integrate socialProviders and genericOAuth
2. **Component Breakdown**:
   - Backend: auth.ts configuration changes
   - Frontend: sign-in UI button additions
   - Environment: new env vars required
3. **Implementation Sequence**: Order of changes
4. **Test Strategy**: How to verify each provider works
5. **Integration Points**: Where this connects to existing code

**Constraints from Spec**:
- No schema changes (use existing tables)
- Environment-driven configuration
- Better Auth native (socialProviders + genericOAuth plugin)
- Production security (exact-match redirect URIs)

**Output Required**:
Return a structured plan with:
1. Architecture overview (how providers integrate)
2. File changes list (which files, what changes)
3. Implementation phases (ordered steps)
4. Environment variables needed
5. Testing approach
6. Risk mitigation

Focus on practical implementation - this is LOW complexity, primarily configuration changes.

## Response snapshot

Created comprehensive implementation plan at `/Users/mjs/Documents/code/mjunaidca/tf-k8/tf-sso/specs/008-social-login-providers/plan.md`.

**Key Insights**:
1. **Better Auth does everything**: OAuth flows, token exchange, account linking all handled by framework
2. **Implementation is configuration**: Just add provider config to auth.ts, UI buttons to sign-in form, and env vars
3. **No schema changes**: Existing `account` table already has `providerId` and `accountId` fields
4. **Environment-driven**: Providers load conditionally based on env vars (no code changes to toggle)

**Architecture**:
- Backend: `socialProviders` plugin (Google, GitHub) + `genericOAuth` plugin (RoboLearn OIDC)
- Frontend: Conditional social sign-in buttons in sign-in form
- Flow: User clicks → Better Auth handles OAuth → account linked → session created

**Implementation Phases**:
- Phase 1 (30 min): Backend configuration (auth.ts + env vars)
- Phase 2 (45 min): Frontend UI (sign-in buttons + handler)
- Phase 3 (45 min): Testing (manual verification of OAuth flows)

**Total Estimate**: 2-3 hours (LOW complexity)

## Outcome

- ✅ Impact: Complete implementation plan ready for Phase 1 execution
- 🧪 Tests: Manual testing checklist defined for all 3 providers + account linking + UI toggling
- 📁 Files: plan.md created with architecture, file changes, phases, testing strategy
- 🔁 Next prompts: Execute Phase 1 (Backend Configuration) or run `/sp.tasks` to generate task breakdown
- 🧠 Reflection: Simple feature made simpler by Better Auth abstraction. Key realization: don't overthink OAuth flows, framework does heavy lifting.

## Evaluation notes (flywheel)

- Failure modes observed: None (planning only)
- Graders run and results (PASS/FAIL): N/A (no code changes)
- Prompt variant (if applicable): Standard planning prompt with spec reference
- Next experiment (smallest change to try): Implement Phase 1 backend config and verify server starts without errors
