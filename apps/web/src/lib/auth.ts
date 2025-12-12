import { JWTClaims } from "@/types";

// Environment variables
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001";
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "taskflow-sso-public-client";
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || "http://localhost:3000/api/auth/callback";
const SCOPE = process.env.NEXT_PUBLIC_OAUTH_SCOPE || "openid profile email";

// PKCE helper functions
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64UrlEncode(hash);
}

// Cookie helper for setting code_verifier (client-accessible cookie for PKCE)
function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// Initiate OAuth login flow
// Optional orgId parameter for org switching - will be passed to SSO to ensure correct tenant_id
export async function initiateLogin(orgId?: string): Promise<void> {
  console.log("[Auth] initiateLogin called", orgId ? `for org: ${orgId}` : "");
  try {
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log("[Auth] PKCE generated, code_challenge:", codeChallenge.substring(0, 20) + "...");

    // Store code verifier in cookie (will be read by API route)
    // 10 minute expiry - enough for OAuth flow
    setCookie("taskflow_code_verifier", codeVerifier, 600);
    console.log("[Auth] Code verifier stored in cookie");

    // Build state - include orgId if switching orgs
    // State format: randomString or randomString:orgId
    const stateRandom = generateRandomString(16);
    const state = orgId ? `${stateRandom}:${orgId}` : stateRandom;

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    // If orgId provided, store in cookie for SSO to read during token generation
    // This ensures the JWT gets the correct tenant_id even if session race condition
    if (orgId) {
      // Set cookie on SSO domain - this won't work cross-domain
      // Instead, we rely on the setActive() + delay approach
      // The org_id in state is for debugging/verification
      console.log("[Auth] Org switch requested for:", orgId);
    }

    const authUrl = `${SSO_URL}/api/auth/oauth2/authorize?${params.toString()}`;
    console.log("[Auth] Redirecting to SSO:", authUrl);

    // Redirect to SSO authorization endpoint
    window.location.href = authUrl;
  } catch (error) {
    // Alert user about the error (crypto.subtle not available, etc.)
    const message = error instanceof Error ? error.message : "Failed to initiate login";
    alert(message);
    console.error("[Auth] Login initiation failed:", error);
    throw error; // Re-throw so caller knows it failed
  }
}

// Session type from API
export interface SessionResponse {
  authenticated: boolean;
  user: JWTClaims | null;
  expiresAt?: number;
}

// Check session via API (reads httpOnly cookies server-side)
export async function getSession(): Promise<SessionResponse> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
    });

    if (!response.ok) {
      return { authenticated: false, user: null };
    }

    return await response.json();
  } catch {
    return { authenticated: false, user: null };
  }
}

// Check if user is authenticated
export async function checkAuthStatus(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated;
}

// Get current user from session
export async function getCurrentUser(): Promise<JWTClaims | null> {
  const session = await getSession();
  return session.user;
}

// Logout - redirect to logout API route
export function logout(): void {
  window.location.href = "/api/auth/logout";
}
