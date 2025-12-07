import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:3001";
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "taskflow-sso-public-client";
const REDIRECT_URI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

// Cookie configuration - secure httpOnly cookies
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth error response
  if (error) {
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  // No code provided - redirect to home
  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Get code verifier from cookie (set during initiateLogin)
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("taskflow_code_verifier")?.value;

  if (!codeVerifier) {
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange authorization code for tokens
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
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Token exchange failed:", errorData);
      const errorUrl = new URL("/", request.url);
      errorUrl.searchParams.set("error", errorData.error || "token_exchange_failed");
      return NextResponse.redirect(errorUrl);
    }

    const tokens = await tokenResponse.json();
    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    // Debug logging
    console.log("[Callback] Token exchange successful");
    console.log("[Callback] access_token present:", !!tokens.access_token);
    console.log("[Callback] id_token present:", !!tokens.id_token);
    console.log("[Callback] id_token is JWT:", tokens.id_token?.startsWith("eyJ"));
    if (tokens.id_token) {
      console.log("[Callback] id_token preview:", tokens.id_token.substring(0, 30) + "...");
    }

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Set httpOnly cookies for tokens
    response.cookies.set("taskflow_access_token", tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in || 3600,
    });

    response.cookies.set("taskflow_id_token", tokens.id_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in || 3600,
    });

    response.cookies.set("taskflow_expires_at", expiresAt.toString(), {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      response.cookies.set("taskflow_refresh_token", tokens.refresh_token, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Clear the code verifier cookie
    response.cookies.delete("taskflow_code_verifier");

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("error", "authentication_failed");
    return NextResponse.redirect(errorUrl);
  }
}
