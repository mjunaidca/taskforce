---
id: 002
title: Social Login Providers Implementation Plan
stage: plan
date: 2025-12-08
surface: agent
model: claude-opus-4-5-20250114
feature: 008-social-login-providers
branch: 008-social-login-providers
user: mjs
command: /sp.plan 008-social-login-providers
labels: ["planning", "oauth", "architecture", "better-auth"]
links:
  spec: specs/008-social-login-providers/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/008-social-login-providers/plan.md
tests: []
---

# PHR: Social Login Providers Implementation Plan

## Prompt

Create implementation plan for 008-social-login-providers feature based on approved specification.

## Response Summary

Created comprehensive implementation plan with:

**Architecture Overview**:
- Better Auth `socialProviders` for Google/GitHub (built-in)
- Better Auth `genericOAuth` for RoboLearn (OIDC discovery)
- Environment-driven configuration (no code changes to toggle)
- Uses existing `account` table (no schema changes)

**Implementation Phases (3)**:
1. **Phase 1: Backend Configuration (30 min)**
   - Update auth.ts with socialProviders and genericOAuth plugins
   - Add conditional loading for environment-driven providers
   - Update .env.example

2. **Phase 2: Frontend UI (45 min)**
   - Add social sign-in buttons to sign-in-form.tsx
   - handleSocialSignIn function with OAuth param preservation
   - SVG icons for Google, GitHub, RoboLearn

3. **Phase 3: Testing (45 min)**
   - End-to-end OAuth flows for all 3 providers
   - Account linking verification
   - Provider toggle testing

**Environment Variables (10 total)**:
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_ENABLED
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXT_PUBLIC_GITHUB_ENABLED
- ROBOLEARN_CLIENT_ID, ROBOLEARN_CLIENT_SECRET, ROBOLEARN_SSO_URL, NEXT_PUBLIC_ROBOLEARN_ENABLED

**Complexity Assessment**: LOW (configuration-only, 2-3 hours total)

**Key Insight**: Better Auth handles ALL OAuth complexity. We just configure providers and add UI buttons.

## Outcome

- Plan created at `specs/008-social-login-providers/plan.md`
- 725 lines of detailed implementation guidance
- Ready for Phase 3: Task breakdown (/sp.tasks)

## Evaluation

- [x] Architecture documented with diagram
- [x] File changes enumerated with code snippets
- [x] Implementation phases ordered logically
- [x] Testing strategy defined
- [x] Risk mitigation documented
- [x] Success criteria mapped to spec
- [x] ADR candidate identified
