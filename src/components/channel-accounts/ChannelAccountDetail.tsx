"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/client/api";
import { PHASE_BY_NUMBER, type ChecklistState } from "@/lib/constants/phaseChecklists";
import { DocumentList } from "@/components/documents/DocumentList";
import type { ChannelAccountListItem } from "@/lib/client/channelAccountTypes";

type Document = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: { name: string };
};

type Props = {
  record: ChannelAccountListItem & { documents: Document[] };
  group: "prospect" | "partner";
};

export function ChannelAccountDetail({ record, group }: Props) {
  const router = useRouter();
  const [checklist, setChecklist] = useState(record.checklistState as unknown as ChecklistState);
  const [notes, setNotes] = useState(record.notes ?? "");
  const [satisfaction, setSatisfaction] = useState(record.satisfaction ?? "");
  const [opportunities, setOpportunities] = useState(record.opportunitiesGenerated ?? "");
  const [error, setError] = useState<string | null>(null);
  const phaseDef = PHASE_BY_NUMBER.get(record.phase);

  async function toggleItem(itemKey: string, done: boolean) {
    setError(null);
    const { ok, data } = await apiJson<{ data?: { checklistState: unknown } }>(
      `/api/channel-accounts/${record.id}/checklist`,
      { method: "POST", body: JSON.stringify({ phase: record.phase, itemKey, done }) }
    );
    if (!ok) {
      setError("Could not update checklist item.");
      return;
    }
    setChecklist(data.data!.checklistState as ChecklistState);
  }

  async function saveDetails() {
    setError(null);
    const body: Record<string, unknown> = { notes };
    if (record.phase === 9) {
      body.satisfaction = satisfaction === "" ? null : Number(satisfaction);
      body.opportunitiesGenerated = opportunities === "" ? null : Number(opportunities);
    }
    const { ok } = await apiJson(`/api/channel-accounts/${record.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!ok) setError("Could not save changes.");
  }

  async function deleteRecord() {
    if (!confirm(`Delete ${record.company}? This cannot be undone.`)) return;
    const { ok } = await apiJson(`/api/channel-accounts/${record.id}`, { method: "DELETE" });
    if (ok) router.push(`/${group}s`);
    else setError("Could not delete this record.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{record.company}</h1>
        <p className="text-sm text-slate-500">
          {record.primaryContact} · {record.email} · {record.region} · Owner: {record.owner.name}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {phaseDef && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-medium text-slate-900">
            Phase {phaseDef.phase}: {phaseDef.name}
          </h2>
          <ul className="space-y-2">
            {phaseDef.items.map((item) => {
              const isDone = Boolean(checklist[String(record.phase)]?.[item.key]?.done);
              return (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(e) => toggleItem(item.key, e.target.checked)}
                    id={`item-${item.key}`}
                  />
                  <label htmlFor={`item-${item.key}`}>{item.label}</label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {record.phase === 9 && (
        <div className="grid max-w-sm grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Satisfaction (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={satisfaction}
              onChange={(e) => setSatisfaction(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Opportunities generated</label>
            <input
              type="number"
              min={0}
              value={opportunities}
              onChange={(e) => setOpportunities(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={saveDetails}
          className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Save
        </button>
      </div>

      <DocumentList
        attachedTo={{ type: "channelAccount", id: record.id }}
        initialDocuments={record.documents}
      />

      <button onClick={deleteRecord} className="text-sm text-red-600 hover:underline">
        Delete this record
      </button>
    </div>
  );
}
