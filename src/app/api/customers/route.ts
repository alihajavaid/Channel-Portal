import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { CustomerCreateSchema } from "@/lib/validation/customer";
import { listCustomers, createCustomer } from "@/lib/services/customer.service";
import type { CustomerHealth, CustomerStatus } from "@prisma/client";

export const GET = withAuth("customers", async (req) => {
  const url = new URL(req.url);
  const rows = await listCustomers({
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as CustomerStatus) || undefined,
    health: (url.searchParams.get("health") as CustomerHealth) || undefined,
  });
  return NextResponse.json({ data: rows });
});

export const POST = withAuth("customers", async (req, _ctx, session) => {
  const body = await req.json().catch(() => null);
  const parsed = CustomerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const created = await createCustomer(parsed.data, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ data: created }, { status: 201 });
});
