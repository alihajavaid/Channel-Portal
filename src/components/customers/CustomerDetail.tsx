"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/client/api";
import { healthLabel, statusLabel, type CustomerListItem } from "@/lib/client/customerTypes";
import { DocumentList } from "@/components/documents/DocumentList";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const HEALTHS = ["Healthy", "NeedsAttention", "Critical"] as const;
const STATUSES = ["Active", "Renewed", "AtRisk", "Churned"] as const;
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400";

type Document = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: { name: string };
};

export function CustomerDetail({ record }: { record: CustomerListItem & { documents: Document[] } }) {
  const router = useRouter();
  const [health, setHealth] = useState(record.health);
  const [status, setStatus] = useState(record.status);
  const [plan, setPlan] = useState(record.plan);
  const [notes, setNotes] = useState(record.notes ?? "");
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function save() {
    const { ok } = await apiJson(`/api/customers/${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({ health, status, plan, notes }),
    });
    if (!ok) showToast("Could not save changes.", "error");
    else showToast("Changes saved.");
  }

  async function remove() {
    const confirmed = await confirm(`Delete ${record.company}? This cannot be undone.`, { title: "Delete customer" });
    if (!confirmed) return;
    const { ok } = await apiJson(`/api/customers/${record.id}`, { method: "DELETE" });
    if (ok) router.push("/customers");
    else showToast("Could not delete this customer.", "error");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{record.company}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {record.primaryContact} · {record.email} · CSM: {record.csmOwner.name}
        </p>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className={labelClass}>Plan</label>
          <input value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Account Health</label>
          <select value={health} onChange={(e) => setHealth(e.target.value as typeof health)} className={inputClass}>
            {HEALTHS.map((h) => (
              <option key={h} value={h}>
                {healthLabel(h)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Renewal date</label>
          <input
            disabled
            value={new Date(record.renewalDate).toLocaleDateString()}
            className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={`${inputClass} px-3 py-2`}
          />
        </div>
        <button onClick={save} className="col-span-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90">
          Save
        </button>
      </div>

      <DocumentList attachedTo={{ type: "customer", id: record.id }} initialDocuments={record.documents} />

      <button onClick={remove} className="text-sm text-red-600 hover:underline dark:text-red-400">
        Delete this customer
      </button>
    </div>
  );
}
