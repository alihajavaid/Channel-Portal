"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client/api";
import { healthLabel, statusLabel, renewalAlert, type CustomerListItem } from "@/lib/client/customerTypes";

const HEALTHS = ["Healthy", "NeedsAttention", "Critical"] as const;
const STATUSES = ["Active", "Renewed", "AtRisk", "Churned"] as const;

export function CustomersTable() {
  const [items, setItems] = useState<CustomerListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState("");
  const [status, setStatus] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (health) params.set("health", health);
    if (status) params.set("status", status);
    const { ok, data } = await apiJson<{ data?: CustomerListItem[] }>(`/api/customers?${params.toString()}`);
    if (ok) setItems(data.data ?? []);
  }

  useEffect(() => {
    load();
    apiJson<{ data?: { id: string; name: string }[] }>("/api/users/options").then(({ ok, data }) => {
      if (ok) setUsers(data.data ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, health, status]);

  async function createCustomer(formData: FormData) {
    setError(null);
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
      setError("Could not create customer. Check the form fields.");
      return;
    }
    setShowNewForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          New Customer
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select value={health} onChange={(e) => setHealth(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">All health</option>
          {HEALTHS.map((h) => (
            <option key={h} value={h}>
              {healthLabel(h)}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {showNewForm && (
        <form
          action={(fd) => createCustomer(fd)}
          className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-4"
        >
          <input name="company" placeholder="Company" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="primaryContact" placeholder="Primary contact" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="email" type="email" placeholder="Email" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="plan" placeholder="Plan" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <select name="csmOwnerId" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">CSM owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="health" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {HEALTHS.map((h) => (
              <option key={h} value={h}>
                {healthLabel(h)}
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
          <input name="renewalDate" type="date" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
            Create
          </button>
        </form>
      )}

      {!items ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Account Health</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Renewal</th>
                <th className="px-3 py-2">CSM Owner</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const alert = renewalAlert(item.renewalDate);
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link href={`/customers/${item.id}`} className="font-medium text-slate-900 hover:underline">
                        {item.company}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item.primaryContact}</td>
                    <td className="px-3 py-2">{item.plan}</td>
                    <td className="px-3 py-2">{healthLabel(item.health)}</td>
                    <td className="px-3 py-2">{statusLabel(item.status)}</td>
                    <td className="px-3 py-2">
                      {new Date(item.renewalDate).toLocaleDateString()}
                      {alert === "overdue" && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          Overdue
                        </span>
                      )}
                      {alert === "soon" && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          Renewal soon
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.csmOwner.name}</td>
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
