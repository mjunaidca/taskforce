import { NextRequest, NextResponse } from "next/server";

// APP_URL for redirects - use client-facing URL, not internal request.url which may be 0.0.0.0 in K8s
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  // Create response redirecting to home
  const response = NextResponse.redirect(new URL("/", APP_URL));

  // Clear all auth cookies
  response.cookies.delete("taskflow_access_token");
  response.cookies.delete("taskflow_id_token");
  response.cookies.delete("taskflow_expires_at");
  response.cookies.delete("taskflow_refresh_token");
  response.cookies.delete("taskflow_code_verifier");

  return response;
}

// Also support GET for simple logout links
export async function GET(request: NextRequest) {
  return POST(request);
}
