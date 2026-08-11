import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { CustomerUpdateSchema } from "@/lib/validation/customer";
import { getCustomer, updateCustomer, deleteCustomer } from "@/lib/services/customer.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>("customers", async (_req, ctx) => {
  const { id } = await ctx.params;
  const record = await getCustomer(id);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: record });
});

export const PATCH = withAuth<Ctx>("customers", async (req, ctx, session) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = CustomerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await updateCustomer(id, parsed.data, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ data: updated });
});

export const DELETE = withAuth<Ctx>("customers", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  await deleteCustomer(id, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ status: "done" });
});
