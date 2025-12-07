# Taskflow SSO Platform Specification

**Version**: 1.0.0 (Consolidated)
**Created**: 2025-12-07
**Status**: PRODUCTION READY
**Migrated From**: Hackathon 1 (Features 001, 003, 004, 005)

---

## Executive Summary

A centralized OAuth 2.1 / OIDC authentication server serving multiple Taskflow applications. Built with Next.js 15, Better Auth, Drizzle ORM, and Neon Postgres. Provides single sign-on across RoboLearn, AI Native, and future Taskflow platforms.

**Key Capabilities**:
- OAuth 2.1 Authorization Code Flow with PKCE
- OIDC Provider with JWKS (RS256 signing, 90-day auto-rotation)
- Multi-tenancy with organizations
- Role-based access control (admin/user + org roles)
- Custom JWT claims (software_background, hardware_tier, tenant_id, gender, city, country)
- API Key M2M authentication for services
- Rate limiting with Redis support for scale
- Admin dashboard for user/client/API key management
- 14,821 users migrated from NextAuth with bcrypt password compatibility

---

## Platform Clients

| Client | Type | Purpose | Status |
|--------|------|---------|--------|
| **RoboLearn** | Public (PKCE) | Educational platform | Configured |
| **Taskflow SSO** | Public (PKCE) | SSO Dashboard (first-party) | Configured |
| **AI Native** | Public (PKCE) | AI Development Platform | Configured |
| **RoboLearn Backend** | Confidential | Server-side integration | Configured |

---

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20+ |
| Framework | Next.js (App Router) | 15.1.0 |
| Auth Library | Better Auth | 1.4.4 |
| ORM | Drizzle | 0.36.0 |
| Database | Neon Postgres | Serverless |
| Cache | Upstash Redis | Optional |
| Email | Resend / SMTP | Optional |
| Testing | Node.js + Playwright | Native |

---

## User Scenarios

### US1 - New User Registration

A visitor creates an account with email, password, and profile data.

**Acceptance Scenarios**:
1. Valid email + password (8+ chars) → account created, verification email sent
2. Duplicate email → clear error with sign-in link
3. Short password → validation feedback
4. Compromised password (HIBP) → rejection with message
5. Email verification completes → auto-signed in
6. User auto-joins default Taskflow organization
7. Two-step onboarding: Step 1 (name/email/password), Step 2 (software_background, hardware_tier)

---

### US2 - Existing User Login

A returning user signs in to continue using Taskflow apps.

**Acceptance Scenarios**:
1. Correct credentials → session created (7 days)
2. Incorrect credentials → generic "Invalid credentials" message
3. Session persists across browser close
4. Rate limiting blocks rapid attempts (10/min)
5. Unverified email → prompted to verify first
6. Migrated users with bcrypt passwords can login (progressive migration to scrypt)

---

### US3 - User Logout

A logged-in user signs out of their account.

**Acceptance Scenarios**:
1. Logout → session invalidated, redirected to login
2. Back button after logout → cannot access protected content
3. OIDC RP-Initiated Logout clears both `{prefix}.session_token` and `__Secure-{prefix}.session_token`

---

### US4 - OAuth/OIDC Flow

External clients authenticate users via OAuth 2.1 with PKCE.

**Acceptance Scenarios**:
1. Authorization request with PKCE → redirect to login
2. First-party clients → skip consent screen
3. Third-party clients → show consent screen
4. Token exchange with code_verifier → returns tokens
5. ID token contains custom claims (tenant_id, role, software_background, hardware_tier, gender, city, country)
6. JWKS endpoint returns RS256 public keys
7. Client-side token verification works (no server call)
8. Access tokens expire after 6 hours
9. Refresh tokens expire after 7 days

---

### US5 - Profile Management

Users can view and update their profile data.

**Acceptance Scenarios**:
1. GET /api/profile → returns user + all profile fields
2. PUT /api/profile → updates all editable fields
3. Profile edit page shows: Name, Given Name, Family Name, Phone Number, Gender, Father's Name, City, Country, Software Background, Hardware Tier
4. Gender dropdown: Male, Female, Other, Prefer not to say
5. All additional fields are optional (nullable)
6. Profile changes reflect in next OAuth token

---

### US6 - Admin Dashboard

Admins manage users, OAuth clients, and API keys.

**Acceptance Scenarios**:
1. Admin can view all registered OAuth clients
2. Admin can register new OAuth clients
3. Admin can edit/delete non-protected clients
4. First-party clients are protected from deletion
5. Admin can view user list
6. Non-admin users → 403 Forbidden

---

### US7 - Password Reset

A user resets their forgotten password via email.

**Acceptance Scenarios**:
1. Request reset → email sent with secure link
2. Click link → password reset form
3. Submit new password → updated, auto-signed in
4. Link expires after 1 hour

---

### US8 - API Key M2M Authentication

Services authenticate programmatically without user interaction.

**Acceptance Scenarios**:
1. Admin creates API key with name → unique key generated, shown once
2. Service verifies key via `POST /api/api-key/verify` with `x-api-key` header
3. Valid key → returns key metadata (name, permissions, user association)
4. Invalid/revoked key → 401 error
5. Admin can revoke key → immediately disabled
6. Admin can delete key permanently
7. Keys stored as argon2id hashes (never plaintext)
8. Rate limited: 100 requests/minute per key
9. Keys display: name, prefix (8 chars), creation date, last used, status

---

## Requirements

### Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | Email/password account creation | Done |
| FR-002 | Email format validation | Done |
| FR-003 | Password min 8 characters | Done |
| FR-004 | Secure password hashing (scrypt + bcrypt compat) | Done |
| FR-005 | 7-day sessions | Done |
| FR-006 | Session invalidation on logout | Done |
| FR-007 | Software background capture (signup step 2) | Done |
| FR-008 | Hardware tier capture (signup step 2) | Done |
| FR-009 | Profile data API (GET/PUT) | Done |
| FR-010 | Rate limiting (per-endpoint + global) | Done |
| FR-011 | CORS for trusted origins | Done |
| FR-012 | User-friendly error messages | Done |
| FR-013 | Duplicate email prevention | Done |
| FR-014 | OAuth 2.1 / OIDC Provider with PKCE | Done |
| FR-015 | JWKS endpoint (RS256, auto-rotation) | Done |
| FR-016 | Admin client registration endpoint | Done |
| FR-017 | Email verification on signup | Done |
| FR-018 | Password reset via email | Done |
| FR-019 | Public vs confidential client distinction | Done |
| FR-020 | Multi-tenancy with organizations | Done |
| FR-021 | Custom JWT claims (tenant_id, role, profile fields) | Done |
| FR-022 | Admin dashboard UI | Done |
| FR-023 | Have I Been Pwned password checking | Done |
| FR-024 | Username support (optional) | Done |
| FR-025 | Health check endpoint | Done |
| FR-026 | Additional profile fields (gender, father_name, city, country) | Done |
| FR-027 | Phone number UI in profile edit | Done |
| FR-028 | All profile fields in JWT token claims | Done |
| FR-029 | API key creation for M2M auth | Done |
| FR-030 | API key verification endpoint | Done |
| FR-031 | API key revocation | Done |
| FR-032 | API key usage tracking (last_used) | Done |
| FR-033 | API key expiration support | Done |
| FR-034 | bcrypt password compatibility (migrated users) | Done |

### Non-Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-001 | Standalone deployment | Done |
| NFR-002 | Future OAuth providers support | Architecture ready |
| NFR-003 | SSO/OIDC provider capabilities | Done |
| NFR-004 | HTTP-only cookies for sessions | Done |
| NFR-005 | Distributed rate limiting (Redis) | Done |
| NFR-006 | Auto JWKS key rotation (90 days) | Done |
| NFR-007 | Multi-instance deployment support | Done |
| NFR-008 | API key verification < 100ms (p95) | Done |
| NFR-009 | Profile edit page < 2s load time | Done |
| NFR-010 | Migration: 14,821 users < 30 minutes | Done |

---

## Key Entities

### User
```typescript
user {
  id: text PK                    // UUID preserved from migration
  email: text UNIQUE
  name: text
  emailVerified: boolean
  role: text                     // "user" | "admin"
  banned: boolean
  username: text UNIQUE          // Optional
  // OIDC Standard Claims
  givenName: text
  familyName: text
  phoneNumber: text
  locale: text
  zoneinfo: text
  // Custom Profile Fields
  softwareBackground: text       // "beginner" | "intermediate" | "advanced"
  hardwareTier: text             // "basic" | "gpu_local" | "cloud_gpu"
  gender: text                   // "male" | "female" | "other" | "prefer_not_to_say"
  fatherName: text
  city: text
  country: text                  // Normalized (e.g., "Pakistan" not "PK")
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Session
```typescript
session {
  id: text PK
  userId: text FK → user.id
  token: text UNIQUE
  expiresAt: timestamp
  ipAddress: text
  userAgent: text
  activeOrganizationId: text     // Current org context
}
```

### Account
```typescript
account {
  id: text PK
  userId: text FK → user.id
  providerId: text               // "credential" | future OAuth providers
  password: text                 // scrypt or bcrypt hash
}
```

### Organization
```typescript
organization {
  id: text PK
  name: text
  slug: text UNIQUE
  logo: text
  metadata: text                 // JSON
}

member {
  id: text PK
  organizationId: text FK → organization.id
  userId: text FK → user.id
  role: text                     // "owner" | "admin" | "member"
}
```

### OAuth Application
```typescript
oauth_application {
  id: text PK
  clientId: text UNIQUE
  clientSecret: text             // NULL for public clients
  name: text
  redirectUrls: text             // Comma-separated
  type: text                     // "public" | "web" (confidential)
  disabled: boolean
}
```

### API Key
```typescript
api_key {
  id: text PK
  name: text
  hashedKey: text                // argon2id hash
  prefix: text                   // First 8 chars for identification
  userId: text FK → user.id      // Admin who created it
  enabled: boolean
  expiresAt: timestamp           // Optional
  lastUsedAt: timestamp
  metadata: text                 // JSON (service name, description)
  createdAt: timestamp
}
```

### JWKS
```typescript
jwks {
  id: text PK
  publicKey: text
  privateKey: text               // Encrypted AES-256-GCM
  createdAt: timestamp
  expiresAt: timestamp
}
```

---

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-up/email` | POST | Create account |
| `/api/auth/sign-in/email` | POST | Sign in |
| `/api/auth/sign-out` | POST | Sign out |
| `/api/auth/session` | GET | Get session |
| `/api/auth/forgot-password` | POST | Request reset |
| `/api/auth/reset-password` | POST | Reset password |

### OAuth/OIDC
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/openid-configuration` | GET | OIDC Discovery |
| `/api/auth/jwks` | GET | Public keys (JWKS) |
| `/api/auth/oauth2/authorize` | GET | Start OAuth flow |
| `/api/auth/oauth2/token` | POST | Exchange code |
| `/api/auth/oauth2/userinfo` | GET | Get user info |
| `/api/auth/oauth2/endsession` | GET/POST | RP-Initiated Logout |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/clients` | GET | List clients |
| `/api/admin/clients/register` | POST | Register client |
| `/api/admin/clients/[clientId]` | PUT/DELETE | Manage client |
| `/api/admin/api-keys/list` | GET | List API keys |
| `/api/admin/api-keys/create` | POST | Create API key |
| `/api/admin/api-keys/update` | PUT | Revoke/update key |
| `/api/admin/api-keys/delete` | DELETE | Delete key |

### Profile
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET | Get profile |
| `/api/profile` | PUT | Update profile |

### M2M
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-key/verify` | POST | Verify API key |
| `/api/m2m/users/[username]` | GET | Get user by username (M2M) |

### Utility
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/oauth/client-info` | GET | Client info (for consent) |

---

## JWT Claims Structure

```typescript
{
  // OIDC Standard
  sub: "user-id",
  email: "user@example.com",
  email_verified: true,
  name: "User Name",
  given_name: "User",
  family_name: "Name",
  picture: "https://...",
  phone_number: "+1234567890",

  // Multi-tenancy
  role: "user",                           // Global role
  tenant_id: "taskflow-default-org-id",   // Primary org
  organization_ids: ["org-1", "org-2"],   // All memberships
  org_role: "member",                     // Role in primary org

  // Custom Profile
  software_background: "intermediate",
  hardware_tier: "gpu_local",
  gender: "male",
  father_name: "Father Name",
  city: "Karachi",
  country: "Pakistan"
}
```

---

## Rate Limiting

```typescript
// Global: 3000 req/min (100k user scale)
rateLimit: {
  "/sign-in/email": { max: 10, window: 60 },       // Brute force protection
  "/sign-up/email": { max: 5, window: 60 },        // Spam protection
  "/forgot-password": { max: 3, window: 300 },     // Abuse protection
  "/oauth2/authorize": { max: 200, window: 60 },   // Generous for OAuth
  "/oauth2/token": { max: 100, window: 60 },       // Token exchanges
  "/api-key/verify": { max: 100, window: 60 },     // Per-key M2M
  "/get-session": false,                           // No limit
}
```

---

## Constraints

| ID | Constraint | Satisfied |
|----|------------|-----------|
| C-001 | Better Auth library v1.4.4+ | Yes |
| C-002 | Neon Postgres serverless | Yes |
| C-003 | Next.js 15 App Router | Yes |
| C-004 | Drizzle ORM | Yes |
| C-005 | bcrypt password compatibility for migrated users | Yes |
| C-006 | User ID preservation for FK integrity | Yes |
| C-007 | Database schema changes are additive only | Yes |

---

## Non-Goals

| ID | Non-Goal | Rationale |
|----|----------|-----------|
| NG-001 | Social login (Google, GitHub) | Deferred - architecture ready |
| NG-002 | Two-factor authentication | Deferred |
| NG-003 | Fine-grained API key scopes | Future enhancement |
| NG-004 | IP allowlisting per API key | Future enhancement |
| NG-005 | API key usage analytics dashboards | Beyond basic tracking |
| NG-006 | Phone number format validation | MVP accepts free-text |
| NG-007 | Country dropdown with predefined list | MVP accepts free-text |

---

## Success Criteria

### Authentication
- [x] Registration completes in < 60 seconds
- [x] Sign-in completes in < 10 seconds
- [x] 100% of users have organization membership
- [x] Sessions persist 7 days
- [x] Zero plaintext passwords in database
- [x] Rate limiting blocks brute force
- [x] Migrated users can login with original password

### OAuth/OIDC
- [x] OAuth flow completes with PKCE in < 5 seconds
- [x] JWKS endpoint returns valid RS256 public keys
- [x] ID tokens contain all custom claims
- [x] Client-side token verification works
- [x] Access tokens expire after 6 hours
- [x] Refresh tokens expire after 7 days

### Profile
- [x] All profile fields editable in < 30 seconds
- [x] All fields appear in JWT claims
- [x] Signup conversion unchanged (no new signup fields)

### API Keys
- [x] Key creation in < 30 seconds
- [x] Key verification in < 100ms (p95)
- [x] Key revocation takes effect in < 5 seconds
- [x] Zero keys stored in plaintext

### Migration
- [x] 100% of source users processed
- [x] 95%+ migrated users can login
- [x] Migration completed in < 30 minutes
- [x] Zero data loss

---

## Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Better Auth (Required)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3001

# CORS (Required)
ALLOWED_ORIGINS=http://localhost:3000,https://robolearn.example.com

# Redis (Optional - for scale)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Email (Optional)
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=noreply@taskflow.org

# Migration (One-time)
NEXT_AUTH_PROD_DB_MIRROR=postgresql://...  # Source DB (read-only)
```

---

## Commands

```bash
# Development
pnpm dev                    # Start on port 3001

# Database
pnpm db:push               # Push schema
pnpm db:generate           # Generate migrations
pnpm db:studio             # Drizzle Studio

# Seeding
pnpm seed:setup            # Dev: all clients + test org
pnpm seed:prod             # Prod: Taskflow + AI Native

# Testing
pnpm test-api              # API tests (~60s)
pnpm test-e2e              # E2E tests (~30s)
pnpm test-all              # Full suite (~90s)
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-07 | Consolidated from features 001, 003, 004, 005 |

---

## Source Features (Archived)

This specification consolidates the following feature specs from Hackathon 1:

1. **001-auth-server**: Core OAuth 2.1/OIDC, multi-tenancy, admin dashboard
2. **003-user-profile-fields**: Additional profile fields (gender, father_name, city, country)
3. **004-api-key-m2m-auth**: API Key M2M authentication
4. **005-nextauth-migration**: 14,821 user migration from NextAuth to Better Auth
