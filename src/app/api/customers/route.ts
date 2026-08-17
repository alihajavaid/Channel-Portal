import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { CustomerCreateSchema } from "@/lib/validation/customer";
import { listCustomers, createCustomer, type CustomerSortKey } from "@/lib/services/customer.service";
import type { CustomerHealth, CustomerStatus } from "@prisma/client";

const SORT_KEYS: CustomerSortKey[] = ["company", "plan", "health", "status", "renewalDate", "csmOwner"];

export const GET = withAuth("customers", async (req) => {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "");
  const sortKeyParam = url.searchParams.get("sortKey");
  const { rows, total } = await listCustomers({
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as CustomerStatus) || undefined,
    health: (url.searchParams.get("health") as CustomerHealth) || undefined,
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
    sortKey: SORT_KEYS.includes(sortKeyParam as CustomerSortKey) ? (sortKeyParam as CustomerSortKey) : undefined,
    sortDir: url.searchParams.get("sortDir") === "desc" ? "desc" : "asc",
  });
  return NextResponse.json({ data: rows, total });
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
