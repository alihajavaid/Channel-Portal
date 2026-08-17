"use client";

import { useState } from "react";
import { apiJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";
const cardClass = "rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";

export function AccountSettings({
  name,
  email,
  role,
  mfaEnabled,
}: {
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
}) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const { ok, data } = await apiJson<{ error?: string; issues?: { message: string }[] }>(
        "/api/account/password",
        { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }
      );
      if (!ok) {
        showToast(
          data.error === "invalid_current_password"
            ? "Your current password is incorrect."
            : data.issues?.[0]?.message ?? "Could not change your password.",
          "error"
        );
        return;
      }
      showToast("Password changed. Your other sessions have been signed out.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  }

  async function onRegenerateCodes(e: React.FormEvent) {
    e.preventDefault();
    setRegenerating(true);
    try {
      const { ok, data } = await apiJson<{ recoveryCodes?: string[]; error?: string }>(
        "/api/account/mfa/recovery-codes",
        { method: "POST", body: JSON.stringify({ currentPassword: recoveryPassword }) }
      );
      if (!ok) {
        showToast(
          data.error === "invalid_current_password" ? "Your current password is incorrect." : "Could not regenerate codes.",
          "error"
        );
        return;
      }
      setRecoveryCodes(data.recoveryCodes ?? []);
      setRecoveryPassword("");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Account Settings</h1>

      <div className={cardClass}>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-slate-100">Profile</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="text-slate-900 dark:text-slate-100">{name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="text-slate-900 dark:text-slate-100">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Role</dt>
            <dd className="text-slate-900 dark:text-slate-100">{role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Two-factor authentication</dt>
            <dd className="text-slate-900 dark:text-slate-100">{mfaEnabled ? "Enabled" : "Not enabled"}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={onChangePassword} className={`${cardClass} space-y-3`}>
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Change password</h2>
        <div>
          <label className={labelClass}>Current password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          At least 8 characters, with a letter, a number, and a special character. Changing your
          password signs out any other active sessions.
        </p>
        <button
          type="submit"
          disabled={changingPassword}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {changingPassword ? "Saving…" : "Change password"}
        </button>
      </form>

      {mfaEnabled && (
        <div className={cardClass}>
          <h2 className="mb-1 font-medium text-slate-900 dark:text-slate-100">Recovery codes</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Lost your recovery codes? Enter your password to generate a fresh set — this invalidates
            any codes issued before.
          </p>
          {recoveryCodes ? (
            <div className="space-y-3">
              <ul className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                {recoveryCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <button
                onClick={() => setRecoveryCodes(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                I&apos;ve saved these codes
              </button>
            </div>
          ) : (
            <form onSubmit={onRegenerateCodes} className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Current password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={regenerating}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {regenerating ? "Generating…" : "Regenerate codes"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
