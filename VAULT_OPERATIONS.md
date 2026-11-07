# Vault rollout and operations

This is an implementation and operator runbook, not evidence of production approval.
The owner selected **Node.js crypto + environment-held encryption keys**, not AWS
KMS. No paid key-management service or new production dependency is required.
Hosting, database, Redis and email services still have their own quotas/pricing.

## Apply before deploying the new authentication code

1. Back up the project and record the existing memberships and verified MFA factors.
   Independently verify that existing factors are legitimate: the migration
   grandfather-approves them to preserve existing logins.
2. In a staging Supabase project, run the existing membership migration if not
   already applied, then `supabase/migrations/202611070002_vault_security.sql`.
   Do not run the original create-table migration twice. The new migration is
   transactional; do not edit an already-applied migration to make future changes.
3. Verify the same migration against your Supabase version (it reads
   `auth.mfa_factors`). PostgreSQL fixture tests are not a live Supabase test.
   Keep `vault_private` OUT of the Data API exposed schemas. Never grant app roles
   access to its tables or private functions. Public RPC functions recheck the
   caller, role, MFA approval, session and secret ownership/grant independently.
4. Enable Supabase TOTP. Existing verified factors are preserved. New users obtain
   a token from `supabase/admin/issue_bootstrap_token.sql` after an administrator
   verifies their identity outside the password channel. Replace the placeholder
   UUID. Deliver the single-use token privately; it expires in 30 minutes. A failed
   enrollment may consume it and need reissuance. Registration of the new factor
   is tied to the session that consumed the token and expires after 10 minutes.
   Direct provider enrollment without approval cannot open a workspace, even with
   an AAL2 token. Do not publish the admin token-issuance SQL as an RPC.
5. Configure the environment below and test with dedicated accounts. Apply the
   migration **before deploying**: new code denies AAL2 workspace access if the
   factor-approval database functions are unavailable. This is deliberate, not an
   optional fail-open fallback.
6. Enable security session tracking, then enable the vault only after the tests
   and operational gates below pass. No live project was modified by this work.

## Environment

Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Never use a Supabase service-role key for this application.

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical HTTPS origin, e.g. `https://your-app.vercel.app`; no path/query. Used for recovery and CSP reporting. |
| `SECURITY_DATA_ENABLED=true` | Enable app session inventory/revocation checks after migration. Required for account mutations and the real vault. |
| `VAULT_ENABLED=true` | Explicitly enable real storage after rollout verification. Omit/false until ready. |
| `ENCRYPTION_KEY` | Server-only 32 random bytes encoded as canonical base64. Never prefix with NEXT_PUBLIC. |
| `ENCRYPTION_KEY_ID` | Non-secret version, default `v1`; change when replacing the root key. |
| `ENCRYPTION_PREVIOUS_KEYS` | Optional server-only JSON object of old version IDs to old base64 keys for controlled rotation. Protect exactly like the active key. |
| `SECURITY_REDIS_REST_URL`, `SECURITY_REDIS_REST_TOKEN` | Shared REST limiter credentials; use both, HTTPS origin only. |
| `SECURITY_AUDIT_SINK_URL`, `SECURITY_AUDIT_SINK_TOKEN` | Optional authenticated HTTPS JSON append endpoint; configure storage, retention and alerts at the receiver. |

Generate the encryption key **locally**, for example:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Put the result in the hosting provider's protected environment settings and a
separate encrypted offline backup. Do not paste it into chat, source control,
public build variables, issue trackers, screenshots or logs. Never use a password
or a repeated/zero-filled byte string as the key. Do not generate a new key on each
deployment. Use different keys and Supabase projects for preview/test/production.

Each value gets a fresh 256-bit data key and random 96-bit IV. AES-256-GCM protects
the value; another AES-256-GCM operation wraps the data key using ENCRYPTION_KEY.
Both authenticate the record ID and owner ID. The database holds only ciphertext,
wrapped keys, IVs and tags for values; names, identities and timestamps remain
plaintext metadata. The root key is not in the database. This is **not** an HSM or
managed KMS: app-runtime compromise can access the environment key. JavaScript
strings/SDK/browser copies cannot be guaranteed securely erased. Authorized reveal
necessarily delivers plaintext to a browser; hiding it after 30 seconds cannot
revoke a copy. Do not claim zero-plaintext exposure or end-to-end encryption.

Rotation: securely retain the old key under its old ID in ENCRYPTION_PREVIOUS_KEYS,
set a new random ENCRYPTION_KEY and a new ENCRYPTION_KEY_ID, and redeploy. Newly
created/replaced values use the new key. Existing values require their old key
until explicitly replaced/re-encrypted and backups have aged out. There is no bulk
rewrap tool in this release. Never remove old keys until a restore/decrypt drill
proves they are no longer needed. Changing environment keys does not rotate
credentials at external providers.

## Account recovery and sessions

Set Supabase Site URL to APP_ORIGIN and allow your exact recovery URL. Configure
custom SMTP/delivery and abuse settings as appropriate for your plan. The Supabase
**Reset Password** email template must link to:

```html
<a href="{{ .SiteURL }}/account/recover/?token_hash={{ .TokenHash }}">Reset password</a>
```

The app consumes `type: recovery` only on form POST, not link GET (email scanners
must not consume it). No arbitrary `next` URL is accepted. Query tokens must be
redacted in external access logs; the app uses no-referrer and no-store and never
logs them. Enrolled users must also supply a TOTP code during reset. If a code is
wrong, the email token may already be consumed; request a new link. Unsupported
factors or lost devices need administrative identity-verified recovery, not an MFA
bypass. Secure password-change settings at Supabase may require additional provider
reauthentication; verify those settings against this flow before rollout.

Password change requires an active approved AAL2 session plus the current password,
checked without overwriting its cookies. It revokes app sessions before changing
the password, then requests Supabase global sign-out. A partial provider failure is
shown as an error, not success. App revocation uses both session IDs and an
account-wide authentication-time cutoff, so previously unseen old sessions are
also rejected. All vault SQL operations independently enforce this check.

`/account/` lists the most recent 100 sessions observed by this app, not every
Supabase device. Provider access JWTs can still be valid until expiry for unrelated
services; immediate revocation is enforced by this app/database's checks. Direct
Supabase Auth token issuance and APIs outside this application need their own
controls. Enabling SECURITY_DATA_ENABLED is mandatory to enforce revocation on
sample workspace pages too.

## Access and audit semantics

Team leads create up to 100 secrets each. Owning leads can replace/delete values
and grant/revoke another active member for one hour in the UI (SQL bounds expiry
to 24 hours). The SQL grant limit is 100 recipients per secret. There is no automatic
team-lead access to another owner's secrets; analysts see audit events but do not
implicitly decrypt secrets. Lists are bounded to the latest 100 accessible records.
Use appropriately scoped accounts rather than granting more than a user can review.
This is a single-workspace model, not a multi-tenant organization service.

Creation/replacement/deletion/grants and read authorization insert audit events in
the same PostgreSQL transaction. Failure to append blocks/rolls back the operation.
Application roles cannot directly read/write private tables. Analysts see the most
recent 100 database events at `/audit/`; others see their own. A read-authorization
event means ciphertext retrieval was authorized, not that decryption succeeded.
These logs are append-only **against application roles**, not tamper-proof against
database administrators or backup operators. Logs persist after secret deletion.
Retention, archival, monitoring and independent WORM storage remain operator work.

Authentication events remain redacted stdout JSON and can additionally POST to the
configured sink. The receiver must durably append, deduplicate `Idempotency-Key`,
restrict readers and enforce retention. Failed export emits `audit_export_failed`;
there is no durable retry queue in the app. Configure a platform stdout log drain
and alerts for guaranteed collection. Auth events exported there are not falsely
shown as database vault events in the UI.

## Limiter and outage policy

Shared Redis counters separate account, Vercel ingress IP, and global pressure.
The application trusts the Vercel-overwritten `x-vercel-forwarded-for` only when
running on Vercel. Other hosting/proxies require their own trusted edge limiter;
no arbitrary forwarded header is treated as an IP identity. Global login pressure
is telemetry, not a switch that locks every account. Account/IP attempts are gated.

Valid Redis outages switch to a bounded local limiter and 15-second circuit breaker
with a `rate_limit_degraded` event. Local counters are maintained while Redis is
healthy, so an outage does not reset attempts. Known Redis denials and invalid
configuration stay denied. Local fallback is **not distributed protection** and
cannot guarantee the same limits across serverless instances. Configure Supabase
provider limits and Vercel edge/WAF controls before public real-secret access.

Supabase/auth/database outages fail closed; they cannot safely degrade into cached
roles or unauthenticated reads. Encryption-key failures make values unreadable.
No automatic failover, paid WAF, backups/PITR or availability SLA is provisioned by
this repository.

## Retirement, governance, recovery and release gates

- Run **Retire legacy GitHub Pages** manually in Actions, or unpublish in Settings
  → Pages. The workflow deletes the old site instead of exporting the server app.
  Verify the old URL and nested routes return 404. No live retirement has been
  performed here. Review old exports/history separately and rotate any actually
  exposed credentials; do not rely on deleting a ZIP to revoke a credential.
- Enable private vulnerability reporting, code-owner review, branch protection,
  restricted Actions permissions, secret scanning and administrator MFA in GitHub.
  CODEOWNERS/Dependabot/SHA pins exist in code; repository settings are not enabled
  by adding those files. CI runs Node and isolated Postgres tests plus an SBOM.
- HSTS now includes subdomains/preload eligibility. Ensure every custom-domain
  subdomain supports HTTPS before rollout. This does **not** submit the domain to
  the browser preload list. CSP reporting is untrusted, sanitized telemetry, not
  a vulnerability verdict; route it to your log collector and alert on patterns.
- Assign an incident/recovery owner and record approved RPO/RTO based on an actual
  restore drill. Back up database, migrations, configuration and **all** required
  key versions separately. Restore into an isolated project, verify counts/grants,
  decrypt a known synthetic canary, test denied cross-user access and record elapsed
  time/data loss. Verify provider plan backups/quotas; do not assume free PITR.
- Account takeover: disable membership, revoke app/provider sessions, preserve
  evidence, verify identity before resetting factors, inspect grants and rotate
  exposed downstream credentials. Restoring a DB backup can resurrect old session
  state: revoke all app/provider sessions and re-review memberships after restore.
- Encryption-key exposure: disable VAULT_ENABLED, restrict provider/operator access,
  preserve logs, rotate external credentials and root key, re-encrypt records and
  assess historical backups. Root-key rotation alone does not undo disclosure.
- Rollback: disable VAULT_ENABLED first. Keep approval/session checks and the schema;
  do not deploy old code that omits them or drop the encryption/audit tables.
- Release tests: separate users for all three roles; first-factor bootstrap and
  direct-provider enrollment bypass; TOTP recovery; password change/global sign-out
  across two sessions; denied cross-user read/replace/delete/grant; expiry/revocation;
  audit write failure; Redis outage/recovery; backup/key restore; SMTP delivery;
  alert receipt; production headers and legacy retirement. Obtain independent
  security review before allowing real customer secrets.
