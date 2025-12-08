# Feature Specification: Social Login Providers

**Feature Branch**: `008-social-login-providers`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Add optional social login providers (Google, GitHub, RoboLearn SSO) to Taskflow SSO Platform, enabled/disabled via environment variables"

## Intent

Enable users to sign in to Taskflow SSO using third-party identity providers (Google, GitHub) and a custom OIDC provider (RoboLearn SSO). Each provider is **independently toggleable** via environment variables, allowing platform operators to enable only the providers they need without code changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign In with Google (Priority: P1)

A user visits the Taskflow SSO login page and clicks "Sign in with Google". They are redirected to Google's OAuth consent screen, authorize the application, and are redirected back to Taskflow SSO with an authenticated session.

**Why this priority**: Google is the most widely used OAuth provider globally. Enabling Google login reduces friction for the majority of users who already have Google accounts.

**Independent Test**: Can be fully tested by setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables, clicking the Google sign-in button, and completing the OAuth flow.

**Acceptance Scenarios**:

1. **Given** Google OAuth is enabled (env vars set) and user is not signed in, **When** user clicks "Sign in with Google", **Then** user is redirected to Google's OAuth consent screen
2. **Given** user completes Google OAuth consent, **When** redirected back to Taskflow SSO, **Then** user session is created and user is signed in
3. **Given** user has existing Taskflow account with same email, **When** user signs in with Google, **Then** accounts are linked (same user record)
4. **Given** user is new (no existing account), **When** user signs in with Google, **Then** new user account is created with Google profile data

---

### User Story 2 - Sign In with GitHub (Priority: P1)

A user visits the Taskflow SSO login page and clicks "Sign in with GitHub". They are redirected to GitHub's OAuth authorization page, authorize the application, and are redirected back with an authenticated session.

**Why this priority**: GitHub is essential for developer-focused platforms. Many Taskflow users will be developers who prefer GitHub authentication.

**Independent Test**: Can be fully tested by setting `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables, clicking the GitHub sign-in button, and completing the OAuth flow.

**Acceptance Scenarios**:

1. **Given** GitHub OAuth is enabled (env vars set) and user is not signed in, **When** user clicks "Sign in with GitHub", **Then** user is redirected to GitHub's OAuth authorization page
2. **Given** user completes GitHub OAuth authorization, **When** redirected back to Taskflow SSO, **Then** user session is created and user is signed in
3. **Given** user has existing Taskflow account with same email, **When** user signs in with GitHub, **Then** accounts are linked
4. **Given** GitHub user has no public email, **When** user signs in with GitHub, **Then** system retrieves email via GitHub API (user:email scope)

---

### User Story 3 - Sign In with RoboLearn (Priority: P2)

A user who already has a RoboLearn SSO account visits Taskflow SSO and clicks "Sign in with RoboLearn". They are redirected to RoboLearn's SSO, authenticate there, and return to Taskflow SSO with a linked session.

**Why this priority**: Enables cross-platform SSO between Taskflow and RoboLearn ecosystems. Lower priority than major providers but essential for users who have RoboLearn accounts.

**Independent Test**: Can be fully tested by setting `ROBOLEARN_CLIENT_ID`, `ROBOLEARN_CLIENT_SECRET`, and `ROBOLEARN_SSO_URL` environment variables, clicking the RoboLearn sign-in button, and completing the OIDC flow.

**Acceptance Scenarios**:

1. **Given** RoboLearn OAuth is enabled (env vars set) and user is not signed in, **When** user clicks "Sign in with RoboLearn", **Then** user is redirected to RoboLearn SSO login page
2. **Given** user completes RoboLearn authentication, **When** redirected back to Taskflow SSO, **Then** user session is created with RoboLearn profile data
3. **Given** RoboLearn user has existing Taskflow account with same email, **When** user signs in with RoboLearn, **Then** accounts are linked

---

### User Story 4 - Provider Toggle via Environment Variables (Priority: P1)

Platform operators can enable or disable individual social login providers by setting or unsetting environment variables. No code deployment is required to toggle providers.

**Why this priority**: Core architectural requirement. Without this, the feature has no operational flexibility.

**Independent Test**: Can be tested by deploying with different combinations of environment variables and verifying login UI shows only enabled providers.

**Acceptance Scenarios**:

1. **Given** `GOOGLE_CLIENT_ID` is set, **When** login page loads, **Then** "Sign in with Google" button is visible
2. **Given** `GOOGLE_CLIENT_ID` is NOT set, **When** login page loads, **Then** "Sign in with Google" button is NOT visible
3. **Given** `GITHUB_CLIENT_ID` is set, **When** login page loads, **Then** "Sign in with GitHub" button is visible
4. **Given** `GITHUB_CLIENT_ID` is NOT set, **When** login page loads, **Then** "Sign in with GitHub" button is NOT visible
5. **Given** `ROBOLEARN_CLIENT_ID` is set, **When** login page loads, **Then** "Sign in with RoboLearn" button is visible
6. **Given** no social provider env vars are set, **When** login page loads, **Then** only email/password sign-in is shown

---

### Edge Cases

- **Email mismatch during account linking**: If user tries to link a social account with different email than existing account, system should warn user and optionally allow manual linking by authenticated user
- **Provider unavailable**: If external OAuth provider (Google/GitHub) is down, show user-friendly error message with option to use email/password
- **Token refresh failure**: If social provider token refresh fails, user should be prompted to re-authenticate
- **Duplicate email across providers**: User with same email in Google and GitHub should link to same Taskflow account
- **Social provider account disabled**: If user's Google/GitHub account is banned/disabled, Taskflow should handle gracefully

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support Google OAuth 2.0 sign-in when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables are set
- **FR-002**: System MUST support GitHub OAuth sign-in when `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables are set
- **FR-003**: System MUST support RoboLearn OIDC sign-in when `ROBOLEARN_CLIENT_ID`, `ROBOLEARN_CLIENT_SECRET`, and `ROBOLEARN_SSO_URL` environment variables are set
- **FR-004**: System MUST hide social login buttons when their respective environment variables are not configured
- **FR-005**: System MUST link social accounts to existing user accounts when email addresses match
- **FR-006**: System MUST create new user accounts when social login is used by new users (no existing account with matching email)
- **FR-007**: System MUST store social provider account links in the existing `account` table (providerId, accountId fields)
- **FR-008**: System MUST request `user:email` scope from GitHub to ensure email is available (required for GitHub Apps)
- **FR-009**: System MUST use OIDC discovery endpoint for RoboLearn provider configuration (`/.well-known/openid-configuration`)
- **FR-010**: System MUST preserve existing email/password authentication regardless of social provider configuration
- **FR-011**: Users MUST be able to link multiple social accounts to a single Taskflow account
- **FR-012**: System MUST auto-add social sign-up users to default organization (existing behavior for email signup)

### Non-Functional Requirements

- **NFR-001**: Social login buttons MUST render within 100ms of page load (no visible delay)
- **NFR-002**: OAuth redirect flow MUST complete within 5 seconds (excluding external provider time)
- **NFR-003**: Provider configuration MUST be hot-reloadable (no server restart required in development)

### Key Entities *(include if feature involves data)*

- **Account**: Existing Better Auth entity that stores provider links. Fields: `providerId` (google/github/robolearn), `accountId` (external user ID), `userId` (FK to user), `accessToken`, `refreshToken`
- **User**: Existing user entity. Social logins create/link to user records. Email from social provider used for matching.

## Constraints

- **No schema changes**: Must use existing `account` and `user` tables (Better Auth already supports social providers)
- **Environment-driven**: All provider credentials via environment variables, never hardcoded
- **Better Auth native**: Use Better Auth's `socialProviders` config and `genericOAuth` plugin, no custom OAuth implementation
- **Production security**: Redirect URIs must be exact-match, no wildcard patterns

## Assumptions

- RoboLearn SSO is a standard OIDC-compliant provider with discovery endpoint
- Platform operators have or can obtain OAuth credentials from Google Cloud Console and GitHub Developer Portal
- Existing user table supports multiple linked accounts (verified: Better Auth account table exists)
- Default organization auto-join logic already exists and will apply to social sign-ups

## Out of Scope

- Social login for mobile apps (native SDKs) - web-only for now
- Social provider-specific profile enrichment (e.g., pulling GitHub repos, Google calendar)
- Social provider token refresh for API access (only authentication, not ongoing API calls)
- Admin UI for managing OAuth provider credentials (env vars only)
- Apple Sign-In, Microsoft, or other providers beyond Google/GitHub/RoboLearn

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete social sign-in within 10 seconds (including redirect to provider and back)
- **SC-002**: Platform operators can enable/disable any provider in under 1 minute by changing environment variables
- **SC-003**: Social sign-up users are auto-added to default organization (100% parity with email signup)
- **SC-004**: Account linking succeeds 100% of the time when emails match
- **SC-005**: Login page correctly shows/hides provider buttons based on configuration (zero mismatches)
- **SC-006**: All three providers (Google, GitHub, RoboLearn) can be enabled simultaneously without conflicts

## Dependencies

- Better Auth `socialProviders` configuration (Google, GitHub built-in)
- Better Auth `genericOAuth` plugin (for RoboLearn custom OIDC)
- Existing sign-in UI components (buttons, forms)
- Environment variable configuration system
