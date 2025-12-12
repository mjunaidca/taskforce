/**
 * Trusted OAuth Clients Configuration
 *
 * First-party applications that skip the OAuth consent screen.
 * These clients MUST also be seeded into the database for token storage.
 *
 * Architecture:
 * 1. Defined here (auth.ts imports for skipConsent behavior)
 * 2. Seeded into database (for token storage FK constraint)
 * 3. Protected in admin UI (cannot edit/delete via UI)
 *
 * Security:
 * - Localhost URLs are allowed for CLI tools (per RFC 8252)
 * - CLI tools must specify exact redirectUri in their config
 * - Only HTTPS URLs allowed in production (except localhost for CLI tools)
 */

/**
 * Filter redirect URLs based on environment
 *
 * SECURITY: In production, localhost URLs are removed to prevent:
 * 1. Authorization code interception on local networks
 * 2. Token hijacking via rogue localhost services
 *
 * In development, all URLs are allowed for testing convenience.
 */
function filterRedirectUrls(urls: string[]): string[] {
  if (process.env.NODE_ENV !== "production") {
    return urls; // Allow all URLs in development
  }

  // In production, filter out localhost URLs
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      // Remove localhost, 127.0.0.1, and [::1] URLs
      return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]";
    } catch {
      return false; // Invalid URLs are filtered out
    }
  });
}

/**
 * ==============================================================================
 * ORGANIZATION CONFIGURATION
 * ==============================================================================
 * Default organization for the hybrid multi-tenant model.
 *
 * Architecture:
 * - Taskflow is the default organization for general users
 * - All new users auto-join this organization on signup
 * - Additional organizations can be created for institutions/schools
 * - This ID is hardcoded for performance (no DB lookup on every signup)
 *
 * Setup:
 * - Run `pnpm run seed:setup` to create this organization in database
 * - The seed script uses this same ID to ensure consistency
 */
export const DEFAULT_ORG_ID = "taskflow-default-org-id";
export const DEFAULT_ORG_NAME = "Taskflow";
export const DEFAULT_ORG_SLUG = "taskflow";

/**
 * ==============================================================================
 * OAUTH CLIENT CONFIGURATION
 * ==============================================================================
 */

const ROBOLEARN_INTERFACE_CLIENT_ID = "robolearn-public-client";


export const TRUSTED_CLIENTS = [
  {
    clientId: ROBOLEARN_INTERFACE_CLIENT_ID,
    name: "RoboLearn Book Interface",
    type: "public" as const,
    redirectUrls: filterRedirectUrls([
      "http://localhost:3000/auth/callback",
      "https://mjunaidca.github.io/robolearn/auth/callback",
    ]),
    disabled: false,
    skipConsent: true,
    metadata: {},
  },
  {
    clientId: "robolearn-confidential-client",
    name: "RoboLearn Backend Service (Test)",
    type: "web" as const, // "web" type for server-side confidential clients with secrets
    clientSecret: "robolearn-confidential-secret-for-testing-only",
    redirectUrls: filterRedirectUrls([
      "http://localhost:8000/auth/callback",
    ]),
    disabled: false,
    skipConsent: true,
    metadata: {},
  },
  {
    clientId: "taskflow-sso-public-client",
    name: "Taskflow SSO",
    type: "public" as const,
    redirectUrls: filterRedirectUrls([
      "http://localhost:3000/api/auth/callback",
      "https://avixato.com/api/auth/callback",
      "https://api.avixato.com/auth/callback",
    ]),
    disabled: false,
    skipConsent: true,
    metadata: {},
  },
  // =============================================================================
  // MCP OAuth Clients - 014-mcp-oauth-standardization
  // These clients use Device Authorization Flow (RFC 8628) for headless auth
  // =============================================================================
  {
    clientId: "claude-code-client",
    name: "Claude Code (Anthropic CLI)",
    type: "public" as const,
    redirectUrls: [], // Device flow doesn't use redirect URIs
    disabled: false,
    skipConsent: true,
    metadata: {
      description: "Anthropic's Claude Code CLI for AI-assisted development",
      allowedGrantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
    },
  },
  {
    clientId: "cursor-client",
    name: "Cursor IDE",
    type: "public" as const,
    redirectUrls: [],
    disabled: false,
    skipConsent: true,
    metadata: {
      description: "Cursor AI-powered IDE",
      allowedGrantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
    },
  },
  {
    clientId: "mcp-inspector",
    name: "MCP Inspector",
    type: "public" as const,
    // Note: MCP Inspector only runs locally for debugging, so it only has localhost URLs
    // In production, this client will have no valid redirect URLs (by design)
    redirectUrls: filterRedirectUrls([
      "http://localhost:5173/callback",
      "http://localhost:5173/oauth/callback",
      "http://localhost:6274/callback",
      "http://localhost:6274/oauth/callback",
    ]),
    disabled: false,
    skipConsent: true,
    metadata: {
      description: "MCP Protocol Inspector for debugging",
      allowedGrantTypes: ["authorization_code", "refresh_token"],
    },
  },
  {
    clientId: "windsurf-client",
    name: "Windsurf IDE",
    type: "public" as const,
    redirectUrls: [],
    disabled: false,
    skipConsent: true,
    metadata: {
      description: "Codeium's Windsurf AI IDE",
      allowedGrantTypes: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
    },
  },
  // NOTE: Gemini CLI uses Dynamic Client Registration (DCR) - no pre-registered client needed
  // DCR allows CLI tools to register with any ephemeral port for OAuth callbacks
  // {
  //   clientId: "ai-native-public-client",
  //   name: "AI Native Platform",
  //   type: "public" as const,
  //   redirectUrls: getRedirectUrls([
  //     "http://localhost:3000/auth/callback",
  //     "https://ai-native.taskflow.org/auth/callback",
  //   ]),
  //   disabled: false,
  //   skipConsent: true,
  //   metadata: {},
  // }
  // {
  //   clientId: "assessment-public-client",
  //   name: "Taskflow Assessment Platform",
  //   type: "public" as const,
  //   redirectUrls: getRedirectUrls([
  //     "http://localhost:3000/api/auth/callback",
  //     "https://assessment.taskflow.org/api/auth/callback",
  //   ]),
  //   disabled: false,
  //   skipConsent: true,
  //   metadata: {},
  // },
];

/**
 * Array of trusted client IDs for protection checks
 * Used in admin API to prevent editing/deletion
 */
export const TRUSTED_CLIENT_IDS = TRUSTED_CLIENTS.map((c) => c.clientId);

/**
 * Comments explaining each client's purpose
 */
export const CLIENT_DESCRIPTIONS = {
  [ROBOLEARN_INTERFACE_CLIENT_ID]: {
    purpose: "Main RoboLearn book interface",
    audience: "Students and educators using the RoboLearn platform",
    security: "Public client with PKCE, no client secret",
  },
  "taskflow-sso-public-client": {
    purpose: "Taskflow Single Sign-On portal",
    audience: "All Taskflow users across platforms",
    security: "Public client with PKCE, no client secret",
  },
  "ai-native-public-client": {
    purpose: "AI Native development platform",
    audience: "Developers building AI applications",
    security: "Public client with PKCE, no client secret",
  },
  "assessment-public-client": {
    purpose: "Taskflow Assessment Platform",
    audience: "Students taking assessments and quizzes",
    security: "Public client with PKCE, no client secret",
  },
} as const;
