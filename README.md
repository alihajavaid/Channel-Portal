# Channel Portal

A full-stack rebuild of the DataGateways Partner Channel Program tool: real authentication
(argon2id + forced MFA for Admins), server-enforced authorization, MySQL via Prisma, local
disk file storage, and Resend transactional email — replacing a browser-only prototype that
had plaintext passwords, a fake "send email" button, and base64-in-JSON file uploads.

See `docs/THREAT_MODEL.md` for the security design and `docs/VERIFICATION.md` for a manual
test checklist.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- MySQL 8.4 (local) + Prisma 7 (via `@prisma/adapter-mariadb`, Prisma 7 requires a driver
  adapter — see `prisma.config.ts` / `src/lib/db/prisma.ts`)
- Hand-rolled DB-backed sessions, argon2id password hashing, TOTP MFA (`otplib`)
- Local disk storage for uploaded documents, served through an authenticated route
- Resend for transactional email (`@react-email/components` for templates)

## Local setup

### 1. Install prerequisites

- Node.js 20.9+ (this project was built against Node 24 LTS)
- MySQL Community Server 8.0+ running locally

### 2. Create the database and a least-privilege app user

Never point the app at `root`. As a MySQL admin:

```sql
CREATE DATABASE channel_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE channel_portal_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'channel_portal_app'@'localhost' IDENTIFIED BY '<a-strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP
  ON channel_portal.* TO 'channel_portal_app'@'localhost';
GRANT ALL PRIVILEGES ON channel_portal_shadow.* TO 'channel_portal_app'@'localhost';
FLUSH PRIVILEGES;
```

The `_shadow` database is used only by `prisma migrate dev` to compute schema diffs.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` / `SHADOW_DATABASE_URL` — the credentials from step 2.
- `FIELD_ENCRYPTION_KEY` — a 32-byte base64 key:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  **Back this up outside git** — losing it makes encrypted fields (MFA secrets, notes)
  permanently unreadable.
- `RESEND_API_KEY` / `EMAIL_FROM` — from [resend.com](https://resend.com). Leave
  `RESEND_API_KEY` empty for local dev; "send credentials" will fail loudly instead of
  silently pretending to succeed, which is deliberate.
- `STORAGE_ROOT` — where uploaded documents live on disk, outside `public/`.
- `BOOTSTRAP_ADMIN_EMAIL` / `_NAME` / `_PASSWORD` — used only by the seed script to create
  the first Admin account.

### 4. Install dependencies, migrate, and seed

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

The seed script creates the bootstrap Admin (forced to change their password and enroll in
MFA on first login), the 10 fixed Deliverable registers, and a few sample records.

### 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with the bootstrap Admin credentials from `.env`,
and follow the forced password-change → MFA-enrollment flow.

## Notable design decisions

- **Auth is hand-rolled, not Auth.js.** Password → lockout check → forced MFA
  enrollment/verification is a genuinely stateful multi-step flow that a Credentials-provider
  library models awkwardly. See `docs/THREAT_MODEL.md`.
- **Sessions are DB-backed, not JWT.** Permissions can change at any moment (an Admin can
  revoke someone's access mid-session) and must take effect immediately — a JWT would need a
  parallel revocation list anyway, so this just uses the DB directly.
- **"Admin" is defined operationally as `permissions.access === true`.** `role` is a free-label
  display string per the original data model, not a real enum, so MFA enforcement and the
  last-Admin invariant key off the `access` permission.
- **ChannelAccount checklists are a JSON column; Deliverable tasks are a real child table.**
  Different cardinality and query needs — see the comments in `prisma/schema.prisma`.
- **`Document.attachedTo` is two nullable FKs, not a discriminator column**, enforced by a
  hand-added SQL `CHECK` constraint (Prisma's schema DSL can't express `CHECK` directly —
  see `prisma/migrations/*_init/migration.sql`).
- **KPIs are computed on the fly**, not cached — at this data scale a cache buys nothing and
  adds a real invalidation-bug surface.
- **The full-data export endpoint is gated behind `access`, not just `dashboard`** — it's the
  single most sensitive read in the app (all customer/partner PII in one response).

## Scripts

`scripts/test-*.mjs` are manual, non-CI verification scripts written while building this app
(auth/MFA flow, module CRUD, authorization boundaries, IDOR, field encryption). Run them
against a local dev server per `docs/VERIFICATION.md`. They are not a substitute for
automated tests and assume a specific seeded/mutated local database state.
