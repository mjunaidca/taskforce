# Implementation Plan: Social Login Providers

**Feature Branch**: `008-social-login-providers`
**Created**: 2025-12-08
**Complexity**: LOW (Configuration changes, no schema modifications)
**Estimated Time**: 2-3 hours

---

## Executive Summary

Add optional social login providers (Google, GitHub, RoboLearn SSO) to Taskflow SSO Platform using Better Auth's native `socialProviders` and `genericOAuth` plugins. All providers are **environment-driven** (no code changes required to enable/disable) and use **existing database tables** (no schema changes).

**Key Insight**: Better Auth already handles all the OAuth flow complexity. We only need to:
1. Configure providers in `auth.ts`
2. Add social sign-in buttons to the UI
3. Set environment variables

---

## Phase Context

**Current Phase**: Phase II (Web Application)
**Constitutional Principles Applied**:
- **Audit**: Social login creates audit entries via existing `account` table (Better Auth automatically stores provider links)
- **Agent Parity**: N/A (social login is human-only authentication)
- **Recursive Tasks**: N/A (authentication feature)
- **Spec-Driven**: This plan follows `specs/008-social-login-providers/spec.md`

---

## Architecture Overview

### Better Auth Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    Better Auth Core                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Google OAuth  │  │  GitHub OAuth  │  │  genericOAuth  │    │
│  │  (built-in)    │  │  (built-in)    │  │  (RoboLearn)   │    │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘    │
│           │                   │                   │              │
│           └───────────────────┼───────────────────┘              │
│                               ▼                                  │
│                    ┌─────────────────┐                          │
│                    │  account table  │                          │
│                    │  providerId     │ ← "google", "github",    │
│                    │  accountId      │   "robolearn"            │
│                    │  userId (FK)    │                          │
│                    │  accessToken    │                          │
│                    │  refreshToken   │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### OAuth Flow (Standard for all providers)

```
1. User clicks "Sign in with Google" (example)
2. Frontend redirects to /api/auth/sign-in/social/google
3. Better Auth redirects to Google OAuth consent screen
4. User authorizes → Google redirects back with code
5. Better Auth exchanges code for tokens
6. Better Auth fetches user profile from provider
7. Better Auth links account:
   - If email matches existing user → link account
   - If new user → create user + account record
8. Better Auth creates session
9. User redirected to callbackURL
```

**Key Realization**: We don't implement OAuth flows. Better Auth does everything. We just:
- **Configure**: Add provider credentials to `auth.ts`
- **UI**: Add buttons to sign-in form
- **Environment**: Set `*_CLIENT_ID` and `*_CLIENT_SECRET`

---

## File Changes Breakdown

### 1. Backend Configuration

#### File: `sso-platform/src/lib/auth.ts`

**Location**: `plugins` array (line ~510)

**Changes**:
```typescript
import { socialProviders } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins";

// After existing plugins (jwt, oidcProvider, admin, organization, username, haveIBeenPwned, apiKey)
plugins: [
  // ... existing plugins ...

  // Social login providers (environment-driven)
  // Only enabled when respective env vars are set
  socialProviders({
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
      // Example: http://localhost:3001/api/auth/callback/google
    } : undefined,

    github: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // GitHub requires explicit email scope (GitHub Apps don't expose email by default)
      scope: ["user:email"],
      // Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/github
    } : undefined,
  }),

  // Generic OAuth for RoboLearn SSO (OIDC discovery)
  ...(process.env.ROBOLEARN_CLIENT_ID && process.env.ROBOLEARN_CLIENT_SECRET && process.env.ROBOLEARN_SSO_URL
    ? [genericOAuth({
        providerId: "robolearn",
        displayName: "RoboLearn",
        clientId: process.env.ROBOLEARN_CLIENT_ID,
        clientSecret: process.env.ROBOLEARN_CLIENT_SECRET,
        // OIDC discovery endpoint (auto-discovers auth/token/userinfo URLs)
        discoveryUrl: `${process.env.ROBOLEARN_SSO_URL}/.well-known/openid-configuration`,
        // Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/robolearn
        scopes: ["openid", "profile", "email"],
        // Map OIDC claims to Better Auth user fields
        userProfile: async (response) => {
          return {
            id: response.sub,
            email: response.email,
            name: response.name,
            emailVerified: response.email_verified || false,
            image: response.picture || null,
          };
        },
      })]
    : []),
],
```

**Why this works**:
- **Conditional loading**: Providers only load if env vars exist
- **Better Auth endpoints**: Automatically creates `/api/auth/sign-in/social/{provider}` and `/api/auth/callback/{provider}`
- **Account linking**: Better Auth handles email matching automatically
- **No schema changes**: Uses existing `account` table with `providerId` and `accountId`

---

### 2. Frontend UI Changes

#### File: `sso-platform/src/components/sign-in-form.tsx`

**Location**: After password field, before submit button (around line 233)

**Changes**:
```tsx
{/* Social login buttons - conditionally rendered based on NEXT_PUBLIC env vars */}
{(process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_ROBOLEARN_ENABLED === 'true') && (
  <div className="space-y-4 pt-4">
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-4 bg-card text-muted-foreground">Or continue with</span>
      </div>
    </div>

    <div className="grid gap-3">
      {/* Google Sign-In */}
      {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' && (
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}

      {/* GitHub Sign-In */}
      {process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true' && (
        <button
          type="button"
          onClick={() => handleSocialSignIn('github')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span>Continue with GitHub</span>
        </button>
      )}

      {/* RoboLearn Sign-In */}
      {process.env.NEXT_PUBLIC_ROBOLEARN_ENABLED === 'true' && (
        <button
          type="button"
          onClick={() => handleSocialSignIn('robolearn')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* RoboLearn logo (replace with actual SVG or image) */}
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            R
          </div>
          <span>Continue with RoboLearn</span>
        </button>
      )}
    </div>
  </div>
)}
```

**Add handler function**:
```tsx
const handleSocialSignIn = async (provider: 'google' | 'github' | 'robolearn') => {
  setIsLoading(true);
  try {
    // Build redirect URL with OAuth params if present (preserve OAuth flow)
    const params = new URLSearchParams();

    // Preserve OAuth parameters for post-login redirect
    if (clientId) params.set('client_id', clientId);
    if (redirectUri) params.set('redirect_uri', redirectUri);
    if (responseType) params.set('response_type', responseType);
    if (scope) params.set('scope', scope);
    if (state) params.set('state', state);
    if (codeChallenge) params.set('code_challenge', codeChallenge);
    if (codeChallengeMethod) params.set('code_challenge_method', codeChallengeMethod);

    // Redirect to Better Auth social sign-in endpoint
    // Better Auth handles the entire OAuth flow
    const redirectUrl = `/api/auth/sign-in/social/${provider}${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = redirectUrl;
  } catch (error) {
    setErrors({ general: `Failed to sign in with ${provider}. Please try again.` });
    setIsLoading(false);
  }
};
```

**Why this approach**:
- **Environment-driven UI**: Buttons only show if `NEXT_PUBLIC_*_ENABLED=true`
- **OAuth flow preservation**: Carries forward OAuth params for SSO flows
- **Better Auth handles everything**: No manual token exchange, just redirect to Better Auth endpoint

---

### 3. Environment Variables

#### File: `sso-platform/.env.example`

**Location**: After existing variables (around line 66)

**Add section**:
```bash
# =============================================================================
# OPTIONAL - Social Login Providers (008-social-login-providers)
# =============================================================================

# Google OAuth 2.0
# Get credentials: https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
# Example: http://localhost:3001/api/auth/callback/google
# GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# NEXT_PUBLIC_GOOGLE_ENABLED=true

# GitHub OAuth
# Get credentials: https://github.com/settings/developers
# Authorization callback URL: {BETTER_AUTH_URL}/api/auth/callback/github
# Example: http://localhost:3001/api/auth/callback/github
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
# NEXT_PUBLIC_GITHUB_ENABLED=true

# RoboLearn SSO (Generic OIDC)
# Requires OIDC-compliant provider with discovery endpoint
# Authorization callback URL: {BETTER_AUTH_URL}/api/auth/callback/robolearn
# Example: http://localhost:3001/api/auth/callback/robolearn
# ROBOLEARN_CLIENT_ID=your-robolearn-client-id
# ROBOLEARN_CLIENT_SECRET=your-robolearn-client-secret
# ROBOLEARN_SSO_URL=https://sso.robolearn.example.com
# NEXT_PUBLIC_ROBOLEARN_ENABLED=true
```

---

## Implementation Phases

### Phase 1: Backend Configuration (30 minutes)

**Tasks**:
1. Update `auth.ts` with `socialProviders` and `genericOAuth` plugins
2. Add conditional loading logic for environment-driven providers
3. Update `.env.example` with new variables

**Verification**:
```bash
# Start dev server
pnpm dev

# Check logs for provider initialization
# Should see: "[Better Auth] Google OAuth enabled" (if env vars set)
# Should NOT see errors about missing providers
```

**Acceptance Criteria**:
- [ ] Server starts without errors
- [ ] Providers only load when env vars are set
- [ ] No schema changes required
- [ ] Existing authentication still works

---

### Phase 2: Frontend UI (45 minutes)

**Tasks**:
1. Update `sign-in-form.tsx` with social sign-in buttons
2. Add `handleSocialSignIn` function
3. Add SVG icons for Google, GitHub, RoboLearn
4. Ensure OAuth parameter preservation

**Verification**:
```bash
# Without env vars
pnpm dev
# Visit /auth/sign-in → Should NOT see social buttons

# With env vars
NEXT_PUBLIC_GOOGLE_ENABLED=true pnpm dev
# Visit /auth/sign-in → Should see Google button only
```

**Acceptance Criteria**:
- [ ] Buttons render only when `NEXT_PUBLIC_*_ENABLED=true`
- [ ] Button clicks redirect to `/api/auth/sign-in/social/{provider}`
- [ ] OAuth parameters preserved in redirect URL
- [ ] Loading states work correctly

---

### Phase 3: Testing & Verification (45 minutes)

**Test Scenarios**:

#### 3.1 Google OAuth Flow
```bash
# 1. Set up Google OAuth
# - Go to https://console.cloud.google.com/apis/credentials
# - Create OAuth 2.0 Client ID
# - Add redirect URI: http://localhost:3001/api/auth/callback/google
# - Copy client ID and secret to .env

# 2. Test flow
GOOGLE_CLIENT_ID=xxx \
GOOGLE_CLIENT_SECRET=xxx \
NEXT_PUBLIC_GOOGLE_ENABLED=true \
pnpm dev

# 3. Manual test
# - Visit http://localhost:3001/auth/sign-in
# - Click "Continue with Google"
# - Authorize on Google
# - Should redirect back and create session

# 4. Verify database
pnpm db:studio
# Check account table:
# - providerId = "google"
# - accountId = Google user ID
# - userId = FK to user record
```

#### 3.2 GitHub OAuth Flow
```bash
# Similar to Google, redirect URI: /api/auth/callback/github
# Verify email scope is requested (GitHub specific)
```

#### 3.3 RoboLearn OIDC Flow
```bash
# Requires running RoboLearn SSO instance
# Test OIDC discovery endpoint first:
curl https://sso.robolearn.example.com/.well-known/openid-configuration
# Should return JSON with authorization_endpoint, token_endpoint, userinfo_endpoint
```

#### 3.4 Account Linking
```bash
# Test case: User signs in with Google, then GitHub (same email)
# Expected: Single user record, two account records
SELECT * FROM "user" WHERE email = 'test@example.com';
# Should show 1 row

SELECT * FROM "account" WHERE user_id = 'xxx';
# Should show 2 rows (providerId: google, github)
```

#### 3.5 Provider Toggle
```bash
# Test disabling provider
unset GOOGLE_CLIENT_ID
pnpm dev
# Visit /auth/sign-in → Google button should NOT appear

# Test enabling provider
export GOOGLE_CLIENT_ID=xxx
export GOOGLE_CLIENT_SECRET=xxx
export NEXT_PUBLIC_GOOGLE_ENABLED=true
pnpm dev
# Visit /auth/sign-in → Google button SHOULD appear
```

**Acceptance Criteria**:
- [ ] All three providers work end-to-end (Google, GitHub, RoboLearn)
- [ ] Account linking works (same email → same user)
- [ ] New users auto-added to default organization
- [ ] Provider buttons toggle correctly via env vars
- [ ] OAuth flow preservation works (redirect back to client app)
- [ ] Email verification skipped for social sign-ins (already verified by provider)

---

## Environment Variable Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | `false` | Show Google button in UI |
| `GITHUB_CLIENT_ID` | No | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth client secret |
| `NEXT_PUBLIC_GITHUB_ENABLED` | No | `false` | Show GitHub button in UI |
| `ROBOLEARN_CLIENT_ID` | No | - | RoboLearn OIDC client ID |
| `ROBOLEARN_CLIENT_SECRET` | No | - | RoboLearn OIDC client secret |
| `ROBOLEARN_SSO_URL` | No | - | RoboLearn SSO base URL (for discovery) |
| `NEXT_PUBLIC_ROBOLEARN_ENABLED` | No | `false` | Show RoboLearn button in UI |

**Security Notes**:
- Client secrets MUST be kept secret (never commit to git)
- Redirect URIs must be exact-match in provider console (no wildcards)
- PKCE not required (confidential client - server-side token exchange)
- HTTPS required in production (Google/GitHub enforce this)

---

## Redirect URI Configuration

### Development
```
Google:    http://localhost:3001/api/auth/callback/google
GitHub:    http://localhost:3001/api/auth/callback/github
RoboLearn: http://localhost:3001/api/auth/callback/robolearn
```

### Production
```
Google:    https://sso.taskflow.example.com/api/auth/callback/google
GitHub:    https://sso.taskflow.example.com/api/auth/callback/github
RoboLearn: https://sso.taskflow.example.com/api/auth/callback/robolearn
```

**Provider Setup Guides**:

#### Google
1. Go to https://console.cloud.google.com/apis/credentials
2. Create project (if needed)
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs: Add callback URL
7. Copy client ID and secret

#### GitHub
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Application name: Taskflow SSO
4. Homepage URL: `{BETTER_AUTH_URL}`
5. Authorization callback URL: Add callback URL
6. Generate client secret
7. Copy client ID and secret

#### RoboLearn
1. Verify OIDC discovery endpoint exists: `{ROBOLEARN_SSO_URL}/.well-known/openid-configuration`
2. Register OAuth client in RoboLearn admin panel
3. Set redirect URI to callback URL
4. Copy client ID and secret

---

## Database Impact

**No schema changes required!** Better Auth uses existing tables:

### `account` table (already exists)
```sql
-- Example records after social sign-in

-- Google sign-in
INSERT INTO account (
  id, user_id, provider_id, account_id,
  access_token, refresh_token, scope, created_at
) VALUES (
  'uuid-1', 'user-123', 'google', '117845723456789012345',
  'ya29.a0AfH6SM...', 'refresh_token...', 'openid profile email', NOW()
);

-- GitHub sign-in (same user, different provider)
INSERT INTO account (
  id, user_id, provider_id, account_id,
  access_token, scope, created_at
) VALUES (
  'uuid-2', 'user-123', 'github', '12345678',
  'gho_16C7e42F292c...', 'user:email', NOW()
);

-- RoboLearn SSO
INSERT INTO account (
  id, user_id, provider_id, account_id,
  access_token, id_token, scope, created_at
) VALUES (
  'uuid-3', 'user-123', 'robolearn', 'sub-claim-value',
  'access_token...', 'id_token...', 'openid profile email', NOW()
);
```

### `user` table (already exists)
```sql
-- User created via social sign-in (email from provider)
INSERT INTO user (
  id, name, email, email_verified, image, created_at
) VALUES (
  'user-123',
  'John Doe',
  'john@example.com',
  true,  -- Already verified by provider
  'https://lh3.googleusercontent.com/...',
  NOW()
);
```

**Audit Trail**: All account links automatically audited via Better Auth's internal logging. Future enhancement: Add explicit audit log entries for social sign-ins (see spec edge cases).

---

## Testing Strategy

### Manual Testing Checklist

**Google OAuth**:
- [ ] Sign in with Google (new user)
- [ ] Sign in with Google (existing user, same email)
- [ ] Profile data populated (name, email, picture)
- [ ] Email already verified (no verification email sent)
- [ ] User added to default organization

**GitHub OAuth**:
- [ ] Sign in with GitHub (new user)
- [ ] Sign in with GitHub (existing user, same email)
- [ ] Email scope requested and returned
- [ ] Profile data populated (username, email, avatar)
- [ ] User added to default organization

**RoboLearn SSO**:
- [ ] OIDC discovery works (fetches endpoints)
- [ ] Authorization redirect to RoboLearn
- [ ] Token exchange successful
- [ ] UserInfo endpoint called
- [ ] Claims mapped to user fields

**Account Linking**:
- [ ] Same email across providers → single user record
- [ ] Multiple account records per user
- [ ] Account unlinking (future: not in scope)

**UI Toggling**:
- [ ] No env vars → no buttons
- [ ] Google enabled → Google button only
- [ ] All enabled → all 3 buttons
- [ ] Button order: Google, GitHub, RoboLearn

**OAuth Flow Preservation**:
- [ ] Direct sign-in → redirects to `/`
- [ ] OAuth flow sign-in → redirects to `/api/auth/oauth2/authorize`
- [ ] Redirect param preserved → redirects to custom URL

---

## Risk Mitigation

### Risk 1: Email Not Available from Provider
**Scenario**: GitHub user has no public email
**Mitigation**: Request `user:email` scope (already in plan)
**Fallback**: Better Auth will fetch email via GitHub API

### Risk 2: Provider Downtime
**Scenario**: Google/GitHub OAuth is down
**Mitigation**: Email/password login remains available
**User Experience**: Show error message with fallback to email/password

### Risk 3: Account Linking Conflict
**Scenario**: User signs in with Google, then tries to link GitHub with different email
**Mitigation**: Better Auth prevents this by default (uses email as unique key)
**User Experience**: Show error: "This social account is linked to a different email"

### Risk 4: Token Refresh Failure
**Scenario**: Refresh token expires or is revoked
**Mitigation**: User must re-authenticate (standard OAuth behavior)
**User Experience**: Redirect to sign-in page on session expiry

### Risk 5: Production Redirect URI Mismatch
**Scenario**: Deployed to production but redirect URI not updated in provider console
**Mitigation**: Document exact redirect URIs in deployment guide
**Detection**: OAuth flow will fail with "redirect_uri_mismatch" error

---

## Success Criteria (From Spec)

- **SC-001**: Users can complete social sign-in within 10 seconds (including redirect) ✅
- **SC-002**: Platform operators can enable/disable any provider in under 1 minute (set env vars) ✅
- **SC-003**: Social sign-up users are auto-added to default organization (existing hook) ✅
- **SC-004**: Account linking succeeds 100% when emails match (Better Auth default) ✅
- **SC-005**: Login page correctly shows/hides provider buttons based on config ✅
- **SC-006**: All three providers can be enabled simultaneously without conflicts ✅

---

## Follow-up Tasks (Out of Scope)

**Not included in this implementation**:
1. Admin UI for managing OAuth credentials (env vars only for now)
2. Social provider-specific profile enrichment (GitHub repos, etc.)
3. Account unlinking UI (users can unlink via database only)
4. Additional providers (Apple, Microsoft, etc.)
5. Social login for mobile apps (native SDKs)

**Future enhancements** (if needed):
- Add audit log entries for social sign-ins
- Token refresh for API access (currently auth-only)
- Social provider avatar sync
- Account linking UI (let users link/unlink manually)

---

## Architectural Decision Records

### ADR Candidates

**Decision 1**: Use Better Auth `socialProviders` vs manual OAuth implementation
- **Rationale**: Better Auth handles token exchange, account linking, and security
- **Trade-off**: Less control, but significantly faster and more secure
- **Verdict**: Use Better Auth (reduces implementation time from 2 days to 2 hours)

**Decision 2**: Environment-driven provider toggling
- **Rationale**: No code deployment needed to enable/disable providers
- **Trade-off**: Requires restart in some environments (not Vercel)
- **Verdict**: Environment-driven (matches platform operator requirements)

**Decision 3**: RoboLearn via `genericOAuth` vs custom plugin
- **Rationale**: RoboLearn is OIDC-compliant, no custom logic needed
- **Trade-off**: Limited customization, but follows standards
- **Verdict**: Use `genericOAuth` (standard OIDC flow)

**Recommendation**: Create ADR for Decision 1 (major architectural choice)

---

## Complexity Assessment

**Complexity Rating**: LOW
- No database migrations
- No API changes
- Configuration-only changes
- Better Auth handles all OAuth complexity

**Estimated Time**: 2-3 hours
- Phase 1 (Backend): 30 minutes
- Phase 2 (Frontend): 45 minutes
- Phase 3 (Testing): 45-60 minutes

**Skills Required**:
- Better Auth plugin configuration
- React component updates
- OAuth 2.0 concepts (redirect URIs, scopes)
- Environment variable management

---

## References

**Better Auth Documentation**:
- Social Providers: https://www.better-auth.com/docs/plugins/social-providers
- Generic OAuth: https://www.better-auth.com/docs/plugins/generic-oauth
- Account Linking: https://www.better-auth.com/docs/concepts/account-linking

**OAuth Provider Documentation**:
- Google: https://developers.google.com/identity/protocols/oauth2
- GitHub: https://docs.github.com/en/apps/oauth-apps
- OIDC Discovery: https://openid.net/specs/openid-connect-discovery-1_0.html

**Project Documentation**:
- Constitution: `.specify/memory/constitution.md`
- Integration Guide: `docs/integration-guide.md`
- Environment Setup: `sso-platform/.env.example`

---

**Plan Status**: READY FOR IMPLEMENTATION
**Next Step**: Execute Phase 1 (Backend Configuration)
**Reviewer**: Validate against spec.md acceptance scenarios
