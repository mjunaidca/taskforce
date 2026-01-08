# Next.js httpOnly Cookie Proxy Pattern

## Problem

When using Better Auth or similar auth systems with httpOnly cookies, the JWT `id_token` is stored securely in a cookie that JavaScript cannot access. This is a security feature - httpOnly cookies prevent XSS attacks from stealing tokens.

However, ChatKit needs to send the Authorization header with requests. Since JavaScript can't read httpOnly cookies, the client-side `useChatKit` hook cannot add the token to requests.

**Symptoms:**
- `document.cookie` returns empty or missing the token
- Console shows: `[ChatKit] No id_token found in cookies`
- ChatKit requests fail with 401 Unauthorized

## Solution

Create a dedicated Next.js API route that:
1. Reads the httpOnly cookie server-side (Next.js can access all cookies)
2. Adds the `Authorization: Bearer ${token}` header
3. Forwards the request to the backend

## Implementation

### 1. API Route (`app/api/chatkit/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Read httpOnly cookie - ONLY accessible server-side
  const idToken = cookieStore.get("taskflow_id_token")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // IMPORTANT: ChatKit endpoint is at /chatkit, NOT /api/chatkit
  const url = new URL("/chatkit", API_BASE);

  // Forward query params if any
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const body = await request.text();

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
        // Forward custom headers for context
        "X-User-ID": request.headers.get("X-User-ID") || "",
        "X-Page-URL": request.headers.get("X-Page-URL") || "",
        "X-Page-Title": request.headers.get("X-Page-Title") || "",
        "X-Project-ID": request.headers.get("X-Project-ID") || "",
      },
      body: body || undefined,
    });

    // Handle SSE streaming responses (ChatKit uses streaming)
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

    // JSON responses
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[ChatKit Proxy] Error:", error);
    return NextResponse.json({ error: "ChatKit proxy request failed" }, { status: 500 });
  }
}
```

### 2. ChatKit Widget Configuration

```typescript
// Point to proxy, not backend directly
const chatkitProxyUrl = "/api/chatkit";

const { control, sendUserMessage } = useChatKit({
  api: {
    url: chatkitProxyUrl,  // Proxy handles auth
    domainKey: domainKey,

    fetch: async (input, options) => {
      // Auth check (proxy will verify the actual token)
      if (!isAuthenticated) {
        throw new Error("User must be logged in");
      }

      return fetch(url, {
        ...options,
        credentials: "include",  // Include cookies for proxy
        headers: {
          ...options?.headers,
          "X-User-ID": userId,
          "X-Page-URL": pageContext?.url || "",
          "Content-Type": "application/json",
        },
      });
    },
  },
});
```

## Key Points

1. **Server-side cookie access**: Next.js API routes can read ALL cookies, including httpOnly
2. **Dedicated endpoint**: Don't use a general proxy that modifies paths - ChatKit expects specific endpoint
3. **SSE streaming**: ChatKit uses Server-Sent Events for streaming responses - must passthrough the response body
4. **Forward headers**: Context headers (X-User-ID, etc.) need forwarding to backend
5. **credentials: "include"**: Client must send cookies to the proxy route

## Common Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Reading cookie in client | httpOnly prevents JS access | Use server-side proxy |
| Using general proxy | May modify path incorrectly | Create dedicated /api/chatkit route |
| Not streaming SSE | ChatKit streaming breaks | Check content-type, passthrough body |
| Missing credentials | Cookies not sent to proxy | Add `credentials: "include"` |

## Evidence

- Implementation: `web-dashboard/src/app/api/chatkit/route.ts`
- Widget: `web-dashboard/src/components/chat/ChatKitWidget.tsx`
- Auth callback setting cookie: `web-dashboard/src/app/api/auth/callback/route.ts`
