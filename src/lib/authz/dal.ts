import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import type { ModuleKey } from "@/lib/constants/modules";

// Memoized per-request so Server Components/pages can call this freely without duplicate
// DB lookups. Redirects to /login when there is no valid session — this is the Data Access
// Layer pattern for page-level checks; API routes use withAuth (lib/authz/guard.ts) instead.
export const requireSession = cache(async () => {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/set-password");
  }
  return session;
});

export async function requireModule(moduleKey: ModuleKey) {
  const session = await requireSession();
  if (!session.user[moduleKey]) {
    redirect("/dashboard");
  }
  return session;
}
