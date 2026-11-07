# Enable real password login

This version uses Next.js on Vercel, not a static export. Authentication and route
roles are real; the vault payloads, approvals, rotation and event lists still use
sample data. No real secret storage has been implemented.

## 1. Vercel environment variables

Keep the two variables you already added, scoped to Production:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your project's `sb_publishable_...` key |

No project ID, database password or service-role/secret key is needed by this app.
It calls Supabase only from the server, using the signed-in user's session and
Row Level Security. Never put privileged keys in a `NEXT_PUBLIC_` variable.

For local development put the same two variables in an ignored `.env.local` file.
Production and previews should use separate projects if preview code is untrusted.
No secrets or working account credentials are committed to this repository.

## 2. Create the role table once

In Supabase open **SQL Editor → New query**. Paste the entire contents of
[`supabase/migrations/202611060001_workspace_members.sql`](supabase/migrations/202611060001_workspace_members.sql)
and Run. Run it once in the correct project. It deliberately fails if the table
already exists so an existing schema is not silently overwritten.

The table has RLS enabled. Authenticated users can read only their own assignment;
they cannot insert, modify, activate or delete assignments. Anonymous users have
no table access. User-editable `user_metadata` is never trusted for roles.

## 3. Create each login account

In Supabase **Authentication → Users → Add user → Create new user**, create an
account using that person's email address and a unique strong password. For this
administrator-provisioned password flow, confirm the account using the dashboard's
confirmation option. Share the password securely with its owner, not through Git
or this chat. No email verification/callback or password-reset UI is implemented yet.

Under Authentication settings, keep email/password sign-in enabled and disable
new public user signups for this administrator-managed application. A self-created
account without a role assignment cannot enter any workspace, even if signups
were left enabled. Keep Supabase auth rate limits enabled; configure appropriate
edge rate limits for the login server action before broader public use.

Set Authentication → URL Configuration → Site URL to your production Vercel URL,
for example `https://centralized-secrets-encryption-mana.vercel.app`.
This password-only flow does not need a redirect callback allowlist entry yet.

## 4. Assign the role through SQL Editor

Copy the user's UUID from Authentication → Users. Replace the placeholder below
with that UUID, choose exactly one role, then execute as the project administrator:

```sql
insert into public.workspace_members (user_id, role, active)
values ('REPLACE_WITH_USER_UUID', 'team_lead', true);
```

| Person / responsibility | Role value | Workspace |
| --- | --- | --- |
| Hafiz / team lead | `team_lead` | `/team-lead/` |
| Rizwan / developer | `developer` | `/developer/` |
| Zaid / security analyst | `security_analyst` | `/security-analyst/` |

Repeat for each account. These names are examples, not built-in credentials.
Login uses the account's **email and password**, not the displayed sample names.
Provisioning and directory routes require `team_lead`.

To disable access, run:

```sql
update public.workspace_members
set active = false
where user_id = 'REPLACE_WITH_USER_UUID';
```

To change an existing role, use an explicit UPDATE of the selected UUID rather
than rerunning the CREATE TABLE migration. Role/active state is queried again on
every protected server request. Already-rendered sample UI remains in the browser
until navigation/reload; it contains no real vault data.

## 5. Deploy the updated code

Commit and push the code and migration to Vercel's connected branch. The committed
`vercel.json` now selects **Next.js**, with `npm run build`; there is no `out` output
directory override. In Vercel remove any manually configured output-directory
setting of `out` and leave the framework's output setting at its default. Root
Directory stays the repository root. A successful new deployment is required.

The app lives at `/`; old repository-prefixed URLs redirect to their root-level
counterparts. GitHub Actions now validates the server build and does not publish
GitHub Pages. If the old Pages deployment still exists, unpublish it separately;
old static artifacts cannot provide the new authentication boundary.

## 6. Verify using separate browser sessions

1. Open `/team-lead/` while signed out: expect a redirect to `/login/`.
2. Enter an incorrect password: expect a generic error and no workspace access.
3. Sign in with a confirmed, active developer account: complete authenticator
   enrollment/verification at `/mfa/`, then expect `/developer/`.
4. Open `/team-lead/` or `/provision-secret/` as that developer: expect a redirect
   to `/developer/`, not the team-lead view.
5. Sign out, then reload a protected URL: expect `/login/`.
6. Disable that user's membership in SQL and request a protected page again:
   expect `/login/`. A missing role table or database outage must also deny access.

The server never returns Supabase access/refresh tokens to client JavaScript.
Cookies are HttpOnly, Secure in production and SameSite=Lax. Proxy refreshes
sessions; each page independently verifies the user through Supabase `getUser`
and checks membership. Auth responses are not shared-cacheable. Server Actions
provide framework origin checks; no custom cross-origin login endpoint exists.

Sign-out revokes the current Supabase refresh session and clears its cookies;
other devices are intentionally unaffected. Supabase access-token revocation
semantics still apply: a copied access token may remain valid until expiry. Do
not describe this as instant revocation of all stolen tokens. TOTP MFA is required
for workspace access. Enterprise session controls, CAPTCHA and vault encryption
remain outside this implementation.

## Validation limits

Automated tests cover absent/forged users, unauthorized/inactive/unknown roles,
database/network failures, wrong-role redirects, credential bounds, generic login
failures, and cookie settings. A production build and signed-out HTTP checks are
run locally. End-to-end login and live RLS verification require your configured
project, this migration and actual accounts; they have not been claimed as tested.

### Local verification completed

- `npm run build`: passed with all application routes dynamically rendered.
- `npm run test:security`: 18 tests passed (including retained demo regression tests).
- Application/scripts/tests/config ESLint and `git diff --check`: passed.
- Production server: all five workspace URLs redirected anonymous requests to
  login; `/` redirected to login; email/password form returned HTTP 200 with
  non-cacheable responses and a nonce-based CSP.
- Browser: login form rendered and Show/Hide Password interacted successfully
  under the production CSP. With missing environment values, sign-in is disabled.
- Password login is reported working by the owner. Live TOTP enrollment/recovery,
  SQL/RLS verification and deployment of these changes remain unverified here.

## Security-hardening rollout (mandatory MFA)

Supabase's [TOTP MFA API](https://supabase.com/docs/guides/auth/auth-mfa/totp)
is free to use (verified 2026-11-07). Codes are generated locally in each user's
authenticator app, without email or SMS delivery. Other hosting/usage limits still
apply. Each account needs its own authenticator; do not share a code per role.
A fixed second password is not MFA because both credentials are knowledge factors
([NIST explanation](https://www.nist.gov/blogs/cybersecurity-insights/back-basics-whats-multi-factor-authentication-and-why-should-i-care)).

The latest review requires **AAL2** for every workspace. Password sign-in now takes
users to `/mfa/`; users without a factor click **Set up authenticator**, scan the
QR code in their authenticator app and verify its six-digit code. Existing TOTP
users enter their code. After verification they reach their assigned workspace.
The header now shows the verified account email instead of fictional sample names.

Before deploying, confirm in Supabase Authentication that TOTP enrollment and
verification are enabled. Keep the existing two Supabase environment variables and
membership table. No extra SQL migration or privileged Supabase API key is needed.
Test with a designated account first, including enrollment, returning-user login,
wrong code, wrong-role URL, sign-out and an inactive membership. Coordinate the MFA
change with existing users; do not deploy without a recovery owner available.

The app cannot remove a verified authenticator with only a password. If a user
loses their device, an administrator must verify their identity outside this app
before recovering their factor through Supabase's administrative facilities. Do
not delete other users' factors or disable verification merely to bypass errors.
Only the enrolling owner's *unverified* TOTP attempts can be replaced by the setup
action. Administrators should pre-provision/verify identity carefully: stolen
passwords before first enrollment remain a bootstrap risk.

### Shared rate limiting (recommended before wider access)

Supabase's own Auth rate limits remain essential, including for requests made
directly to Supabase. The application now also limits password attempts, TOTP
checks and enrollment. Without shared configuration its counters are bounded
**per-process** only and reset with serverless instances; they are not distributed
protection. To use the atomic shared implementation, configure an Upstash-compatible
Redis REST database and add both server-only Vercel variables:

| Variable | Value |
| --- | --- |
| `SECURITY_REDIS_REST_URL` | Your Redis HTTPS REST endpoint |
| `SECURITY_REDIS_REST_TOKEN` | Its REST token permitted to execute the limiter's EVAL/INCR/PEXPIRE commands |

Do not prefix these with `NEXT_PUBLIC_`. Do not use the read-only Redis token.
Counters use SHA-256 identities, not raw emails; these hashes are pseudonyms,
not encrypted personal data. If either variable is set but the other is absent,
or if the configured service is unavailable, auth attempts fail closed. Configure
and test both together before enabling in production. Existing signed-in page
reads do not require Redis. The fixed limits are 10 attempts/account/15 minutes,
100 password attempts total/minute, 10 MFA checks/user/5 minutes and 3 enrollments/
user/15 minutes. These are small-workspace defaults, not capacity guarantees.

Set appropriate Vercel edge/firewall limits as well. Application counters cannot
prevent request floods from reaching the function, and account/global limits can
be exhausted by an attacker to temporarily disrupt legitimate sign-in.

### Security logs

Security events are emitted as JSON server logs with `type: security`, a unique
ID, timestamp, event name and optionally verified user UUID. Passwords, emails,
tokens, MFA codes/seeds and raw error bodies are excluded. Configure export,
restricted access, retention and alerting outside the app. These logs are not
immutable and are not yet wired to the sample audit-trail table in the UI.

### Configuration and database permission checks

The app accepts publishable keys and legacy `anon` JWT keys only; secret keys and
legacy `service_role` keys are rejected. Legacy payload inspection is only a
configuration check, not JWT authentication: Supabase validates the API key.
Service URLs must be HTTPS origins with no credentials, path, query or fragment.
Use the canonical Supabase/Redis endpoints: credential-bearing requests reject
redirects. No additional Supabase key is needed for these changes.

Run `supabase/checks/workspace_permissions.sql` in the Supabase SQL Editor as the
project administrator. This is a read-only inspection, not a migration. All checks
in its first result should be true. Its second result should contain only the
authenticated own-row SELECT policy. If the editor displays only the last result,
run the two SELECT statements separately. Review any extra policies or failed checks
before rollout; do not automatically broaden permissions to fix a login error.

The script has not been executed against your database here. Even if its catalog
checks pass, verify with two real user sessions that neither can read another
user's assignment or change their own role. Also test disabled membership. These
checks cover the membership table only, not other project tables, views or functions.
