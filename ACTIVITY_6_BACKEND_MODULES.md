# Activity 6 Task 2 — Individual Backend Module Development & Integration

This document records the complete, database-backed implementation and integration of the two Activity 3 modules for Development Activity 6 Task 2. Both modules communicate with the same Supabase PostgreSQL database, share the same server-side cryptographic envelope architecture, enforce role-based access control, and handle success and error states without mock fallbacks.

---

## 1. Shared Backend Infrastructure

- **Database:** Supabase PostgreSQL instance, storing records in `vault_private.secrets` and audit trails in `vault_private.events`.
- **Database Migrations:**
  - `supabase/migrations/202611070002_vault_security.sql`: Core vault tables, RLS policies, session verification, and cryptographic RPCs.
  - `supabase/migrations/202611080003_module_backend.sql`: Metadata columns (`secret_type`, `environment`, `service`, `rotation_policy`), module-specific RPC functions (`vault_create_module`, `vault_list_modules`, `vault_rotate_module`).
- **Cryptographic Envelope:** Node.js AES-256-GCM envelope encryption (`src/lib/vault/crypto.ts`). Root key stored exclusively in server environment variable `ENCRYPTION_KEY`.
- **Authorization & Security:** Supabase Auth session with verified AAL2 (TOTP) factor, forced Row Level Security (RLS), role validation (`team_lead` required for creation, rotation, and deletion), and parameterized SQL / PLpgSQL stored procedures preventing SQL injection.

---

## 2. Module 1: Secret Provisioning Module

- **Responsible Member:** Hafiz Muhammad Rizwan
- **Frontend Component:** `src/components/SecretProvisioningModule.tsx`

### Operations Implemented:
1. **Insert / Submit Operation:**
   - **Server Action:** `provisionSecret(input)` in `src/app/provision-secret/actions.ts`
   - **REST API Endpoint:** `POST /api/provision-secret`
   - **Server Logic:** `provisionModuleSecret(input)` in `src/lib/vault/modules.ts`
   - **Database RPC:** `public.vault_create_module(uuid, text, jsonb, text, text, text, text)`
   - **Workflow:**
     1. Client validates identifier (`^[a-z0-9_-]{3,50}$`), payload bounds, environment (`PROD`/`STAGING`/`DEV`), classification, service, and checks against script injection.
     2. Server re-validates all parameters, checks `team_lead` role, verifies MFA session, enforces rate limits, and generates a random UUID.
     3. Plaintext payload is envelope-encrypted with AES-256-GCM before database insertion.
     4. Database RPC validates envelope schema, metadata constraints, and user quota (< 100 secrets) before transactional insert into `vault_private.secrets` and append to `vault_private.events`.
     5. Frontend displays immediate success feedback with the generated database ID, version, and encrypted confirmation toast.

2. **Retrieve Stored Data Operation:**
   - **Server Action:** `getRecentProvisions(limit)` in `src/app/provision-secret/actions.ts`
   - **REST API Endpoint:** `GET /api/provision-secret`
   - **Server Logic:** `getRecentModuleSecrets(limit)` in `src/lib/vault/modules.ts`
   - **Database RPC:** `public.vault_list_modules()` filtered by caller ownership
   - **Workflow:**
     1. On mount and after each successful provisioning, component queries the backend for the user's stored secrets.
     2. Database records are fetched and rendered under "Database Vault Stored Secrets" card with live reload capability.
     3. Successful responses display database record names, environment tags, version numbers, services, and timestamps.
     4. Unsuccessful responses or network outages render informative inline error messages.

---

## 3. Module 2: Secrets Directory & Audit Explorer

- **Responsible Member:** Zaid Hassan
- **Frontend Component:** `src/components/SecretsDirectoryModule.tsx`

### Operations Implemented:
1. **Retrieve Stored Data Operation:**
   - **Server Actions:**
     - `listSecrets()`: retrieves visible records via `vault_list_modules()`.
     - `revealSecret(id)`: retrieves decrypted payload on demand via `vault_read(id)`.
   - **REST API Endpoint:** `GET /api/secrets-directory`
   - **Database RPCs:** `public.vault_list_modules()`, `public.vault_read(uuid)`
   - **Workflow:**
     1. On mount, `listSecrets` queries the PostgreSQL database for all secrets owned by or granted to the user. Plaintext/ciphertext is never exposed in the list endpoint.
     2. Table renders stored metadata (name, classification, environment, service, version, update date, audit access count).
     3. Clicking "Inspect" opens a modal. Clicking "Reveal Payload" calls `revealSecret(id)`, which logs an authorized read event to `vault_private.events` before decrypting and starting a 10-second auto-mask countdown timer.

2. **Update / Rotate Operation:**
   - **Server Action:** `rotateSecret(id, version)` in `src/app/secrets-directory/actions.ts`
   - **REST API Endpoint:** `POST /api/secrets-directory`
   - **Server Logic:** `rotateModuleSecret(id, version)` in `src/lib/vault/modules.ts`
   - **Database RPC:** `public.vault_rotate_module(uuid, integer, jsonb)`
   - **Workflow:**
     1. Team lead triggers "Rotate Secret Now".
     2. Server verifies caller ownership, fetches the existing envelope, decrypts, and re-encrypts with a brand new data key.
     3. Stored procedure enforces optimistic concurrency via `expected_version`, increments version, updates `updated_at`, and logs `'secret_rotated'`.
     4. Directory reloads automatically to reflect the new version number and timestamp.

3. **Delete Operation:**
   - **Server Action:** `deleteSecret(id)` in `src/app/secrets-directory/actions.ts`
   - **REST API Endpoint:** `DELETE /api/secrets-directory`
   - **Server Logic:** `deleteModuleSecret(id)` in `src/lib/vault/modules.ts`
   - **Database RPC:** `public.vault_delete(uuid)`
   - **Workflow:**
     1. Team lead clicks "Delete" in the inspection modal with confirmation protection.
     2. Server verifies caller ownership and role, calling `public.vault_delete`.
     3. Record is deleted from `vault_private.secrets`, and a `'secret_deleted'` event is durably recorded in `vault_private.events`.
     4. Directory modal closes and table refreshes immediately.

---

## 4. Endpoints & Request-Handling Summary

| Module | Action / Route | HTTP Method | Operation Type | Database Target |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** (Hafiz Muhammad Rizwan) | `provisionSecret` / `/api/provision-secret` | `POST` | Insert / Submit | `vault_create_module` RPC |
| **Module 1** (Hafiz Muhammad Rizwan) | `getRecentProvisions` / `/api/provision-secret` | `GET` | Retrieve Stored Data | `vault_list_modules` RPC |
| **Module 2** (Zaid Hassan) | `listSecrets` / `/api/secrets-directory` | `GET` | Retrieve Stored Data | `vault_list_modules` RPC |
| **Module 2** (Zaid Hassan) | `revealSecret` | `POST` | Retrieve / Decrypt | `vault_read` RPC |
| **Module 2** (Zaid Hassan) | `rotateSecret` / `/api/secrets-directory` | `POST` | Update / Re-encrypt | `vault_rotate_module` RPC |
| **Module 2** (Zaid Hassan) | `deleteSecret` / `/api/secrets-directory` | `DELETE` | Delete Record | `vault_delete` RPC |

---

## 5. Verification & Testing

All security tests, TypeScript compilation, and Next.js production builds execute cleanly:

```sh
# Run security and module unit tests (49 passing tests)
npm run test:security

# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

Database security tests in `tests/sql/vault-security.sql` verify:
- Parameterized metadata insertion (`vault_create_module`).
- Metadata persistence in `vault_private.secrets`.
- Valid listing without ciphertext leakage (`vault_list_modules`).
- Optimistic version increment on rotation (`vault_rotate_module`).
- Rejection of invalid environments, unauthenticated access, and cross-owner mutations.
- Owner-only permanent deletion with audit logging (`vault_delete`).
