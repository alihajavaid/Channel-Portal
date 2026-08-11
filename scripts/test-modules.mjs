import { generate } from "otplib";

const BASE = "http://localhost:3000";
const ADMIN_SECRET = "2EWUT6N3GF4WN3NRGQF3MIABASOCW4QT";
const ADMIN_PASSWORD = "Sup3r$ecureAdminPass!";
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

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
    if (opts.body && !(opts.body instanceof FormData)) headers.set("content-type", "application/json");
    if (opts.csrf !== false) headers.set("x-csrf-token", jar.get("csrfToken") ?? "");
    const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
    applySetCookies(res);
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data, res };
  }
  return { call, jar };
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
  console.log("  ok:", msg);
}

async function loginAsAdmin(session) {
  let r = await session.call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@channelportal.local", password: ADMIN_PASSWORD }),
  });
  assert(r.data.status === "mfa_verify", "admin login reaches mfa_verify");
  const code = await generate({ secret: ADMIN_SECRET });
  r = await session.call("/api/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });
  assert(r.data.status === "done", "admin MFA verify succeeds");
}

async function main() {
  const admin = makeJar();
  console.log("== Admin login ==");
  await loginAsAdmin(admin);

  console.log("== ChannelAccount lifecycle ==");
  const usersRes = await admin.call("/api/users/options");
  const adminId = usersRes.data.data[0].id;
  let r = await admin.call("/api/channel-accounts", {
    method: "POST",
    body: JSON.stringify({
      company: "Test Co " + Date.now(),
      primaryContact: "Test Contact",
      email: "test@example.com",
      region: "Test Region",
      focusArea: "Testing",
      ownerId: adminId,
      tier: "Bronze",
      status: "Active",
      requestDate: new Date().toISOString(),
    }),
  });
  assert(r.status === 201, "create channel account (prospect) succeeds");
  const accountId = r.data.data.id;

  r = await admin.call(`/api/channel-accounts/${accountId}/phase`, { method: "POST", body: JSON.stringify({ phase: 4 }) });
  assert(r.status === 200 && r.data.data.phase === 4, "admin (has both prospects+partners) can cross into partner phase");

  r = await admin.call(`/api/channel-accounts/${accountId}/checklist`, {
    method: "POST",
    body: JSON.stringify({ phase: 4, itemKey: "nda_issued", done: true }),
  });
  assert(r.status === 200, "checklist toggle succeeds");

  console.log("== Document upload/download ==");
  const buf = Buffer.from(TINY_PNG_BASE64, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([buf], { type: "image/png" }), "test.png");
  formData.append("channelAccountId", accountId);
  r = await admin.call("/api/documents", { method: "POST", body: formData });
  assert(r.status === 201, "document upload succeeds (valid PNG)");
  const documentId = r.data.data.id;

  r = await admin.call(`/api/documents/${documentId}`);
  assert(r.status === 200, "document download succeeds for permitted user");

  console.log("== Reject a fake PDF (wrong magic bytes) ==");
  const fakeForm = new FormData();
  fakeForm.append("file", new Blob([Buffer.from("not a real pdf")], { type: "application/pdf" }), "fake.pdf");
  fakeForm.append("channelAccountId", accountId);
  r = await admin.call("/api/documents", { method: "POST", body: fakeForm });
  assert(r.status === 400 && r.data.error === "upload_rejected", "spoofed PDF content-type rejected by magic-byte sniff");

  console.log("== Customer lifecycle ==");
  r = await admin.call("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      company: "Test Customer " + Date.now(),
      primaryContact: "CX Contact",
      email: "cx@example.com",
      plan: "Pro",
      csmOwnerId: adminId,
      health: "Healthy",
      status: "Active",
      renewalDate: new Date().toISOString(),
    }),
  });
  assert(r.status === 201, "create customer succeeds");
  const customerId = r.data.data.id;
  r = await admin.call(`/api/customers/${customerId}`, { method: "PATCH", body: JSON.stringify({ health: "Critical" }) });
  assert(r.status === 200 && r.data.data.health === "Critical", "customer health update succeeds");

  console.log("== Deliverables ==");
  r = await admin.call("/api/deliverables");
  assert(r.status === 200 && r.data.data.length === 10, "10 deliverables seeded");
  const deliverable = r.data.data[0];
  const task = deliverable.tasks[0];
  r = await admin.call(`/api/deliverables/${deliverable.id}/tasks/${task.id}`, { method: "POST", body: JSON.stringify({ done: true }) });
  assert(r.status === 200 && r.data.data.done === true, "deliverable task toggle succeeds");

  console.log("== CSRF enforcement ==");
  r = await admin.call(`/api/customers/${customerId}`, { method: "PATCH", body: JSON.stringify({ health: "Healthy" }), csrf: false });
  assert(r.status === 403 && r.data.error === "csrf", "mutating request without CSRF header is rejected");

  console.log("== Second user + permission boundaries ==");
  r = await admin.call("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: "Limited User",
      email: `limited-${Date.now()}@example.com`,
      role: "Sales",
      dashboard: true,
      prospects: true,
      partners: false,
      customers: false,
      deliverables: false,
      access: false,
    }),
  });
  assert(r.status === 201, "create limited user succeeds");

  console.log("== Last-admin invariant ==");
  r = await admin.call(`/api/users/${adminId}`, { method: "PATCH", body: JSON.stringify({ access: false }) });
  assert(r.status === 409 && r.data.error === "last_admin", "cannot demote the sole Admin");

  console.log("== Export (access-gated) ==");
  r = await admin.call("/api/export?format=json");
  assert(r.status === 200, "export succeeds for access-permitted user");

  console.log("== Send credentials without RESEND_API_KEY configured ==");
  const usersList = await admin.call("/api/users");
  const limited = usersList.data.data.find((u) => u.role === "Sales");
  r = await admin.call(`/api/users/${limited.id}/send-credentials`, { method: "POST" });
  assert(r.status === 502 && r.data.error === "email_not_configured", "send-credentials fails loudly with no API key (never silent fake-success)");

  console.log("\nALL MODULE TESTS PASSED");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
