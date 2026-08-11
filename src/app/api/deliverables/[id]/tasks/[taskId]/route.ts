import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/authz/guard";
import { toggleDeliverableTask } from "@/lib/services/deliverable.service";

type Ctx = { params: Promise<{ id: string; taskId: string }> };

const BodySchema = z.object({ done: z.boolean() });

export const POST = withAuth<Ctx>("deliverables", async (req, ctx, session) => {
  const { id, taskId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = await toggleDeliverableTask(id, taskId, parsed.data.done, {
    id: session.user.id,
    name: session.user.name,
  });
  return NextResponse.json({ data: updated });
});
