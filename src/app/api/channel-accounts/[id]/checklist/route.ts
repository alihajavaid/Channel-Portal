import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { canAccessPhase } from "@/lib/authz/channelAccountAuthz";
import { ChecklistToggleSchema } from "@/lib/validation/channelAccount";
import { getChannelAccount, toggleChecklistItem } from "@/lib/services/channelAccount.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>("any", async (req, ctx, session) => {
  const { id } = await ctx.params;
  const existing = await getChannelAccount(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessPhase(session.user, existing.phase)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ChecklistToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (parsed.data.phase !== existing.phase) {
    return NextResponse.json({ error: "phase_mismatch" }, { status: 400 });
  }

  const updated = await toggleChecklistItem(
    id,
    parsed.data.phase,
    parsed.data.itemKey,
    parsed.data.done,
    session.user.id
  );
  return NextResponse.json({ data: updated });
});
