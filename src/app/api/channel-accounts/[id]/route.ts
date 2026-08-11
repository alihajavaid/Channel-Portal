import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { canAccessPhase } from "@/lib/authz/channelAccountAuthz";
import { ChannelAccountUpdateSchema } from "@/lib/validation/channelAccount";
import {
  getChannelAccount,
  updateChannelAccount,
  deleteChannelAccount,
} from "@/lib/services/channelAccount.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>("any", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const record = await getChannelAccount(id);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessPhase(session.user, record.phase)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ data: record });
});

export const PATCH = withAuth<Ctx>("any", async (req, ctx, session) => {
  const { id } = await ctx.params;
  const existing = await getChannelAccount(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessPhase(session.user, existing.phase)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ChannelAccountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await updateChannelAccount(id, parsed.data);
  return NextResponse.json({ data: updated });
});

export const DELETE = withAuth<Ctx>("any", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const existing = await getChannelAccount(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessPhase(session.user, existing.phase)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deleteChannelAccount(id, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ status: "done" });
});
