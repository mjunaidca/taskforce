# httpOnly Cookie Proxy Pattern for Next.js 16

## Problem

When using Better Auth, NextAuth, or custom auth with httpOnly cookies, the JWT/session token is stored securely in a cookie that JavaScript cannot access. This is a security feature preventing XSS attacks.

However, you often need to forward this token to backend APIs. Since JavaScript can't read httpOnly cookies, client-side fetch calls cannot add the `Authorization` header.

**Symptoms:**
- `document.cookie` returns empty or missing the auth token
- Console shows: "No token found in cookies" or similar
- API requests return 401 Unauthorized
- Token exists in browser DevTools > Application > Cookies but code can't access it

## Solution

Create a Next.js API route that:
1. Receives client requests
2. Reads the httpOnly cookie server-side (Next.js can access ALL cookies)
3. Adds the `Authorization: Bearer ${token}` header
4. Forwards to the backend
5. Returns the response to the client

## Implementation

### Generic Proxy Route

```typescript
// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function proxyRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  const { path } = await params;
  const cookieStore = await cookies();

  // Read httpOnly cookie - ONLY accessible server-side
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Build target URL
  const targetPath = "/" + path.join("/");
  const url = new URL(targetPath, BACKEND_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const body = ["POST", "PUT", "PATCH"].includes(method)
      ? await request.text()
      : undefined;

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Forward any custom headers
        ...Object.fromEntries(
          Array.from(request.headers.entries())
            .filter(([key]) => key.startsWith("x-"))
        ),
      },
      body,
    });

    // Handle SSE streaming responses
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Handle binary responses (files, images)
    if (response.headers.get("content-type")?.startsWith("application/octet-stream") ||
        response.headers.get("content-type")?.startsWith("image/")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        },
      });
    }

    // JSON responses
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, params, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, params, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, params, "PATCH");
}
```

### Client-Side Usage

```typescript
// Use proxy instead of calling backend directly
async function fetchTasks() {
  // WRONG - Can't add auth header (httpOnly)
  // const res = await fetch("http://backend:8000/api/tasks");

  // CORRECT - Proxy adds auth header
  const res = await fetch("/api/proxy/api/tasks", {
    credentials: "include", // Send cookies to proxy
  });

  return res.json();
}

async function createTask(data: TaskInput) {
  const res = await fetch("/api/proxy/api/tasks", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}
```

### Dedicated Endpoint Proxy (Alternative)

For specific endpoints with different routing needs:

```typescript
// app/api/chatkit/route.ts
// ChatKit backend is at /chatkit, not /api/chatkit

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("taskflow_id_token")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Route to specific endpoint (no /api prefix)
  const url = new URL("/chatkit", API_BASE);

  const body = await request.text();

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body,
  });

  // Handle SSE
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}
```

## Key Points

1. **Server-side access**: `cookies()` from `next/headers` can read ALL cookies, including httpOnly
2. **credentials: "include"**: Client must send cookies to the proxy route
3. **SSE streaming**: Pass through `response.body` for streaming responses
4. **Path routing**: Be careful with path prefixes - backend endpoints may not match frontend routes
5. **Error handling**: Always catch and handle proxy errors gracefully

## Common Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Reading cookie client-side | httpOnly prevents JS access | Use server-side proxy |
| Forgetting `credentials: "include"` | Cookies not sent to proxy | Add to fetch options |
| Not handling SSE | Streaming responses fail | Check content-type, passthrough body |
| Wrong path mapping | 404 errors | Create dedicated proxy or adjust path |
| Not forwarding custom headers | Backend missing context | Forward X-* headers |

## Security Considerations

- The proxy runs server-side, so the token never reaches the client JavaScript
- Validate the user/token in the proxy if needed
- Rate limit the proxy endpoint to prevent abuse
- Only proxy to trusted backend URLs (don't allow arbitrary destinations)

## Evidence

- Implementation: `web-dashboard/src/app/api/chatkit/route.ts`
- Better Auth integration: `web-dashboard/src/app/api/auth/callback/route.ts`
