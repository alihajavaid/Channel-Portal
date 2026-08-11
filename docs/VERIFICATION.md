# Verification checklist

No CI exists for this project yet — this is the manual checklist to run before calling any
milestone "done". The `scripts/test-*.mjs` files automate most of it against a running
`npm run dev` server; they are throwaway verification scripts, not a real test suite, and
some hardcode state from a specific local run (the bootstrap admin's TOTP secret, a test
user's email) — read the comments/constants at the top before rerunning them against a
freshly seeded database.

## Auth / MFA / lockout

- [x] Password login → forced password change (`mustChangePassword`) → forced MFA
      enrollment (Admin) → real session. (`scripts/test-auth-flow.mjs`)
- [x] Password login → MFA verification (already-enrolled Admin) → real session; logout
      destroys the session and further page loads redirect to `/login`.
      (`scripts/test-auth-flow-2.mjs`)
- [x] 5 failed login attempts locks the account with escalating backoff.
      (`scripts/test-auth-flow-2.mjs`)
- [x] A non-Admin user (no `access` permission) logs straight in without MFA.
      (`scripts/test-authz-boundaries.mjs`)

## Authorization

- [x] Every module's direct API hit — not just the hidden nav item — returns 403 for a user
      lacking that permission, and 401 for a logged-out request. (`scripts/test-authz-boundaries.mjs`)
- [x] A ChannelAccount's required permission is derived from its **current phase**, not a
      static role: moving a record across the prospect/partner boundary requires both
      permissions; fetching a specific partner-phase record by id as a prospects-only user
      returns 403 (IDOR guard), not the record. (`scripts/test-idor.mjs`)
- [x] The last remaining Admin cannot be demoted (`access: false`) or deleted.
      (`scripts/test-modules.mjs`)

## CSRF

- [x] A mutating request (`PATCH`) with a valid session but a missing/wrong `x-csrf-token`
      header is rejected with 403. (`scripts/test-modules.mjs`)

## File uploads

- [x] A valid PNG uploads and downloads successfully round-trip.
- [x] A file with a spoofed `Content-Type` (e.g. plain text sent as `application/pdf`) is
      rejected — magic-byte sniffing, not the client-declared type, decides the mimetype.
      (`scripts/test-modules.mjs`)
- [ ] Manually confirm on disk: `storage/documents/` contains only opaque UUID filenames,
      never the original filename or any path derived from user input.

## Field encryption

- [x] Setting a ChannelAccount's `notes` through the app, then reading the raw MySQL row
      directly, shows ciphertext (`enc:v1:...`) — never the plaintext. The app layer decrypts
      it correctly on read. (`scripts/test-encryption.mjs`)
- [ ] Same check for `User.mfaSecret` after MFA enrollment (spot-checked manually during
      development; automate if this changes).

## Email

- [ ] With `RESEND_API_KEY` unset: "Send credentials" returns a clear `email_not_configured`
      error, never a silent success. (`scripts/test-modules.mjs` covers this.)
- [ ] With a real `RESEND_API_KEY` configured: one true end-to-end send to a test inbox,
      confirm the temp password logs in and immediately forces a password reset.

## Cookies (manual — inspect in browser dev tools, not automatable via `fetch`)

- [ ] `session` cookie: `HttpOnly`, `Secure` in production, `SameSite=Lax`.
- [ ] `csrfToken` cookie: **not** `HttpOnly` (client JS must read it), same `Secure`/`SameSite`.

## Build / static checks

- [x] `npm run build` compiles and type-checks clean.
- [x] `npm audit` reports 0 vulnerabilities.
- [x] Every `route.ts` under `src/app/api` either wraps its handlers in `withAuth` or is one
      of the deliberately pre-session auth endpoints (`login`, `logout`, `set-password`,
      `mfa/enroll`, `mfa/enroll/confirm`, `mfa/verify`) — re-run
      `grep -rl "export const \(GET\|POST\|PATCH\|DELETE\)" src/app/api` vs
      `grep -rl withAuth src/app/api` after adding any new route and confirm the only diff is
      that list.
