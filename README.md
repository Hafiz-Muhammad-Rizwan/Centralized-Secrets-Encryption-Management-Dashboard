# Vaultline authenticated workspace

Next.js application deployed on Vercel with Supabase email/password authentication.
Every workspace route verifies the user on the server and checks an active,
administrator-assigned database role. Direct URLs do not bypass authentication.

**Vault operations still use samples.** Encryption, approvals, rotation and audit
event lists are simulations. Do not enter real vault secrets or sensitive metadata.

Follow [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) to configure the two Vercel
variables, run the role-table migration, create users and assign their roles.
Missing configuration, unavailable Supabase or missing membership denies access.

```sh
npm ci
npm run dev
npm run test:security
npx eslint src scripts tests next.config.ts
npm run build
npm start
```

Deployment requires a server. `vercel.json` selects Next.js, not static hosting.
There is no `out/` output or GitHub Pages deployment. The app runs at the domain
root. Legacy repository-prefixed URLs redirect to root-level counterparts.
Proxy applies a per-request nonce CSP and private/no-store response headers.

See [SECURITY_APPLIED_PRINCIPLES.md](SECURITY_APPLIED_PRINCIPLES.md) for the original
audit and the authentication update. Historical coursework, ZIPs and static
exports describe older versions; do not redeploy them. Revoke any live credentials
that were entered into an older plaintext-storage version.
