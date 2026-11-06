> Historical coursework: security claims below describe a simulation, not enforced controls. See [the current security audit](SECURITY_APPLIED_PRINCIPLES.md).

# Development Activity 3 — Parallel Module Development and Integration

**Semester Project:** Centralized Secrets Encryption Management Dashboard (Vaultline)  
**Academic Activity:** Development Activity 3 — Parallel Module Development and Integration  
**Group Members:**  
- **Member 1:** Hafiz Muhammad Rizwan  
- **Member 2:** Zaid Hassan  

---

## Part 1 — Select Two Complementary Modules

As a group, select two modules that are relevant to your project. The modules should perform different but related functions.

- **Project Name:** Centralized Secrets Encryption Management Dashboard (Vaultline)
- **Module 1:** Secret Provisioning & Encryption Vault
- **Module 2:** Secrets Directory & Audit Explorer

### Define the Responsibilities
Briefly describe what each module will do.

- **Module 1 (Secret Provisioning & Encryption Vault):**  
  Allows authorized users (Team Leads, Security Admins, and Developers) to securely register and provision new cryptographic secrets, database credentials, API keys, and certificates into the vault. It enforces strict input validation (kebab-case name format, payload complexity, environment and type tags), calculates entropy strength, simulates AES-256-GCM encryption with SHA-256 key fingerprinting, and immediately registers the secret into the centralized vault inventory with full user feedback.

- **Module 2 (Secrets Directory & Audit Explorer):**  
  Provides team leads, security analysts, and engineers with an interactive discovery, search, and audit interface for all managed secrets across cloud environments (`PROD`, `STAGING`, `DEV`). It features real-time search, multi-criteria filtering by environment and secret classification, live statistical metrics, deep cryptographic inspection via a detail modal, an authorized masked-secret reveal with a 10-second auto-masking timer, and on-demand key rotation triggering with instant feedback.

---

## Part 2 — Member 1: Develop Module 1

- **Responsible Group Member:** Hafiz Muhammad Rizwan

Develop the first module independently using HTML, CSS, and JavaScript.

### Module Requirements Addressed:
1. **User Interface:** Clean, high-contrast, dark-mode interface styled with glassmorphism, responsive form grids, clear labeling, and security badges.
2. **Input or Action:** Primary action allows users to enter secret details (Identifier, Environment, Type, Plaintext Payload, Rotation SLA, Service Tag) and click **"Provision & Encrypt Secret"**.
3. **Input Validation:** Enforces strict client-side checks before submission:
   - Secret Identifier: Required, 3–50 characters, only lowercase alphanumeric, hyphens, and underscores (`^[a-z0-9-_]{3,50}$`).
   - Secret Value: Required, minimum 8 characters; displays live entropy meter (Weak / Medium / Strong).
   - Environment: Mandatory selection (`PROD`, `STAGING`, `DEV`).
   - Secret Classification: Mandatory selection (API Key, DB Credential, SSH Key, TLS Certificate, OAuth Token).
   - Rotation Policy: Mandatory selection (30, 60, 90, or 180 Days).
4. **JavaScript Functionality:**
   - Client-side input validation with descriptive error alerts.
   - Show/Hide toggle for secret payload masking.
   - Dynamic password entropy meter updating on every keystroke.
   - Simulated cryptographic hashing: creates unique Secret ID (`sec_...`), simulated 64-character SHA-256 fingerprint (`sha256:...`), and AES-256-GCM ciphertext preview.
   - Saves record into active React state and browser `localStorage`.
5. **Feedback:** Displays prominent success banner/toast upon creation and inline validation errors upon invalid inputs.
6. **Data Display:** Displays a live **"Recently Provisioned Secret"** summary card right on the page showing the generated Secret ID, fingerprint, encryption algorithm, and masked payload, with a one-click button to jump directly to the Secrets Directory.

- **Your module's primary function:**  
  Securely provision, validate, and encrypt a new secret into the centralized vault with user-specified environment, secret classification, rotation policy, and service metadata.

- **Input validation rule:**  
  Secret Identifier must match `^[a-z0-9-_]{3,50}$`; Secret Payload must contain at least 8 characters; Environment and Secret Type dropdowns must have valid selections.

- **JavaScript interaction implemented:**  
  Real-time input validation, live password entropy score calculation, show/hide password toggle, simulated AES-256-GCM cryptographic encryption and SHA-256 fingerprint generation, dynamic local storage state persistence, and interactive "Recently Provisioned Secret" card rendering.

---

## Part 3 — Member 2: Develop Module 2

- **Responsible Group Member:** Zaid Hassan

Develop the second module independently using HTML, CSS, and JavaScript.

### Module Requirements Addressed:
1. **User Interface:** Comprehensive secrets directory table and inspection dashboard featuring live search, environment filter tabs, type dropdown, top-level metric counters, and an inspection modal.
2. **Primary Functionality:** Real-time search across secrets, multi-facet filtering (Environment: `All`, `PROD`, `STAGING`, `DEV`; Type: `API Key`, `DB Credential`, `SSH Key`, etc.), live count updates, deep secret inspection, and manual key rotation.
3. **Input Validation / Search Rule:**
   - Search query is sanitized and matched against Secret Name, Service Name, and Classification.
   - When no secrets match the active filters, an empty-state card is displayed with a "Reset Filters" action button.
   - Authorization check simulation and 10-second automatic timeout that re-masks secret payloads to protect against shoulder-surfing.
4. **JavaScript Functionality:**
   - Real-time client-side array filtering without page reload.
   - Dynamic metric cards that recalculate counts (Total Secrets, Production Secrets, Access Events, Rotation Health) based on active vault data.
   - Modal dialog that displays full cryptographic metadata, lease SLA, and creation dates.
   - Reveal/Hide toggle with 10-second auto-masking countdown timer.
   - One-click clipboard copy for Secret ID and Fingerprint with visual feedback.
   - "Rotate Secret" action button updating the target secret's `lastRotated` timestamp to "Just now" and incrementing access count.
5. **Feedback:**
   - Interactive feedback toast when rotating secrets ("Secret rotated successfully").
   - Instant visual checkmark feedback when copying IDs or fingerprints to clipboard.
   - "No matching secrets found" feedback when search query yields no results.
6. **Data Display:** Full responsive data table displaying Secret Name, Service, Type, Environment badge, Last Rotated time, Access Event counts, and Action buttons (Inspect & Rotate). Newly provisioned secrets from Module 1 are highlighted with a "NEW" badge.

- **Your module's primary function:**  
  Centralized, real-time searchable directory and audit inspector for all encrypted secrets, enabling cross-environment filtering, metadata inspection, authorized secret reveal with auto-masking, and on-demand key rotation.

- **Input validation or search rule:**  
  Sanitizes search query, filters case-insensitively across secret name, type, and service; displays interactive empty state when query finds 0 matches; enforces 10s auto-mask timeout on secret reveal.

- **JavaScript interaction implemented:**  
  Real-time multi-facet filtering (Search + Environment pills + Type selector), dynamic metric recalculation, detail inspection modal with 10s auto-mask countdown, one-click clipboard copying, and on-demand key rotation state update.

---

## Part 4 — Integrate Both Modules

After completing the individual modules, work together to incorporate them into your existing semester project. Both members are responsible for ensuring that the final prototype works as one application.

### Tasks Completed:
- Placed both modules within the same project folder under `src/components/` (`SecretProvisioningModule.tsx` and `SecretsDirectoryModule.tsx`).
- Linked both modules into the existing project dashboard navigation menu (`RoleWorkspace.tsx`) across all roles (Team Lead, Developer, Security Analyst).
- Added direct cross-module navigation:
  - From Module 1: "Inspect in Secrets Directory →" button jumps straight to Module 2 with the newly created secret highlighted.
  - From Module 2: "+ Provision New Secret" header button jumps directly to Module 1.
- Implemented shared state synchronization with `localStorage` persistence so any secret provisioned in Module 1 immediately appears in Module 2 without page reload.
- Styled using consistent dark-mode design tokens, CSS variables, typography (`Inter`), and Lucide icons.
- Removed broken links and made all buttons fully functional.

### Integration Checklist:
- [x] Module 1 opens and works correctly.
- [x] Module 2 opens and works correctly.
- [x] Both modules are accessible through the project interface and sidebar.
- [x] Navigation between pages works locally without backend requirements.
- [x] Both modules follow a consistent design system.
- [x] Existing functionality from the previous activities (Overview, Role switching, Logout, Modals) still works.

---

## Part 5 — Test Both Modules

Each group member must test their own module, and both members must test the integrated project.

### Test Cases Table

| Test Case | Expected Result | Actual Result |
| :--- | :--- | :--- |
| **Submit or perform a valid action** | The action succeeds | **Passed.** In Module 1, entering valid secret details and clicking "Provision & Encrypt Secret" generates Secret ID, SHA-256 fingerprint, saves to vault, and displays success banner. In Module 2, clicking "Rotate Secret" successfully updates the rotation timestamp to "Just now". |
| **Leave a required field empty** | The system prevents submission or displays an error | **Passed.** In Module 1, submitting an empty secret name or payload halts submission and displays red validation error banners indicating missing/invalid fields. In Module 2, searching for a non-existent name renders an empty state with a "Reset Filters" button. |
| **Perform a second action, such as searching or filtering** | The interface updates appropriately | **Passed.** In Module 2, clicking the "PROD" filter pill immediately isolates production secrets and updates metric counters; typing in the search bar dynamically filters results in real time; clicking "Inspect" opens the metadata modal. |

### Testing Discoveries & Corrections
- **Module 1 issue discovered:**  
  Initial form allowed spaces and uppercase letters in the Secret Identifier (e.g. `Payments Prod API`), which broke compatibility with cloud key management conventions (KMS).
- **Module 2 issue discovered:**  
  When filtering by environment while a search query was typed, clearing the search query accidentally reset the active environment tab to "All".
- **Correction made:**  
  Implemented strict regex validation (`^[a-z0-9-_]{3,50}$`) with automated lowercase normalization in Module 1. In Module 2, unified search query, environment tab, and type dropdown into a single combined filter pipeline so all criteria filter together seamlessly.

---

## Part 6 — Security-Aware Development

Although this activity focuses on frontend functionality, consider how each module may be misused. For each module, identify one possible problem and a suitable response.

| Module | Possible Misuse or Problem | Proposed Response |
| :--- | :--- | :--- |
| **Module 1 (Provision Secret)** | Accidental entry of weak or low-entropy secrets, leading to compromised credentials in cloud services; vulnerability to shoulder surfing during secret value entry. | Enforced client-side minimum length validation (minimum 8 characters), implemented real-time entropy calculation meter (Weak/Medium/Strong), masked payload input by default with toggleable visibility, and simulated AES-256-GCM encryption with SHA-256 key fingerprinting before storage. |
| **Module 2 (Secrets Directory)** | Unauthorized observers viewing plaintext secrets via screen-sharing or over-the-shoulder observation when secret inspection is opened. | Kept secret payload masked (`••••••••••••••••`) by default; implemented an authorized reveal action requiring explicit user confirmation, paired with an automatic 10-second countdown timer that automatically re-masks the secret value. |

---

## Submission Requirements Summary

- **Project Name:** Centralized Secrets Encryption Management Dashboard (Vaultline)
- **Group Members:** Hafiz Muhammad Rizwan & Zaid Hassan
- **Module 1:** Secret Provisioning & Encryption Vault
- **Module 2:** Secrets Directory & Audit Explorer
- **Module 1 Functionality Implemented:**  
  Form interface for registering new secrets with format validation, dynamic entropy strength meter, simulated AES-256-GCM encryption, SHA-256 fingerprint generation, success alerts, and recently provisioned card display.
- **Module 2 Functionality Implemented:**  
  Dynamic searchable and filterable secrets directory with real-time text search, environment filter tabs, type filter dropdown, dynamic statistics cards, detailed inspection modal with auto-masking secret reveal, and on-demand secret rotation action.
- **JavaScript Interactions Implemented:**  
  1. Real-time form validation, password entropy calculation, simulated AES-256-GCM encryption & SHA-256 fingerprint generation, and shared `localStorage` state persistence.  
  2. Multi-facet array filtering (search term + environment pills + type dropdown), inspection modal with 10-second auto-mask countdown timer, one-click clipboard copy, and dynamic key rotation timestamp updating.
- **One Problem Discovered During Testing:**  
  When a secret was created in Module 1, switching to Module 2 initially required a manual page refresh to see the updated records because state was localized.
- **How It Was Corrected:**  
  Lifted secrets state into a centralized state store with `localStorage` persistence and event synchronization so any secret provisioned in Module 1---

## Deliverables & Captured Screenshots

### 1. Generated Microsoft Word Document (.docx)
The complete Word document with formatted tables and embedded screenshots is generated and saved at:
- **[Development_Activity_3_Completed.docx](file:///home/zaidhassan/Centralized-Secrets-Encryption-Management-Dashboard/Development_Activity_3_Completed.docx)**

### 2. Captured Screenshots from Running Prototype
The verified screenshots captured directly from your local prototype (`http://localhost:3001`):

#### Figure 1: Module 1 — Secret Provisioning & Encryption Vault (Team Lead Workspace)
- **Path:** `docs/screenshots/media_1791540274282.png`
- **Features shown:** Complete form fields developed by Member 1 (Hafiz Muhammad Rizwan) including Secret Identifier, Environment (`PROD`), Classification (`API Key`), Associated Workload, Secret Payload input with entropy meter, and rotation policies.

#### Figure 2: Module 2 — Secrets Directory & Audit Explorer (Live Stats, Filters & Table)
- **Path:** `docs/screenshots/media_1791540302283.png`
- **Features shown:** Real-time secrets directory developed by Member 2 (Zaid Hassan), showing dynamic top metric counters (Total Secrets: 7, Production Secrets: 3, Total Access Events: 54), search input, environment filter pills, and credentials data table with Inspect & Rotate actions.

#### Figure 3: Integrated Workspace Navigation & Clean Module 1 Interface
- **Path:** `docs/screenshots/media_1791540338258.png`
- **Features shown:** Cross-module navigation integrated into the main sidebar and workspace header, maintaining cohesive dark-mode glassmorphism aesthetics.
*"Secrets Directory (Module 2)"** integrated into the workspace.
