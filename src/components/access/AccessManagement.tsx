"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client/api";
import { MODULE_KEYS, type ModuleKey } from "@/lib/constants/modules";
import { ROLE_TEMPLATES } from "@/lib/constants/roleTemplates";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
} & Record<ModuleKey, boolean>;

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  prospects: "Prospects",
  partners: "Partners",
  customers: "Customers",
  deliverables: "Deliverables",
  access: "Access",
};

function emptyPermState(): Record<ModuleKey, boolean> {
  return { dashboard: false, prospects: false, partners: false, customers: false, deliverables: false, access: false };
}

export function AccessManagement() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [permState, setPermState] = useState<Record<ModuleKey, boolean>>(emptyPermState());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const { ok, data } = await apiJson<{ data?: UserRow[] }>("/api/users");
    if (ok) setUsers(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function applyTemplate(templateKey: string) {
    const template = ROLE_TEMPLATES.find((t) => t.key === templateKey);
    if (template) setPermState(template.permissions);
  }

  async function createUser(formData: FormData) {
    setError(null);
    setNotice(null);
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
      setError(data.error === "email_in_use" ? "That email is already in use." : "Could not create user.");
      return;
    }
    setShowNewForm(false);
    setPermState(emptyPermState());
    load();
  }

  async function saveEdit(formData: FormData) {
    if (!editing) return;
    setError(null);
    setNotice(null);
    const body = { name: formData.get("name"), role: formData.get("role"), ...permState };
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!ok) {
      setError(data.error === "last_admin" ? "You can't remove the last remaining Admin's access." : "Could not save changes.");
      return;
    }
    setEditing(null);
    load();
  }

  async function removeUser(user: UserRow) {
    if (!confirm(`Remove ${user.name}?`)) return;
    setError(null);
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${user.id}`, { method: "DELETE" });
    if (!ok) {
      if (data.error === "last_admin") setError("You can't remove the last remaining Admin.");
      else if (data.error === "user_has_owned_records") setError(`${user.name} still owns prospects, partners, customers, or deliverables — reassign them first.`);
      else setError("Could not remove this user.");
      return;
    }
    load();
  }

  async function sendCredentials(user: UserRow) {
    setError(null);
    setNotice(null);
    const { ok, data } = await apiJson<{ error?: string }>(`/api/users/${user.id}/send-credentials`, {
      method: "POST",
    });
    if (!ok) {
      setError(
        data.error === "email_not_configured"
          ? "Email isn't configured yet (no RESEND_API_KEY set) — credentials were not sent."
          : "Could not send credentials."
      );
      return;
    }
    setNotice(`Credentials sent to ${user.email}.`);
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
        <h1 className="text-2xl font-semibold text-slate-900">Access Management</h1>
        <button
          onClick={() => {
            setShowNewForm((v) => !v);
            setEditing(null);
            setPermState(emptyPermState());
          }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          New User
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      {(showNewForm || formUser) && (
        <form
          action={(fd) => (formUser ? saveEdit(fd) : createUser(fd))}
          className="space-y-3 rounded-md border border-slate-200 bg-white p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              name="name"
              placeholder="Full name"
              defaultValue={formUser?.name}
              required
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            {!formUser && (
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            )}
            <input
              name="role"
              placeholder="Role (e.g. Channel, Sales, Admin)"
              defaultValue={formUser?.role}
              required
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <select onChange={(e) => applyTemplate(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
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
              <span className="text-xs font-medium uppercase text-slate-500">Permissions</span>
              <button
                type="button"
                onClick={() => setPermState({ dashboard: true, prospects: true, partners: true, customers: true, deliverables: true, access: true })}
                className="text-xs text-slate-600 hover:underline"
              >
                Grant all access
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {MODULE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-sm">
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
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              {formUser ? "Save" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setEditing(null);
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!users ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Permissions</th>
                <th className="px-3 py-2">MFA</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">
                    {MODULE_KEYS.filter((k) => u[k]).map((k) => MODULE_LABELS[k]).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">{u.mfaEnabled ? "Enabled" : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(u)} className="text-slate-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => sendCredentials(u)} className="text-slate-600 hover:underline">
                        Send credentials
                      </button>
                      <button onClick={() => removeUser(u)} className="text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
