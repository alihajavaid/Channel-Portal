"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client/api";
import { MODULE_KEYS, type ModuleKey } from "@/lib/constants/modules";
import { ROLE_TEMPLATES } from "@/lib/constants/roleTemplates";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { PlusIcon, TrashIcon, PencilIcon, MailIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, InboxIcon } from "@/components/ui/icons";

const PAGE_SIZE = 25;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
} & Record<ModuleKey, boolean>;

type SortKey = "name" | "email" | "role";

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  prospects: "Prospects",
  partners: "Partners",
  customers: "Customers",
  access: "Access",
};

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function emptyPermState(): Record<ModuleKey, boolean> {
  return { dashboard: false, prospects: false, partners: false, customers: false, access: false };
}

export function AccessManagement() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [permState, setPermState] = useState<Record<ModuleKey, boolean>>(emptyPermState());
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function load() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortKey,
      sortDir,
    });
    const { ok, data } = await apiJson<{ data?: UserRow[]; total?: number }>(`/api/users?${params.toString()}`);
    if (ok) {
      setUsers(data.data ?? []);
      setTotal(data.total ?? 0);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortDir]);

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

  function applyTemplate(templateKey: string) {
    const template = ROLE_TEMPLATES.find((t) => t.key === templateKey);
    if (template) setPermState(template.permissions);
  }

  async function createUser(formData: FormData) {
    const body = {
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      ...permState,
    };
    const { ok, data } = await apiJson<{ error?: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!ok) {
      showToast(data.error === "email_in_use" ? "That email is already in use." : "Could not create user.", "error");
      return;
    }
    showToast(`${body.name} added.`);
    setShowNewForm(false);
    setPermState(emptyPermState());
    load();
  }

  async function saveEdit(formData: FormData) {
    if (!editing) return;
    const body = { name: formData.get("name"), role: formData.get("role"), ...permState };
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!ok) {
      showToast(
        data.error === "last_admin" ? "You can't remove the last remaining Admin's access." : "Could not save changes.",
        "error"
      );
      return;
    }
    showToast("Changes saved.");
    setEditing(null);
    load();
  }

  async function removeUser(user: UserRow) {
    const confirmed = await confirm(`Remove ${user.name}?`, { title: "Remove user" });
    if (!confirmed) return;
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${user.id}`, { method: "DELETE" });
    if (!ok) {
      if (data.error === "last_admin") showToast("You can't remove the last remaining Admin.", "error");
      else if (data.error === "user_has_owned_records")
        showToast(`${user.name} still owns prospects, partners, or customers — reassign them first.`, "error");
      else showToast("Could not remove this user.", "error");
      return;
    }
    showToast(`Removed ${user.name}.`);
    load();
  }

  async function sendCredentials(user: UserRow) {
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${user.id}/send-credentials`, {
      method: "POST",
    });
    if (!ok) {
      showToast(
        data.error === "email_not_configured"
          ? "Email isn't configured yet (no RESEND_API_KEY set) — credentials were not sent."
          : "Could not send credentials.",
        "error"
      );
      return;
    }
    showToast(`Credentials sent to ${user.email}.`);
  }

  function startEdit(user: UserRow) {
    setEditing(user);
    setShowNewForm(false);
    setPermState(Object.fromEntries(MODULE_KEYS.map((k) => [k, user[k]])) as Record<ModuleKey, boolean>);
  }

  const formUser = editing;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Access Management</h1>
        <button
          onClick={() => {
            setShowNewForm((v) => !v);
            setEditing(null);
            setPermState(emptyPermState());
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
        >
          <PlusIcon className="h-4 w-4" />
          New User
        </button>
      </div>

      {(showNewForm || formUser) && (
        <form
          action={(fd) => (formUser ? saveEdit(fd) : createUser(fd))}
          className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Full name" defaultValue={formUser?.name} required className={inputClass} />
            {!formUser && <input name="email" type="email" placeholder="Email" required className={inputClass} />}
            <input
              name="role"
              placeholder="Role (e.g. Channel, Sales, Admin)"
              defaultValue={formUser?.role}
              required
              className={inputClass}
            />
            <select onChange={(e) => applyTemplate(e.target.value)} className={inputClass}>
              <option value="">Apply role template…</option>
              {ROLE_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Permissions</span>
              <button
                type="button"
                onClick={() => setPermState({ dashboard: true, prospects: true, partners: true, customers: true, access: true })}
                className="text-xs text-brand hover:underline"
              >
                Grant all access
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {MODULE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={permState[key]}
                    onChange={(e) => setPermState((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {MODULE_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90">
              {formUser ? "Save" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setEditing(null);
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!users ? (
        <TableSkeleton cols={6} />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <InboxIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-700 dark:text-slate-300">No users yet</p>
        </div>
      ) : (
        <div>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                {(
                  [
                    ["name", "Name"],
                    ["email", "Email"],
                    ["role", "Role"],
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
                <th className="px-3 py-2">Permissions</th>
                <th className="px-3 py-2">MFA</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{u.name}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.email}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.role}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {MODULE_KEYS.filter((k) => u[k]).map((k) => MODULE_LABELS[k]).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.mfaEnabled ? "Enabled" : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        aria-label={`Edit ${u.name}`}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => sendCredentials(u)}
                        aria-label={`Send credentials to ${u.name}`}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <MailIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        aria-label={`Remove ${u.name}`}
                        className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
