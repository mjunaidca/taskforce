# Social Login Providers

This guide explains how to configure optional social login providers (Google, GitHub, RoboLearn SSO) for Taskflow SSO Platform.

## Overview

Social login providers allow users to authenticate using their existing accounts from third-party identity providers. All providers are **environment-driven** - set the credentials to enable, unset to disable. No code changes required.

**Supported Providers:**
- Google OAuth 2.0 (built-in)
- GitHub OAuth (built-in)
- RoboLearn SSO (custom OIDC via genericOAuth)

## Redirect URI Pattern

When registering OAuth clients with any provider, you must configure the redirect URI (also called "callback URL"). Better Auth automatically creates callback endpoints for each provider.

> **Important**: Built-in social providers (Google, GitHub) and genericOAuth providers (RoboLearn) use **different callback paths**!

### URI Formats

| Provider Type | Callback Path Pattern |
|---------------|----------------------|
| Built-in (Google, GitHub) | `/api/auth/callback/{provider}` |
| genericOAuth (RoboLearn) | `/api/auth/oauth2/callback/{providerId}` |

### Development URIs

| Provider | Redirect URI |
|----------|--------------|
| Google | `http://localhost:3001/api/auth/callback/google` |
| GitHub | `http://localhost:3001/api/auth/callback/github` |
| RoboLearn | `http://localhost:3001/api/auth/oauth2/callback/robolearn` |

### Production URIs

| Provider | Redirect URI |
|----------|--------------|
| Google | `https://sso.yourdomain.com/api/auth/callback/google` |
| GitHub | `https://sso.yourdomain.com/api/auth/callback/github` |
| RoboLearn | `https://sso.yourdomain.com/api/auth/oauth2/callback/robolearn` |

> **Important**: Redirect URIs must be **exact matches**. No wildcards are allowed for security reasons.

---

## Google OAuth 2.0

### Step 1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Click **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3001/api/auth/callback/google`
   - Production: `https://your-sso-domain.com/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

```bash
# .env or .env.local
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
NEXT_PUBLIC_GOOGLE_ENABLED=true
```

### Step 3: Verify

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:3001/auth/sign-in`
3. You should see "Continue with Google" button
4. Click to test the OAuth flow

---

## GitHub OAuth

### Step 1: Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Taskflow SSO
   - **Homepage URL**: `http://localhost:3001` (or production URL)
   - **Authorization callback URL**: `http://localhost:3001/api/auth/callback/github`
4. Click **Register application**
5. Generate a **Client Secret**
6. Copy **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

```bash
# .env or .env.local
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRET=your-github-client-secret
NEXT_PUBLIC_GITHUB_ENABLED=true
```

### Step 3: Verify

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:3001/auth/sign-in`
3. You should see "Continue with GitHub" button
4. Click to test the OAuth flow

> **Note**: The `user:email` scope is automatically requested to ensure email is available even if the user's GitHub profile has no public email.

---

## RoboLearn SSO (Custom OIDC)

RoboLearn SSO is configured as a generic OIDC provider using Better Auth's `genericOAuth` plugin.

### Prerequisites

- RoboLearn SSO must be OIDC-compliant
- Discovery endpoint must be available at `{ROBOLEARN_SSO_URL}/.well-known/openid-configuration`

### Step 1: Register OAuth Client in RoboLearn

1. Access RoboLearn SSO admin panel
2. Register a new OAuth client:
   - **Client Type**: Confidential
   - **Redirect URI**: `http://localhost:3001/api/auth/oauth2/callback/robolearn`
   - **Scopes**: `openid`, `profile`, `email`
3. Copy **Client ID** and **Client Secret**

> **Note**: RoboLearn uses the `genericOAuth` plugin which has a different callback path (`/oauth2/callback/`) than built-in social providers (`/callback/`).

### Step 2: Configure Environment Variables

```bash
# .env or .env.local
ROBOLEARN_CLIENT_ID=taskflow-sso-client
ROBOLEARN_CLIENT_SECRET=your-robolearn-client-secret
# IMPORTANT: Include /api/auth if discovery is at /api/auth/.well-known/openid-configuration
ROBOLEARN_SSO_URL=https://robolearn-sso.vercel.app/api/auth
NEXT_PUBLIC_ROBOLEARN_ENABLED=true
```

### Step 3: Verify OIDC Discovery

Before testing, verify the discovery endpoint. The URL is `{ROBOLEARN_SSO_URL}/.well-known/openid-configuration`:

```bash
# Example for RoboLearn deployed on Vercel:
curl https://robolearn-sso.vercel.app/api/auth/.well-known/openid-configuration
```

Expected response should include:
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`

### Step 4: Verify

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:3001/auth/sign-in`
3. You should see "Continue with RoboLearn" button
4. Click to test the OIDC flow

---

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | Show Google button (`true`/`false`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |
| `NEXT_PUBLIC_GITHUB_ENABLED` | No | Show GitHub button (`true`/`false`) |
| `ROBOLEARN_CLIENT_ID` | No | RoboLearn OIDC client ID |
| `ROBOLEARN_CLIENT_SECRET` | No | RoboLearn OIDC client secret |
| `ROBOLEARN_SSO_URL` | No | RoboLearn SSO base URL |
| `NEXT_PUBLIC_ROBOLEARN_ENABLED` | No | Show RoboLearn button (`true`/`false`) |

> **Note**: The `NEXT_PUBLIC_*_ENABLED` variables control UI visibility. The backend providers only load when their respective `CLIENT_ID` and `CLIENT_SECRET` are set.

---

## Database & Account Linking

### How Social Login Affects the Database

When a user signs in with a social provider, Better Auth automatically manages database records:

**First Login (New User):**
1. New record created in `user` table with profile data from provider
2. New record created in `account` table linking provider to user
3. User automatically added to default organization (if configured)

**Subsequent Logins (Existing User):**
1. User found by email in `user` table
2. New session created
3. No duplicate records

### Database Tables

**`user` table** - stores user profile:
| Column | Description |
|--------|-------------|
| `id` | Unique user ID |
| `email` | User's email (from provider) |
| `name` | Display name (from provider) |
| `image` | Profile picture URL (from provider) |
| `emailVerified` | Whether email is verified |
| `createdAt` | Account creation timestamp |

**`account` table** - stores OAuth provider links:
| Column | Description |
|--------|-------------|
| `providerId` | `google`, `github`, or `robolearn` |
| `accountId` | User's ID from the provider |
| `userId` | Foreign key to `user` table |
| `accessToken` | OAuth access token |
| `refreshToken` | OAuth refresh token (if provided) |
| `expiresAt` | Token expiration time |

### Account Linking Behavior

> **Note:** Account linking is enabled by default in Better Auth. If a user logs in with multiple providers (Google, GitHub, RoboLearn) using the same email address, their accounts will be linked to a single user record automatically. No explicit configuration is required.

This means:
- **Same email across providers** → All accounts link to single user record
- **Example**: Login with Google (user@example.com), then GitHub (user@example.com) → Same user, two linked accounts
- **Different emails** → Separate user records created

### Auto-Join Default Organization

New users created via social login are automatically added to the default organization:

```typescript
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        // Auto-adds new user to default organization with 'member' role
      }
    }
  }
}
```

This ensures social login users have immediate access to organization resources without manual admin intervention.

### Querying Social Login Users

To find users who signed up via social providers:

```sql
-- Find all users with Google accounts
SELECT u.* FROM "user" u
JOIN account a ON a."userId" = u.id
WHERE a."providerId" = 'google';

-- Find all users with RoboLearn accounts
SELECT u.* FROM "user" u
JOIN account a ON a."userId" = u.id
WHERE a."providerId" = 'robolearn';

-- Find users with multiple linked providers
SELECT u.email, COUNT(a.id) as provider_count
FROM "user" u
JOIN account a ON a."userId" = u.id
GROUP BY u.id, u.email
HAVING COUNT(a.id) > 1;
```

---

## Troubleshooting

### "redirect_uri_mismatch" or "INVALID_REDIRECT_URI" Error

The redirect URI in your provider console doesn't match exactly. Check:
- Protocol (`http` vs `https`)
- Port number (`:3001`)
- Path - **IMPORTANT**: Different for each provider type:
  - Google/GitHub: `/api/auth/callback/{provider}`
  - RoboLearn (genericOAuth): `/api/auth/oauth2/callback/robolearn`
- No trailing slash

**Common mistake**: Using `/api/auth/callback/robolearn` instead of `/api/auth/oauth2/callback/robolearn` for RoboLearn.

### Button Not Showing

1. Check `NEXT_PUBLIC_*_ENABLED=true` is set
2. Restart the dev server (Next.js caches env vars)
3. Check browser console for errors

### "Invalid client_id" Error

The client ID doesn't match what's registered with the provider. Verify:
- No extra spaces in the env var
- Correct client ID copied from provider console

### GitHub: "Email not available"

GitHub may not return email if:
- User has no public email set
- The `user:email` scope wasn't requested (we request it automatically)

Solution: User should add a public email to their GitHub profile, or the SSO will use the primary email from GitHub's API.

### RoboLearn: "Discovery failed" or 404 Error

The OIDC discovery endpoint is not accessible. Check:
- `ROBOLEARN_SSO_URL` includes the full path to auth (e.g., `https://robolearn-sso.vercel.app/api/auth`)
- Discovery endpoint returns valid JSON at `{ROBOLEARN_SSO_URL}/.well-known/openid-configuration`
- No firewall blocking the request

**Common mistake**: Setting `ROBOLEARN_SSO_URL=https://robolearn-sso.vercel.app` when the discovery endpoint is actually at `https://robolearn-sso.vercel.app/api/auth/.well-known/openid-configuration`. Include `/api/auth` in the URL.

---

## Security Considerations

1. **HTTPS Required**: Google and GitHub require HTTPS in production
2. **Secret Storage**: Never commit client secrets to git. Use environment variables or secret management
3. **Redirect URI Validation**: Always use exact-match redirect URIs
4. **Token Storage**: Access tokens are stored in the `account` table (encrypted at rest if DB supports it)

---

## Related Documentation

- [Integration Guide](./integration-guide.md) - Backend integration with client applications
- [Environment Variables](./environment-variables.md) - Complete env var reference
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
