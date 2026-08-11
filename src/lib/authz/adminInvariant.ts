import "server-only";
import type { Prisma } from "@prisma/client";

export class LastAdminError extends Error {
  constructor() {
    super("Cannot remove the last remaining Admin");
  }
}

// Must run inside the same transaction as the mutation that would demote/delete an Admin,
// to close the race where two concurrent demotions both pass the check independently.
export async function assertNotLastAdmin(
  tx: Prisma.TransactionClient,
  targetUserId: string
): Promise<void> {
  const remainingAdmins = await tx.user.count({
    where: { access: true, id: { not: targetUserId } },
  });
  if (remainingAdmins === 0) {
    throw new LastAdminError();
  }
}
