const BASE = "http://localhost:3000";

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

async function main() {
  const limited = makeJar();
  let r = await limited.call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "limited-1786419569071@example.com", password: "LimitedUserP@ss123" }),
  });
  assert(r.data.status === "done", "limited user (no MFA required, access=false) logs straight in");

  console.log("== Direct API hits against modules the limited user lacks ==");
  r = await limited.call("/api/channel-accounts?group=partner");
  assert(r.status === 403, "limited user (partners=false) hitting partner list API -> 403");

  r = await limited.call("/api/customers");
  assert(r.status === 403, "limited user (customers=false) hitting customers API -> 403");

  r = await limited.call("/api/deliverables");
  assert(r.status === 403, "limited user (deliverables=false) hitting deliverables API -> 403");

  r = await limited.call("/api/users");
  assert(r.status === 403, "limited user (access=false) hitting users admin API -> 403");

  r = await limited.call("/api/export?format=json");
  assert(r.status === 403, "limited user (access=false) hitting export API -> 403");

  console.log("== Allowed module still works ==");
  r = await limited.call("/api/channel-accounts?group=prospect");
  assert(r.status === 200, "limited user (prospects=true) can list prospects");

  console.log("== Logged-out direct API hit ==");
  const anon = makeJar();
  r = await anon.call("/api/channel-accounts?group=prospect");
  assert(r.status === 401, "unauthenticated direct API hit -> 401");

  console.log("\nALL AUTHZ BOUNDARY TESTS PASSED");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
