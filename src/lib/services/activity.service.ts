import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type ActivityCategory =
  | "channel_account"
  | "customer"
  | "deliverable"
  | "user"
  | "permission_change"
  | "export";

type LogInput = {
  actor: { id: string; name: string };
  category: ActivityCategory;
  message: string;
  metadata?: Record<string, unknown>;
};

// Always call within the same transaction as the mutation being logged, so the audit trail
// can never silently be dropped by a later failure in the same request.
export async function logActivity(tx: Prisma.TransactionClient, input: LogInput) {
  await tx.activityLogEntry.create({
    data: {
      actorUserId: input.actor.id,
      actorName: input.actor.name,
      category: input.category,
      message: input.message,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

export async function getRecentActivity(limit = 20) {
  return prisma.activityLogEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
