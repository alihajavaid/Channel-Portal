"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client/api";

export default function MfaVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { ok, status, data } = await apiJson<{ error?: string; retryAt?: string }>(
        "/api/auth/mfa/verify",
        { method: "POST", body: JSON.stringify({ code }) }
      );
      if (!ok) {
        if (status === 423 && data.retryAt) {
          setError(`Too many failed attempts. Try again after ${new Date(data.retryAt).toLocaleTimeString()}.`);
        } else {
          setError("That code didn't work.");
        }
        return;
      }
      router.push("/dashboard");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Two-factor verification</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enter the 6-digit code from your authenticator app, or one of your recovery codes.
      </p>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Code
        </label>
        <input
          id="code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-widest text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
      >
        {pending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
