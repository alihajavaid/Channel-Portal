import "server-only";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { isLocked, computeLockAfterFailure, resetLockoutFields } from "@/lib/auth/lockout";
import { createSession, revokeAllSessionsForUser } from "@/lib/auth/session";
import { createAuthBridge, getAuthBridgeUser, consumeAuthBridge } from "@/lib/auth/authBridge";
import { isAdmin } from "@/lib/constants/modules";

export type LoginResult =
  | { status: "invalid_credentials" }
  | { status: "locked"; retryAt: Date }
  | { status: "set_password" }
  | { status: "mfa_enroll" }
  | { status: "mfa_verify" }
  | { status: "done" };

type RequestMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function attemptLogin(
  email: string,
  password: string,
  meta: RequestMeta = {}
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-shape response for unknown email vs wrong password to avoid user enumeration.
  if (!user) {
    await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", password);
    return { status: "invalid_credentials" };
  }

  if (isLocked(user)) {
    return { status: "locked", retryAt: user.lockUntil as Date };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const update = computeLockAfterFailure(user.failedLoginAttempts);
    await prisma.user.update({ where: { id: user.id }, data: update });
    if (update.lockUntil) {
      return { status: "locked", retryAt: update.lockUntil };
    }
    return { status: "invalid_credentials" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...resetLockoutFields, lastLoginAt: new Date() },
  });

  return continueLoginFlow(user, meta);
}

async function continueLoginFlow(
  user: { id: string; mustChangePassword: boolean; mfaEnabled: boolean; access: boolean },
  meta: RequestMeta
): Promise<LoginResult> {
  if (user.mustChangePassword) {
    await createAuthBridge(user.id);
    return { status: "set_password" };
  }
  if (isAdmin(user) && !user.mfaEnabled) {
    await createAuthBridge(user.id);
    return { status: "mfa_enroll" };
  }
  if (user.mfaEnabled) {
    await createAuthBridge(user.id);
    return { status: "mfa_verify" };
  }
  await createSession(user.id, meta);
  return { status: "done" };
}

export async function completeSetPassword(newPassword: string): Promise<LoginResult> {
  const bridgeUser = await getAuthBridgeUser();
  if (!bridgeUser) return { status: "invalid_credentials" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: bridgeUser.id },
    data: { passwordHash, mustChangePassword: false, tempPasswordExpiresAt: null },
  });
  await revokeAllSessionsForUser(bridgeUser.id);
  await consumeAuthBridge();

  const updated = { ...bridgeUser, mustChangePassword: false };
  return continueLoginFlow(updated, {});
}
