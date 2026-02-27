import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for authentication and route protection.
 *
 * Note: Firebase Auth uses client-side SDK. For server-side auth verification,
 * we rely on a session cookie set after Google OAuth sign-in.
 * The cookie is validated in Route Handlers using Firebase Admin SDK.
 *
 * Client-side auth state is managed via AuthContext.
 * This middleware provides a lightweight check for the session cookie.
 */

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/invitations/verify", "/api/invitations/accept", "/join", "/forbidden"];

const ADMIN_ONLY_PATHS = [
  "/settings",
  "/organization/roles",
  "/workflows/forms",
  "/workflows/policies",
];

const MANAGER_PATHS = [
  "/members/new",
  "/members/invite",
  "/contracts/templates",
  "/contracts/seals",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (set after Firebase Auth login)
  const session = request.cookies.get("__session");

  if (!session?.value) {
    // Redirect to login if no session
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection is handled client-side via AuthContext
  // Server-side role checks happen in individual Route Handlers
  // This middleware only ensures the session cookie exists

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
