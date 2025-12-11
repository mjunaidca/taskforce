/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * This endpoint provides OAuth AS metadata for MCP clients (Claude Code, Gemini CLI, etc.)
 * that use RFC 8414 discovery instead of OIDC Discovery.
 *
 * MCP Auth flow:
 * 1. Client fetches /.well-known/oauth-protected-resource from MCP server
 * 2. Client gets authorization_servers list pointing to this SSO
 * 3. Client fetches this endpoint to get OAuth endpoints
 * 4. Client performs OAuth flow
 */

import { NextResponse } from "next/server";

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3001";

export async function GET() {
  // Return OAuth AS metadata (RFC 8414)
  // This mirrors the OIDC Discovery document but in OAuth AS format
  return NextResponse.json({
    // Required fields
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/api/auth/oauth2/authorize`,
    token_endpoint: `${BASE_URL}/api/auth/oauth2/token`,

    // Optional but recommended
    jwks_uri: `${BASE_URL}/api/auth/jwks`,
    registration_endpoint: `${BASE_URL}/api/auth/oauth2/register`,
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:device_code",
    ],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],

    // Device authorization (RFC 8628)
    device_authorization_endpoint: `${BASE_URL}/api/auth/device/code`,

    // Userinfo endpoint
    userinfo_endpoint: `${BASE_URL}/api/auth/oauth2/userinfo`,

    // Revocation endpoint (if supported)
    revocation_endpoint: `${BASE_URL}/api/auth/oauth2/revoke`,

    // End session endpoint (OIDC logout)
    end_session_endpoint: `${BASE_URL}/api/auth/oauth2/endsession`,
  });
}
