"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client/api";
import { PHASES, checklistProgress, type ChecklistState } from "@/lib/constants/phaseChecklists";
import type { ChannelAccountListItem } from "@/lib/client/channelAccountTypes";

type Group = "prospect" | "partner";

const TIERS = ["Bronze", "Silver", "Gold"] as const;
const STATUSES = ["Active", "OnHold", "Churned"] as const;

function statusLabel(status: string) {
  return status === "OnHold" ? "On Hold" : status;
}

export function ChannelAccountBoard({ group }: { group: Group }) {
  const [view, setView] = useState<"board" | "table">("board");
  const [items, setItems] = useState<ChannelAccountListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const phases = useMemo(
    () => PHASES.filter((p) => (group === "prospect" ? p.phase <= 3 : p.phase >= 4)),
    [group]
  );

  async function load() {
    const params = new URLSearchParams({ group });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (tier) params.set("tier", tier);
    const { ok, data } = await apiJson<{ data?: ChannelAccountListItem[] }>(
      `/api/channel-accounts?${params.toString()}`
    );
    if (ok) setItems(data.data ?? []);
  }

  useEffect(() => {
    load();
    apiJson<{ data?: { id: string; name: string }[] }>("/api/users/options").then(({ ok, data }) => {
      if (ok) setUsers(data.data ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, search, status, tier]);

  async function movePhase(id: string, newPhase: number) {
    setError(null);
    const { ok, data } = await apiJson<{ error?: string }>(`/api/channel-accounts/${id}/phase`, {
      method: "POST",
      body: JSON.stringify({ phase: newPhase }),
    });
    if (!ok) {
      setError(data.error === "forbidden" ? "You don't have permission to move this record there." : "Could not move phase.");
      return;
    }
    load();
  }

  async function createAccount(formData: FormData) {
    setError(null);
    const body = {
      company: formData.get("company"),
      primaryContact: formData.get("primaryContact"),
      email: formData.get("email"),
      region: formData.get("region"),
      focusArea: formData.get("focusArea"),
      ownerId: formData.get("ownerId"),
      tier: formData.get("tier"),
      status: formData.get("status"),
      requestDate: formData.get("requestDate"),
    };
    const { ok, data } = await apiJson<{ error?: string }>("/api/channel-accounts", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!ok) {
      setError("Could not create record. Check the form fields.");
      return;
    }
    setShowNewForm(false);
    load();
  }

  const label = group === "prospect" ? "Prospect" : "Partner";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{label}s</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-300 bg-white">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 text-sm ${view === "board" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-sm ${view === "table" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Table
            </button>
          </div>
          {group === "prospect" && (
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              New Prospect
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {showNewForm && (
        <form
          action={(fd) => createAccount(fd)}
          className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-4"
        >
          <input name="company" placeholder="Company" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="primaryContact" placeholder="Primary contact" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="email" type="email" placeholder="Email" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="region" placeholder="Region" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="focusArea" placeholder="Focus area" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <select name="ownerId" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="tier" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select name="status" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <input name="requestDate" type="date" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
            Create
          </button>
        </form>
      )}

      {!items ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : view === "board" ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(200px, 1fr))` }}>
          {phases.map((p) => {
            const colItems = items.filter((i) => i.phase === p.phase);
            return (
              <div key={p.phase} className="rounded-md bg-slate-100 p-2">
                <div className="mb-2 px-1 text-xs font-semibold uppercase text-slate-500">
                  {p.phase}. {p.name} ({colItems.length})
                </div>
                <div className="space-y-2">
                  {colItems.map((item) => {
                    const progress = checklistProgress(item.checklistState as unknown as ChecklistState, item.phase);
                    return (
                      <div key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                        <Link href={`/${group}s/${item.id}`} className="font-medium text-slate-900 hover:underline">
                          {item.company}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{item.tier} · {statusLabel(item.status)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Checklist: {progress.checked}/{progress.total}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {p.phase > 1 && (
                            <button
                              onClick={() => movePhase(item.id, p.phase - 1)}
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                            >
                              ← Back
                            </button>
                          )}
                          {p.phase < 9 && (
                            <button
                              onClick={() => movePhase(item.id, p.phase + 1)}
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                            >
                              Advance →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const progress = checklistProgress(item.checklistState as unknown as ChecklistState, item.phase);
                const phaseDef = phases.find((p) => p.phase === item.phase);
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link href={`/${group}s/${item.id}`} className="font-medium text-slate-900 hover:underline">
                        {item.company}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item.primaryContact}</td>
                    <td className="px-3 py-2">{item.region}</td>
                    <td className="px-3 py-2">{item.tier}</td>
                    <td className="px-3 py-2">{statusLabel(item.status)}</td>
                    <td className="px-3 py-2">{phaseDef ? `${phaseDef.phase}. ${phaseDef.name}` : item.phase}</td>
                    <td className="px-3 py-2">{progress.checked}/{progress.total}</td>
                    <td className="px-3 py-2">{item.owner.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
