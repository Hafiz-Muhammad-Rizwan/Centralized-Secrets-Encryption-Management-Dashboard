# Vaultline public UI demo

This is a Next.js static export for Vercel or GitHub Pages. It is **not a secrets manager**:
all role routes are public, payloads are fixed sample text, and approval, rotation,
lease, encryption, and audit controls are simulations. Never enter real credentials
or sensitive metadata. Records exist only in memory and reset on navigation/reload;
only the newest 100 are kept. The old plaintext browser store is removed on mount
when browser storage permissions allow it.

```sh
npm ci
npm run dev
npm run test:security
npx eslint src scripts tests
npm run build
```

Deploy only the `out/` produced by `npm run build`. Its final step adds per-document
hash-based script CSP and a no-referrer policy to every HTML page. Running
`next build` directly skips this hardening. Development does not have this CSP.
System fonts avoid a remote font download at build time. `npm start` is not a
static file server. By default, serve `out/` at the domain root (`/`).
The GitHub Pages workflow sets `GITHUB_PAGES=true` to use the repository subfolder
`/Centralized-Secrets-Encryption-Management-Dashboard/` instead.

## Vercel deployment (no Supabase required for the demo)

The committed `vercel.json` selects the static hosting preset, runs `npm run build`
including CSP hardening, and publishes `out/`. Keep the Vercel project Root Directory
at the repository root, where `package.json` and `vercel.json` live. Do not set
`GITHUB_PAGES=true` in Vercel. Push these changes to the connected branch to deploy
them; redeploying an older commit will not include the fix.

The home page and `/login/`, `/team-lead/`, `/developer/`, `/security-analyst/`,
`/provision-secret/`, and `/secrets-directory/` work with sample data and no Supabase
variables. If Vercel still returns its own `404 NOT_FOUND`, check that the production
domain points to the successful deployment of this repository and branch.

When a server backend is added, replace this static hosting configuration and
export-only CSP step with Next.js server deployment and response security headers.

See [SECURITY_APPLIED_PRINCIPLES.md](SECURITY_APPLIED_PRINCIPLES.md) for findings,
verification, risk estimates, and the outstanding production architecture work.
Older coursework documents and ZIP snapshots describe the insecure prototype;
they are historical material, not evidence of working security controls. Do not
redeploy those snapshots. Any real credentials ever entered into an older version
must be rotated at their issuer; deleting browser data does not revoke them.
