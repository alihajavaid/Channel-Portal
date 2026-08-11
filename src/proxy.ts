import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Optimistic, cookie-presence-only check for snappier redirects on page navigation. This is
// NOT the security boundary — every API route re-checks the real session server-side via
// withAuth (lib/authz/guard.ts), and every page re-checks via requireSession (lib/authz/dal.ts).
const PUBLIC_ROUTES = ["/login", "/set-password", "/mfa/enroll", "/mfa/verify"];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublicRoute = PUBLIC_ROUTES.includes(path);

  if (!isPublicRoute && !hasSessionCookie && path !== "/") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};
