import "server-only";
import { prisma } from "@/lib/db/prisma";
import { decryptNullable } from "@/lib/crypto/fieldCrypto";

export async function exportAllData() {
  const [channelAccounts, customers, users] = await Promise.all([
    prisma.channelAccount.findMany({ include: { owner: { select: { name: true, email: true } } } }),
    prisma.customer.findMany({ include: { csmOwner: { select: { name: true, email: true } } } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dashboard: true,
        prospects: true,
        partners: true,
        customers: true,
        access: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
  ]);

  return {
    channelAccounts: channelAccounts.map((a) => ({ ...a, notes: decryptNullable(a.notes) })),
    customers: customers.map((c) => ({ ...c, notes: decryptNullable(c.notes) })),
    users,
    exportedAt: new Date().toISOString(),
  };
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function exportAllDataAsCsv(): Promise<string> {
  const data = await exportAllData();
  const sections = [
    "# Channel Accounts",
    toCsv(
      data.channelAccounts.map((a) => ({
        id: a.id,
        company: a.company,
        primaryContact: a.primaryContact,
        email: a.email,
        region: a.region,
        focusArea: a.focusArea,
        owner: a.owner.name,
        tier: a.tier,
        status: a.status,
        phase: a.phase,
        requestDate: a.requestDate.toISOString(),
        satisfaction: a.satisfaction,
        opportunitiesGenerated: a.opportunitiesGenerated,
      }))
    ),
    "",
    "# Customers",
    toCsv(
      data.customers.map((c) => ({
        id: c.id,
        company: c.company,
        primaryContact: c.primaryContact,
        email: c.email,
        plan: c.plan,
        csmOwner: c.csmOwner.name,
        health: c.health,
        status: c.status,
        renewalDate: c.renewalDate.toISOString(),
      }))
    ),
    "",
    "# Users",
    toCsv(
      data.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        dashboard: u.dashboard,
        prospects: u.prospects,
        partners: u.partners,
        customers: u.customers,
        access: u.access,
      }))
    ),
  ];
  return sections.join("\n");
}
