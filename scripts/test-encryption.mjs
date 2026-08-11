import { generate } from "otplib";

const BASE = "http://localhost:3000";
const ADMIN_SECRET = "2EWUT6N3GF4WN3NRGQF3MIABASOCW4QT";

function makeJar() {
  const jar = new Map();
  function applySetCookies(res) {
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const idx = pair.indexOf("=");
      jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }
  function cookieHeader() {
    return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async function call(path, opts = {}) {
    const headers = new Headers(opts.headers ?? {});
    headers.set("cookie", cookieHeader());
    if (opts.body) headers.set("content-type", "application/json");
    headers.set("x-csrf-token", jar.get("csrfToken") ?? "");
    const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
    applySetCookies(res);
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data, res };
  }
  return { call };
}

const admin = makeJar();
await admin.call("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@channelportal.local", password: "Sup3r$ecureAdminPass!" }) });
const code = await generate({ secret: ADMIN_SECRET });
await admin.call("/api/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });

const listRes = await admin.call("/api/channel-accounts?group=prospect");
const acct = listRes.data.data[0] ?? (await admin.call("/api/channel-accounts?group=partner")).data.data[0];

const MARKER = "PLAINTEXT-SHOULD-NOT-APPEAR-IN-DB-" + Date.now();
const patchRes = await admin.call(`/api/channel-accounts/${acct.id}`, { method: "PATCH", body: JSON.stringify({ notes: MARKER }) });
console.log("patch status:", patchRes.status);

const getRes = await admin.call(`/api/channel-accounts/${acct.id}`);
console.log("app-layer read (should show plaintext):", getRes.data.data.notes === MARKER ? "MATCH (decrypts correctly)" : "MISMATCH");
console.log("account id for raw DB check:", acct.id);
