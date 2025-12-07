# Taskflow SSO Platform - Reusable Intelligence

**Version**: 1.0.0
**Extracted**: 2025-12-07
**Source**: Hackathon 1 implementation (features 001, 003, 004, 005)

---

## Overview

This document captures the reusable intelligence embedded in the SSO platform codebase - patterns, architectural decisions, and lessons learned that are worth preserving for future development.

---

## Architecture Decision Records (ADRs)

### ADR-001: Better Auth over NextAuth

**Status**: Accepted
**Date**: 2025-11-29

**Context**: Need a modern auth library that supports OAuth 2.1 Provider capabilities (not just consumer), multi-tenancy, and extensibility.

**Decision**: Use Better Auth instead of NextAuth

**Rationale**:
1. Better Auth has native OIDC Provider support (NextAuth is consumer-only)
2. Plugin-based architecture allows extending (admin, organization, API key)
3. TypeScript-first with excellent DX
4. Active development and responsive maintainer
5. Supports both scrypt (default) and bcrypt (for migration)

**Consequences**:
- **Positive**: Full OIDC Provider capability, clean plugin API
- **Negative**: Smaller community than NextAuth, fewer tutorials
- **Migration**: Required custom migration script for bcrypt passwords

---

### ADR-002: PKCE for All Public Clients

**Status**: Accepted
**Date**: 2025-12-01

**Context**: Need secure OAuth flows for SPAs (RoboLearn, AI Native) without exposing client secrets.

**Decision**: Require PKCE for all public clients, make client secrets null

**Rationale**:
1. SPAs cannot securely store client secrets
2. PKCE (S256) provides proof of authorization request origin
3. OAuth 2.1 mandates PKCE for public clients
4. Simplifies client implementation (no secret management)

**Consequences**:
- **Positive**: Industry-standard security, no leaked secrets risk
- **Negative**: Slightly more complex flow (code_verifier/code_challenge)

---

### ADR-003: User ID Preservation During Migration

**Status**: Accepted
**Date**: 2025-12-05

**Context**: 14,821 users migrating from NextAuth. User IDs are foreign keys in multiple microservices.

**Decision**: Preserve exact user.id (UUID as text) during migration

**Rationale**:
1. Microservices reference user.id in their own databases
2. Changing IDs would require coordinated updates across all services
3. UUID format is compatible between NextAuth and Better Auth
4. Account.id can be new (only user.id matters for FK)

**Consequences**:
- **Positive**: Zero-friction migration, no FK updates needed
- **Positive**: Users experience no disruption
- **Negative**: Migration script complexity (ID collision handling)

---

### ADR-004: bcrypt to scrypt Progressive Migration

**Status**: Accepted
**Date**: 2025-12-05

**Context**: NextAuth uses bcrypt, Better Auth uses scrypt. Converting 14,821 password hashes is impossible (one-way).

**Decision**: Support both hash formats with progressive migration on password change

**Rationale**:
1. Cannot reverse hash passwords to rehash
2. Better Auth can verify bcrypt with minor customization
3. New passwords use scrypt, old passwords stay bcrypt
4. On password change, user gets upgraded to scrypt

**Implementation**:
```typescript
// src/lib/auth.ts:189-200
password: {
  verify: async ({ hash, password }) => {
    if (hash.startsWith('$2')) {
      // bcrypt (migrated users)
      const bcrypt = await import('bcrypt');
      return bcrypt.compare(password, hash);
    }
    // scrypt (Better Auth default)
    const { verifyPassword } = await import('better-auth/crypto');
    return verifyPassword({ hash, password });
  }
}
```

**Consequences**:
- **Positive**: Migrated users login immediately
- **Positive**: Gradual upgrade to stronger scrypt hashes
- **Negative**: Must maintain bcrypt dependency

---

### ADR-005: __Secure- Cookie Prefix in Production

**Status**: Accepted (discovered during bug fix)
**Date**: 2025-12-06

**Context**: OIDC RP-Initiated Logout not working in production. Users remained logged in at SSO after client logout.

**Discovery**: Better Auth prefixes cookie names with `__Secure-` when `secure: true` (production).

| Environment | Cookie Name |
|-------------|-------------|
| Development | `robolearn.session_token` |
| Production | `__Secure-robolearn.session_token` |

**Decision**: Custom logout must clear both cookie variants

**Implementation**:
```typescript
const BASE_COOKIES = ['session_token', 'session_data', 'dont_remember'];
const names = BASE_COOKIES.flatMap(name => [
  `${prefix}.${name}`,                    // Development
  `__Secure-${prefix}.${name}`,           // Production
]);
```

**Lesson**: Never assume cookie names - check browser DevTools in production.

---

### ADR-006: Country Normalization Strategy

**Status**: Accepted
**Date**: 2025-12-05

**Context**: Source database has inconsistent country values: "PK", "Pakistan", NULL, "US", etc.

**Decision**: Normalize to full country names during migration, default NULL to "Pakistan"

**Rationale**:
1. Full names are more user-friendly in UI
2. Consistent format simplifies queries
3. Pakistan default based on user demographics (majority)

**Mapping**:
```
PK → Pakistan, US → United States, GB → United Kingdom
CA → Canada, AE → United Arab Emirates, SA → Saudi Arabia
IN → India, AU → Australia, DE → Germany, NULL → Pakistan
```

---

## Extracted Skills

### Skill 1: Better Auth OIDC Provider Setup

**Persona**: You are a backend engineer implementing OAuth 2.1 / OIDC Provider capabilities.

**Questions to ask**:
1. Public or confidential clients? (PKCE required for public)
2. What custom claims needed in tokens?
3. Which clients skip consent? (first-party apps)
4. Token expiration requirements?

**Principles**:
- Always use RS256 (not HS256) for JWT signing
- Configure auto key rotation (90 days recommended)
- Store private keys encrypted (AES-256-GCM)
- Skip consent for trusted first-party clients
- Include tenant_id in all tokens for multi-tenant apps

**Configuration Pattern**:
```typescript
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins/jwt";
import { oidcProvider } from "better-auth/plugins/oidc-provider";

export const auth = betterAuth({
  plugins: [
    jwt({
      jwks: { keyPairConfig: { alg: "RS256" } },
    }),
    oidcProvider({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/consent",
      accessTokenExpiresIn: 60 * 60 * 6,      // 6 hours
      refreshTokenExpiresIn: 60 * 60 * 24 * 7, // 7 days
    }),
  ],
});
```

---

### Skill 2: Multi-Tenant JWT Claims

**Persona**: You are implementing tenant isolation in a multi-org SaaS platform.

**Questions to ask**:
1. Can users belong to multiple organizations?
2. What's the "active" organization context?
3. How do downstream services validate tenant access?

**Principles**:
- Always include `tenant_id` (primary org) in tokens
- Include `organization_ids` array for multi-org users
- Include `org_role` for role within active org
- Validate tenant_id at API boundaries in consuming services

**Implementation Pattern**:
```typescript
oidcProvider({
  async getUser(user) {
    const orgs = await db.query.member.findMany({
      where: eq(member.userId, user.id),
    });
    const primaryOrg = orgs[0];

    return {
      ...user,
      tenant_id: primaryOrg?.organizationId || null,
      organization_ids: orgs.map(m => m.organizationId),
      org_role: primaryOrg?.role || null,
    };
  },
});
```

---

### Skill 3: Database Migration with ID Preservation

**Persona**: You are migrating users between auth systems while preserving FK references.

**Questions to ask**:
1. Which ID field is referenced by other systems?
2. Can password hashes be verified without rehashing?
3. What's the batch size for transaction safety?
4. How to handle overlapping users (same email)?

**Principles**:
- Preserve user.id exactly (FK integrity)
- Process in batches of 500 (transaction rollback on failure)
- Support dry-run mode before actual migration
- Log every operation for audit trail
- Handle password hash format compatibility

**Implementation Pattern**:
```typescript
async function migrateBatch(users: SourceUser[], dryRun: boolean) {
  return await db.transaction(async (tx) => {
    for (const user of users) {
      if (dryRun) {
        console.log(`[DRY-RUN] Would migrate: ${user.email}`);
        continue;
      }

      // Check for overlap
      const existing = await tx.query.user.findFirst({
        where: eq(userTable.email, user.email),
      });

      if (existing) {
        // Update existing user's ID to match source
        await updateUserIdAndFKs(tx, existing.id, user.id);
      } else {
        // Insert new user preserving ID
        await tx.insert(userTable).values({
          id: user.id,  // Preserve!
          ...mapFields(user),
        });
      }
    }
  });
}
```

---

### Skill 4: API Key M2M Authentication

**Persona**: You are implementing machine-to-machine authentication without OAuth.

**Questions to ask**:
1. Who creates/manages API keys? (admin-only recommended)
2. What metadata to track? (service name, description)
3. Expiration policy?
4. Rate limiting per key?

**Principles**:
- Store keys as secure hashes (argon2id, never plaintext)
- Show full key exactly once at creation
- Display only prefix (8 chars) for identification
- Track last_used for security monitoring
- Immediate revocation takes effect

**Implementation Pattern**:
```typescript
// Creation
const key = generateSecureKey(64);  // 256 bits entropy
const hashedKey = await argon2.hash(key);
const prefix = key.substring(0, 8);

await db.insert(apiKey).values({
  id: generateId(),
  name: input.name,
  hashedKey,
  prefix,
  userId: adminUser.id,
  enabled: true,
});

return { key };  // Show once, never again

// Verification
const storedKey = await db.query.apiKey.findFirst({
  where: eq(apiKey.prefix, requestKey.substring(0, 8)),
});

if (!storedKey?.enabled) return { valid: false };
if (storedKey.expiresAt < new Date()) return { valid: false };

const valid = await argon2.verify(storedKey.hashedKey, requestKey);
if (valid) {
  await db.update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, storedKey.id));
}

return { valid, keyName: storedKey.name };
```

---

## Common Patterns

### Pattern 1: Rate Limiting Configuration

```typescript
rateLimit: {
  window: 60,               // 1 minute window
  max: 3000,                // Global max (100k user scale)
  customRules: {
    "/sign-in/email": { max: 10, window: 60 },     // 10/min
    "/sign-up/email": { max: 5, window: 60 },      // 5/min
    "/forgot-password": { max: 3, window: 300 },   // 3/5min
    "/get-session": false,                         // No limit
  },
}
```

### Pattern 2: Trusted Client Configuration

```typescript
const TRUSTED_CLIENTS = [
  {
    clientId: "app-public-client",
    name: "App Name",
    type: "public",
    redirectUrls: [
      "http://localhost:3000/auth/callback",
      "https://app.example.com/auth/callback",
    ],
    skipConsent: true,  // First-party
  },
];
```

### Pattern 3: Session Cookie Configuration

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,  // 7 days
  updateAge: 60 * 60 * 24,      // Update daily
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5,             // 5 min cache
  },
},
advanced: {
  cookiePrefix: "appname",
  useSecureCookies: process.env.NODE_ENV === "production",
},
```

---

## Lessons Learned

### What Worked Well

1. **Better Auth plugin architecture** - Clean extension points for admin, org, API key
2. **PKCE-only for public clients** - Simplified security model, no secret leaks
3. **User ID preservation** - Zero-friction migration for microservice FKs
4. **Progressive password migration** - bcrypt users login immediately

### What Could Be Improved

1. **Email templates** - Plain HTML, could use mjml for responsive
2. **Admin UI** - Basic shadcn/ui, could add more polish
3. **API key scopes** - No fine-grained permissions yet
4. **Integration tests** - Could add more E2E coverage

### What to Avoid

1. **Assuming cookie names** - Always check in production DevTools
2. **Hardcoding country codes** - Normalize during migration
3. **Batch sizes > 1000** - Transaction timeouts on serverless DBs
4. **Custom password hashing** - Use library defaults when possible

---

## Security Checklist

- [x] PKCE required for all public clients
- [x] RS256 JWT signing (not HS256)
- [x] Automatic JWKS key rotation (90 days)
- [x] Rate limiting on auth endpoints
- [x] HIBP password checking
- [x] bcrypt/scrypt password hashing
- [x] HTTP-only session cookies
- [x] __Secure- prefix in production
- [x] Admin-only client registration
- [x] API keys stored as argon2id hashes
- [x] No plaintext passwords/keys in database
- [x] CORS restricted to trusted origins

---

## Test Strategy

```bash
# API tests (OAuth flows, claims, edge cases)
pnpm test-api              # ~60 seconds

# E2E browser tests (login, logout, consent)
pnpm test-e2e              # ~30 seconds

# Full suite
pnpm test-all              # ~90 seconds
```

**Key test files**:
- `tests/test-oauth-flows.js` - PKCE flow, token exchange
- `tests/test-tenant-claims.js` - Multi-tenant JWT claims
- `tests/test-edge-cases.js` - Error handling, rate limits
- `tests/test-confidential-client.js` - Client secret auth
- `tests/test-pkce-playwright.mjs` - Browser PKCE flow

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [OAuth 2.1 Spec](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [JWKS RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517)
