import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { UserUpdateSchema } from "@/lib/validation/user";
import { updateUser, deleteUser, LastAdminError, UserHasOwnedRecordsError } from "@/lib/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>("access", async (req, ctx, session) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const updated = await updateUser(id, parsed.data, { id: session.user.id, name: session.user.name });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof LastAdminError) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
    throw err;
  }
});

export const DELETE = withAuth<Ctx>("access", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  try {
    await deleteUser(id, { id: session.user.id, name: session.user.name });
    return NextResponse.json({ status: "done" });
  } catch (err) {
    if (err instanceof LastAdminError) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
    if (err instanceof UserHasOwnedRecordsError) {
      return NextResponse.json({ error: "user_has_owned_records" }, { status: 409 });
    }
    throw err;
  }
});
