import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Better Auth client for organization management
 *
 * Note: Taskflow uses custom OAuth flow for authentication,
 * but uses Better Auth client ONLY for organization switching.
 *
 * This client communicates with the SSO platform to:
 * - Switch active organization (updates session.activeOrganizationId)
 * - Trigger new JWT generation with updated tenant_id
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001",
  plugins: [organizationClient()],
});

export const { organization } = authClient;
