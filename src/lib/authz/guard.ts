import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, touchSession, type AuthedSession } from "@/lib/auth/session";
import { CSRF_COOKIE, CSRF_HEADER, csrfTokensMatch, requiresCsrfCheck } from "@/lib/auth/csrf";
import type { ModuleKey } from "@/lib/constants/modules";

type GuardOptions = {
  // Only the set-password route itself should allow a mustChangePassword user through.
  allowMustChangePassword?: boolean;
};

type RouteHandler<Ctx> = (
  req: NextRequest,
  ctx: Ctx,
  session: AuthedSession
) => Promise<Response> | Response;

// Single reusable guard wrapping every API route: session validity, forced-password-change
// state, CSRF, then the specific module permission. No route can "forget" to check — this is
// the actual security boundary (middleware/proxy.ts only redirects page navigations for UX).
export function withAuth<Ctx = unknown>(
  moduleKey: ModuleKey | "any",
  handler: RouteHandler<Ctx>,
  opts: GuardOptions = {}
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    await touchSession();

    if (session.user.mustChangePassword && !opts.allowMustChangePassword) {
      return NextResponse.json({ error: "password_change_required" }, { status: 403 });
    }

    if (requiresCsrfCheck(req.method)) {
      const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
      const headerToken = req.headers.get(CSRF_HEADER);
      if (!csrfTokensMatch(cookieToken, headerToken)) {
        return NextResponse.json({ error: "csrf" }, { status: 403 });
      }
    }

    if (moduleKey !== "any" && !session.user[moduleKey]) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return handler(req, ctx, session);
  };
}
