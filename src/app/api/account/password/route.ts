import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { ChangePasswordSchema } from "@/lib/validation/auth";
import { changeOwnPassword, InvalidCurrentPasswordError } from "@/lib/services/user.service";

export const PATCH = withAuth("any", async (req, _ctx, session) => {
  const body = await req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await changeOwnPassword(
      session.user.id,
      session.sessionId,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );
    return NextResponse.json({ status: "done" });
  } catch (err) {
    if (err instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ error: "invalid_current_password" }, { status: 403 });
    }
    throw err;
  }
});
