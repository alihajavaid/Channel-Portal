import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { UserCreateSchema } from "@/lib/validation/user";
import { listUsers, createUser, type UserSortKey } from "@/lib/services/user.service";
import { prisma } from "@/lib/db/prisma";

const SORT_KEYS: UserSortKey[] = ["name", "email", "role"];

export const GET = withAuth("access", async (req) => {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "");
  const sortKeyParam = url.searchParams.get("sortKey");
  const { rows, total } = await listUsers({
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
    sortKey: SORT_KEYS.includes(sortKeyParam as UserSortKey) ? (sortKeyParam as UserSortKey) : undefined,
    sortDir: url.searchParams.get("sortDir") === "desc" ? "desc" : "asc",
  });
  return NextResponse.json({ data: rows, total });
});

export const POST = withAuth("access", async (req, _ctx, session) => {
  const body = await req.json().catch(() => null);
  const parsed = UserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "email_in_use" }, { status: 409 });
  }

  const created = await createUser(parsed.data, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ data: created }, { status: 201 });
});
