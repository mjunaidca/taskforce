# Tasks: Social Login Providers

**Input**: Design documents from `/specs/008-social-login-providers/`
**Prerequisites**: plan.md (read), spec.md (read)
**Branch**: `008-social-login-providers`

**Tests**: NOT requested in specification - manual testing via acceptance scenarios

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `sso-platform/src/` (Next.js app)
- **Backend**: `sso-platform/src/lib/` (Better Auth config)
- **Environment**: `sso-platform/.env.example`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment variable documentation and initial configuration structure

- [x] T001 Update environment variable documentation in `sso-platform/.env.example` with social provider variables section
- [x] T002 [P] Verify Better Auth `socialProviders` and `genericOAuth` imports are available in package

**Checkpoint**: Environment structure ready, dependencies verified

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend configuration that MUST be complete before UI work

**⚠️ CRITICAL**: UI buttons cannot function until backend providers are configured

- [x] T003 Add `socialProviders` plugin import to `sso-platform/src/lib/auth.ts`
- [x] T004 Add `genericOAuth` plugin import to `sso-platform/src/lib/auth.ts`
- [x] T005 Add environment type declarations for social provider env vars (if using TypeScript strict mode)

**Checkpoint**: Backend foundation ready - provider-specific configuration can begin

---

## Phase 3: User Story 4 - Provider Toggle via Env Vars (Priority: P1) 🎯 MVP

**Goal**: Enable environment-driven provider configuration (must be implemented first as other stories depend on it)

**Independent Test**: Deploy with no social provider env vars → verify no social buttons appear. Then set `NEXT_PUBLIC_GOOGLE_ENABLED=true` → verify Google button appears.

**Why First**: US1-US3 all depend on the toggle mechanism being in place.

### Implementation for User Story 4

- [x] T006 [US4] Configure conditional `socialProviders` block with Google placeholder in `sso-platform/src/lib/auth.ts` (loads only if `GOOGLE_CLIENT_ID` is set)
- [x] T007 [US4] Configure conditional `socialProviders` block with GitHub placeholder in `sso-platform/src/lib/auth.ts` (loads only if `GITHUB_CLIENT_ID` is set)
- [x] T008 [US4] Configure conditional `genericOAuth` plugin for RoboLearn in `sso-platform/src/lib/auth.ts` (loads only if `ROBOLEARN_CLIENT_ID` is set)
- [x] T009 [US4] Add `handleSocialSignIn` handler function to `sso-platform/src/components/sign-in-form.tsx`
- [x] T010 [US4] Add social login section divider ("Or continue with") to `sso-platform/src/components/sign-in-form.tsx` (conditional on any provider being enabled)

**Checkpoint**: Toggle mechanism in place, server starts without errors regardless of which providers are enabled

---

## Phase 4: User Story 1 - Sign In with Google (Priority: P1)

**Goal**: Users can sign in using their Google account

**Independent Test**: Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_ENABLED=true` → click Google button → complete OAuth → verify session created

### Implementation for User Story 1

- [x] T011 [US1] Complete Google OAuth configuration in `socialProviders` block in `sso-platform/src/lib/auth.ts` with `clientId` and `clientSecret`
- [x] T012 [US1] Add Google sign-in button with SVG icon to `sso-platform/src/components/sign-in-form.tsx` (conditional on `NEXT_PUBLIC_GOOGLE_ENABLED`)
- [ ] T013 [US1] Verify Google OAuth callback URL works: `/api/auth/callback/google` (requires OAuth credentials)

**Checkpoint**: Google sign-in fully functional and independently testable

---

## Phase 5: User Story 2 - Sign In with GitHub (Priority: P1)

**Goal**: Users can sign in using their GitHub account

**Independent Test**: Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXT_PUBLIC_GITHUB_ENABLED=true` → click GitHub button → complete OAuth → verify session created

### Implementation for User Story 2

- [x] T014 [US2] Complete GitHub OAuth configuration in `socialProviders` block in `sso-platform/src/lib/auth.ts` with `clientId`, `clientSecret`, and `scope: ["user:email"]`
- [x] T015 [US2] Add GitHub sign-in button with SVG icon to `sso-platform/src/components/sign-in-form.tsx` (conditional on `NEXT_PUBLIC_GITHUB_ENABLED`)
- [ ] T016 [US2] Verify GitHub OAuth callback URL works: `/api/auth/callback/github` (requires OAuth credentials)

**Checkpoint**: GitHub sign-in fully functional and independently testable

---

## Phase 6: User Story 3 - Sign In with RoboLearn (Priority: P2)

**Goal**: Users can sign in using their existing RoboLearn SSO account

**Independent Test**: Set `ROBOLEARN_CLIENT_ID`, `ROBOLEARN_CLIENT_SECRET`, `ROBOLEARN_SSO_URL`, `NEXT_PUBLIC_ROBOLEARN_ENABLED=true` → click RoboLearn button → complete OIDC flow → verify session created

### Implementation for User Story 3

- [x] T017 [US3] Complete RoboLearn OIDC configuration in `genericOAuth` plugin in `sso-platform/src/lib/auth.ts` with `discoveryUrl`, `scopes`, and `userProfile` mapping
- [x] T018 [US3] Add RoboLearn sign-in button with branded icon/placeholder to `sso-platform/src/components/sign-in-form.tsx` (conditional on `NEXT_PUBLIC_ROBOLEARN_ENABLED`)
- [ ] T019 [US3] Verify RoboLearn OIDC callback URL works: `/api/auth/callback/robolearn` (requires RoboLearn SSO credentials)

**Checkpoint**: RoboLearn sign-in fully functional and independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Refinements that affect all providers

- [x] T020 [P] Ensure OAuth parameter preservation in `handleSocialSignIn` (client_id, redirect_uri, state, etc. for SSO flows)
- [x] T021 [P] Add loading states and error handling for social sign-in failures
- [ ] T022 [P] Verify account linking behavior (same email → same user record) (requires OAuth credentials)
- [ ] T023 Run manual acceptance test: all 3 providers enabled simultaneously (requires OAuth credentials)
- [ ] T024 Run manual acceptance test: verify default organization auto-join for social sign-ups (requires OAuth credentials)
- [x] T025 Update deployment documentation with redirect URI configuration guide (in .env.example)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (US4: Toggle) ← CRITICAL: All other stories depend on this
    ↓
Phase 4-6 (US1, US2, US3) ← Can run in parallel after Phase 3
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

- **US4 (Toggle)**: MUST complete first - provides the infrastructure for US1-US3
- **US1 (Google)**: Depends on US4 - Can start immediately after Phase 3
- **US2 (GitHub)**: Depends on US4 - Can run in parallel with US1
- **US3 (RoboLearn)**: Depends on US4 - Can run in parallel with US1/US2

### Within Each User Story

- Backend configuration before frontend UI
- Button implementation after handler function exists
- Callback verification after full implementation

### Parallel Opportunities

**After Phase 3 completes**, all three provider implementations can proceed in parallel:

```bash
# Parallel execution after US4 (Toggle) is complete:
Phase 4: US1 (Google)   → T011, T012, T013
Phase 5: US2 (GitHub)   → T014, T015, T016
Phase 6: US3 (RoboLearn) → T017, T018, T019
```

---

## Parallel Example: Provider Implementation

```bash
# After Phase 3 (US4 Toggle) completes, launch provider implementations in parallel:

# Google (US1)
Task: "Complete Google OAuth configuration in sso-platform/src/lib/auth.ts"
Task: "Add Google sign-in button to sso-platform/src/components/sign-in-form.tsx"

# GitHub (US2) - parallel with Google
Task: "Complete GitHub OAuth configuration in sso-platform/src/lib/auth.ts"
Task: "Add GitHub sign-in button to sso-platform/src/components/sign-in-form.tsx"

# RoboLearn (US3) - parallel with Google and GitHub
Task: "Complete RoboLearn OIDC configuration in sso-platform/src/lib/auth.ts"
Task: "Add RoboLearn sign-in button to sso-platform/src/components/sign-in-form.tsx"
```

---

## Implementation Strategy

### MVP First (US4 + US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US4 (Toggle mechanism)
4. Complete Phase 4: US1 (Google only)
5. **STOP and VALIDATE**: Test Google sign-in independently
6. Deploy/demo with Google support

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US4 (Toggle) → Environment-driven architecture in place
3. US1 (Google) → Test independently → Deploy (MVP!)
4. US2 (GitHub) → Test independently → Deploy
5. US3 (RoboLearn) → Test independently → Deploy
6. Polish → Full feature complete

### File Change Summary

| File | Tasks | Changes |
|------|-------|---------|
| `sso-platform/.env.example` | T001 | Add 10 new env var comments |
| `sso-platform/src/lib/auth.ts` | T003-T008, T011, T014, T017 | Add socialProviders + genericOAuth plugins |
| `sso-platform/src/components/sign-in-form.tsx` | T009-T010, T012, T015, T018, T020-T021 | Add buttons, handler, UI section |

---

## Task Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 25 |
| **Setup Tasks** | 2 |
| **Foundational Tasks** | 3 |
| **US4 (Toggle) Tasks** | 5 |
| **US1 (Google) Tasks** | 3 |
| **US2 (GitHub) Tasks** | 3 |
| **US3 (RoboLearn) Tasks** | 3 |
| **Polish Tasks** | 6 |
| **Parallel Opportunities** | 9 tasks marked [P] |
| **MVP Scope** | T001-T013 (13 tasks for Google-only MVP) |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests - manual acceptance testing per spec
- Better Auth handles all OAuth complexity - tasks are configuration-only
- Each provider can be tested independently with its env vars set
- Commit after each task or logical group
- Complexity: LOW (configuration changes, no schema modifications)
