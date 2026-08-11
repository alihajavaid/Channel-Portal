import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { allPermissions } from "@/lib/constants/modules";
import { DELIVERABLES } from "@/lib/constants/deliverableSeed";
import { emptyChecklistState } from "@/lib/constants/phaseChecklists";

// This script runs standalone via `tsx`, outside Next.js's bundler, so it can't import
// lib/db/prisma.ts or lib/auth/password.ts — both are guarded with `server-only`, which
// unconditionally throws when loaded by plain Node instead of being tree-shaken by webpack.
const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function main() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!adminEmail || !adminName || !adminPassword) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL/NAME/PASSWORD must be set in .env for seeding");
  }

  const passwordHash = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "Admin",
      ...allPermissions(),
      mustChangePassword: true,
    },
  });
  console.log(`Bootstrap admin ready: ${admin.email}`);

  const existingDeliverables = await prisma.deliverable.count();
  if (existingDeliverables === 0) {
    for (const d of DELIVERABLES) {
      await prisma.deliverable.create({
        data: {
          name: d.name,
          description: d.description,
          link: d.link,
          ownerId: admin.id,
          tasks: {
            create: d.tasks.map((label, i) => ({ label, orderIndex: i })),
          },
        },
      });
    }
    console.log(`Seeded ${DELIVERABLES.length} deliverables.`);
  } else {
    console.log("Deliverables already seeded, skipping.");
  }

  const existingAccounts = await prisma.channelAccount.count();
  if (existingAccounts === 0) {
    const sampleAccounts: Array<{
      company: string;
      primaryContact: string;
      email: string;
      region: string;
      focusArea: string;
      tier: "Bronze" | "Silver" | "Gold";
      status: "Active" | "OnHold" | "Churned";
      phase: number;
      satisfaction?: number;
      opportunitiesGenerated?: number;
    }> = [
      {
        company: "Northwind Data Solutions",
        primaryContact: "Alex Rivera",
        email: "alex.rivera@northwinddata.example",
        region: "North America",
        focusArea: "Analytics",
        tier: "Silver",
        status: "Active",
        phase: 2,
      },
      {
        company: "Bluepeak Systems",
        primaryContact: "Jordan Lee",
        email: "jordan.lee@bluepeak.example",
        region: "EMEA",
        focusArea: "Integration",
        tier: "Gold",
        status: "Active",
        phase: 6,
      },
      {
        company: "Rivermark Technologies",
        primaryContact: "Sam Okafor",
        email: "sam.okafor@rivermark.example",
        region: "APAC",
        focusArea: "Data Engineering",
        tier: "Gold",
        status: "Active",
        phase: 9,
        satisfaction: 5,
        opportunitiesGenerated: 12,
      },
    ];

    for (const acc of sampleAccounts) {
      await prisma.channelAccount.create({
        data: {
          company: acc.company,
          primaryContact: acc.primaryContact,
          email: acc.email,
          region: acc.region,
          focusArea: acc.focusArea,
          ownerId: admin.id,
          tier: acc.tier,
          status: acc.status,
          phase: acc.phase,
          checklistState: emptyChecklistState(),
          requestDate: new Date(),
          satisfaction: acc.satisfaction,
          opportunitiesGenerated: acc.opportunitiesGenerated,
        },
      });
    }
    console.log(`Seeded ${sampleAccounts.length} sample channel accounts.`);

    await prisma.customer.create({
      data: {
        company: "Fernbridge Logistics",
        primaryContact: "Priya Nair",
        email: "priya.nair@fernbridge.example",
        plan: "Enterprise",
        csmOwnerId: admin.id,
        health: "Healthy",
        status: "Active",
        renewalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("Seeded 1 sample customer.");
  } else {
    console.log("Sample data already present, skipping.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
