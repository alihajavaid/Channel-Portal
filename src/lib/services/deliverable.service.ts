import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/services/activity.service";

export type DeliverableStatus = "Not started" | "In progress" | "Up to date";

export function deriveStatus(tasks: { done: boolean }[]): DeliverableStatus {
  const doneCount = tasks.filter((t) => t.done).length;
  if (doneCount === 0) return "Not started";
  if (doneCount === tasks.length) return "Up to date";
  return "In progress";
}

export function deriveLastUpdated(createdAt: Date, tasks: { completedAt: Date | null }[]): Date {
  const completedDates = tasks.map((t) => t.completedAt).filter((d): d is Date => d !== null);
  if (completedDates.length === 0) return createdAt;
  return new Date(Math.max(...completedDates.map((d) => d.getTime())));
}

export async function listDeliverables() {
  const rows = await prisma.deliverable.findMany({
    include: {
      owner: { select: { id: true, name: true } },
      tasks: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return rows.map((d) => ({
    ...d,
    status: deriveStatus(d.tasks),
    lastUpdated: deriveLastUpdated(d.createdAt, d.tasks),
    progress: { done: d.tasks.filter((t) => t.done).length, total: d.tasks.length },
  }));
}

export async function toggleDeliverableTask(
  deliverableId: string,
  taskId: string,
  done: boolean,
  actor: { id: string; name: string }
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.deliverableTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { deliverable: true },
    });
    if (task.deliverableId !== deliverableId) {
      throw new Error("Task does not belong to this deliverable");
    }
    const updated = await tx.deliverableTask.update({
      where: { id: taskId },
      data: done
        ? { done: true, completedAt: new Date(), completedById: actor.id }
        : { done: false, completedAt: null, completedById: null },
    });
    await logActivity(tx, {
      actor,
      category: "deliverable",
      message: `${actor.name} ${done ? "completed" : "reopened"} "${task.label}" on ${task.deliverable.name}`,
      metadata: { deliverableId, taskId },
    });
    return updated;
  });
}
