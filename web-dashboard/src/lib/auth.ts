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
export async function initiateLogin(): Promise<void> {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier in cookie (will be read by API route)
  // 10 minute expiry - enough for OAuth flow
  setCookie("taskflow_code_verifier", codeVerifier, 600);

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: generateRandomString(16),
  });

  // Redirect to SSO authorization endpoint
  window.location.href = `${SSO_URL}/api/auth/oauth2/authorize?${params.toString()}`;
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
