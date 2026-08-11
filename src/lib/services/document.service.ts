import "server-only";
import { prisma } from "@/lib/db/prisma";
import { storeUploadedFile, deleteStoredFile, storedFilePath, UploadRejectedError } from "@/lib/storage/upload";
import { moduleForPhase } from "@/lib/authz/channelAccountAuthz";
import type { ModuleKey } from "@/lib/constants/modules";

export { UploadRejectedError };

export type ParentRef = { type: "channelAccount"; id: string } | { type: "customer"; id: string };

// Resolves which module permission governs a document's parent record. For a ChannelAccount
// this depends on its current phase (prospects vs partners) — the same rule used everywhere
// else a ChannelAccount's permission is derived (lib/authz/channelAccountAuthz.ts).
export async function resolveParentModule(parent: ParentRef): Promise<ModuleKey | null> {
  if (parent.type === "channelAccount") {
    const account = await prisma.channelAccount.findUnique({
      where: { id: parent.id },
      select: { phase: true },
    });
    if (!account) return null;
    return moduleForPhase(account.phase);
  }
  const customer = await prisma.customer.findUnique({ where: { id: parent.id }, select: { id: true } });
  return customer ? "customers" : null;
}

export async function uploadDocument(
  parent: ParentRef,
  file: { name: string; buffer: Buffer },
  actor: { id: string; name: string }
) {
  const stored = await storeUploadedFile(file.buffer);
  try {
    return await prisma.document.create({
      data: {
        name: file.name,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        channelAccountId: parent.type === "channelAccount" ? parent.id : null,
        customerId: parent.type === "customer" ? parent.id : null,
        uploadedById: actor.id,
      },
    });
  } catch (err) {
    // Insert failed after the file was written — clean up the orphaned file on disk.
    await deleteStoredFile(stored.storageKey);
    throw err;
  }
}

export async function getDocumentWithParentModule(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return null;
  const parent: ParentRef = document.channelAccountId
    ? { type: "channelAccount", id: document.channelAccountId }
    : { type: "customer", id: document.customerId as string };
  const module = await resolveParentModule(parent);
  return { document, module };
}

export async function deleteDocument(id: string) {
  const document = await prisma.document.delete({ where: { id } });
  await deleteStoredFile(document.storageKey);
  return document;
}

export function documentFilePath(storageKey: string) {
  return storedFilePath(storageKey);
}
