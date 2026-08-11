import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { sendCredentials, EmailNotConfiguredError, EmailSendError } from "@/lib/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>("access", async (req: NextRequest, ctx, session) => {
  const { id } = await ctx.params;
  const loginUrl = `${process.env.APP_URL ?? new URL(req.url).origin}/login`;
  try {
    await sendCredentials(id, { id: session.user.id, name: session.user.name }, loginUrl);
    return NextResponse.json({ status: "done" });
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json({ error: "email_not_configured" }, { status: 502 });
    }
    if (err instanceof EmailSendError) {
      return NextResponse.json({ error: "email_send_failed" }, { status: 502 });
    }
    throw err;
  }
});
