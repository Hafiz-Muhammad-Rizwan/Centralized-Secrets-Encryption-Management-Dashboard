# Security remediation summary — V-01 through V-13

Date: 2026-11-07. Baseline: `SYSTEM_FLAWS_AND_VULNERABILITIES_REPORT.md`.
The baseline report was preserved. This summary distinguishes implemented code,
local verification, and operator work that has not been performed.

**Deployment status: not deployed; live Supabase not modified; real-secret release
not approved.** Apply the migration before deploying the authentication changes.
Follow `VAULT_OPERATIONS.md`. No production key was generated or read.

## Owner-selected architecture

The owner explicitly rejected AWS KMS in favor of free server-side Node.js crypto
with `process.env.ENCRYPTION_KEY`. The implementation uses AES-256-GCM envelope
encryption: random data key per value, authenticated record/owner binding, and a
root environment key wrapping each data key. There is no AWS SDK dependency or KMS
service. Environment-held keys do not provide HSM isolation; runtime/key compromise
is a residual risk. Provider hosting/database/email/Redis quotas still apply.

## Finding-by-finding disposition

| Finding | Implemented change and evidence | Verification / remaining boundary |
| --- | --- | --- |
| **V-01 Distributed throttling** | `src/lib/security/rate-limit.ts`, `client-address.ts`, login/account actions separate account/IP/global scopes. Vercel-overwritten IP header only; global login pressure is telemetry instead of an account lockout switch. | Unit tests cover limits/failure paths. Shared Redis/edge/provider limits must be configured and load-tested. Local mode/fallback is not distributed protection. No CAPTCHA/WAF service was provisioned. **Partially remediated operationally.** |
| **V-02 MFA bootstrap** | Single-use, expiring, hashed admin-issued tokens; enrollment-session binding; approved-factor table. `mfa/actions.ts`, `MfaForm.tsx`, auth access guard, migration, admin issuance SQL. Even a direct-provider unapproved AAL2 factor cannot open the workspace/vault. Existing verified factors are grandfathered by migration. | Node and PostgreSQL tests cover missing approval, replay, registration, AAL1 and unapproved verified-factor denials. **Code remediated; migration and identity-verification process required.** Review preexisting factors before approving them. |
| **V-03 Credential lifecycle** | `/account/` password change with current-password check and approved MFA; `/account/recover/` generic email request and explicit recovery-token verification on POST, existing TOTP retained, global revocation. | Node tests cover wrong password, missing MFA/member, token failure, failed code, failed revocation and success. **Code implemented; live SMTP/templates/provider reauthentication policy and recovery drill pending.** Lost-device recovery remains identity-verified administration. |
| **V-04 Audit durability** | Transactional append-only database events for vault reads/mutations, grants, bootstrap and revocation. `/audit/` renders real records, not generated rows. `audit.ts` also exports redacted auth events to a configured HTTPS append sink with idempotency IDs. | PostgreSQL tests verify denied direct deletion and rollback when audit insert fails; Node tests verify exporter field safety/failure. **Partially remediated:** DB admins remain trusted; auth export has no durable retry queue. Independent immutable/WORM retention, drains, monitoring and alerts need configuration. |
| **V-05 Session lifecycle** | Global Supabase sign-out plus immediate application revocation by session ID/authentication-time cutoff; DB checks enforce revocation independently. `/account/` shows actual app-observed sessions. | Node/SQL tests cover global scope, revoked/stale unseen sessions and own inventory. **Code implemented; enable SECURITY_DATA_ENABLED and test two live sessions.** Inventory is not a provider-wide device list; unrelated services may accept copied JWTs until expiry. |
| **V-06 Real vault engine** | `src/lib/vault/{crypto,key,access}.ts`, `/vault/` actions/UI, private schema/RLS and checked RPCs. Create/list/reveal/replace/delete, owner-bound access, expiring grants/revoke, optimistic version checks, bounded input/record/grant counts and strict encrypted-envelope shape. Client mock storage is removed from active secret navigation. | Real crypto tamper/substitution/rotation tests; PostgreSQL cross-user/AAL1/role/grant-expiry/audit-failure tests. **Core engine implemented, rollout disabled by default.** Single workspace; no dual approvals, automatic provider rotation, bulk rewrap, or independent pentest. These are not falsely represented as implemented. |
| **V-07 Legacy exposure** | `deploy-pages.yml` now manually deletes the obsolete Pages site; validation moved to `security-ci.yml`. README corrects the previous claim that changing the workflow removed the live site. `.vercelignore` excludes old ZIP/static exports from server deployment. | **Live retirement still pending:** run workflow or unpublish in GitHub settings and verify old URLs. Historical coursework archives/history are preserved, not destroyed or claimed sanitized. Rotate any genuinely exposed credentials. |
| **V-08 Supply chain** | All Actions use verified full 40-character SHAs. Added CODEOWNERS, SECURITY.md, Dependabot, database CI tests and CycloneDX SBOM generation/upload. | Dependency scan and local SBOM generation passed. **Code/config implemented;** branch protection, enforced code-owner review, private reporting, secret scanning and provider account controls require repository settings. |
| **V-09 Availability/DR** | `VAULT_OPERATIONS.md` documents backup/key restore, RPO/RTO evidence, incident containment, rollback, key rotation and outage policy. Quotas and bounded requests reduce abuse. | **Operational finding remains open:** no cloud backup/PITR, regional failover, tested recovery time, monitoring owner or live restore drill is claimed. Auth/database failure stays closed. |
| **V-10 Misleading claims** | Persistent SIMULATED / DEMO ONLY notice and module badges; false FIDO2/zero-plaintext/kill-switch settings corrected; inert toggles replaced with unavailable labels. Actual vault/audit/account pages are linked separately; synthetic audit page removed from navigation. | Source review and build passed. Sample dashboards remain for coursework and are not security measurements. Plaintext reveal and unimplemented automation are explicitly described. **UI remediation implemented.** |
| **V-11 Redis outage lockout** | Bounded local counters maintained during healthy operation; transient outage uses a 15-second circuit breaker and emits degradation telemetry. Known denials, bad credentials and malformed config are not bypassed. | Unit tests cover outage fallback exhaustion and malformed responses. **Code remediated with explicit availability tradeoff:** multi-instance protection degrades until shared service recovers; edge/provider controls remain required. |
| **V-12 CSP/browser controls** | CSP report-uri/report-to, Reporting-Endpoints from fixed APP_ORIGIN, bounded/sanitized `/api/csp-report/`, COOP/CORP. Existing nonce policy retained. | Production HTTP checks verify headers, sanitized reporting and 8KiB report cap. **Partially remediated:** style-src unsafe-inline remains for existing styling; no false claim of full CSP closure. Operational report collection/alerts pending. |
| **V-13 Headers** | `poweredByHeader:false`; HSTS adds includeSubDomains/preload. | Local production HTTP confirms absent X-Powered-By and exact HSTS. **Code remediated;** operator must verify HTTPS on custom-domain subdomains. Header does not constitute browser preload-list registration or TLS scanner verification. |

## Changed paths

- Deployment/governance: `.github/workflows/deploy-pages.yml`,
  `.github/workflows/security-ci.yml`, `.github/dependabot.yml`, `.github/CODEOWNERS`,
  `.github/SECURITY.md`, `.vercelignore`, `README.md`, `next.config.ts`.
- Auth/resilience: `src/lib/auth/access.ts`, `src/lib/security/{rate-limit,client-address,audit}.ts`,
  `src/app/login/actions.ts`, `src/app/mfa/actions.ts`, `src/components/MfaForm.tsx`.
- Account flows: `src/app/account/actions.ts`, `src/app/account/page.tsx`,
  `src/app/account/recover/page.tsx`, `src/components/AccountForms.tsx`.
- Vault: `src/lib/vault/{access,crypto,key}.ts`, `src/app/vault/actions.ts`,
  `src/app/vault/page.tsx`, `src/components/VaultPanel.tsx`,
  `src/app/provision-secret/page.tsx`, `src/app/secrets-directory/page.tsx`.
- Audit/transport/UI: `src/app/audit/page.tsx`, `src/app/api/csp-report/route.ts`,
  `src/proxy.ts`, `src/components/{DemoNotice,LoginForm,RoleWorkspace}.tsx`,
  `src/app/globals.css`.
- Database: `supabase/migrations/202611070002_vault_security.sql`,
  `supabase/admin/issue_bootstrap_token.sql`.
- Tests: `tests/{account,auth,hardening,vault}.test.mjs`,
  `tests/sql/{bootstrap,vault-security}.sql`. Prior sample regression tests retained.
- Documentation: `VAULT_OPERATIONS.md`, `REMEDIATION_SUMMARY.md`, supersession notices
  in `SUPABASE_AUTH_SETUP.md` and `SECURITY_APPLIED_PRINCIPLES.md`.

## Local verification

- `npm run test:security`: **27 tests passed**.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, including new vault/account/audit/report routes.
- `npm run lint`: **zero errors**, one preexisting unused-variable warning in a
  coursework helper under `.github/prompts/design-system/scripts/`.
- PostgreSQL 17 isolated, network-disabled container: both migrations applied;
  `tests/sql/vault-security.sql` **passed**. Tests use fixture users and simulated
  trusted PostgREST claims, not real Supabase accounts or a provider auth server.
- Full `npm audit`: **0 known vulnerabilities** at verification time.
- `npm sbom --sbom-format cyclonedx`: **passed**, 388 components.
- `git diff --check`: **passed**.
- Local production HTTP: nine protected routes denied anonymous/forged cookies;
  recovery request form loads; X-Powered-By absent; HSTS/COOP/CORP/CSP reporting and
  no-store verified; CSP report accepted without retaining supplied URL/sample;
  oversized report rejected with HTTP 413.

No deployments, live migrations, email delivery, real MFA enrollment/recovery,
Redis outage, live key provisioning, Pages deletion, repository-setting changes,
backup restore or independent penetration test were performed. These are explicit
release gates, not tests silently treated as passed.

## References used

- [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords)
  and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
- [Vercel ingress header behavior](https://vercel.com/docs/headers/request-headers).
- Installed Next.js 16.4.5 Server Actions/data-security guides; official Actions
  repositories queried to resolve commit SHAs.

The implementation improves the system substantially, but this document does not
assert that all 13 findings are operationally closed or that no critical flaws can
remain. The live retirement, key/backup custody, provider configuration and
independent assurance gates must be completed before real-secret production use.
