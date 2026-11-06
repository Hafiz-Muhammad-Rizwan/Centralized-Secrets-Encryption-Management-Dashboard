> Historical coursework: security claims below describe a simulation, not enforced controls. See [the current security audit](SECURITY_APPLIED_PRINCIPLES.md).

# Development Activity 4 — Dependency Mapping and Failure Analysis

**Semester Project:** Centralized Secrets Encryption Management Dashboard (Vaultline)  
**Academic Activity:** Development Activity 4 — Dependency Mapping and Failure Analysis  
**Group Members:**
- **Member 1:** Hafiz Muhammad Rizwan
- **Member 2:** Zaid Hassan

---

## Part 1 — System Components

The **Vaultline** project is a centralized, role-based secrets management and encryption dashboard. After reviewing all source files (`RoleWorkspace.tsx`, `SecretProvisioningModule.tsx`, `SecretsDirectoryModule.tsx`, `secretsStore.ts`, `login/page.tsx`, and the routing structure under `src/app/`), the following six major components have been identified:

| Symbol | Component Name | Main Responsibility |
|:---:|:---|:---|
| **C1** | Authentication & Role Gateway | Handles user login, credential validation, and role-based routing. Directs users to Team Lead (`/team-lead`), Developer (`/developer`), or Security Analyst (`/security-analyst`) workspaces based on username. Enforces session security with password validation. |
| **C2** | Role Workspace & Navigation Shell | The central dashboard shell rendered by `RoleWorkspace.tsx`. Manages role-specific navigation menus, sidebar links, sub-page routing (Approval Queue, Rotation Schedules, Audit Trail, etc.), global toast notifications, and cross-module navigation state. |
| **C3** | Secret Provisioning Module | The module (`SecretProvisioningModule.tsx`) that allows authorized users to register new cryptographic secrets. Implements form validation (`^[a-z0-9-_]{3,50}$`), live entropy metering, simulated AES-256-GCM encryption, SHA-256 fingerprint generation, and success feedback. |
| **C4** | Secrets Directory & Audit Explorer | The module (`SecretsDirectoryModule.tsx`) providing a searchable, filterable directory of all managed secrets. Supports real-time multi-facet filtering (environment, type, search term), secret inspection via modal, authorized reveal with 10-second auto-masking, clipboard copy, and on-demand key rotation. |
| **C5** | Centralized Secrets Store (localStorage) | The shared state layer (`secretsStore.ts`) that persists all `SecretRecord` objects to browser `localStorage`. Functions `loadSecrets()` and `saveSecrets()` are the single source of truth for all vault data, ensuring C3 and C4 share synchronized state. |
| **C6** | Encryption & Cryptographic Engine | The client-side cryptographic utility embedded within C3. Responsible for entropy scoring, SHA-256 fingerprint simulation, AES-256-GCM ciphertext preview generation, and unique Secret ID (`sec_...`) generation. It is consumed exclusively by the Provisioning Module during secret creation. |

---

## Part 2 — Direct Dependencies

A dependency exists when one component **requires** another to perform its primary function.

| Component | Directly Depends On | Reason |
|:---|:---|:---|
| **C1** (Auth & Role Gateway) | None | C1 operates independently. It validates credentials internally against a hardcoded accounts map and redirects via Next.js router. It has no dependency on any other component to perform its login function. |
| **C2** (Role Workspace Shell) | **C1** | C2 requires C1 to have already authenticated and routed the user. Without a successful login, the workspace routes (`/team-lead`, `/developer`, `/security-analyst`) are never reached. C2 also directly imports and renders C3 and C4 as sub-page components. |
| **C3** (Secret Provisioning Module) | **C5, C6** | C3 depends on C5 (`saveSecrets()`) to persist newly provisioned secrets to the vault. It also depends on C6 (the embedded cryptographic engine) to generate entropy scores, fingerprints, and encrypted ciphertext previews during provisioning. |
| **C4** (Secrets Directory & Audit Explorer) | **C5** | C4 depends on C5 (`loadSecrets()`) to populate its directory table with all existing vault records. Without C5, C4 has no data to display, search, filter, or rotate. |
| **C5** (Centralized Secrets Store) | None | C5 is a pure data persistence layer. It reads from and writes to browser `localStorage` and has no dependency on any other component in the system. |
| **C6** (Encryption & Cryptographic Engine) | None | C6 is a self-contained utility embedded within C3. It performs mathematical entropy and hashing operations that require no external component. |

---

## Part 3 — Dependency Matrix

Key: 1 = direct dependency exists | 0 = no direct dependency | Diagonal = 0 (a component does not depend on itself)

The **row** component depends on the **column** component.

| Row / Column | C1 | C2 | C3 | C4 | C5 | C6 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **C1** (Auth Gateway) | 0 | 0 | 0 | 0 | 0 | 0 |
| **C2** (Role Workspace Shell) | 1 | 0 | 0 | 0 | 0 | 0 |
| **C3** (Secret Provisioning) | 0 | 0 | 0 | 0 | 1 | 1 |
| **C4** (Secrets Directory) | 0 | 0 | 0 | 0 | 1 | 0 |
| **C5** (Secrets Store) | 0 | 0 | 0 | 0 | 0 | 0 |
| **C6** (Crypto Engine) | 0 | 0 | 0 | 0 | 0 | 0 |

Matrix Reading Notes:
- Row C2, Column C1 = 1: The workspace shell depends on the authentication gateway.
- Row C3, Column C5 = 1: The Provisioning Module depends on the Secrets Store to save records.
- Row C3, Column C6 = 1: The Provisioning Module depends on the Crypto Engine to generate fingerprints and entropy.
- Row C4, Column C5 = 1: The Secrets Directory depends on the Secrets Store to load and display records.
- All other entries are 0: No other direct dependencies exist between the remaining component pairs.

---

## Part 4 — Component Failure Analysis

### Failure Scenario 1 — C5: Centralized Secrets Store Fails

**Component that fails:** C5 — Centralized Secrets Store (localStorage)

This can occur when browser storage is disabled by privacy settings, a storage quota is exceeded (typically 5–10 MB), or the localStorage data becomes corrupted (e.g., due to a malformed JSON write).

#### Which components depend directly on it?
- **C3 (Secret Provisioning Module)** — depends on C5 via `saveSecrets()` to persist newly created secrets.
- **C4 (Secrets Directory & Audit Explorer)** — depends on C5 via `loadSecrets()` to populate the entire secrets table.

#### Which additional components could be affected through indirect dependencies?
- **C2 (Role Workspace Shell)** — is indirectly affected because it hosts both C3 and C4. While C2 itself would still render (sidebar, navigation, metrics), the two most important sub-pages it delivers — the Provisioning form and the Secrets Directory — would be degraded or empty.
- **C1 (Auth & Role Gateway)** — is NOT affected. Login operates independently of the storage layer.
- **C6 (Crypto Engine)** — is NOT affected. Entropy calculation, fingerprinting, and ciphertext generation happen in-memory and do not require C5.

#### Which system functions would be disrupted or degraded?

| Function | Impact |
|:---|:---|
| Provisioning a new secret | Fully disrupted. The form may complete validation and call `saveSecrets()`, but the record will not be persisted. On refresh, the provisioned secret is lost. |
| Viewing the Secrets Directory | Fully disrupted. `loadSecrets()` falls back to `INITIAL_SECRETS` (the hardcoded seed list), so the directory still renders with static data, but any secrets provisioned in the current session are invisible. |
| Key rotation (Rotate Secret button) | Fully disrupted. Rotation triggers `saveSecrets()` to update the `lastRotated` timestamp. Without C5, the update is lost on page refresh. |
| Dashboard metrics (Total Secrets, etc.) | Partially degraded. Metrics recompute from in-memory state, so they may be temporarily correct within the session but will revert after reload. |
| Login and role navigation | Not disrupted. C1 and C2's navigation shell are unaffected. |

---

### Failure Scenario 2 — C1: Authentication & Role Gateway Fails

**Component that fails:** C1 — Authentication & Role Gateway (Login Page)

This can occur if the login page fails to render (JavaScript error, route misconfiguration), credential validation logic crashes, or the Next.js router fails to redirect after authentication.

#### Which components depend directly on it?
- **C2 (Role Workspace Shell)** — directly depends on C1 because the workspace routes (`/team-lead`, `/developer`, `/security-analyst`) are only reachable after C1 authenticates and redirects the user.

#### Which additional components could be affected through indirect dependencies?
- **C3 (Secret Provisioning Module)** — indirectly affected. Since C3 is rendered inside C2 and C2 is unreachable without a successful C1 login, C3 becomes completely inaccessible.
- **C4 (Secrets Directory & Audit Explorer)** — indirectly affected for the same reason. C4 is a sub-page within C2; if users cannot log in, they cannot navigate to C4.
- **C5 (Centralized Secrets Store)** — not directly disrupted. The stored data in `localStorage` remains intact. However, since no user can access C3 or C4, no reads or writes will happen.
- **C6 (Crypto Engine)** — not directly disrupted. The logic is inert without user interaction.

#### Which system functions would be disrupted or degraded?

| Function | Impact |
|:---|:---|
| User login and workspace access | Fully disrupted. No user can enter the application. |
| Secret provisioning (C3) | Fully disrupted (indirect). Unreachable without authentication. |
| Secrets directory and audit (C4) | Fully disrupted (indirect). Unreachable without authentication. |
| Role-based access control (Team Lead / Developer / Security Analyst views) | Fully disrupted. Role routing is C1's primary responsibility. |
| Stored vault data in C5 | Preserved but inaccessible. Data remains in localStorage but cannot be read or written without reaching C3/C4. |

Note: Because C1 is the sole entry point to the entire application, its failure effectively takes the whole system offline from the user's perspective, even though the underlying data (C5) and utility logic (C6) remain intact.

---

## Part 5 — Critical Component Identification

**Selected Component: C5 — Centralized Secrets Store (localStorage)**

### Which components depend directly on it?
- **C3 — Secret Provisioning Module** (reads/writes via `saveSecrets()`)
- **C4 — Secrets Directory & Audit Explorer** (reads via `loadSecrets()`)

### Why could its failure have a significant impact on the project?

C5 is the **single source of truth** for all vault data in the Vaultline application. Every secret record — its encrypted payload, SHA-256 fingerprint, rotation policy, environment tag, and access count — is persisted exclusively through C5.

1. **It serves as the integration bridge between C3 and C4.** The core value of the system is that secrets provisioned in C3 immediately appear in C4's directory. This cross-module synchronization is entirely mediated by C5. If C5 fails, the two modules become disconnected and operate on stale, inconsistent, or empty data.

2. **Two of the three most-used functional modules depend on it.** Both the Provisioning Module (C3) and the Secrets Directory (C4) are rendered within the workspace (C2) and accessed by all three user roles (Team Lead, Developer, Security Analyst). Any degradation in C5 propagates visibly to every user session.

3. **Loss of C5 means loss of audit trail.** Because access counts, rotation timestamps, and newly provisioned secrets are stored in C5, a failure corrupts the integrity of the audit record — a critical concern for a security-focused system.

While C1 (Authentication) could also be considered critical — since its failure prevents any user from entering the system — C5 is selected as the more architecturally significant component because its failure degrades **core data integrity** even when users are already authenticated and active in the system.

---

## Part 6 — Failure-Handling Strategy

**Component that may fail:** C5 — Centralized Secrets Store (localStorage)

### Proposed Strategy: Multi-Layer Storage Fallback with Session Memory Cache

The proposed strategy combines three layers of redundancy to ensure the system degrades gracefully rather than failing catastrophically:

#### Layer 1 — In-Memory Session Cache (Primary Mitigation)
Maintain an in-memory JavaScript array (`sessionCache`) as an active mirror of all secrets during the user's session. On every `saveSecrets()` call, the record is written both to `localStorage` (C5) **and** to `sessionCache`. If `localStorage` throws an error (quota exceeded, storage disabled), the write to `sessionCache` still succeeds, keeping the current session fully functional. All reads (`loadSecrets()`) check `sessionCache` first before falling back to `localStorage`.

```typescript
// Pseudocode for resilient secrets store
let sessionCache: SecretRecord[] | null = null;

export function loadSecrets(): SecretRecord[] {
  if (sessionCache) return sessionCache;           // Layer 1: in-memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY); // Layer 2: localStorage
    sessionCache = raw ? JSON.parse(raw) : INITIAL_SECRETS;
  } catch {
    sessionCache = INITIAL_SECRETS;                // Layer 3: fallback seed data
  }
  return sessionCache;
}

export function saveSecrets(secrets: SecretRecord[]): void {
  sessionCache = secrets;                           // Always update in-memory
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
  } catch (e) {
    console.warn("localStorage unavailable — operating from session cache only.");
    // Show a non-blocking user banner: "Changes are saved for this session only."
  }
}
```

#### Layer 2 — Non-Blocking User Warning Banner
If `localStorage` writes consistently fail (detected after the first failed `try/catch`), display a persistent but non-blocking amber warning banner at the top of the workspace: *"Persistent storage is unavailable. Your changes are saved for this session but will not survive a page refresh."* This is consistent with the system's security-first UX philosophy: inform users without halting their work.

#### Layer 3 — Graceful Fallback to Seed Data
If both `sessionCache` and `localStorage` are unavailable (e.g., fresh page load with storage disabled), the `INITIAL_SECRETS` seed array provides a static baseline. The Secrets Directory (C4) still renders with demonstration data, making the application usable for read-only exploration even under full storage failure.

### How would this strategy reduce the impact?

| Scenario | Without Strategy | With Strategy |
|:---|:---|:---|
| localStorage quota exceeded | Secrets silently lost; directory shows stale data | In-memory cache absorbs all writes; user is warned but session remains fully functional |
| localStorage disabled by browser policy | All provisioning fails silently | Session cache keeps new secrets available for current session |
| JSON parse corruption on load | Exception crashes the load call; app may throw | try/catch catches the error and falls back to INITIAL_SECRETS |
| Page refresh with storage failure | All session data lost | Session data is lost (expected behavior); warning banner prepared users in advance |

### Would the entire system need to stop?

No. With this strategy:
- **C1 (Auth)** and **C2 (Role Workspace Shell)** continue operating normally.
- **C4 (Secrets Directory)** continues to display data (from session cache or seed data), filter secrets, and open inspection modals.
- **C3 (Secret Provisioning Module)** continues to accept inputs, generate fingerprints, and calculate entropy. Provisioned secrets are stored in session memory and visible in C4 within the same session.
- Only **cross-session persistence** is lost — a clearly communicated degradation, not a crash.

The system transitions from a persistence failure to a session-only mode, which is a far more graceful and user-friendly outcome.

---

## Part 7 — Dependency Graph

The following directed graph represents the dependencies identified in Parts 2 and 3. An arrow from component A -> B means A depends on B (A requires B to function).

```
+-----------------------------------------------------------------------+
|               VAULTLINE - DEPENDENCY GRAPH                            |
|                                                                       |
|   +----------------+                                                  |
|   |       C1       |   (no outgoing dependencies)                     |
|   |  Auth & Role   |                                                  |
|   |    Gateway     |                                                  |
|   +-------+--------+                                                  |
|           |   (C2 depends on C1)                                      |
|           v                                                           |
|   +----------------+                                                  |
|   |       C2       |   Role Workspace & Navigation Shell              |
|   |  (Dashboard    |                                                  |
|   |    Shell)      |                                                  |
|   +-------+--------+                                                  |
|           |   (C2 hosts and renders C3 and C4)                        |
|      +----+----+                                                      |
|      v         v                                                      |
|  +-------+  +-------+                                                 |
|  |  C3   |  |  C4   |                                                 |
|  |Secret |  |Secret |                                                 |
|  |Provis.|  | Dir.  |                                                 |
|  +---+---+  +---+---+                                                 |
|      |           |                                                    |
|      |           |   (Both C3 and C4 depend on C5)                   |
|      +-----+-----+                                                    |
|            v                                                          |
|   +----------------+                                                  |
|   |       C5       |   Centralized Secrets Store (localStorage)       |
|   |  (Data Layer)  |   <<< CRITICAL COMPONENT >>>                    |
|   +----------------+                                                  |
|                                                                       |
|  C3 also depends on C6:                                               |
|                                                                       |
|  +-------+                                          +--------+        |
|  |  C3   | ---------------------------------------->|   C6   |        |
|  |Secret | (C3 depends on C6 for crypto operations) | Crypto |        |
|  |Provis.|                                          | Engine |        |
|  +-------+                                          +--------+        |
+-----------------------------------------------------------------------+
```

### Graph in Textual Arrow Notation:

```
C2  ->  C1     (Role Workspace depends on Auth Gateway)
C3  ->  C5     (Provisioning Module depends on Secrets Store)
C3  ->  C6     (Provisioning Module depends on Crypto Engine)
C4  ->  C5     (Secrets Directory depends on Secrets Store)
```

Components with no outgoing edges (no dependencies): C1, C5, C6
Most depended-upon component (most incoming edges): C5 (2 direct dependents: C3, C4)

---

## Final Reflection

Performing a structured dependency mapping of the Vaultline project revealed that **C5 (the Secrets Store)** is a hidden single point of failure that is not immediately obvious from looking at the user interface alone — two major modules silently depend on it without any built-in resilience. It also made clear that **C1 (Authentication)**, while appearing simple, acts as a total gate that prevents all downstream components from functioning if it fails, even though those components themselves are architecturally sound and their data remains intact. This analysis directly improved the system's reliability design by motivating the multi-layer fallback storage strategy in Part 6, and it highlighted that security and reliability are deeply intertwined: a storage failure in a secrets management system is not just a UX inconvenience — it is a potential audit integrity and data availability risk that demands an explicit mitigation plan.

---

## Appendix — Component-to-Source File Map

| Symbol | Component | File(s) | Type |
|:---:|:---|:---|:---|
| C1 | Authentication & Role Gateway | `src/app/login/page.tsx` | Next.js Page Component |
| C2 | Role Workspace & Navigation Shell | `src/components/RoleWorkspace.tsx` | React Component (1,487 lines) |
| C3 | Secret Provisioning Module | `src/components/SecretProvisioningModule.tsx` | React Component (524 lines) |
| C4 | Secrets Directory & Audit Explorer | `src/components/SecretsDirectoryModule.tsx` | React Component |
| C5 | Centralized Secrets Store | `src/components/secretsStore.ts` | TypeScript Utility / Data Layer (153 lines) |
| C6 | Encryption & Cryptographic Engine | Embedded in `SecretProvisioningModule.tsx` | Client-side Utility Functions |
