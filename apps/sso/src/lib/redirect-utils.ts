/**
 * Redirect URL Validation Utilities
 *
 * Validates redirect URLs against trusted client origins to prevent open redirect attacks.
 * Uses the TRUSTED_CLIENTS configuration to derive allowed origins.
 *
 * IMPORTANT: OAuth callback URLs (e.g., /auth/callback) are explicitly blocked
 * because redirecting to them after profile updates causes PKCE errors when
 * the client app tries to complete a non-existent OAuth flow.
 */

import { TRUSTED_CLIENTS } from "./trusted-clients";

/**
 * OAuth callback URL patterns that should NEVER be used as redirect targets
 * These URLs are for OAuth authorization code flow only, not general navigation
 */
const OAUTH_CALLBACK_PATTERNS = [
  '/auth/callback',
  '/oauth/callback',
  '/callback',
  '/api/auth/callback',
];

/**
 * Extract unique origins from trusted client redirect URLs
 * @returns Array of trusted origins (e.g., ["https://example.com", "http://localhost:3000"])
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();
  
  // Add SSO server's own origin (same-origin redirects are always safe)
  // In client-side: use window.location.origin
  // In server-side: this will be skipped, but server-side doesn't need same-origin check
  if (typeof window !== 'undefined') {
    origins.add(window.location.origin);
  }
  
  // Extract origins from all trusted client redirect URLs
  for (const client of TRUSTED_CLIENTS) {
    for (const redirectUrl of client.redirectUrls) {
      try {
        const url = new URL(redirectUrl);
        origins.add(url.origin);
      } catch (error) {
        // Skip invalid URLs - only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Invalid redirect URL in trusted clients: ${redirectUrl}`);
        }
      }
    }
  }
  
  return Array.from(origins);
}

/**
 * Check if a URL path matches any OAuth callback pattern
 * @param pathname - The URL pathname to check
 * @returns true if the path is an OAuth callback URL
 */
function isOAuthCallbackUrl(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase();
  return OAUTH_CALLBACK_PATTERNS.some(
    (pattern) =>
      normalizedPath === pattern ||
      normalizedPath.endsWith(pattern) ||
      normalizedPath.includes(`${pattern}?`) ||
      normalizedPath.includes(`${pattern}/`)
  );
}

/**
 * Validate if a redirect URL is safe to use
 * @param url - The redirect URL to validate
 * @returns true if the URL is safe, false otherwise
 *
 * Security rules:
 * 1. Reject empty URLs
 * 2. Allow relative URLs (same origin) - but NOT OAuth callback paths
 * 3. Reject non-HTTP(S) URLs
 * 4. Reject OAuth callback URLs (prevents PKCE errors after profile updates)
 * 5. Allow URLs from trusted client origins only
 */
export function isValidRedirectUrl(url: string): boolean {
  // Reject empty or whitespace-only URLs
  if (!url || url.trim().length === 0) {
    return false;
  }

  // Allow relative URLs (same origin) - but NOT OAuth callback paths
  if (url.startsWith('/')) {
    // Block OAuth callback paths even for same-origin
    if (isOAuthCallbackUrl(url)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Redirect to OAuth callback URL blocked: ${url}`);
      }
      return false;
    }
    return true;
  }

  // Reject URLs that don't start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  try {
    // Parse the URL to get its origin and pathname
    const parsedUrl = new URL(url);
    const trustedOrigins = getTrustedOrigins();

    // Block OAuth callback URLs - these cause PKCE errors when redirected to
    // after profile updates because the client tries to complete a non-existent OAuth flow
    if (isOAuthCallbackUrl(parsedUrl.pathname)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Redirect to OAuth callback URL blocked: ${url}`);
      }
      return false;
    }

    // Check if the origin is in the trusted list
    return trustedOrigins.includes(parsedUrl.origin);
  } catch (error) {
    // Invalid URL format - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Invalid redirect URL format: ${url}`, error);
    }
    return false;
  }
}
