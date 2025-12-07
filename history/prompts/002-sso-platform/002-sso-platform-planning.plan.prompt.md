---
id: 002
title: SSO Platform Architecture Review from Hackathon 1
stage: plan
date: 2025-12-07
surface: agent
model: claude-opus-4-5-20251101
feature: sso-platform
branch: main
user: mjs
command: /sp.plan sso-platform
labels: [plan, oauth, oidc, better-auth, architecture, hackathon-1-blueprint, hackathon-2-prep]
links:
  spec: specs/002-sso-platform/spec.md
  ticket: null
  adr: specs/002-sso-platform/intelligence.md
  pr: null
files:
  - specs/002-sso-platform/plan.md (implicit - inherited from hackathon 1)
tests:
  - N/A (planning phase)
---

## Prompt

Review the architecture and implementation approach from Hackathon 1 starter code. Document the existing patterns and decisions for Hackathon 2 SSO integration work. The codebase already has OAuth 2.1/OIDC Provider, multi-tenancy, admin dashboard, profile fields, API key M2M auth, and completed NextAuth migration.

## Response snapshot

Reviewed existing implementation from Hackathon 1 starter code. The phased approach was:

**Phase 1: Core Auth Server (Feature 001)**
- Better Auth setup with OIDC Provider plugin
- RS256 JWKS with 90-day auto-rotation
- Multi-tenancy with organizations plugin
- Admin dashboard for client registration
- Rate limiting (global + per-endpoint)
- OAuth clients: RoboLearn, AI Native, SSO Dashboard

**Phase 2: Profile Enhancement (Feature 003)**
- Additional user fields: gender, father_name, city, country
- Profile API endpoints (GET/PUT)
- JWT claims extension for all profile fields
- Profile edit UI in dashboard

**Phase 3: API Key M2M (Feature 004)**
- API key schema (argon2id hashing, prefix display)
- Admin endpoints: create, list, update, delete
- Verification endpoint with rate limiting
- Usage tracking (last_used timestamp)

**Phase 4: User Migration (Feature 005)**
- Migration script: 14,821 users from NextAuth
- User ID preservation for FK integrity
- bcrypt password compatibility layer
- Country code normalization
- Batch processing (500 users/transaction)

**Architecture Decisions (documented in intelligence.md)**:
1. ADR-001: Better Auth over NextAuth (OIDC Provider capability)
2. ADR-002: PKCE for all public clients
3. ADR-003: User ID preservation during migration
4. ADR-004: bcrypt to scrypt progressive migration
5. ADR-005: __Secure- cookie prefix handling
6. ADR-006: Country normalization strategy

**Technology Stack**:
- Next.js 15.1.0 App Router
- Better Auth 1.4.4 with plugins (jwt, oidc-provider, organization, admin)
- Drizzle ORM 0.36.0
- Neon Postgres (serverless)
- Upstash Redis (optional, for distributed rate limiting)

## Outcome

- ✅ Impact: Documented Hackathon 1 architecture as foundation for Hackathon 2 work
- 🧪 Tests: N/A (planning phase)
- 📁 Files: Architecture inherited from starter code, patterns documented in intelligence.md
- 🔁 Next prompts: Use this blueprint for Hackathon 2 integrations
- 🧠 Reflection: Having production-ready SSO from Hackathon 1 eliminates auth implementation risk for Hackathon 2 - focus can be on integration

## Evaluation notes (flywheel)

- Failure modes observed: __Secure- cookie prefix lesson already learned (ADR-005)
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Leverage existing OAuth clients for new Hackathon 2 apps
