import { generate } from "otplib";

const BASE = "http://localhost:3000";
const jar = new Map();
const KNOWN_SECRET = "2EWUT6N3GF4WN3NRGQF3MIABASOCW4QT";

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
  if (opts.csrf) headers.set("x-csrf-token", jar.get("csrfToken") ?? "");
  const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
  applySetCookies(res);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, res };
}

async function main() {
  console.log("1) login with current password");
  let r = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@channelportal.local", password: "Sup3r$ecureAdminPass!" }),
  });
  console.log("   ->", r.status, r.data);
  if (r.data.status !== "mfa_verify") throw new Error("expected mfa_verify, got " + JSON.stringify(r.data));

  console.log("2) verify TOTP code");
  const code = await generate({ secret: KNOWN_SECRET });
  r = await call("/api/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });
  console.log("   ->", r.status, r.data);
  if (r.data.status !== "done") throw new Error("expected done");

  console.log("3) fetch /dashboard with real session (expect 200, no cookie-write crash)");
  r = await call("/dashboard");
  console.log("   -> status:", r.status);
  if (r.status !== 200) throw new Error("dashboard did not return 200");

  console.log("4) wrong CSRF token on a mutating request should be rejected once a real route checks it (skipped: no such route yet)");

  console.log("5) log out, then dashboard should redirect");
  await call("/api/auth/logout", { method: "POST" });
  r = await call("/dashboard");
  console.log("   -> status:", r.status, "location:", r.res.headers.get("location"));
  if (r.status !== 307 && r.status !== 302) throw new Error("expected redirect after logout");

  console.log("6) five bad logins in a row should lock the account");
  for (let i = 0; i < 5; i++) {
    r = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@channelportal.local", password: "wrong-password" }),
    });
  }
  console.log("   -> after 5th bad attempt:", r.status, r.data);
  if (r.status !== 423) throw new Error("expected account to be locked (423)");

  console.log("\nAll steps passed.");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
