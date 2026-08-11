import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/services/activity.service";
import { encryptNullable, decryptNullable } from "@/lib/crypto/fieldCrypto";
import type { CustomerHealth, CustomerStatus } from "@prisma/client";

type Actor = { id: string; name: string };

function withDecryptedNotes<T extends { notes: string | null }>(record: T): T {
  return { ...record, notes: decryptNullable(record.notes) };
}

export async function listCustomers(filter: { search?: string; status?: CustomerStatus; health?: CustomerHealth }) {
  const rows = await prisma.customer.findMany({
    where: {
      status: filter.status,
      health: filter.health,
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
    include: { csmOwner: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(withDecryptedNotes);
}

export async function getCustomer(id: string) {
  const row = await prisma.customer.findUnique({
    where: { id },
    include: {
      csmOwner: { select: { id: true, name: true } },
      documents: { include: { uploadedBy: { select: { id: true, name: true } } } },
    },
  });
  return row ? withDecryptedNotes(row) : null;
}

export type CustomerInput = {
  company: string;
  primaryContact: string;
  email: string;
  plan: string;
  csmOwnerId: string;
  health: CustomerHealth;
  status: CustomerStatus;
  renewalDate: string;
  notes?: string | null;
};

export async function createCustomer(input: CustomerInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        company: input.company,
        primaryContact: input.primaryContact,
        email: input.email,
        plan: input.plan,
        csmOwnerId: input.csmOwnerId,
        health: input.health,
        status: input.status,
        renewalDate: new Date(input.renewalDate),
        notes: encryptNullable(input.notes ?? null),
      },
    });
    await logActivity(tx, {
      actor,
      category: "customer",
      message: `${actor.name} added ${created.company} as a new customer`,
      metadata: { customerId: created.id },
    });
    return created;
  });
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findUniqueOrThrow({ where: { id } });
    const data: Record<string, unknown> = { ...input };
    if (input.renewalDate) data.renewalDate = new Date(input.renewalDate);
    if ("notes" in input) data.notes = encryptNullable(input.notes ?? null);

    const updated = await tx.customer.update({ where: { id }, data });

    if (input.health && input.health !== existing.health) {
      await logActivity(tx, {
        actor,
        category: "customer",
        message: `${actor.name} changed ${updated.company}'s account health from ${existing.health} to ${input.health}`,
        metadata: { customerId: id, from: existing.health, to: input.health },
      });
    }
    return updated;
  });
}

export async function deleteCustomer(id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findUniqueOrThrow({ where: { id } });
    await tx.customer.delete({ where: { id } });
    await logActivity(tx, {
      actor,
      category: "customer",
      message: `${actor.name} deleted ${existing.company}`,
      metadata: { customerId: id },
    });
  });
}
