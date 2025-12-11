import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/workers",
  "/agents",
  "/audit",
];

// Routes that are public (no auth required)
const publicRoutes = ["/", "/auth/error"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if this is a public route
  const isPublicRoute = publicRoutes.includes(pathname);

  // Get auth tokens from cookies
  // We check id_token (JWT) as that's what's used for API auth
  const idToken = request.cookies.get("taskflow_id_token")?.value;
  const expiresAt = request.cookies.get("taskflow_expires_at")?.value;

  // Check if token is valid (exists and not expired)
  const isAuthenticated =
    idToken &&
    expiresAt &&
    Date.now() < parseInt(expiresAt, 10) - 60000; // 1 minute buffer

  // Redirect unauthenticated users from protected routes to home
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from public routes to dashboard
  if (isPublicRoute && isAuthenticated && pathname === "/") {
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.png$|.*\\.svg$).*)",
  ],
};
