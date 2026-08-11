import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { logActivity } from "@/lib/services/activity.service";
import { exportAllData, exportAllDataAsCsv } from "@/lib/services/export.service";
import { prisma } from "@/lib/db/prisma";

// Gated behind `access` rather than `dashboard` — a full data export (including customer
// and partner PII) is the single most sensitive read in the app, so it gets the same
// permission as user/permission administration rather than the broader dashboard audience.
export const GET = withAuth("access", async (req: NextRequest, _ctx, session) => {
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";

  await prisma.$transaction((tx) =>
    logActivity(tx, {
      actor: { id: session.user.id, name: session.user.name },
      category: "export",
      message: `${session.user.name} exported all data (${format})`,
    })
  );

  if (format === "csv") {
    const csv = await exportAllDataAsCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="channel-portal-export.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const data = await exportAllData();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="channel-portal-export.json"`,
      "Cache-Control": "private, no-store",
    },
  });
});
