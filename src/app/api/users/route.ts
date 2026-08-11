import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { UserCreateSchema } from "@/lib/validation/user";
import { listUsers, createUser } from "@/lib/services/user.service";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth("access", async () => {
  const users = await listUsers();
  return NextResponse.json({ data: users });
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
