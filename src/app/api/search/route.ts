import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { prisma } from "@/lib/db/prisma";

const RESULTS_PER_GROUP = 5;

export const GET = withAuth("any", async (req, _ctx, session) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ data: { prospects: [], partners: [], customers: [], users: [] } });
  }

  const nameFilter = {
    OR: [{ company: { contains: q } }, { primaryContact: { contains: q } }, { email: { contains: q } }],
  };

  const [prospects, partners, customers, users] = await Promise.all([
    session.user.prospects
      ? prisma.channelAccount.findMany({
          where: { phase: { lte: 3 }, ...nameFilter },
          select: { id: true, company: true, primaryContact: true },
          take: RESULTS_PER_GROUP,
        })
      : Promise.resolve([]),
    session.user.partners
      ? prisma.channelAccount.findMany({
          where: { phase: { gte: 4 }, ...nameFilter },
          select: { id: true, company: true, primaryContact: true },
          take: RESULTS_PER_GROUP,
        })
      : Promise.resolve([]),
    session.user.customers
      ? prisma.customer.findMany({
          where: {
            OR: [{ company: { contains: q } }, { primaryContact: { contains: q } }, { email: { contains: q } }],
          },
          select: { id: true, company: true, primaryContact: true },
          take: RESULTS_PER_GROUP,
        })
      : Promise.resolve([]),
    session.user.access
      ? prisma.user.findMany({
          where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
          select: { id: true, name: true, email: true },
          take: RESULTS_PER_GROUP,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    data: {
      prospects: prospects.map((p) => ({ id: p.id, label: p.company, sublabel: p.primaryContact, href: `/prospects/${p.id}` })),
      partners: partners.map((p) => ({ id: p.id, label: p.company, sublabel: p.primaryContact, href: `/partners/${p.id}` })),
      customers: customers.map((c) => ({ id: c.id, label: c.company, sublabel: c.primaryContact, href: `/customers/${c.id}` })),
      users: users.map((u) => ({ id: u.id, label: u.name, sublabel: u.email, href: `/access` })),
    },
  });
});
