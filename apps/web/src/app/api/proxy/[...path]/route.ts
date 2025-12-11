import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// SERVER_API_URL for Docker (container names), fallback to NEXT_PUBLIC for local dev
const API_BASE = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Notification Service URL - separate microservice
const NOTIFICATION_SERVICE_URL = process.env.SERVER_NOTIFICATION_URL || process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:8001";

// Routes that go to Notification Service instead of main API
const NOTIFICATION_ROUTES = ["notifications"];

function getTargetUrl(path: string[]): string {
  // Check if this is a notification route
  if (path.length > 0 && NOTIFICATION_ROUTES.includes(path[0])) {
    return NOTIFICATION_SERVICE_URL;
  }
  return API_BASE;
}

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const cookieStore = await cookies();

  // Debug: log all cookies
  const allCookies = cookieStore.getAll();
  console.log("[Proxy] All cookies:", allCookies.map(c => c.name));

  // Use id_token (JWT) for API calls, not access_token (opaque session token)
  // Better Auth's oidcProvider returns opaque access_tokens but JWT id_tokens
  const idToken = cookieStore.get("taskflow_id_token")?.value;

  console.log("[Proxy] id_token present:", !!idToken);
  if (idToken) {
    console.log("[Proxy] id_token preview:", idToken.substring(0, 20) + "...");
  }

  if (!idToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Determine target service based on route
  const targetBase = getTargetUrl(path);

  // Build the target URL - prepend /api since backend expects /api/...
  const targetPath = "/api/" + path.join("/");
  const url = new URL(targetPath, targetBase);

  console.log("[Proxy] Routing to:", url.toString());

  // Copy query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Forward the request with JWT id_token as bearer
  const headers: HeadersInit = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Include body for POST, PUT, PATCH
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    } catch {
      // No body
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    // Handle 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => null);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}
