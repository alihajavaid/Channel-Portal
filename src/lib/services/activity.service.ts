import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ActivityCategory =
  | "channel_account"
  | "customer"
  | "user"
  | "permission_change"
  | "export";
export type ActivityCategoryFilter = ActivityCategory;

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "channel_account",
  "customer",
  "user",
  "permission_change",
  "export",
];

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

export async function listActivity(filter: {
  category?: ActivityCategory;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.ActivityLogEntryWhereInput = {
    category: filter.category,
    ...(filter.search
      ? {
          OR: [
            { message: { contains: filter.search } },
            { actorName: { contains: filter.search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.activityLogEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.activityLogEntry.count({ where }),
  ]);
  return { rows, total };
}
