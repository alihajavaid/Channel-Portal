"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client/api";
import { PHASES, checklistProgress, type ChecklistState } from "@/lib/constants/phaseChecklists";
import type { ChannelAccountListItem } from "@/lib/client/channelAccountTypes";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TableSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, InboxIcon } from "@/components/ui/icons";

type Group = "prospect" | "partner";
type SortKey = "company" | "region" | "tier" | "status" | "phase" | "owner";
const TABLE_PAGE_SIZE = 25;

const TIERS = ["Bronze", "Silver", "Gold"] as const;
const STATUSES = ["Active", "OnHold", "Churned"] as const;

function statusLabel(status: string) {
  return status === "OnHold" ? "On Hold" : status;
}

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function ChannelAccountBoard({ group }: { group: Group }) {
  const [view, setView] = useState<"board" | "table">("board");
  const [items, setItems] = useState<ChannelAccountListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tablePage, setTablePage] = useState(1);
  const { showToast } = useToast();
  const confirm = useConfirm();

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
    setSelected(new Set());
    setTablePage(1);
  }

  useEffect(() => {
    load();
    apiJson<{ data?: { id: string; name: string }[] }>("/api/users/options").then(({ ok, data }) => {
      if (ok) setUsers(data.data ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, search, status, tier]);

  function toggleSort(key: SortKey) {
    setTablePage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />;
  }

  const sortedItems = useMemo(() => {
    if (!items || !sortKey) return items;
    const dir = sortDir === "asc" ? 1 : -1;
    const sortValue = (item: ChannelAccountListItem): string | number =>
      sortKey === "owner" ? item.owner.name : (item[sortKey] as string | number);
    return [...items].sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [items, sortKey, sortDir]);

  // Board view needs the full set to distribute across phase columns; only the flat table
  // view is paginated.
  const pagedItems = useMemo(() => {
    if (!sortedItems) return [];
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return sortedItems.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedItems, tablePage]);

  async function movePhase(id: string, newPhase: number) {
    const { ok, data } = await apiJson<{ error?: string }>(`/api/channel-accounts/${id}/phase`, {
      method: "POST",
      body: JSON.stringify({ phase: newPhase }),
    });
    if (!ok) {
      showToast(
        data.error === "forbidden" ? "You don't have permission to move this record there." : "Could not move phase.",
        "error"
      );
      return;
    }
    load();
  }

  async function deleteItem(id: string, company: string) {
    const confirmed = await confirm(`Delete ${company}? This cannot be undone.`, { title: "Delete record" });
    if (!confirmed) return;
    const { ok } = await apiJson(`/api/channel-accounts/${id}`, { method: "DELETE" });
    if (!ok) {
      showToast("Could not delete this record.", "error");
      return;
    }
    showToast(`Deleted ${company}.`);
    load();
  }

  async function deleteSelected() {
    const count = selected.size;
    const confirmed = await confirm(`Delete ${count} selected record${count === 1 ? "" : "s"}? This cannot be undone.`, {
      title: "Delete records",
    });
    if (!confirmed) return;
    const results = await Promise.all(
      Array.from(selected).map((id) => apiJson(`/api/channel-accounts/${id}`, { method: "DELETE" }))
    );
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) showToast(`${failed} of ${count} could not be deleted.`, "error");
    else showToast(`Deleted ${count} record${count === 1 ? "" : "s"}.`);
    load();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!pagedItems) return;
    setSelected((prev) => (prev.size === pagedItems.length ? new Set() : new Set(pagedItems.map((i) => i.id))));
  }

  async function createAccount(formData: FormData) {
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
    const { ok } = await apiJson<{ error?: string }>("/api/channel-accounts", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!ok) {
      showToast("Could not create record. Check the form fields.", "error");
      return;
    }
    showToast(`${label} created.`);
    setShowNewForm(false);
    load();
  }

  const label = group === "prospect" ? "Prospect" : "Partner";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{label}s</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 text-sm ${view === "board" ? "bg-brand text-white" : "text-slate-700 dark:text-slate-300"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-sm ${view === "table" ? "bg-brand text-white" : "text-slate-700 dark:text-slate-300"}`}
            >
              Table
            </button>
          </div>
          {group === "prospect" && (
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
            >
              <PlusIcon className="h-4 w-4" />
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
          className={`${inputClass} min-w-[240px] flex-1`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass}>
          <option value="">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {showNewForm && (
        <form
          action={(fd) => createAccount(fd)}
          className="mb-6 grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <input name="company" placeholder="Company" required className={inputClass} />
          <input name="primaryContact" placeholder="Primary contact" required className={inputClass} />
          <input name="email" type="email" placeholder="Email" required className={inputClass} />
          <input name="region" placeholder="Region" required className={inputClass} />
          <input name="focusArea" placeholder="Focus area" required className={inputClass} />
          <select name="ownerId" required className={inputClass}>
            <option value="">Owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="tier" required className={inputClass}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select name="status" required className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <input name="requestDate" type="date" required className={inputClass} />
          <button type="submit" className="col-span-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90">
            Create
          </button>
        </form>
      )}

      {!sortedItems ? (
        view === "table" ? (
          <TableSkeleton cols={8} />
        ) : (
          <CardGridSkeleton cards={phases.length * 2} />
        )
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <InboxIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">No {label.toLowerCase()}s yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search || status || tier ? "Try clearing your filters." : `${label}s you add will show up here.`}
            </p>
          </div>
        </div>
      ) : view === "board" ? (
        <div className="overflow-x-auto pb-2">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(200px, 1fr))`, minWidth: phases.length * 216 }}>
          {phases.map((p) => {
            const colItems = sortedItems.filter((i) => i.phase === p.phase);
            return (
              <div key={p.phase} className="rounded-md bg-slate-100 p-2 dark:bg-slate-900">
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {p.phase}. {p.name} ({colItems.length})
                </div>
                <div className="space-y-2">
                  {colItems.map((item) => {
                    const progress = checklistProgress(item.checklistState as unknown as ChecklistState, item.phase);
                    return (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <Link href={`/${group}s/${item.id}`} className="font-medium text-slate-900 hover:text-brand hover:underline dark:text-slate-100">
                          {item.company}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.tier} · {statusLabel(item.status)}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Checklist: {progress.checked}/{progress.total}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {p.phase > 1 && (
                            <button
                              onClick={() => movePhase(item.id, p.phase - 1)}
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              ← Back
                            </button>
                          )}
                          {p.phase < 9 && (
                            <button
                              onClick={() => movePhase(item.id, p.phase + 1)}
                              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Advance →
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem(item.id, item.company)}
                            aria-label={`Delete ${item.company}`}
                            className="ml-auto rounded border border-slate-300 p-1 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950/40"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : (
        <div>
          {selected.size > 0 && (
            <div className="mb-2 flex items-center justify-between rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-sm dark:bg-brand/10">
              <span className="text-slate-700 dark:text-slate-300">{selected.size} selected</span>
              <button
                onClick={deleteSelected}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete selected
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.size === pagedItems.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  {(
                    [
                      ["company", "Company"],
                      ["region", "Region"],
                      ["tier", "Tier"],
                      ["status", "Status"],
                      ["phase", "Phase"],
                      ["owner", "Owner"],
                    ] as [SortKey, string][]
                  ).map(([key, headerLabel]) => (
                    <th key={key} className="px-3 py-2">
                      <button
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {headerLabel}
                        {sortIcon(key)}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Progress</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => {
                  const progress = checklistProgress(item.checklistState as unknown as ChecklistState, item.phase);
                  const phaseDef = phases.find((p) => p.phase === item.phase);
                  return (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Select ${item.company}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/${group}s/${item.id}`} className="font-medium text-slate-900 hover:text-brand hover:underline dark:text-slate-100">
                          {item.company}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.region}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.tier}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{statusLabel(item.status)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {phaseDef ? `${phaseDef.phase}. ${phaseDef.name}` : item.phase}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.owner.name}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.primaryContact}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{progress.checked}/{progress.total}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteItem(item.id, item.company)}
                          aria-label={`Delete ${item.company}`}
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={tablePage} pageSize={TABLE_PAGE_SIZE} total={sortedItems.length} onPageChange={setTablePage} />
        </div>
      )}
    </div>
  );
}
