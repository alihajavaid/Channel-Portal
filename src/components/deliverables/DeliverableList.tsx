"use client";

import { useState } from "react";
import { apiJson } from "@/lib/client/api";

type Task = { id: string; label: string; done: boolean; orderIndex: number };
type Deliverable = {
  id: string;
  name: string;
  description: string;
  link: string;
  owner: { id: string; name: string };
  tasks: Task[];
  status: "Not started" | "In progress" | "Up to date";
  lastUpdated: string;
  progress: { done: number; total: number };
};

const STATUS_STYLES: Record<Deliverable["status"], string> = {
  "Not started": "bg-slate-100 text-slate-600",
  "In progress": "bg-amber-100 text-amber-700",
  "Up to date": "bg-emerald-100 text-emerald-700",
};

export function DeliverableList({ initialDeliverables }: { initialDeliverables: Deliverable[] }) {
  const [deliverables, setDeliverables] = useState(initialDeliverables);

  async function toggle(deliverableId: string, taskId: string, done: boolean) {
    const { ok } = await apiJson(`/api/deliverables/${deliverableId}/tasks/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ done }),
    });
    if (!ok) return;
    setDeliverables((prev) =>
      prev.map((d) => {
        if (d.id !== deliverableId) return d;
        const tasks = d.tasks.map((t) => (t.id === taskId ? { ...t, done } : t));
        const doneCount = tasks.filter((t) => t.done).length;
        const status: Deliverable["status"] =
          doneCount === 0 ? "Not started" : doneCount === tasks.length ? "Up to date" : "In progress";
        return { ...d, tasks, status, progress: { done: doneCount, total: tasks.length } };
      })
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Deliverables</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {deliverables.map((d) => (
          <div key={d.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-medium text-slate-900">{d.name}</h2>
                <p className="text-xs text-slate-500">{d.description}</p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                {d.status}
              </span>
            </div>
            <div className="mb-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${(d.progress.done / d.progress.total) * 100}%` }}
              />
            </div>
            <ul className="mb-2 space-y-1">
              {d.tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) => toggle(d.id, t.id, e.target.checked)}
                    id={`task-${t.id}`}
                  />
                  <label htmlFor={`task-${t.id}`}>{t.label}</label>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <a href={d.link} target="_blank" rel="noreferrer" className="hover:underline">
                External register
              </a>
              <span>
                Owner: {d.owner.name} · Updated {new Date(d.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
