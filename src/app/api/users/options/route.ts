import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { prisma } from "@/lib/db/prisma";

// Minimal {id, name} lookup for owner/CSM-owner selectors elsewhere in the app. Any
// authenticated user can see teammate names to assign ownership — this is not user
// administration (that's gated behind the `access` permission in /api/users).
export const GET = withAuth("any", async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: users });
});
