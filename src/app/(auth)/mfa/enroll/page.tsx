"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client/api";

export default function MfaEnrollPage() {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    apiJson<{ qrDataUrl?: string; manualEntryKey?: string; error?: string }>("/api/auth/mfa/enroll", {
      method: "POST",
    }).then(({ ok, data }) => {
      if (!ok) {
        router.push("/login");
        return;
      }
      setQrDataUrl(data.qrDataUrl ?? null);
      setManualEntryKey(data.manualEntryKey ?? null);
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { ok, data } = await apiJson<{ recoveryCodes?: string[]; error?: string }>(
        "/api/auth/mfa/enroll/confirm",
        { method: "POST", body: JSON.stringify({ code }) }
      );
      if (!ok) {
        setError("That code didn't work. Check your authenticator app and try again.");
        return;
      }
      setRecoveryCodes(data.recoveryCodes ?? []);
    } finally {
      setPending(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Save your recovery codes</h1>
        <p className="text-sm text-slate-600">
          Each code can be used once to sign in if you lose access to your authenticator app.
          They will not be shown again.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 font-mono text-sm">
          {recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          I've saved these codes — continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Set up two-factor authentication</h1>
      <p className="text-sm text-slate-600">
        Admin accounts require an authenticator app. Scan the QR code below, or enter the key
        manually, then enter the 6-digit code it generates.
      </p>
      {qrDataUrl && (
        // Server-generated data: URI for a TOTP enrollment QR code, not user content.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="TOTP enrollment QR code" className="mx-auto h-40 w-40" />
      )}
      {manualEntryKey && (
        <p className="break-all rounded-md bg-slate-50 p-2 text-center font-mono text-xs">
          {manualEntryKey}
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-slate-700">
            6-digit code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Confirm"}
        </button>
      </form>
    </div>
  );
}
