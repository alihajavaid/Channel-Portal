import "server-only";
import { generateSecret, generateURI, verify as otpVerify } from "otplib";
import QRCode from "qrcode";
import { hashPassword, verifyPassword, generateRandomSecret } from "@/lib/auth/password";
import { encryptField, decryptField } from "@/lib/crypto/fieldCrypto";

const ISSUER = "Channel Portal";
// Allow one 30s step of clock drift in either direction.
const EPOCH_TOLERANCE_SECONDS = 30;

export function generateTotpSecret(): string {
  return generateSecret();
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret);
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptField(encrypted);
}

export async function totpQrDataUrl(secret: string, email: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(uri);
}

export async function verifyTotpToken(secret: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false;
  const result = await otpVerify({ secret, token, epochTolerance: EPOCH_TOLERANCE_SECONDS });
  return result.valid;
}

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 10;

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRandomSecret(RECOVERY_CODE_LENGTH));
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(code)));
}

// Returns the remaining hash list with the matched hash removed (single-use), or null if no
// hash matched the provided code.
export async function consumeRecoveryCode(
  hashes: string[],
  candidate: string
): Promise<string[] | null> {
  for (let i = 0; i < hashes.length; i++) {
    if (await verifyPassword(hashes[i], candidate)) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
