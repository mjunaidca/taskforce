import { betterAuth } from "better-auth";
// Note: createAuthMiddleware, APIError, getSessionFromCtx removed - using custom endpoints for admin auth
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oidcProvider } from "better-auth/plugins/oidc-provider";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { jwt } from "better-auth/plugins";
import { username } from "better-auth/plugins";
import { haveIBeenPwned } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins"; // 008-social-login-providers
import { deviceAuthorization } from "better-auth/plugins"; // 014-mcp-oauth-standardization
import { db } from "./db";
import * as schema from "../../auth-schema"; // Use Better Auth generated schema
import { member } from "../../auth-schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { Resend } from "resend";
import * as nodemailer from "nodemailer";
import { TRUSTED_CLIENTS, DEFAULT_ORG_ID } from "./trusted-clients";
import { redis, redisStorage } from "./redis";
import bcrypt from "bcryptjs";

/**
 * Cookie prefix for Better Auth session cookies
 * Used in auth config and endsession endpoint for consistent cookie handling
 */
export const AUTH_COOKIE_PREFIX = "robolearn";

// Cached default organization ID (validated at startup)
let cachedDefaultOrgId: string | null = null;

/**
 * Get default organization ID with validation and fallback
 * This function is called at app startup to validate the default org exists
 * and cache its ID to avoid DB lookups on every signup
 */
async function validateAndCacheDefaultOrg(): Promise<string | null> {
  try {
    // Check if default org exists
    const defaultOrg = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, DEFAULT_ORG_ID))
      .limit(1);

    if (defaultOrg.length > 0) {
      cachedDefaultOrgId = defaultOrg[0].id;
      console.log("[Auth] Default organization validated:", cachedDefaultOrgId);
      return cachedDefaultOrgId;
    }

    // Default org doesn't exist - warn but don't fail startup
    console.warn("[Auth] WARNING: Default organization not found!");
    console.warn(`[Auth] Expected ID: ${DEFAULT_ORG_ID}`);
    console.warn("[Auth] Run 'pnpm run seed:setup' to create default organization");
    console.warn("[Auth] New users will NOT be auto-added to any organization");

    return null;
  } catch (error) {
    console.error("[Auth] Failed to validate default organization:", error);
    return null;
  }
}

/**
 * Get the default organization ID for auto-join
 * Returns null if default org doesn't exist (users won't auto-join)
 */
function getDefaultOrgId(): string | null {
  return cachedDefaultOrgId;
}

// Email configuration - supports multiple providers
// Priority: SMTP (Google/custom) > Resend
// Required: EMAIL_FROM or provider-specific from address

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM;

// Provider 1: SMTP (Google Gmail, custom SMTP, etc.)
// For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=your@gmail.com, SMTP_PASS=app-password
const smtpConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const smtpTransport = smtpConfigured
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  : null;

// Provider 2: Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email is enabled if we have any provider AND a from address
const emailEnabled = !!(EMAIL_FROM && (smtpTransport || resend));

// Log which provider is active on startup
if (emailEnabled) {
  console.log("[Auth] Email enabled via:", smtpTransport ? "SMTP" : "Resend", "from:", EMAIL_FROM);
} else {
  console.log("[Auth] Email disabled - missing provider or EMAIL_FROM");
}

// Generic email sender - tries SMTP first, then Resend
// IMPORTANT: Fire-and-forget to prevent slow SMTP from blocking signup
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!emailEnabled || !EMAIL_FROM) {
    console.warn("[Auth] Email not configured - skipping email to:", to);
    return;
  }

  // Fire-and-forget: Don't block signup/auth flow if email is slow
  // User can request resend if email doesn't arrive
  const sendAsync = async () => {
    try {
      // Priority 1: SMTP (Google, custom)
      if (smtpTransport) {
        const result = await smtpTransport.sendMail({
          from: EMAIL_FROM,
          to,
          subject,
          html,
        });
        console.log("[Auth] Email sent via SMTP to:", to, "messageId:", result.messageId);
        return;
      }

      // Priority 2: Resend
      if (resend) {
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to,
          subject,
          html,
        });
        console.log("[Auth] Email sent via Resend to:", to, "id:", result.data?.id);
        return;
      }
    } catch (error) {
      // Log error but don't throw - email failure shouldn't block auth
      console.error("[Auth] Failed to send email to:", to, "error:", error);
    }
  };

  // Start email send but don't await - returns immediately
  sendAsync();
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  // Disable /token endpoint when using OIDC Provider (OAuth equivalent is /oauth2/token)
  // Disable /sign-in/username - users sign in with email only, username is for profiles
  // Disable API key management endpoints - use custom admin-only endpoints instead
  // Note: /api-key/verify is NOT disabled - it's needed for M2M services (handled by custom route)
  disabledPaths: [
    "/token",
    "/sign-in/username",
    "/api-key/create",  // Use /api/admin/api-keys/create instead
    "/api-key/delete",  // Use /api/admin/api-keys/delete instead
    "/api-key/update",  // Use /api/admin/api-keys/update instead
    "/api-key/list",    // Use /api/admin/api-keys/list instead
  ],

  // OIDC Standard Claims - extends user table with standard profile fields
  user: {
    additionalFields: {
      // OIDC Standard Claims
      givenName: { type: "string", required: false },
      familyName: { type: "string", required: false },
      picture: { type: "string", required: false },
      phoneNumber: { type: "string", required: false },
      phoneNumberVerified: { type: "boolean", required: false, defaultValue: false },
      locale: { type: "string", required: false },
      zoneinfo: { type: "string", required: false },
      // TODO: Migrate to member.metadata in Proposal 001 (tenant-specific fields)
      softwareBackground: { type: "string", required: false },
      hardwareTier: { type: "string", required: false },
      // Additional profile fields (003-user-profile-fields)
      gender: { type: "string", required: false },
      fatherName: { type: "string", required: false },
      city: { type: "string", required: false },
      country: { type: "string", required: false },
    },
  },

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Require email verification (disable in test environment for automated testing)
    requireEmailVerification: process.env.DISABLE_EMAIL_VERIFICATION !== 'true',
    // Custom password verification to support migrated bcrypt hashes from NextAuth
    // New passwords use scrypt (Better Auth default), migrated users have bcrypt ($2b$...)
    password: {
      verify: async ({ password, hash }) => {
        // Check if this is a bcrypt hash (migrated from NextAuth)
        if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
          // Use bcryptjs to verify bcrypt hashes
          return bcrypt.compare(password, hash);
        }
        // Default: Use Better Auth's scrypt verification for new passwords
        const { verifyPassword } = await import('better-auth/crypto');
        return verifyPassword({ password, hash });
      },
      // Keep using scrypt for new passwords (don't change hash function)
      // Progressive migration: When users change password, they get scrypt hash
    },
    // Password reset - always register handler (sendEmail handles disabled case gracefully)
    sendResetPassword: async ({ user, url }) => {
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Taskflow SSO";
        const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Secure Single Sign-On";
        const orgName = process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow";

        await sendEmail({
          to: user.email,
          subject: `Reset your ${appName} password`,
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                  <td align="center">
                    <!-- Main container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">${appName}</h1>
                          <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">${appDescription}</p>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">Password Reset Request</h2>
                          <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #374151;">
                            Hello${user.name ? ` ${user.name}` : ''},
                          </p>
                          <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #374151;">
                            We received a request to reset your password. Click the button below to create a new password:
                          </p>

                          <!-- Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td align="center" style="padding: 0 0 24px;">
                                <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Reset Password</a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                            Or copy and paste this link into your browser:
                          </p>
                          <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-size: 13px; color: #374151; word-break: break-all; font-family: monospace;">
                            ${url}
                          </p>

                          <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 14px; color: #92400e;">
                              <strong>⏱️ This link expires in 1 hour</strong> for your security.
                            </p>
                          </div>

                          <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                            This is an automated message from <strong>${appName}</strong>
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                            Secure authentication for your ${orgName} applications
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
    },
  },

  // Email verification configuration - always required for security
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Taskflow SSO";
      const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Secure Single Sign-On";
      const orgName = process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow";

      await sendEmail({
        to: user.email,
        subject: `Verify your ${appName} account`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <!-- Main container -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">${appName}</h1>
                        <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">${appDescription}</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">Welcome to ${orgName}!</h2>
                        <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #374151;">
                          Hello${user.name ? ` ${user.name}` : ''},
                        </p>
                        <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #374151;">
                          Thank you for creating your account. To get started, please verify your email address by clicking the button below:
                        </p>

                        <!-- Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 24px;">
                              <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Verify Email Address</a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-size: 13px; color: #374151; word-break: break-all; font-family: monospace;">
                          ${url}
                        </p>

                        <div style="padding: 16px; background-color: #dbeafe; border-left: 4px solid #2563eb; border-radius: 4px; margin-bottom: 24px;">
                          <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                            <strong>⏱️ This link expires in 1 hour</strong> for your security.
                          </p>
                        </div>

                        <div style="padding: 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #065f46;">
                            🎓 What's next?
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 20px;">
                            Once verified, you'll have secure access to all ${orgName} applications with a single account.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                        <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                          This is an automated message from <strong>${appName}</strong>
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                          Secure authentication for your ${orgName} applications
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Cookie settings
  advanced: {
    cookiePrefix: AUTH_COOKIE_PREFIX,
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Rate limiting - Configured for 100k users scale
  // Peak calculation: 10k concurrent × 5 API calls = 50k requests
  // Distributed over 10 minutes = 5k req/min + 20% buffer = 6k req/min
  // Conservative limit: 3000 req/min (50 req/sec) to prevent abuse
  rateLimit: {
    window: 60, // 60 seconds
    max: 3000, // 3000 requests per minute - supports 100k user base
    // Automatically use Redis if configured, otherwise fall back to memory
    // Redis required for multi-instance deployments (Cloud Run, Kubernetes)
    storage: redis ? "secondary-storage" : "memory",

    // Per-endpoint rules for security-sensitive operations
    customRules: {
      // Authentication endpoints - strict limits to prevent brute force
      "/sign-in/email": {
        window: 60,
        max: 10, // 10 login attempts per minute per IP
      },
      "/sign-up/email": {
        window: 60,
        max: 5, // 5 signups per minute per IP
      },
      "/forgot-password": {
        window: 300, // 5 minutes
        max: 3, // 3 password reset requests per 5 minutes
      },
      "/reset-password": {
        window: 300, // 5 minutes
        max: 3, // 3 password reset attempts per 5 minutes
      },

      // OAuth 2.1 endpoints - generous limits for normal flows
      "/oauth2/authorize": {
        window: 60,
        max: 200, // Authorization requests (initial OAuth flow)
      },
      "/oauth2/token": {
        window: 60,
        max: 100, // Token exchanges (code → token)
      },
      "/oauth2/userinfo": {
        window: 60,
        max: 300, // UserInfo endpoint (frequently called by clients)
      },

      // Admin endpoints - moderate limits
      "/admin/clients/register": {
        window: 60,
        max: 10, // Client registration (admin only)
      },
      "/admin/clients": {
        window: 60,
        max: 50, // Client management operations
      },

      // API Key endpoints - M2M authentication
      "/api-key/create": {
        window: 60,
        max: 10, // Key creation (admin only, low volume)
      },
      "/api-key/verify": {
        window: 60,
        max: 500, // Verification endpoint (high volume from M2M services)
      },
      "/api-key/list": {
        window: 60,
        max: 50, // List keys (admin dashboard)
      },
      "/api-key/delete": {
        window: 60,
        max: 10, // Key deletion (admin only, low volume)
      },
      "/api-key/update": {
        window: 60,
        max: 20, // Key updates (admin only)
      },

      // Session management - no rate limit (called frequently by all clients)
      "/get-session": false, // Disable rate limiting for session checks
      "/session": false, // Disable rate limiting for session checks
    },
  },

  // Trusted origins for CORS
  // Production: Set ALLOWED_ORIGINS env var (comma-separated list of URLs)
  // Development: Falls back to localhost:3000
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",") ||
    (process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://localhost:3001"] : []),

  // =============================================================================
  // Social Login Providers (008-social-login-providers)
  // Environment-driven: providers only load when env vars are set
  // =============================================================================
  socialProviders: {
    // Google OAuth 2.0 - loads only if GOOGLE_CLIENT_ID is set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
      },
    } : {}),

    // GitHub OAuth - loads only if GITHUB_CLIENT_ID is set
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // GitHub requires explicit email scope (GitHub Apps don't expose email by default)
        scope: ["user:email"],
        // Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/github
      },
    } : {}),
  },

  // Plugins
  plugins: [
    // JWT Plugin - Enables JWKS endpoint for asymmetric key signing (RS256)
    // This allows client-side token verification, reducing server load
    // Enterprise Security: Automatic key rotation + encrypted private keys
    jwt({
      jwks: {
        keyPairConfig: {
          alg: "RS256", // RSA with SHA-256 - standard for OIDC/JWKS
        },
        // Automatic key rotation for enterprise security
        // Keys rotate every 90 days with 30-day grace period
        // Clients automatically use correct key via 'kid' in JWT header
        rotationInterval: 60 * 60 * 24 * 90, // 90 days (7,776,000 seconds)
        gracePeriod: 60 * 60 * 24 * 30, // 30 days grace period (2,592,000 seconds)

        // Private key encryption enabled for security (AES-256-GCM)
        // Recommended by Better Auth for production environments
        disablePrivateKeyEncryption: false, // Enable encryption (production security)
      },
    }),

    // OIDC Provider - Makes auth-server an OAuth2/OIDC provider
    oidcProvider({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/consent",
      // Enable JWT plugin integration for asymmetric key signing
      // ID tokens will be signed with RS256 using JWKS keys instead of HS256 with secret
      useJWTPlugin: true,
      // OAuth token expiration configuration
      accessTokenExpiresIn: 60 * 60 * 6, // 6 hours (21600 seconds)
      refreshTokenExpiresIn: 60 * 60 * 24 * 7, // 7 days (604800 seconds)
      codeExpiresIn: 600, // 10 minutes (authorization code expiry)
      // Pre-register first-party clients (skip consent screen)
      // IMPORTANT: These clients MUST also exist in the database for token storage!
      // The database stores access tokens with FK constraint to oauth_application.
      // Seed them with: pnpm run seed:prod
      // Configuration: See src/lib/trusted-clients.ts
      trustedClients: TRUSTED_CLIENTS,
      // RFC 7591 - OAuth 2.0 Dynamic Client Registration
      // ENABLED: Required for MCP clients (Claude Code, Gemini CLI, Cursor)
      // These clients cannot pre-register and require DCR to obtain client credentials
      // Security: DCR clients still need user authorization to get tokens
      allowDynamicClientRegistration: true,
      // Add custom claims to userinfo endpoint and ID token
      // Parameters: user object, requested scopes, OAuth client that initiated the request
      async getAdditionalUserInfoClaim(user, scopes, client) {
        // DEBUG: Log user and client info
        console.log("[JWT] getAdditionalUserInfoClaim - user.id:", user.id);
        console.log("[JWT] getAdditionalUserInfoClaim - user.email:", user.email);
        console.log("[JWT] getAdditionalUserInfoClaim - client:", client?.clientId, client?.name);

        // Fetch user's organization memberships for tenant_id
        const memberships = await db
          .select()
          .from(member)
          .where(eq(member.userId, user.id));

        // DEBUG: Log memberships
        console.log("[JWT] Memberships found:", memberships.length);
        console.log("[JWT] Memberships:", memberships);

        // Get all organization IDs the user belongs to
        const organizationIds = memberships.map((m: typeof memberships[number]) => m.organizationId);

        // DEBUG: Log organization IDs
        console.log("[JWT] Organization IDs:", organizationIds);

        // Fetch organization names for better UX (avoids extra API calls in clients)
        let organizationNames: string[] = [];
        if (organizationIds.length > 0) {
          const orgs = await db
            .select({ id: schema.organization.id, name: schema.organization.name })
            .from(schema.organization)
            .where(
              organizationIds.length === 1
                ? eq(schema.organization.id, organizationIds[0])
                : inArray(schema.organization.id, organizationIds)
            );

          // Preserve order of organizationIds
          organizationNames = organizationIds.map((id: string) => {
            const org = orgs.find((o: { id: string; name: string }) => o.id === id);
            return org?.name || id.slice(0, 12); // Fallback to short ID
          });

          console.log("[JWT] Organization Names:", organizationNames);
        }

        // Get active organization from user's most recent session
        // This allows org switcher to update tenant_id in JWT
        let activeOrgId: string | null = null;

        // Query ALL sessions for this user to debug
        const allUserSessions = await db
          .select({
            id: schema.session.id,
            activeOrganizationId: schema.session.activeOrganizationId,
            updatedAt: schema.session.updatedAt,
          })
          .from(schema.session)
          .where(eq(schema.session.userId, user.id))
          .orderBy(desc(schema.session.updatedAt));

        console.log("[JWT] All sessions for user:", user.id);
        console.log("[JWT] Session count:", allUserSessions.length);
        allUserSessions.forEach((s: { id: string; activeOrganizationId: string | null; updatedAt: Date | null }, i: number) => {
          console.log(`[JWT] Session ${i}: id=${s.id?.slice(0, 8)}..., activeOrgId=${s.activeOrganizationId}, updated=${s.updatedAt}`);
        });

        const userSessions = allUserSessions.slice(0, 1);

        if (userSessions.length > 0 && userSessions[0].activeOrganizationId) {
          // Verify the active org is one the user actually belongs to
          if (organizationIds.includes(userSessions[0].activeOrganizationId)) {
            activeOrgId = userSessions[0].activeOrganizationId;
            console.log("[JWT] Using activeOrganizationId from session:", activeOrgId);
          } else {
            console.log("[JWT] Session activeOrganizationId not in user's orgs, falling back");
            console.log("[JWT] organizationIds:", organizationIds);
          }
        } else {
          console.log("[JWT] No session with activeOrganizationId found");
        }

        // Use active org if set, otherwise fall back to first org
        const primaryTenantId = activeOrgId || organizationIds[0] || null;

        console.log("[JWT] Primary tenant_id:", primaryTenantId);

        return {
          // OIDC Standard Claims (from additionalFields)
          preferred_username: user.username || null,
          given_name: user.givenName || null,
          family_name: user.familyName || null,
          picture: user.picture || null,
          phone_number: user.phoneNumber || null,
          phone_number_verified: user.phoneNumberVerified || false,
          locale: user.locale || null,
          zoneinfo: user.zoneinfo || null,
          // Multi-tenant claims
          role: user.role || "user",
          tenant_id: primaryTenantId,
          organization_ids: organizationIds,
          organization_names: organizationNames,
          org_role: memberships[0]?.role || null,
          // Temporary: RoboLearn-specific fields (TODO: move to member.metadata in Proposal 001)
          software_background: user.softwareBackground || null,
          hardware_tier: user.hardwareTier || null,
          // Additional profile fields (003-user-profile-fields)
          gender: user.gender || null,
          father_name: user.fatherName || null,
          city: user.city || null,
          country: user.country || null,
          // OAuth client identity (for audit trail: "@user via Claude Code")
          // azp = authorized party (OIDC standard claim)
          azp: client?.clientId || null,
          client_id: client?.clientId || null,
          client_name: client?.name || null,
        };
      },
    }),

    // Admin plugin - User management and admin dashboard
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      // You can specify admin user IDs directly
      // adminUserIds: ["your-admin-user-id"],
    }),

    // Organization plugin - Multi-tenancy support
    // Enables tenant_id in token claims and organization management
    organization({
      // Allow any user to create organizations (can be restricted later)
      allowUserToCreateOrganization: true,
      // Send invitation emails when members are invited to organizations
      sendInvitationEmail: async ({ email, organization, inviter, invitation }) => {
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Taskflow SSO";
        const appDescription = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Secure Single Sign-On";
        const orgNameEnv = process.env.NEXT_PUBLIC_ORG_NAME || "Taskflow";

        // Build invitation URL from invitation ID
        const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
        const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${invitation.id}`;

        // Get inviter name from the nested user object
        const inviterName = inviter.user?.name || inviter.user?.email || "Someone";

        await sendEmail({
          to: email,
          subject: `You've been invited to join ${organization.name}`,
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                  <td align="center">
                    <!-- Main container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">${appName}</h1>
                          <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">${appDescription}</p>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">You're Invited! 🎉</h2>
                          <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #374151;">
                            <strong>${inviterName}</strong> has invited you to join <strong>${organization.name}</strong> on ${appName}.
                          </p>

                          <!-- Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td align="center" style="padding: 0 0 24px;">
                                <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Accept Invitation</a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                            Or copy and paste this link into your browser:
                          </p>
                          <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; font-size: 13px; color: #374151; word-break: break-all; font-family: monospace;">
                            ${inviteUrl}
                          </p>

                          <div style="padding: 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                            <p style="margin: 0; font-size: 14px; color: #065f46;">
                              <strong>🔐 Secure Access:</strong> Once you accept, you'll have access to ${organization.name}'s resources and projects.
                            </p>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                            This is an automated message from <strong>${appName}</strong>
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                            Secure authentication for your ${orgNameEnv} applications
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
      },
    }),

    // Username plugin - Adds username fields for user profiles
    // Sign-in with username is DISABLED (see disabledPaths above)
    // Uses Better Auth defaults: 3-30 chars, alphanumeric+underscore+dots, lowercase normalization
    username(),

    // HIBP (Have I Been Pwned) - Prevents use of compromised passwords
    // Checks password against HIBP breach database on signup/password change
    // Security: Only first 5 chars of SHA-1 hash sent to API (k-anonymity)
    haveIBeenPwned({
      customPasswordCompromisedMessage: "This password has been exposed in a data breach. Please choose a more secure password.",
    }),

    // API Key Plugin - M2M (Machine-to-Machine) authentication
    // Enables services like GitHub Actions, MCP servers to authenticate programmatically
    // Keys are hashed with argon2id, never stored in plaintext
    apiKey({
      // Prefix for generated API keys (e.g., "tf_abc123...")
      defaultPrefix: "tf_",
      // Require a name when creating API keys for identification
      requireName: true,
      // Enable metadata storage for additional key info (service name, description)
      enableMetadata: true,
      // Store first 8 characters for key identification in UI (includes prefix)
      startingCharactersConfig: {
        shouldStore: true,
        charactersLength: 8,
      },
      // Rate limiting for API key verification (prevent brute force)
      rateLimit: {
        enabled: true,
        timeWindow: 60000, // 1 minute window
        maxRequests: 100, // 100 requests per minute per key
      },
      // Key expiration defaults (can be overridden per key)
      keyExpiration: {
        defaultExpiresIn: null, // No expiration by default
        minExpiresIn: 1, // Minimum 1 day if expiration set
        maxExpiresIn: 365, // Maximum 1 year
      },
    }),

    // =============================================================================
    // Device Authorization Flow (RFC 8628) - 014-mcp-oauth-standardization
    // Enables CLI tools (Claude Code, Cursor) to authenticate without browser access
    // =============================================================================
    deviceAuthorization({
      // Verification URI where users enter their code
      verificationUri: "/auth/device",
      // Device code expiration (15 minutes)
      expiresIn: "15m",
      // Minimum polling interval (5 seconds)
      interval: "5s",
      // User code length (8 characters, e.g., ABCD-1234)
      userCodeLength: 8,
      // Validate client ID (only allow registered MCP clients)
      validateClient: async (clientId) => {
        const validMcpClients = [
          "claude-code-client",
          "cursor-client",
          "mcp-inspector",
          "windsurf-client",
        ];
        return validMcpClients.includes(clientId);
      },
      // Log device auth requests for debugging
      onDeviceAuthRequest: async (clientId, scope) => {
        console.log(`[DeviceAuth] Request from client: ${clientId}, scope: ${scope || "default"}`);
      },
    }),

    // =============================================================================
    // RoboLearn SSO (Generic OIDC) - 008-social-login-providers
    // Loads only when ROBOLEARN_CLIENT_ID, ROBOLEARN_CLIENT_SECRET, and ROBOLEARN_SSO_URL are set
    // =============================================================================
    ...(process.env.ROBOLEARN_CLIENT_ID && process.env.ROBOLEARN_CLIENT_SECRET && process.env.ROBOLEARN_SSO_URL
      ? [genericOAuth({
          config: [{
            providerId: "robolearn",
            clientId: process.env.ROBOLEARN_CLIENT_ID,
            clientSecret: process.env.ROBOLEARN_CLIENT_SECRET,
            // OIDC discovery endpoint - auto-discovers auth/token/userinfo URLs
            discoveryUrl: `${process.env.ROBOLEARN_SSO_URL}/.well-known/openid-configuration`,
            scopes: ["openid", "profile", "email"],
            // IMPORTANT: genericOAuth callback path is /api/auth/oauth2/callback/{providerId}
            // Register this in RoboLearn SSO: {BETTER_AUTH_URL}/api/auth/oauth2/callback/robolearn
          }],
        })]
      : []),
  ],

  // Database hooks - Automatically add new users to default organization
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Get default org ID (returns null if not configured)
          const defaultOrgId = getDefaultOrgId();

          if (!defaultOrgId) {
            console.warn(`[Auth] No default organization configured - user ${user.email} not auto-added to any org`);
            return;
          }

          try {
            // Check if user is already a member (prevent duplicates)
            const existingMembership = await db
              .select()
              .from(member)
              .where(
                and(
                  eq(member.userId, user.id),
                  eq(member.organizationId, defaultOrgId)
                )
              )
              .limit(1);

            if (existingMembership.length > 0) {
              console.log(`[Auth] User ${user.email} already member of default organization`);
              return;
            }

            // Add user to default Taskflow organization
            await db.insert(member).values({
              id: crypto.randomUUID(),
              userId: user.id,
              organizationId: defaultOrgId,
              role: "member",
              createdAt: new Date(),
            });

            console.log(`[Auth] ✅ Added user ${user.email} to default organization`);
          } catch (error: any) {
            // Log error but don't fail user creation
            // User can still sign in and join organization later via admin UI
            console.error(`[Auth] ❌ Failed to add user ${user.email} to default organization:`, error.message);
          }
        },
      },
    },
  },

  // Secondary storage for rate limiting with Redis (optional)
  // Enables distributed rate limiting across multiple server instances
  // Falls back to memory storage if Redis is not configured
  ...(redisStorage && { secondaryStorage: redisStorage }),

  // Note: API key authorization is handled via custom admin endpoints at /api/admin/api-keys/*
  // Better Auth's /api-key/* endpoints are disabled via disabledPaths above
});

// Validate default organization at startup
validateAndCacheDefaultOrg().catch((error) => {
  console.error("[Auth] Failed to validate default organization at startup:", error);
});

// Export client config for use in robolearn-interface (no secret for public client)
export const oauthClientConfig = {
  clientId: "robolearn-public-client",
};

export type Auth = typeof auth;
