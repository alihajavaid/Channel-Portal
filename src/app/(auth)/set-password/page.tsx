"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client/api";

export default function SetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const { ok, data } = await apiJson<{ status?: string; error?: string; issues?: { message: string }[] }>(
        "/api/auth/set-password",
        { method: "POST", body: JSON.stringify({ newPassword }) }
      );

      if (!ok) {
        setError(data.issues?.[0]?.message ?? "Could not set password. Please log in again.");
        if (data.error === "no_active_bridge") router.push("/login");
        return;
      }

      switch (data.status) {
        case "mfa_enroll":
          router.push("/mfa/enroll");
          break;
        case "mfa_verify":
          router.push("/mfa/verify");
          break;
        default:
          router.push("/dashboard");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Set a new password</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Your account requires a new password before continuing.
      </p>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        At least 8 characters, with a letter, a number, and a special character.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
