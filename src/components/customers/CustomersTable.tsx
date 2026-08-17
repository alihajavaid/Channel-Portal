"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client/api";
import { healthLabel, statusLabel, renewalAlert, type CustomerListItem } from "@/lib/client/customerTypes";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, InboxIcon } from "@/components/ui/icons";

const HEALTHS = ["Healthy", "NeedsAttention", "Critical"] as const;
const STATUSES = ["Active", "Renewed", "AtRisk", "Churned"] as const;
type SortKey = "company" | "plan" | "health" | "status" | "renewalDate" | "csmOwner";
const PAGE_SIZE = 25;

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function CustomersTable() {
  const [items, setItems] = useState<CustomerListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState("");
  const [status, setStatus] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function load() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortKey,
      sortDir,
    });
    if (search) params.set("search", search);
    if (health) params.set("health", health);
    if (status) params.set("status", status);
    const { ok, data } = await apiJson<{ data?: CustomerListItem[]; total?: number }>(
      `/api/customers?${params.toString()}`
    );
    if (ok) {
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
    }
    setSelected(new Set());
  }

  useEffect(() => {
    load();
    apiJson<{ data?: { id: string; name: string }[] }>("/api/users/options").then(({ ok, data }) => {
      if (ok) setUsers(data.data ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, health, status, page, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, health, status]);

  function toggleSort(key: SortKey) {
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

  async function deleteItem(id: string, company: string) {
    const confirmed = await confirm(`Delete ${company}? This cannot be undone.`, { title: "Delete customer" });
    if (!confirmed) return;
    const { ok } = await apiJson(`/api/customers/${id}`, { method: "DELETE" });
    if (!ok) {
      showToast("Could not delete this customer.", "error");
      return;
    }
    showToast(`Deleted ${company}.`);
    load();
  }

  async function deleteSelected() {
    const count = selected.size;
    const confirmed = await confirm(`Delete ${count} selected customer${count === 1 ? "" : "s"}? This cannot be undone.`, {
      title: "Delete customers",
    });
    if (!confirmed) return;
    const results = await Promise.all(Array.from(selected).map((id) => apiJson(`/api/customers/${id}`, { method: "DELETE" })));
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) showToast(`${failed} of ${count} could not be deleted.`, "error");
    else showToast(`Deleted ${count} customer${count === 1 ? "" : "s"}.`);
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
    if (!items) return;
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function createCustomer(formData: FormData) {
    const body = {
      company: formData.get("company"),
      primaryContact: formData.get("primaryContact"),
      email: formData.get("email"),
      plan: formData.get("plan"),
      csmOwnerId: formData.get("csmOwnerId"),
      health: formData.get("health"),
      status: formData.get("status"),
      renewalDate: formData.get("renewalDate"),
    };
    const { ok } = await apiJson("/api/customers", { method: "POST", body: JSON.stringify(body) });
    if (!ok) {
      showToast("Could not create customer. Check the form fields.", "error");
      return;
    }
    showToast("Customer created.");
    setShowNewForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Customers</h1>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
        >
          <PlusIcon className="h-4 w-4" />
          New Customer
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} min-w-[240px] flex-1`}
        />
        <select value={health} onChange={(e) => setHealth(e.target.value)} className={inputClass}>
          <option value="">All health</option>
          {HEALTHS.map((h) => (
            <option key={h} value={h}>
              {healthLabel(h)}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {showNewForm && (
        <form
          action={(fd) => createCustomer(fd)}
          className="mb-6 grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <input name="company" placeholder="Company" required className={inputClass} />
          <input name="primaryContact" placeholder="Primary contact" required className={inputClass} />
          <input name="email" type="email" placeholder="Email" required className={inputClass} />
          <input name="plan" placeholder="Plan" required className={inputClass} />
          <select name="csmOwnerId" required className={inputClass}>
            <option value="">CSM owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="health" required className={inputClass}>
            {HEALTHS.map((h) => (
              <option key={h} value={h}>
                {healthLabel(h)}
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
          <input name="renewalDate" type="date" required className={inputClass} />
          <button type="submit" className="col-span-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90">
            Create
          </button>
        </form>
      )}

      {!items ? (
        <TableSkeleton cols={7} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <InboxIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">No customers yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search || health || status ? "Try clearing your filters." : "Customers you add will show up here."}
            </p>
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
                      checked={selected.size === items.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  {(
                    [
                      ["company", "Company"],
                      ["plan", "Plan"],
                      ["health", "Account Health"],
                      ["status", "Status"],
                      ["renewalDate", "Renewal"],
                      ["csmOwner", "CSM Owner"],
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
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const alert = renewalAlert(item.renewalDate);
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
                        <Link href={`/customers/${item.id}`} className="font-medium text-slate-900 hover:text-brand hover:underline dark:text-slate-100">
                          {item.company}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.plan}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{healthLabel(item.health)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{statusLabel(item.status)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {new Date(item.renewalDate).toLocaleDateString()}
                        {alert === "overdue" && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                            Overdue
                          </span>
                        )}
                        {alert === "soon" && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            Renewal soon
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.csmOwner.name}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.primaryContact}</td>
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
