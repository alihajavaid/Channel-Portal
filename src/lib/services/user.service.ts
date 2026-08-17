import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/services/activity.service";
import { assertNotLastAdmin, LastAdminError } from "@/lib/authz/adminInvariant";
import { hashPassword, verifyPassword, generateRandomSecret } from "@/lib/auth/password";
import { revokeAllSessionsForUser, revokeOtherSessions } from "@/lib/auth/session";
import { sendEmail, EmailNotConfiguredError, EmailSendError } from "@/lib/email/resend";
import { CredentialsEmail } from "@/lib/email/templates/CredentialsEmail";
import { MODULE_KEYS, type Permissions } from "@/lib/constants/modules";

export { LastAdminError, EmailNotConfiguredError, EmailSendError };

type Actor = { id: string; name: string };

export class UserHasOwnedRecordsError extends Error {
  constructor() {
    super("This user still owns records (prospects, partners, or customers) — reassign them first");
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Current password is incorrect");
  }
}

// Self-service password change, distinct from the forced-reset flow in auth.service.ts:
// this requires proving the *current* password (the forced flow instead relies on a
// short-lived auth bridge established right after login) and keeps the current session
// alive while revoking every other one, since the user is already mid-session here.
export async function changeOwnPassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new InvalidCurrentPasswordError();

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await logActivity(tx, {
      actor: { id: userId, name: user.name },
      category: "user",
      message: `${user.name} changed their own password`,
      metadata: { userId },
    });
  });
  await revokeOtherSessions(userId, currentSessionId);
}

export type UserSortKey = "name" | "email" | "role";

export async function listUsers(
  filter: { page?: number; pageSize?: number; sortKey?: UserSortKey; sortDir?: "asc" | "desc" } = {}
) {
  const select = {
    id: true,
    name: true,
    email: true,
    role: true,
    dashboard: true,
    prospects: true,
    partners: true,
    customers: true,
    access: true,
    mfaEnabled: true,
    mustChangePassword: true,
    createdAt: true,
    lastLoginAt: true,
  } as const;

  const paginate = filter.page !== undefined && filter.pageSize !== undefined;
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      select,
      orderBy: { [filter.sortKey ?? "name"]: filter.sortDir ?? "asc" },
      ...(paginate ? { skip: (filter.page! - 1) * filter.pageSize!, take: filter.pageSize } : {}),
    }),
    paginate ? prisma.user.count() : Promise.resolve(undefined),
  ]);
  return { rows, total: total ?? rows.length };
}

export type UserCreateInput = { name: string; email: string; role: string } & Permissions;

const TEMP_PASSWORD_TTL_HOURS = 48;

export async function createUser(input: UserCreateInput, actor: Actor) {
  const tempPassword = generateRandomSecret(16);
  const passwordHash = await hashPassword(tempPassword);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000),
        dashboard: input.dashboard,
        prospects: input.prospects,
        partners: input.partners,
        customers: input.customers,
        access: input.access,
      },
    });
    await logActivity(tx, {
      actor,
      category: "user",
      message: `${actor.name} added ${user.name} (${user.role})`,
      metadata: { userId: user.id },
    });
    return user;
  });

  return created;
}

export type UserUpdateInput = Partial<{ name: string; role: string } & Permissions>;

export async function updateUser(id: string, input: UserUpdateInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUniqueOrThrow({ where: { id } });

    const permissionChanges = MODULE_KEYS.filter(
      (key) => key in input && input[key] !== existing[key]
    );
    if (permissionChanges.includes("access") && input.access === false) {
      await assertNotLastAdmin(tx, id);
    }

    const updated = await tx.user.update({ where: { id }, data: input });

    await logActivity(tx, {
      actor,
      category: "user",
      message: `${actor.name} updated ${updated.name}`,
      metadata: { userId: id },
    });

    if (permissionChanges.length > 0) {
      const before = Object.fromEntries(permissionChanges.map((k) => [k, existing[k]]));
      const after = Object.fromEntries(permissionChanges.map((k) => [k, updated[k]]));
      await logActivity(tx, {
        actor,
        category: "permission_change",
        message: `${actor.name} changed permissions for ${updated.name}`,
        metadata: { targetUserId: id, before, after },
      });
    }

    return updated;
  });
}

export async function deleteUser(id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUniqueOrThrow({ where: { id } });
    if (existing.access) {
      await assertNotLastAdmin(tx, id);
    }

    await tx.session.deleteMany({ where: { userId: id } });
    await tx.mfaChallenge.deleteMany({ where: { userId: id } });

    try {
      await tx.user.delete({ where: { id } });
    } catch {
      throw new UserHasOwnedRecordsError();
    }

    await logActivity(tx, {
      actor,
      category: "user",
      message: `${actor.name} removed ${existing.name}`,
      metadata: { userId: id },
    });
  });
}

export async function sendCredentials(id: string, actor: Actor, loginUrl: string) {
  const tempPassword = generateRandomSecret(16);
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    await logActivity(tx, {
      actor,
      category: "user",
      message: `${actor.name} sent login credentials to ${updated.name}`,
      metadata: { userId: id },
    });
    return updated;
  });

  await revokeAllSessionsForUser(id);

  await sendEmail({
    to: user.email,
    subject: "Your Channel Portal login credentials",
    react: CredentialsEmail({
      name: user.name,
      email: user.email,
      tempPassword,
      loginUrl,
      expiresInHours: TEMP_PASSWORD_TTL_HOURS,
    }),
  });
}
