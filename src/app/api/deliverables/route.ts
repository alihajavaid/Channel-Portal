import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { listDeliverables } from "@/lib/services/deliverable.service";

export const GET = withAuth("deliverables", async () => {
  const rows = await listDeliverables();
  return NextResponse.json({ data: rows });
});
