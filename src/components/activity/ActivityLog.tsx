"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client/api";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { InboxIcon } from "@/components/ui/icons";

type ActivityCategory = "channel_account" | "customer" | "user" | "permission_change" | "export";
type ActivityRow = {
  id: string;
  actorName: string;
  category: ActivityCategory;
  message: string;
  createdAt: string;
};

const CATEGORIES: ActivityCategory[] = ["channel_account", "customer", "user", "permission_change", "export"];

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  channel_account: "Prospect/Partner",
  customer: "Customer",
  user: "User",
  permission_change: "Permission change",
  export: "Export",
};

const CATEGORY_STYLES: Record<ActivityCategory, string> = {
  channel_account: "bg-brand/10 text-brand",
  customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  user: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  permission_change: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  export: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const PAGE_SIZE = 25;

export function ActivityLog() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  async function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const { ok, data } = await apiJson<{ data?: ActivityRow[]; total?: number }>(
      `/api/activity?${params.toString()}`
    );
    if (ok) {
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, category]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Activity Log</h1>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search message or actor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} min-w-[240px] flex-1`}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {!rows ? (
        <TableSkeleton cols={4} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <InboxIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-700 dark:text-slate-300">No activity found</p>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.actorName}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[row.category]}`}>
                        {CATEGORY_LABELS[row.category]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
