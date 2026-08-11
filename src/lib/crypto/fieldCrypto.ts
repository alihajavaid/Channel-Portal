import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Field-level AES-256-GCM encryption for the most sensitive columns (User.mfaSecret,
// ChannelAccount/Customer.notes). This is a pragmatic single-key stand-in for envelope
// encryption, not a full KMS hierarchy — losing FIELD_ENCRYPTION_KEY makes encrypted data
// permanently unreadable. MySQL/BitLocker-level at-rest encryption is a real complement but
// is host/DB config outside this application; this is what the app layer can actually
// guarantee. Contact/email fields are deliberately left unencrypted because they're actively
// filtered/searched in the UI.

function getKey(): Buffer {
  const b64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error("FIELD_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

const PREFIX = "enc:v1:";

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, ciphertext]).toString("base64");
  return PREFIX + payload;
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    // Allow reading legacy/plaintext values gracefully during migration windows.
    return stored;
  }
  const key = getKey();
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function encryptNullable(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  return encryptField(plaintext);
}

export function decryptNullable(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null;
  return decryptField(stored);
}
