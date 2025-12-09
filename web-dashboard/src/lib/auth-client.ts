import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Better Auth client for organization management
 *
 * Note: Taskflow uses custom OAuth flow for authentication,
 * but uses Better Auth client ONLY for organization switching.
 * This provides seamless org context updates without disrupting
 * the existing auth architecture.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001",
  plugins: [organizationClient()],
});

// Export organization methods
export const { organization } = authClient;
