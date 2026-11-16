# Activity 6 Task 3 — Frontend–Backend Integration

This document records the end-to-end integration of the frontend user interfaces with the real Supabase PostgreSQL database backend for **Secure Software Development – Development Activity 6 Task 3**.

---

## 1. Objective & Scope

Task 3 requires transforming the frontend prototype from prior activities into a live, fully functional web application connected to the backend database. All mock and hardcoded data in the module workflows have been replaced with live database queries and server-side operations, complete with proper error handling, loading states, and user feedback.

---

## 2. Requirement-by-Requirement Implementation

### Requirement 1: Replace relevant hardcoded or mock data with actual backend responses

- **Secrets Directory Table (`SecretsDirectoryModule.tsx`):**
  - Previously in Activity 3, the table was loaded with 7 hardcoded records from `INITIAL_SECRETS`.
  - In this integration, `SecretsDirectoryModule` fetches live database rows on mount using the `listSecrets()` server action (which queries `vault_private.secrets` via `public.vault_list_modules()`).
  - The list contains only secrets owned by or granted to the authenticated user.
  - No ciphertext or mock data is returned in the list response.

- **Dynamic Metric Counters (`SecretsDirectoryModule.tsx`):**
  - Metrics ("Total Secrets", "PROD", "STAGING", "DEV", and "Access Events") are now computed dynamically from the live array of database records retrieved from PostgreSQL:
    - Total Secrets = `allDisplaySecrets.length`
    - Production Secrets = `allDisplaySecrets.filter(s => s.env === "PROD").length`
    - Staging Secrets = `allDisplaySecrets.filter(s => s.env === "STAGING").length`
    - Development Secrets = `allDisplaySecrets.filter(s => s.env === "DEV").length`
    - Total Access Events = sum of durable audit events from `vault_private.events`

- **Workspace Overview Dashboard (`RoleWorkspace.tsx`):**
  - Integrated a live database status indicator in the spotlight cards that queries the backend on mount and after mutations, displaying:
    `"X encrypted secrets in PostgreSQL vault"` and `"Vault connected • Ready to provision"`.

---

### Requirement 2: Send information from frontend forms to the backend

- **Secret Provisioning Form (`SecretProvisioningModule.tsx`):**
  - Submits the form data directly to the `provisionSecret()` server action (and `POST /api/provision-secret`).
  - Fields transmitted:
    - `name`: Sanitized, lowercase alphanumeric identifier (`^[a-z0-9_-]{3,50}$`).
    - `value`: Plaintext credential (enforces min length 8, max 4096 characters, never logged or exposed in transit).
    - `env`: Cloud environment (`PROD`, `STAGING`, or `DEV`).
    - `type`: Secret classification (`API Key`, `DB Credential`, `SSH Key`, etc.).
    - `service`: Associated workload name (`^[A-Za-z0-9 ._/&-]{3,100}$`).
    - `rotationPolicy`: Rotation schedule (`30 Days`, `60 Days`, `90 Days`, `180 Days`).
  - The server verifies caller role (`team_lead`), generates a UUID, envelope-encrypts the payload using AES-256-GCM, and inserts the record into PostgreSQL `vault_private.secrets` via `vault_create_module`.

- **On-Demand Key Rotation Action (`SecretsDirectoryModule.tsx`):**
  - Sends `{ id, expectedVersion }` to `rotateSecret()` / `POST /api/secrets-directory`.
  - Triggers server-side decryption, re-encryption with a fresh data key, and an optimistic concurrency version update in PostgreSQL (`vault_rotate_module`).

- **Permanent Secret Deletion Action (`SecretsDirectoryModule.tsx`):**
  - Sends `{ id }` to `deleteSecret()` / `DELETE /api/secrets-directory`.
  - Executes `public.vault_delete(secret_id)` in PostgreSQL, deleting the secret row and appending an immutable `'secret_deleted'` audit event.

---

### Requirement 3: Retrieve stored records from the backend and display them in appropriate interfaces

- **Directory Interface (`SecretsDirectoryModule.tsx`):**
  - Retrieves stored database records and displays them in a responsive 6-column data table showing Name, Service, Type, Environment pill, Last Rotated timestamp, Version, and Access Count.
  - Inspection modal displays persistent UUID and SHA-256 key fingerprint stored in the database.
  - Authorized payload reveal retrieves the stored envelope from `vault_read(id)`, checks access permissions, decrypts on the server, and returns the plaintext with an automatic 10-second auto-masking countdown.

- **Provisioning Interface (`SecretProvisioningModule.tsx`):**
  - Directly queries `getRecentProvisions()` on mount and after form submissions.
  - Renders a live **"Database Vault Stored Secrets"** card showing the user's latest stored records retrieved from PostgreSQL, complete with an on-demand refresh trigger.

---

### Requirement 4: Handle successful and unsuccessful responses

- **Loading & Processing States:**
  - `submitting` state on the provision form disables inputs and changes the submit button text to *"Encrypting & Storing in Database…"*.
  - `backendLoading` state in the directory shows a loading card: *"Loading secrets from the encrypted vault… Requesting authorized records from PostgreSQL."*.
  - `revealing` state on the reveal button shows *"Decrypting…"*.
  - `rotatingId` state on the rotate button shows *"Rotating…"*.
  - `deletingId` state on the delete button shows *"Deleting…"*.
  - `loadingRecent` state in the provisioning module shows *"Querying database vault records…"*.

- **Unsuccessful Operations Handling:**
  - Client-side input validation errors prevent submission and display an explicit error callout list.
  - Server-side validation errors, quota rejections, or database outages return structured `{ error: string }` responses.
  - Errors fail closed safely without leaking technical exception stacks or SQL table structures.
  - Form remains populated when a server error occurs so the user does not lose their input.
  - Directory displays an empty/error state when no records match or when the database query fails.

---

### Requirement 5: Display appropriate messages when operations succeed or fail

- **Success Messages:**
  - **Provisioning:** Toast *"Secret '<name>' encrypted and stored in the database."* + "Recently Provisioned" card displayed with generated Database ID.
  - **Payload Reveal:** Toast *"Plaintext decrypted from the vault with a 10s auto-masking timer."*
  - **Payload Auto-Mask:** Toast *"Secret payload auto-masked for security."*
  - **Secret Rotation:** Toast *"Secret re-encrypted and rotated in the database."*
  - **Secret Deletion:** Toast *"Secret deleted from database."*

- **Failure Messages:**
  - **Invalid inputs:** *"Secret details are invalid. Check the identifier, payload, environment, classification, service, and rotation policy."*
  - **Access denied / Non-team-lead:** *"Unable to complete this operation. Check your access or contact the administrator."*
  - **Database outage / network disconnect:** Safe generic message: *"The backend could not store this secret. Check your connection and try again."*

---

## 3. Dedicated Route Integration

The application routes have been unified so that both navigation models work seamlessly:

1. **Embedded Workspace Navigation:**
   - Within `/team-lead`, the Team Lead workspace sidebar includes **"Provision secret"** and **"Secrets inventory"**.
   - Within `/developer`, the Developer workspace sidebar includes **"Secrets inventory"** (with read/inspect access to authorized secrets).
2. **Direct Route URLs:**
   - `/provision-secret`: Direct access route for Team Leads to provision secrets.
   - `/secrets-directory`: Direct access route for authorized workspace members to browse the secrets directory.
3. **REST API Endpoints:**
   - `/api/provision-secret`: `GET` (retrieve recent stored secrets) & `POST` (provision encrypted secret).
   - `/api/secrets-directory`: `GET` (list secrets), `POST` (rotate secret), `DELETE` (delete secret).

---

## 4. Verification Evidence

All automated verification checks run and pass with zero errors:

```sh
# Security & Integration Unit Tests (53 tests passing)
npm run test:security

# TypeScript Typecheck (0 errors)
npx tsc --noEmit

# ESLint (0 errors)
npm run lint

# Next.js Production Build (Clean build)
npm run build
```

The test suite in `tests/integration.test.mjs` directly verifies:
- End-to-end form data submission, envelope encryption, and database insertion.
- Retrieval of stored database records replacing mock data in the frontend table.
- Graceful handling of unsuccessful responses with safe messaging.
- Optimistic version checking, re-encryption on rotation, and permanent database deletion.
