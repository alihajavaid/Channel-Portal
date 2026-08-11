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
    if (opts.csrf !== false) headers.set("x-csrf-token", jar.get("csrfToken") ?? "");
    const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
    applySetCookies(res);
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data, res };
  }
  return { call };
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
  console.log("  ok:", msg);
}

const admin = makeJar();
await admin.call("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@channelportal.local", password: "Sup3r$ecureAdminPass!" }) });
const code = await generate({ secret: ADMIN_SECRET });
await admin.call("/api/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });

const partnerList = await admin.call("/api/channel-accounts?group=partner");
const partnerRecord = partnerList.data.data[0];
console.log("Using partner-phase record:", partnerRecord.id, "phase", partnerRecord.phase);

const partnerDoc = partnerRecord.id
  ? await admin.call(`/api/channel-accounts/${partnerRecord.id}`)
  : null;

const limited = makeJar();
const loginRes = await limited.call("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "limited-1786419569071@example.com", password: "LimitedUserP@ss123" }),
});
assert(loginRes.data.status === "done", "limited user logs in");

const r = await limited.call(`/api/channel-accounts/${partnerRecord.id}`);
assert(r.status === 403, "limited user (partners=false) cannot fetch a specific partner-phase record by id (IDOR guarded)");

console.log("\nIDOR TEST PASSED");
