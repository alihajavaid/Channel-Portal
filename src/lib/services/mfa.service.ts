import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  generateTotpSecret,
  encryptTotpSecret,
  decryptTotpSecret,
  totpQrDataUrl,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from "@/lib/auth/totp";
import { computeLockAfterFailure, resetLockoutFields, isLocked } from "@/lib/auth/lockout";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/services/activity.service";
import {
  getAuthBridgeUser,
  setBridgePendingSecret,
  getBridgePendingSecret,
  consumeAuthBridge,
} from "@/lib/auth/authBridge";
import { InvalidCurrentPasswordError } from "@/lib/services/user.service";

export { InvalidCurrentPasswordError };

export class MfaNotEnabledError extends Error {
  constructor() {
    super("MFA is not enabled on this account");
  }
}

export type MfaEnrollStart = { qrDataUrl: string; manualEntryKey: string };

export async function startMfaEnrollment(): Promise<MfaEnrollStart | null> {
  const user = await getAuthBridgeUser();
  if (!user) return null;

  const secret = generateTotpSecret();
  await setBridgePendingSecret(encryptTotpSecret(secret));
  const qrDataUrl = await totpQrDataUrl(secret, user.email);
  return { qrDataUrl, manualEntryKey: secret };
}

export type MfaEnrollResult =
  | { status: "invalid" }
  | { status: "no_pending_enrollment" }
  | { status: "done"; recoveryCodes: string[] };

export async function confirmMfaEnrollment(code: string): Promise<MfaEnrollResult> {
  const user = await getAuthBridgeUser();
  if (!user) return { status: "invalid" };

  const encryptedPending = await getBridgePendingSecret();
  if (!encryptedPending) return { status: "no_pending_enrollment" };

  const secret = decryptTotpSecret(encryptedPending);
  const valid = await verifyTotpToken(secret, code);
  if (!valid) return { status: "invalid" };

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: encryptTotpSecret(secret),
      mfaEnabled: true,
      mfaRecoveryCodeHashes: recoveryCodeHashes,
    },
  });

  await consumeAuthBridge();
  await createSession(user.id);
  return { status: "done", recoveryCodes };
}

export type MfaVerifyResult =
  | { status: "invalid" }
  | { status: "locked"; retryAt: Date }
  | { status: "done" };

export async function verifyMfaChallenge(code: string): Promise<MfaVerifyResult> {
  const user = await getAuthBridgeUser();
  if (!user) return { status: "invalid" };

  if (isLocked(user)) {
    return { status: "locked", retryAt: user.lockUntil as Date };
  }

  const secret = user.mfaSecret ? decryptTotpSecret(user.mfaSecret) : null;
  const validTotp = secret ? await verifyTotpToken(secret, code) : false;

  if (validTotp) {
    await prisma.user.update({ where: { id: user.id }, data: resetLockoutFields });
    await consumeAuthBridge();
    await createSession(user.id);
    return { status: "done" };
  }

  const existingHashes = (user.mfaRecoveryCodeHashes as string[] | null) ?? [];
  const remaining = await consumeRecoveryCode(existingHashes, code);
  if (remaining) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryCodeHashes: remaining, ...resetLockoutFields },
    });
    await consumeAuthBridge();
    await createSession(user.id);
    return { status: "done" };
  }

  const update = computeLockAfterFailure(user.failedLoginAttempts);
  await prisma.user.update({ where: { id: user.id }, data: update });
  if (update.lockUntil) {
    return { status: "locked", retryAt: update.lockUntil };
  }
  return { status: "invalid" };
}

// Self-service: lets a user who still has their password (but may have lost their recovery
// codes) rotate to a fresh set. Requires re-proving the current password since these codes
// are a full authentication bypass for the account.
export async function regenerateRecoveryCodes(userId: string, currentPassword: string): Promise<string[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaEnabled) throw new MfaNotEnabledError();

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new InvalidCurrentPasswordError();

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { mfaRecoveryCodeHashes: recoveryCodeHashes } });
    await logActivity(tx, {
      actor: { id: userId, name: user.name },
      category: "user",
      message: `${user.name} regenerated their MFA recovery codes`,
      metadata: { userId },
    });
  });

  return recoveryCodes;
}
