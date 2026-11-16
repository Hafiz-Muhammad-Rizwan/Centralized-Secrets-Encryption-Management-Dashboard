# Vaultline

Next.js server application with Supabase email/password authentication, native
TOTP two-factor authentication, role checks, and a server-side encrypted vault. The
original role dashboards remain explicitly labelled simulations for metrics and
approval workflows. The two Activity 3 modules embedded in those dashboards —
**Secret Provisioning** and **Secrets Directory** — use the real PostgreSQL vault
when the backend is enabled; they do not fall back to sample secrets.

**New code is not a deployed or certified production vault.** Follow
[VAULT_OPERATIONS.md](VAULT_OPERATIONS.md) before deploying. Apply the membership
migration first so each signed-in account has an active role. Workspace login uses
Supabase TOTP directly: users enroll their own authenticator at first sign-in and
verify it on later sign-ins. The optional vault migration keeps its separate
factor-approval and session controls.

The owner-selected encryption design uses built-in Node.js AES-256-GCM and a
server-only `ENCRYPTION_KEY` environment variable, with a fresh wrapped data key per
secret. No AWS/KMS subscription is used. Key backups and restricted environment
access are essential; this is not HSM-backed encryption. Real storage is disabled
unless `SECURITY_DATA_ENABLED=true` and `VAULT_ENABLED=true` are configured.

```sh
npm ci
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev
npm run test:security
npx tsc --noEmit
npm run lint
npm run build
npm start
```

Apply `supabase/migrations/202611060001_workspace_members.sql` once in the
Supabase SQL Editor, then insert an active role for each account
(`team_lead`, `developer`, or `security_analyst`). To enable the encrypted vault and
the database-backed modules, apply `202611070002_vault_security.sql` followed by
`202611080003_module_backend.sql`. See [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md)
and [ACTIVITY_6_BACKEND_MODULES.md](ACTIVITY_6_BACKEND_MODULES.md).

CI additionally runs isolated PostgreSQL authorization tests, scans dependencies,
and produces an SBOM. Do not execute `tests/sql/` against a live project.

Vercel runs the Next.js server at the domain root; static export is unsupported.
Old `out/` directories/ZIPs may still exist locally or in history and must not be
redeployed. Replacing the build workflow did **not** remove an already-published
GitHub Pages site. Use the manual **Retire legacy GitHub Pages** workflow or
repository Settings → Pages, then verify the old URL and nested routes are gone.
Live retirement has not been performed by this implementation.

See [REMEDIATION_SUMMARY.md](REMEDIATION_SUMMARY.md) for V-01–V-13 status and verification,
[VAULT_OPERATIONS.md](VAULT_OPERATIONS.md) for migration/environment/recovery details,
and [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) for the original account setup.
The historical assessment remains in `SYSTEM_FLAWS_AND_VULNERABILITIES_REPORT.md`;
it is point-in-time evidence, not a statement about the newly implemented code.
