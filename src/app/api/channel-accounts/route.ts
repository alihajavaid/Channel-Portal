import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { ChannelAccountCreateSchema } from "@/lib/validation/channelAccount";
import { listChannelAccounts, createChannelAccount } from "@/lib/services/channelAccount.service";
import type { Tier, ChannelStatus } from "@prisma/client";

export const GET = withAuth("any", async (req, _ctx, session) => {
  const url = new URL(req.url);
  const group = url.searchParams.get("group") === "partner" ? "Partner" : "Prospect";
  const module = group === "Prospect" ? "prospects" : "partners";
  if (!session.user[module]) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await listChannelAccounts({
    phaseGroup: group,
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as ChannelStatus) || undefined,
    tier: (url.searchParams.get("tier") as Tier) || undefined,
  });
  return NextResponse.json({ data: rows });
});

export const POST = withAuth("prospects", async (req, _ctx, session) => {
  const body = await req.json().catch(() => null);
  const parsed = ChannelAccountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const created = await createChannelAccount(parsed.data, { id: session.user.id, name: session.user.name });
  return NextResponse.json({ data: created }, { status: 201 });
});
