import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/services/activity.service";
import { emptyChecklistState, type ChecklistState } from "@/lib/constants/phaseChecklists";
import { encryptNullable, decryptNullable } from "@/lib/crypto/fieldCrypto";
import type { Tier, ChannelStatus } from "@prisma/client";

type Actor = { id: string; name: string };

export type ChannelAccountListFilter = {
  phaseGroup: "Prospect" | "Partner";
  search?: string;
  status?: ChannelStatus;
  tier?: Tier;
};

function withDecryptedNotes<T extends { notes: string | null }>(record: T): T {
  return { ...record, notes: decryptNullable(record.notes) };
}

export async function listChannelAccounts(filter: ChannelAccountListFilter) {
  const phaseRange = filter.phaseGroup === "Prospect" ? [1, 2, 3] : [4, 5, 6, 7, 8, 9];
  const rows = await prisma.channelAccount.findMany({
    where: {
      phase: { in: phaseRange },
      status: filter.status,
      tier: filter.tier,
      ...(filter.search
        ? {
            OR: [
              { company: { contains: filter.search } },
              { primaryContact: { contains: filter.search } },
              { email: { contains: filter.search } },
            ],
          }
        : {}),
    },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(withDecryptedNotes);
}

export async function getChannelAccount(id: string) {
  const row = await prisma.channelAccount.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      documents: { include: { uploadedBy: { select: { id: true, name: true } } } },
    },
  });
  return row ? withDecryptedNotes(row) : null;
}

export type ChannelAccountInput = {
  company: string;
  primaryContact: string;
  email: string;
  region: string;
  focusArea: string;
  ownerId: string;
  tier: Tier;
  status: ChannelStatus;
  requestDate: string;
  notes?: string | null;
};

export async function createChannelAccount(input: ChannelAccountInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.channelAccount.create({
      data: {
        company: input.company,
        primaryContact: input.primaryContact,
        email: input.email,
        region: input.region,
        focusArea: input.focusArea,
        ownerId: input.ownerId,
        tier: input.tier,
        status: input.status,
        phase: 1,
        checklistState: emptyChecklistState() as object,
        requestDate: new Date(input.requestDate),
        notes: encryptNullable(input.notes ?? null),
      },
    });
    await logActivity(tx, {
      actor,
      category: "channel_account",
      message: `${actor.name} added ${created.company} as a new prospect`,
      metadata: { channelAccountId: created.id },
    });
    return created;
  });
}

export type ChannelAccountUpdateInput = Partial<ChannelAccountInput> & {
  satisfaction?: number | null;
  opportunitiesGenerated?: number | null;
};

export async function updateChannelAccount(id: string, input: ChannelAccountUpdateInput) {
  const data: Record<string, unknown> = { ...input };
  if (input.requestDate) data.requestDate = new Date(input.requestDate);
  if ("notes" in input) data.notes = encryptNullable(input.notes ?? null);
  return prisma.channelAccount.update({ where: { id }, data });
}

export async function moveChannelAccountPhase(id: string, newPhase: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.channelAccount.findUniqueOrThrow({ where: { id } });
    const updated = await tx.channelAccount.update({
      where: { id },
      data: { phase: newPhase },
    });
    const direction = newPhase > existing.phase ? "advanced" : "moved back";
    await logActivity(tx, {
      actor,
      category: "channel_account",
      message: `${actor.name} ${direction} ${updated.company} from phase ${existing.phase} to phase ${newPhase}`,
      metadata: { channelAccountId: id, fromPhase: existing.phase, toPhase: newPhase },
    });
    return updated;
  });
}

export async function toggleChecklistItem(id: string, phase: number, itemKey: string, done: boolean, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.channelAccount.findUniqueOrThrow({ where: { id } });
    const state = (existing.checklistState as unknown as ChecklistState) ?? {};
    const phaseState = { ...(state[String(phase)] ?? {}) };
    phaseState[itemKey] = done
      ? { done: true, at: new Date().toISOString(), by: actorId }
      : { done: false };
    const newState = { ...state, [String(phase)]: phaseState };
    return tx.channelAccount.update({
      where: { id },
      data: { checklistState: newState as object },
    });
  });
}

export async function deleteChannelAccount(id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.channelAccount.findUniqueOrThrow({ where: { id } });
    await tx.channelAccount.delete({ where: { id } });
    await logActivity(tx, {
      actor,
      category: "channel_account",
      message: `${actor.name} deleted ${existing.company}`,
      metadata: { channelAccountId: id },
    });
  });
}
