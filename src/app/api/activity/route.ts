import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { listActivity, ACTIVITY_CATEGORIES, type ActivityCategoryFilter } from "@/lib/services/activity.service";

// Gated behind "access" (Admin), same as the full-data export — the audit trail includes
// permission_change and export events, which are sensitive by nature.
export const GET = withAuth("access", async (req) => {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 25));
  const categoryParam = url.searchParams.get("category") as ActivityCategoryFilter | null;
  const category = categoryParam && ACTIVITY_CATEGORIES.includes(categoryParam) ? categoryParam : undefined;

  const { rows, total } = await listActivity({
    category,
    search: url.searchParams.get("search") ?? undefined,
    page,
    pageSize,
  });
  return NextResponse.json({ data: rows, total });
});
