import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { canAccessPhase } from "@/lib/authz/channelAccountAuthz";
import { PhaseMoveSchema } from "@/lib/validation/channelAccount";
import { getChannelAccount, moveChannelAccountPhase } from "@/lib/services/channelAccount.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>("any", async (req, ctx, session) => {
  const { id } = await ctx.params;
  const existing = await getChannelAccount(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = PhaseMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Require permission for the record's current phase group AND, if the move crosses into
  // the other group (prospect <-> partner), the destination group too.
  if (
    !canAccessPhase(session.user, existing.phase) ||
    !canAccessPhase(session.user, parsed.data.phase)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await moveChannelAccountPhase(id, parsed.data.phase, {
    id: session.user.id,
    name: session.user.name,
  });
  return NextResponse.json({ data: updated });
});
