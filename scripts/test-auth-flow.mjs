import { generate } from "otplib";

const BASE = "http://localhost:3000";
const jar = new Map();

function applySetCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    jar.set(name, value);
  }
}

function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function call(path, opts = {}) {
  const headers = new Headers(opts.headers ?? {});
  headers.set("cookie", cookieHeader());
  if (opts.body) headers.set("content-type", "application/json");
  if (opts.csrf) headers.set("x-csrf-token", jar.get("csrfToken") ?? "");
  const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
  applySetCookies(res);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, res };
}

async function main() {
  console.log("1) login with bootstrap admin (password already changed by a prior run)");
  let r = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@channelportal.local", password: "Sup3r$ecureAdminPass!" }),
  });
  console.log("   ->", r.status, r.data);
  if (r.data.status !== "mfa_enroll") throw new Error("expected mfa_enroll step, got " + JSON.stringify(r.data));

  console.log("3) start MFA enrollment");
  r = await call("/api/auth/mfa/enroll", { method: "POST" });
  console.log("   -> got manualEntryKey:", r.data.manualEntryKey);
  const secret = r.data.manualEntryKey;

  console.log("4) compute a valid TOTP code and confirm enrollment");
  const code = await generate({ secret });
  r = await call("/api/auth/mfa/enroll/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  console.log("   ->", r.status, r.data.status, "recoveryCodes count:", r.data.recoveryCodes?.length);
  if (r.data.status !== "done") throw new Error("expected mfa enrollment done");

  console.log("5) fetch /dashboard with real session (expect 200)");
  r = await call("/dashboard");
  console.log("   -> status:", r.status);

  console.log("6) log out, then fetch /dashboard again (expect redirect)");
  await call("/api/auth/logout", { method: "POST", csrf: true });
  r = await call("/dashboard");
  console.log("   -> status:", r.status, "location:", r.res.headers.get("location"));

  console.log("\nAll steps completed.");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
