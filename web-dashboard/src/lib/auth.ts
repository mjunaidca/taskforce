import { JWTClaims, AuthState } from "@/types";
import { decodeJwt } from "jose";

// Environment variables
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001";
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "taskflow-dashboard";
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || "http://localhost:3000/api/auth/callback";
const SCOPE = process.env.NEXT_PUBLIC_OAUTH_SCOPE || "openid profile email";

// Storage keys
const STORAGE_KEYS = {
  REFRESH_TOKEN: "taskflow_refresh_token",
  CODE_VERIFIER: "taskflow_code_verifier",
};

// In-memory storage for access token (more secure than localStorage)
let accessToken: string | null = null;
let idToken: string | null = null;
let expiresAt: number | null = null;
let currentUser: JWTClaims | null = null;

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

// Auth functions
export async function initiateLogin(): Promise<void> {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier for token exchange
  sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);

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

export async function handleCallback(code: string): Promise<AuthState> {
  // Get stored code verifier
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!codeVerifier) {
    throw new Error("Code verifier not found. Please try logging in again.");
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(`${SSO_URL}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json().catch(() => ({ error: "Token exchange failed" }));
    throw new Error(error.error || "Failed to exchange code for tokens");
  }

  const tokens = await tokenResponse.json();

  // Clear code verifier
  sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

  // Store tokens
  accessToken = tokens.access_token;
  idToken = tokens.id_token;
  expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

  // Store refresh token in localStorage (for persistence)
  if (tokens.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  }

  // Decode user from id_token
  try {
    currentUser = decodeJwt(tokens.id_token) as JWTClaims;
  } catch {
    currentUser = null;
  }

  return {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    user: currentUser,
  };
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${SSO_URL}/api/auth/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const tokens = await response.json();

    // Update tokens
    accessToken = tokens.access_token;
    idToken = tokens.id_token;
    expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    // Update refresh token if provided
    if (tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    }

    // Update user
    try {
      currentUser = decodeJwt(tokens.id_token) as JWTClaims;
    } catch {
      // Keep existing user
    }

    return true;
  } catch {
    // Clear invalid refresh token
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    return false;
  }
}

export function getAccessToken(): string | null {
  // Check if token is expired
  if (expiresAt && Date.now() > expiresAt - 60000) {
    // Token expired or will expire in 1 minute
    return null;
  }
  return accessToken;
}

export function getAuthState(): AuthState | null {
  if (!accessToken || !idToken || !expiresAt) {
    return null;
  }

  return {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || "",
    expires_at: expiresAt,
    user: currentUser,
  };
}

export function getCurrentUser(): JWTClaims | null {
  return currentUser;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return token !== null;
}

export function logout(): void {
  // Clear in-memory tokens
  accessToken = null;
  idToken = null;
  expiresAt = null;
  currentUser = null;

  // Clear localStorage
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

  // Redirect to home
  window.location.href = "/";
}

// Check auth status on load (try to restore from refresh token)
export async function checkAuthStatus(): Promise<boolean> {
  // If already authenticated, return true
  if (isAuthenticated()) {
    return true;
  }

  // Try to refresh using stored refresh token
  const refreshed = await refreshAccessToken();
  return refreshed;
}
