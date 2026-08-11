import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export class UploadRejectedError extends Error {}

function storageRoot(): string {
  return process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage", "documents");
}

function maxUploadBytes(): number {
  return Number(process.env.MAX_UPLOAD_BYTES ?? 26_214_400);
}

// Validates by sniffing actual magic bytes (never trusting the client-declared Content-Type,
// which can be spoofed to disguise an executable as a "PDF"), writes to a temp path, then
// atomically renames into STORAGE_ROOT/<uuid> — a filename with no user input and no
// extension, so path traversal is impossible by construction. Virus scanning is explicitly
// out of scope for v1; this is the single, clearly marked hook for adding it later.
export async function storeUploadedFile(buffer: Buffer): Promise<{
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}> {
  if (buffer.byteLength === 0) {
    throw new UploadRejectedError("Empty file");
  }
  if (buffer.byteLength > maxUploadBytes()) {
    throw new UploadRejectedError("File exceeds the maximum allowed size");
  }

  const sniffed = await fileTypeFromBuffer(buffer);
  if (!sniffed || !ALLOWED_MIME_TYPES.has(sniffed.mime)) {
    throw new UploadRejectedError("Unsupported or unrecognized file type");
  }

  // TODO: virus scan hook — pass `buffer` through a scanner (e.g. ClamAV) before it is
  // persisted, and throw UploadRejectedError on a positive match.

  const root = storageRoot();
  await mkdir(root, { recursive: true });
  const storageKey = randomUUID();
  const finalPath = path.join(/* turbopackIgnore: true */ root, storageKey);
  const tempPath = `${finalPath}.tmp-${randomUUID()}`;

  await writeFile(tempPath, buffer);
  await rename(tempPath, finalPath);

  return { storageKey, mimeType: sniffed.mime, sizeBytes: buffer.byteLength };
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const finalPath = path.join(/* turbopackIgnore: true */ storageRoot(), storageKey);
  await unlink(finalPath).catch(() => {});
}

export function storedFilePath(storageKey: string): string {
  return path.join(/* turbopackIgnore: true */ storageRoot(), storageKey);
}
