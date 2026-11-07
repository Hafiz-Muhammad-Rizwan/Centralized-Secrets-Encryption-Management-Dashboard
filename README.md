# Vaultline

Next.js server application with Supabase password/TOTP authentication, approved
MFA enrollment, role checks, and a server-side encrypted vault. The original role
dashboards remain explicitly labelled simulations; they are separate from real
`/vault/`, `/account/` and `/audit/` pages.

**New code is not a deployed or certified production vault.** Follow
[VAULT_OPERATIONS.md](VAULT_OPERATIONS.md) before deploying. Apply the new migration
first: workspace access now checks approved MFA factors. Existing verified factors
are preserved by the migration; new factors require administrator-issued one-time
authorization after identity verification.

The owner-selected encryption design uses built-in Node.js AES-256-GCM and a
server-only `ENCRYPTION_KEY` environment variable, with a fresh wrapped data key per
secret. No AWS/KMS subscription is used. Key backups and restricted environment
access are essential; this is not HSM-backed encryption. Real storage is disabled
unless `SECURITY_DATA_ENABLED=true` and `VAULT_ENABLED=true` are configured.

```sh
npm ci
npm run dev
npm run test:security
npm run typecheck
npm run lint
npm run build
npm start
```

CI additionally runs isolated PostgreSQL authorization tests, scans dependencies,
and produces an SBOM. Do not execute `tests/sql/` against a live project.

`npm run typecheck` generates Next.js route types before running TypeScript, so
it also works on a clean checkout without an existing `.next/` directory.

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
