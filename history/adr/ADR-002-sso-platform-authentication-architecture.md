# ADR-002: SSO Platform Authentication Architecture

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 002-sso-platform
- **Context:** specs/002-sso-platform/spec.md

## Decision

Built a centralized OAuth 2.1 / OIDC authentication server using Better Auth library with Drizzle ORM on Neon Postgres. This serves as the single sign-on provider for all TaskFlow applications with support for custom JWT claims.

**Technology Stack:**
- **Auth Library**: Better Auth v1.4.4 (over NextAuth or Auth.js)
- **Framework**: Next.js 15 App Router
- **ORM**: Drizzle ORM with Neon Postgres serverless
- **JWT Signing**: RS256 with 90-day auto-rotation via JWKS
- **Password Hashing**: scrypt (native) with bcrypt compatibility for migrated users
- **Rate Limiting**: Memory-based with Redis support for scale

**Authentication Decisions:**
- OAuth 2.1 with PKCE for all public clients (no implicit flow)
- First-party clients skip consent screen; third-party require explicit consent
- Session tokens via httpOnly cookies (7-day expiry)
- Access tokens expire after 6 hours; refresh tokens after 7 days
- Custom JWT claims: tenant_id, role, software_background, hardware_tier, gender, city, country

**Multi-tenancy Model:**
- Organizations as tenant containers
- Users auto-join default Taskflow organization on signup
- Members have roles: owner, admin, member
- Active organization stored in session for context switching

## Consequences

### Positive
- Single source of identity across all TaskFlow applications
- RS256 signing enables client-side token verification without SSO roundtrip
- Better Auth's OIDC compliance enables third-party integrations
- bcrypt compatibility allowed seamless migration of 14,821 existing users
- API key M2M authentication supports service-to-service communication

### Negative
- Better Auth is newer/less documented than NextAuth/Auth.js ecosystem
- Custom claims require careful coordination between SSO and consuming apps
- JWKS caching adds complexity to token verification in backends
- Multi-tenancy adds complexity for single-tenant use cases

## Alternatives Considered

### Alternative A: NextAuth v5 / Auth.js
- Pros: Large ecosystem, extensive documentation, many adapters
- Cons: Less control over token structure, harder to customize claims, complex upgrade path
- Why rejected: Better Auth provides more control over OIDC compliance and custom claims needed for multi-tenancy

### Alternative B: Clerk or Auth0
- Pros: Fully managed, excellent DX, enterprise features built-in
- Cons: Vendor lock-in, cost at scale, less control over data locality
- Why rejected: Self-hosted requirement for hackathon; need full control over user data

### Alternative C: Build from scratch with jose + passport
- Pros: Maximum control, no library abstractions
- Cons: High security risk, significant development time, easy to miss edge cases
- Why rejected: Authentication is security-critical; Better Auth provides battle-tested implementation

## References
- Spec: specs/002-sso-platform/spec.md
- Intelligence: specs/002-sso-platform/intelligence.md
- Key decisions: OAuth 2.1 PKCE, RS256 JWKS, custom claims, bcrypt migration
