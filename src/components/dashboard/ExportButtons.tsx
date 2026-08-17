"use client";

import { DownloadIcon } from "@/components/ui/icons";

export function ExportButtons() {
  return (
    <div className="flex gap-2">
      <a
        href="/api/export?format=csv"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Export CSV
      </a>
      <a
        href="/api/export?format=json"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Export JSON
      </a>
    </div>
  );
}
