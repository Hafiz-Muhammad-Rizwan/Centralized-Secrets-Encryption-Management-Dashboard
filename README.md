# Vaultline public UI demo

This is a Next.js static export for GitHub Pages. It is **not a secrets manager**:
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
static file server; serve `out/` under the configured production base path:
`/Centralized-Secrets-Encryption-Management-Dashboard/`.

See [SECURITY_APPLIED_PRINCIPLES.md](SECURITY_APPLIED_PRINCIPLES.md) for findings,
verification, risk estimates, and the outstanding production architecture work.
Older coursework documents and ZIP snapshots describe the insecure prototype;
they are historical material, not evidence of working security controls. Do not
redeploy those snapshots. Any real credentials ever entered into an older version
must be rotated at their issuer; deleting browser data does not revoke them.
