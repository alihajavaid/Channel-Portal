# Threat model — Channel Portal

## Assets

- Credentials and session tokens (passwords hashes, session tokens, CSRF tokens, MFA
  recovery codes).
- MFA secrets (TOTP seeds for Admin accounts).
- Business data: ChannelAccount/Customer records, notes, contact PII.
- Uploaded Documents — likely the single most sensitive artifact (contracts, NDAs).
- The audit trail (`ActivityLogEntry`) — its own integrity matters for accountability.
- Secrets: `RESEND_API_KEY`, MySQL credentials, `FIELD_ENCRYPTION_KEY`.

## Actors

- **Unauthenticated attacker** — no credentials, attacking from outside.
- **Low-privilege authenticated user** — compromised or malicious, holds a subset of
  module permissions.
- **Admin** (`permissions.access === true`) — the highest-power insider-risk actor.
- **Negligent-but-legitimate user** — accidental exposure (e.g. sharing a screenshot,
  weak personal device security), not malice.

## Trust boundaries

| Boundary | What crosses it | Mitigation |
|---|---|---|
| Browser ↔ Next.js server | Every request | Every crossing re-authenticates (session cookie → DB lookup) and re-authorizes (module permission check). Client-supplied `permissions`/`role`/ids are **never** trusted — every check re-derives from the DB record just fetched. |
| Next.js ↔ MySQL | SQL queries | Least-privilege DB user (`channel_portal_app`), no `CREATE DATABASE`/superuser rights, connects to `localhost` only. |
| Next.js ↔ Resend | Outbound email | API key is the only secret crossing this boundary; sends fail loudly if unconfigured rather than faking success. |
| Next.js ↔ local storage directory | File read/write | `storage/documents/` sits outside `public/` so static serving can never expose it; every read goes through an authenticated, permission-checked route handler. |

## Top risks → mitigations

| Risk | Mitigation |
|---|---|
| Credential stuffing / brute force | argon2id password hashing; escalating lockout after 5 failures; generic "invalid credentials" errors (no user enumeration). |
| Session hijacking | `HttpOnly`/`Secure` (prod)/`SameSite=Lax` cookies; DB-backed sessions with instant revocation; session rotated on password change. |
| CSRF on state-changing requests | `SameSite=Lax` plus a double-submit CSRF token, enforced in `withAuth` for every mutating API request. |
| IDOR (guessing a Document/ChannelAccount id) | Every route re-derives permission from the *resolved record's current state* (e.g. a ChannelAccount's current phase), never from client-asserted scope. IDs are non-sequential `cuid()`s. |
| Malicious file upload | Allowlist + magic-byte sniffing (never trusts client `Content-Type`); opaque UUID storage paths (path traversal impossible by construction); forced `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` on download. **Known gap: no virus scanning in v1** — see Non-goals. |
| Insider misuse of Admin power | Last-Admin invariant (can't remove/demote the sole Admin); permission changes are separately audit-logged with before/after; "credentials sent" emails notify the affected user so a silent takeover by another Admin is visible to the victim; full-data export is gated behind `access`, not just `dashboard`, and is itself logged. |
| MFA secret or DB backup theft | `mfaSecret` is field-encrypted (AES-256-GCM) at the application layer via `FIELD_ENCRYPTION_KEY`; DB/host-level encryption (MySQL InnoDB tablespace encryption, BitLocker) is a real complement but is infrastructure/ops configuration this application does not itself configure. |
| MFA brute force | Wrong TOTP codes and recovery codes count against the same account-lockout counter as password failures; recovery codes are single-use. |
| Dependency / supply-chain risk | `npm audit` run clean at build time; native/postinstall scripts reviewed and approved individually (`npm approve-scripts`) rather than blanket-allowed; well-known crypto/auth packages (`argon2`, `otplib`) used instead of hand-rolled primitives, except the intentionally small hand-rolled session/CSRF layer (see below). |
| Secrets in logs | No password, temp password, or MFA secret is ever passed to `console.log`/error output; `.env` is gitignored (`.env.example` is the only committed template). |
| Logout CSRF | `POST /api/auth/logout` is intentionally not CSRF-gated (no session/CSRF-cookie pair may exist yet at that call site in some flows). Accepted low-severity risk: a forced cross-site logout is an annoyance, not a data exposure. |

## Why a hand-rolled auth layer

Password + forced MFA enrollment + account lockout is a genuinely stateful, multi-step
flow that off-the-shelf Credentials-provider libraries (e.g. Auth.js) don't model
cleanly — see `docs/README.md` for the fuller rationale. The trade-off is explicit: a
small, auditable, ~500-line hand-rolled layer (`src/lib/auth/`, `src/lib/authz/`)
instead of a larger dependency whose stateful-MFA support would have to be worked
around anyway.

## Explicit non-goals (v1)

- **Virus/malware scanning of uploaded files.** Mitigated by allowlist + magic-byte
  sniffing, but not eliminated. `src/lib/storage/upload.ts` has one clearly marked hook
  for adding a scanner later.
- **Network-level DDoS protection.** Out of scope for an app-layer build; belongs to
  whatever sits in front of this app in production (a CDN/WAF).
- **Physical security of the host machine.** Out of scope.
- **Protecting against a fully compromised Admin account.** The last-Admin invariant and
  audit logging make misuse *visible and harder to hide*, not impossible — a fully
  compromised sole-Admin credential is an authorization ceiling this design doesn't
  claim to defend past.
- **MySQL/host-level at-rest encryption.** This app field-encrypts specific sensitive
  columns; it does not configure MySQL InnoDB tablespace encryption or BitLocker. That's
  a real, recommended complement, but it's infrastructure/ops configuration outside what
  `schema.prisma`/application code can guarantee.
