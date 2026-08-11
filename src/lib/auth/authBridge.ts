import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/session";

export const AUTH_BRIDGE_COOKIE = "authBridge";
const BRIDGE_TTL_MS = 10 * 60 * 1000;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

// Bridges the gap between "password verified" and "full session issued" while a user still
// needs to change their password and/or complete MFA enrollment/verification. Holding this
// cookie proves identity was checked once; it is never accepted by withAuth (lib/authz/guard.ts).
export async function createAuthBridge(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + BRIDGE_TTL_MS);
  await prisma.mfaChallenge.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_BRIDGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function getBridgeRecord() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_BRIDGE_COOKIE)?.value;
  if (!token) return null;
  const bridge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!bridge || bridge.expiresAt.getTime() <= Date.now()) return null;
  return bridge;
}

export async function getAuthBridgeUser() {
  const bridge = await getBridgeRecord();
  return bridge?.user ?? null;
}

export async function setBridgePendingSecret(encryptedSecret: string): Promise<void> {
  const bridge = await getBridgeRecord();
  if (!bridge) throw new Error("No active auth bridge");
  await prisma.mfaChallenge.update({
    where: { id: bridge.id },
    data: { pendingMfaSecret: encryptedSecret },
  });
}

export async function getBridgePendingSecret(): Promise<string | null> {
  const bridge = await getBridgeRecord();
  return bridge?.pendingMfaSecret ?? null;
}

export async function consumeAuthBridge(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_BRIDGE_COOKIE)?.value;
  if (token) {
    await prisma.mfaChallenge.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(AUTH_BRIDGE_COOKIE);
}
