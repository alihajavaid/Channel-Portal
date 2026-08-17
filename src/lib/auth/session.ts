import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { generateCsrfToken, CSRF_COOKIE } from "@/lib/auth/csrf";

export const SESSION_COOKIE = "session";
const SESSION_IDLE_MS = 12 * 60 * 60 * 1000; // 12h sliding window
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000; // 7d hard cap

function isProd() {
  return process.env.NODE_ENV === "production";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export type SessionUser = Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>;

export type AuthedSession = {
  sessionId: string;
  user: SessionUser;
};

async function setSessionCookies(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  const secure = isProd();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  cookieStore.set(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {}
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  await setSessionCookies(token, expiresAt);
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  await clearSessionCookies();
}

export async function revokeAllSessionsForUser(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Used by self-service password change: kill every other session but let the device the
// user is currently changing their password from stay signed in.
export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });
}

// Read-only: validates the session cookie against the DB. Never writes cookies, so this is
// safe to call from Server Components/pages (Next.js forbids cookie writes there). Returns
// null for anything invalid/expired/revoked rather than throwing — callers decide whether
// that means 401 or a redirect to /login.
export async function getCurrentSession(): Promise<AuthedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return { sessionId: session.id, user: session.user };
}

// Slides the idle window forward (capped at the absolute 7-day lifetime) and rewrites the
// session+csrf cookies. Only call this from a Route Handler or Server Action — those are the
// only contexts Next.js allows cookie writes in. lib/authz/guard.ts calls this on every
// authenticated API request; page renders stay read-only via getCurrentSession above.
export async function touchSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return;

  const absoluteExpiry = session.createdAt.getTime() + SESSION_ABSOLUTE_MS;
  const slidExpiry = Math.min(Date.now() + SESSION_IDLE_MS, absoluteExpiry);
  if (slidExpiry > session.expiresAt.getTime()) {
    const newExpiresAt = new Date(slidExpiry);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    await setSessionCookies(token, newExpiresAt);
  }
}
