"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/client/api";
import { healthLabel, statusLabel, type CustomerListItem } from "@/lib/client/customerTypes";
import { DocumentList } from "@/components/documents/DocumentList";

const HEALTHS = ["Healthy", "NeedsAttention", "Critical"] as const;
const STATUSES = ["Active", "Renewed", "AtRisk", "Churned"] as const;

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
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const { ok } = await apiJson(`/api/customers/${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({ health, status, plan, notes }),
    });
    if (!ok) setError("Could not save changes.");
  }

  async function remove() {
    if (!confirm(`Delete ${record.company}? This cannot be undone.`)) return;
    const { ok } = await apiJson(`/api/customers/${record.id}`, { method: "DELETE" });
    if (ok) router.push("/customers");
    else setError("Could not delete this customer.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{record.company}</h1>
        <p className="text-sm text-slate-500">
          {record.primaryContact} · {record.email} · CSM: {record.csmOwner.name}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid max-w-2xl grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Plan</label>
          <input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Account Health</label>
          <select
            value={health}
            onChange={(e) => setHealth(e.target.value as typeof health)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {HEALTHS.map((h) => (
              <option key={h} value={h}>
                {healthLabel(h)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Renewal date</label>
          <input
            disabled
            value={new Date(record.renewalDate).toLocaleDateString()}
            className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={save} className="col-span-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
          Save
        </button>
      </div>

      <DocumentList attachedTo={{ type: "customer", id: record.id }} initialDocuments={record.documents} />

      <button onClick={remove} className="text-sm text-red-600 hover:underline">
        Delete this customer
      </button>
    </div>
  );
}
