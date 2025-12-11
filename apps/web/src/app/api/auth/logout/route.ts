import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Create response redirecting to home
  const response = NextResponse.redirect(new URL("/", request.url));

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
