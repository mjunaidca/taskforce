import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// SERVER_API_URL for Docker (container names), fallback to NEXT_PUBLIC for local dev
const API_BASE = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * ChatKit Proxy Route
 *
 * Proxies requests to the backend /chatkit endpoint with authentication.
 * This is separate from the main /api/proxy because:
 * 1. ChatKit endpoint is at /chatkit, not /api/chatkit
 * 2. ChatKit uses streaming responses that need special handling
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Get JWT id_token from httpOnly cookies
  const idToken = cookieStore.get("taskflow_id_token")?.value;

  console.log("[ChatKit Proxy] id_token present:", !!idToken);
  if (idToken) {
    console.log("[ChatKit Proxy] id_token preview:", idToken.substring(0, 20) + "...");
  }

  if (!idToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Build the target URL - /chatkit on backend (not /api/chatkit)
  const url = new URL("/chatkit", API_BASE);

  // Copy query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  console.log("[ChatKit Proxy] Forwarding to:", url.toString());

  try {
    const body = await request.text();
    console.log("[ChatKit Proxy] Request body preview:", body.substring(0, 100));

    // Forward the request with JWT id_token as bearer
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
        // Forward custom headers from the original request
        "X-User-ID": request.headers.get("X-User-ID") || "",
        "X-Page-URL": request.headers.get("X-Page-URL") || "",
        "X-Page-Title": request.headers.get("X-Page-Title") || "",
        "X-Page-Path": request.headers.get("X-Page-Path") || "",
        "X-Project-ID": request.headers.get("X-Project-ID") || "",
      },
      body: body || undefined,
    });

    console.log("[ChatKit Proxy] Backend response status:", response.status);
    console.log("[ChatKit Proxy] Backend response content-type:", response.headers.get("content-type"));

    // For streaming responses (SSE), pass through the stream
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      console.log("[ChatKit Proxy] Streaming response detected");
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // For non-streaming responses, return JSON
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[ChatKit Proxy] Error:", error);
    return NextResponse.json({ error: "ChatKit proxy request failed" }, { status: 500 });
  }
}
