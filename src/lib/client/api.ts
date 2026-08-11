"use client";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

// Every authenticated mutating client call goes through this so the CSRF header is attached
// consistently — withAuth (lib/authz/guard.ts) rejects mutating requests without it.
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie("csrfToken");
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers, credentials: "same-origin" });
}

export async function apiJson<T = unknown>(url: string, options: RequestInit = {}): Promise<{
  ok: boolean;
  status: number;
  data: T;
}> {
  const res = await apiFetch(url, options);
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
