"use client";

export function ExportButtons() {
  return (
    <div className="flex gap-2">
      <a href="/api/export?format=csv" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
        Export CSV
      </a>
      <a href="/api/export?format=json" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
        Export JSON
      </a>
    </div>
  );
}
