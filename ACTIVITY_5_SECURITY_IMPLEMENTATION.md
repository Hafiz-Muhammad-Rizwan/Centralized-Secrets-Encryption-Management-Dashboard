# Project Activity 5 — Basic Secure Coding Implementation

**Semester Project:** Centralized Secrets Encryption Management Dashboard (Vaultline)  
**Academic Activity:** Project Activity 5 — Basic Secure Coding Implementation in Existing Semester Project  
**Development Environment:** HTML, CSS, JavaScript / TypeScript, Next.js, and Web Browser  
**Internet / Backend Requirement:** Not Required (100% operational offline)  
**Group Members:**
- **Member 1:** Hafiz Muhammad Rizwan
- **Member 2:** Zaid Hassan

---

## 1. Executive Summary & Objective

The objective of Project Activity 5 is to evaluate our existing semester project (**Vaultline — Centralized Secrets Encryption Management Dashboard**), identify potential security weaknesses across client-side components, implement standard secure coding practices directly into the source code, and verify their effectiveness through structured testing and demonstration.

All security enhancements have been implemented in the active project codebase and verified with an automated security test suite comprising **40 passing tests** (`node --test tests/*.test.mjs`).

---

## 2. Review of Implemented Tasks

### Task 1: Secure Input Validation

#### 1. Selected Forms:
1. **Secret Provisioning Form** (`src/components/SecretProvisioningModule.tsx`):
   - Responsible for registering cryptographic secrets, database credentials, API keys, and certificates into the vault.
2. **Access Request Form** (`src/components/RoleWorkspace.tsx` — Developer Workspace):
   - Responsible for submitting developer access requests for sensitive keys to team leads.
3. **Account Password Update & Reset Form** (`src/components/AccountForms.tsx`):
   - Responsible for updating credentials and account passwords.

#### 2. Weaknesses Identified:
- Previous implementations accepted raw whitespace strings or unbounded inputs.
- Unsanitized characters could lead to format corruption or inconsistent application state.
- Error feedback was either missing or overly generic.

#### 3. Security Improvements Implemented:
- **Empty Mandatory Field Prevention:** Submissions are blocked with prominent error feedback if any mandatory field is missing or contains only whitespace (`trimmed.length === 0`).
- **Minimum & Maximum Character Limits:**
  - *Secret Identifier:* 3 to 50 characters.
  - *Secret Payload / Password:* 8 to 4096 characters.
  - *Associated Service:* 3 to 100 characters.
  - *Purpose / Ticket ID:* 5 to 120 characters.
  - *Account Password:* 12 to 128 characters.
- **Whitespace Trimming:** All text inputs are automatically sanitized using `.trim()` to remove extraneous leading and trailing spaces before validation and processing.
- **Expected Format Validation:**
  - *Secret Identifier:* Strictly constrained to lowercase alphanumeric characters, hyphens, and underscores via regular expression `/^[a-z0-9-_]{3,50}$/`.
  - *Service Name:* Validated against `/^[A-Za-z0-9\s._\-/]{3,100}$/`.
  - *Purpose / Ticket ID:* Validated against `/^[A-Za-z0-9\s._\-#/:]{5,120}$/`.
- **User Validation Messages:** Descriptive, human-readable error messages are displayed directly above or beneath input fields indicating the exact criteria that failed.

---

### Task 2: Cross-Site Scripting (XSS) Prevention

#### 1. Selected Component:
- **Secrets Directory & Audit Explorer** (`src/components/SecretsDirectoryModule.tsx`) & **Secret Provisioning Module** (`src/components/SecretProvisioningModule.tsx`).
- These components display user-submitted secret identifiers, associated service names, classification tags, search queries, and decrypted payload values.

#### 2. Weaknesses Identified:
- Direct rendering of user-controlled strings into DOM contexts without defensive encoding can allow attackers to inject malicious HTML markup or JavaScript (`<script>`, `<img onerror>`, `<svg onload>`).

#### 3. Security Improvements Implemented:
- **Safe Data Rendering:** The application exclusively relies on React JSX data bindings (which set `textContent` rather than `innerHTML`), ensuring the browser treats user input strictly as text data rather than executable markup.
- **Sanitization Utility (`sanitizeText`):** Implemented in `src/lib/security/secure-coding.ts`. Defensive entity encoding converts `<`, `>`, `&`, `"`, `'`, and `/` into safe HTML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`, `&#x2F;`).
- **Input Filtering:** Form validation actively detects and blocks script tags and event handlers (`<script`, `javascript:`, `onerror=`, `onload=`).
- **Interactive XSS Defense Demonstration:** An interactive testing panel allows testers to simulate malicious injection attacks (`<script>alert('XSS')</script>`, `<img src=x onerror=alert('XSS')>`, `<svg onload=alert(1)>`) and verify in real time that the browser renders them strictly as inert textual data with zero script execution.

---

### Task 3: Secure File Selection and Validation

#### 1. Selected Feature:
- **Secure File Selection & Import** embedded in `src/components/SecretProvisioningModule.tsx`.
- Enables administrators and developers to import configuration files (`.env`, `.json`), certificates (`.pem`), or keys (`.key`, `.txt`) directly into the vault.

#### 2. Weaknesses Identified:
- Generic file inputs without client-side extension and size limits can expose users to accidental upload of malicious executables (`.exe`, `.sh`, `.php`, `.bat`) or cause browser denial-of-service from massive multi-megabyte files.

#### 3. Security Improvements Implemented:
- **Restricted File Extensions:** Only whitelisted configuration and cryptographic key extensions are permitted:
  - Allowed: `.json`, `.env`, `.pem`, `.key`, `.txt`.
  - Rejected: `.exe`, `.sh`, `.php`, `.bat`, `.html`, `.pdf`, `.zip`, etc.
- **Maximum File Size Limit:** Enforces a strict maximum limit of **50 KB** (51,200 bytes), suitable for configuration and key bundles while preventing memory exhaustion.
- **Client-Side Rejection & Meaningful Error Messages:**
  - If an unsupported file is chosen, the input is immediately cleared (`e.target.value = ''`), and a descriptive error is displayed:
    *`"Unsupported file extension (.exe). Only permitted formats: .json, .env, .pem, .key, .txt"`*
  - If an oversized file is selected, it is rejected with:
    *`"File size (60.0 KB) exceeds the maximum allowed limit of 50 KB. Selection rejected."`*
- **Quick-Test Demonstration Controls:** Provides one-click test buttons for testing:
  1. *Test Allowed File (.env, 68 bytes)* -> Validated and accepted.
  2. *Test Blocked File (.exe)* -> Rejected immediately.
  3. *Test Oversized File (60 KB)* -> Rejected immediately.

---

### Task 4: Sensitive Information Handling

#### 1. Scope Examined:
- Browser storage (`localStorage` and `sessionStorage`), memory state lifecycle, and frontend credential exposure.

#### 2. Weaknesses Identified:
- Storing passwords or plaintext credentials in web storage exposes them to theft via XSS or local device access.
- Lingering user-interface state after logout could reveal previously inspected secrets to subsequent users.

#### 3. Security Improvements Implemented:
- **Zero Passwords in Web Storage:** Passwords, private keys, and secret values are strictly excluded from `localStorage` and `sessionStorage`.
- **Storage Sanitization & Audit (`auditAndCleanBrowserStorage`):** An automated audit utility in `src/lib/security/secure-coding.ts` scans browser storage on startup and during logout, automatically purging any keys or values matching sensitive patterns (`password`, `secret_plain`, `private_key`, `auth_credential`, `vaultline_secrets_records_v1`).
- **Temporary In-Memory State Only:** Demonstration vault records exist solely in memory during the active session.
- **Shoulder-Surfing Protection:** Payloads are masked by default (`••••••••••••••••`). When temporarily revealed in the inspection modal, a **10-second auto-masking countdown timer** automatically re-masks the value.
- **Secure Logout State Clearance:** Clicking "Sign out" executes `handleLogout()`, which:
  1. Resets active sub-page to `"Overview"`.
  2. Clears in-memory secrets and resets form inputs.
  3. Calls `sessionStorage.clear()`.
  4. Runs `auditAndCleanBrowserStorage()` to remove any temporary data.
  5. Dispatches server sign-out and routes to `/login/`.

---

### Task 5: Password Strength Checker

#### 1. Objective & File Integration:
- Integrated the pre-developed security helper file:
  - **`public/password_strength_helper.js`** (loaded via `<script src="/password_strength_helper.js" defer></script>` in `src/app/layout.tsx`).
  - **`src/lib/security/password_strength_helper.ts`** (companion typed ES module).
- Contains the required standard function:
  ```javascript
  checkPasswordStrength(password)
  ```
  Returns:
  ```javascript
  {
    score: number, // 0 to 4
    strength: "Weak" | "Moderate" | "Strong",
    feedback: string,
    message: string
  }
  ```

#### 2. Integration Points:
1. **Account Password Management (`src/components/AccountForms.tsx`):**
   - As the user enters or modifies a new password, `checkPasswordStrength(password)` is invoked on every keystroke.
   - Displays a live color-coded badge (`Weak` in red, `Moderate` in amber, `Strong` in emerald), a responsive strength meter bar, and detailed actionable guidance.
2. **Secret Payload Field (`src/components/SecretProvisioningModule.tsx`):**
   - Evaluates complexity and entropy of passwords and secret keys being provisioned.

#### 3. Tested Password Samples:
| Password Input | Evaluated Strength | Feedback Message |
|:---|:---:|:---|
| `"pass"` or `"12345"` | **Weak** | *Use at least 8 characters. Add lowercase and uppercase letters. Add at least one special symbol (!@#$%^&*).* |
| `"Password12"` | **Moderate** | *Add at least one special symbol (!@#$%^&*).* |
| `"Vault#2026!SecureKey"` | **Strong** | *Strong password! Meets complexity and security requirements.* |

---

## 3. Testing and Demonstration Evidence

### Test Cases Summary Table

| Test ID | Feature / Component | Test Input / Action | Expected Result | Actual Result | Status |
|:---:|:---|:---|:---|:---|:---:|
| **TC-01** | Input Validation (`SecretProvisioningModule`) | Submit with empty Secret Identifier (`"   "`) | Form blocks submission; displays *"Secret Identifier is mandatory and cannot be empty."* | Submission blocked; red alert displayed with exact error. | **PASS** |
| **TC-02** | Input Validation (`SecretProvisioningModule`) | Identifier `"PAYMENT API KEY!"` (uppercase + spaces) | Rejected: must match lowercase alphanumeric format `/^[a-z0-9-_]{3,50}$/`. | Error: *"Secret Identifier format is invalid. Use lowercase alphanumeric characters..."* | **PASS** |
| **TC-03** | Input Validation (`RoleWorkspace` - Request Access) | Ticket purpose `"Bug"` (3 characters; min is 5) | Form blocks submission; informs user that purpose must be at least 5 characters. | Error: *"Purpose must be at least 5 characters long (current: 3)."* | **PASS** |
| **TC-04** | XSS Prevention (`SecretsDirectoryModule`) | Injected search query `<script>alert('XSS')</script>` | Script does NOT execute. String is displayed purely as inert text data. | Zero JavaScript execution; string rendered as safe text node. | **PASS** |
| **TC-05** | XSS Prevention (`SecretProvisioningModule`) | Injected `<img src=x onerror=alert('XSS')>` into Secret Name | Input validation blocks submission due to dangerous HTML tags. | Error: *"Malicious script pattern detected in input."* | **PASS** |
| **TC-06** | File Selection (`SecretProvisioningModule`) | Upload `malicious_script.exe` | File rejected; input cleared; unsupported extension error shown. | Rejected: *"Unsupported file extension (.exe). Only permitted formats: .json, .env, .pem, .key, .txt"* | **PASS** |
| **TC-07** | File Selection (`SecretProvisioningModule`) | Upload oversized configuration file (60 KB) | File rejected; exceeds 50 KB maximum allowed size. | Rejected: *"File size (60.0 KB) exceeds the maximum allowed limit of 50 KB."* | **PASS** |
| **TC-08** | File Selection (`SecretProvisioningModule`) | Upload valid configuration file `credentials.env` (68 bytes) | File accepted; success banner displayed; payload pre-populated. | Accepted: *"File validated successfully! Permitted type (.env) and size (0.07 KB) verified."* | **PASS** |
| **TC-09** | Sensitive Storage (`secure-coding.ts`) | Inspect `localStorage` & `sessionStorage` for sensitive keys | Zero passwords, tokens, or private keys found in browser storage. | Clean: `auditAndCleanBrowserStorage()` purges any sensitive keys; returns 0 passwords stored. | **PASS** |
| **TC-10** | Logout Functionality (`RoleWorkspace`) | Click "Sign out" button | Active UI state, temporary provisioned secrets, and session storage cleared. | State reset to Overview; storage cleaned; user redirected to `/login/`. | **PASS** |
| **TC-11** | Password Strength (`password_strength_helper.js`) | Input `"pass"` | Returns `{ strength: "Weak", score: 0 }` with criteria guidance. | Strength displayed as **Weak** (red badge + progress bar). | **PASS** |
| **TC-12** | Password Strength (`password_strength_helper.js`) | Input `"Password12"` | Returns `{ strength: "Moderate", score: 2 }` recommending special symbols. | Strength displayed as **Moderate** (amber badge). | **PASS** |
| **TC-13** | Password Strength (`password_strength_helper.js`) | Input `"Vault#2026!SecureKey"` | Returns `{ strength: "Strong", score: 4 }` with success message. | Strength displayed as **Strong** (emerald badge). | **PASS** |

---

## 4. Automated Security Test Suite Verification

Run the complete security test suite directly via:
```bash
npm run test:security
```

### Execution Output:
```text
> secrets-dashboard@0.1.0 test:security
> node --test tests/*.test.mjs

✔ password change requires current password, MFA and membership; database revocation precedes password change
✔ email recovery validates recovery token and retains existing MFA requirement
✔ global sign-out requires MFA and fails closed if database revocation fails
✔ Task 1: Mandatory fields prevent empty submission
✔ Task 1: Leading and trailing spaces are automatically trimmed
✔ Task 1: Character limits (minimum and maximum) are strictly enforced
✔ Task 1: Input pattern and expected format validation
✔ Task 2: XSS test vectors are sanitized into inert textual data
✔ Task 3: Permitted file extensions are accepted
✔ Task 3: Dangerous and unsupported file extensions are rejected
✔ Task 3: Files exceeding maximum size (50 KB) are strictly rejected
✔ Task 4: Browser storage audit cleans any sensitive keys or passwords
✔ Task 5: Evaluates Weak passwords and returns actionable feedback
✔ Task 5: Evaluates Moderate passwords and returns guidance
✔ Task 5: Evaluates Strong passwords with high entropy and complexity
✔ Task 5: Handles empty or invalid password inputs gracefully
✔ no identity, forged metadata, missing role, disabled role, DB errors and outages deny access
✔ verified role allows only its own workspace
✔ credentials are bounded, passwords preserved and prototype roles rejected
✔ missing or unsafe config fails closed; production cookies are HttpOnly and Secure
✔ public API config rejects privileged keys and ambiguous endpoints while preserving legacy anon keys
✔ login redirects only after verified credentials and an active database assignment
✔ a password-only session cannot enter any protected role even with a valid membership
✔ AAL2 alone cannot bypass factor approval or enabled session revocation
✔ MFA action rejects foreign factors, unauthenticated users, malformed codes, and rate-limited attempts
✔ MFA accepts only an upgraded verified session; provider errors remain generic
✔ password-only requests cannot remove or replace an existing verified factor
✔ local rate buckets enforce counts and expire
✔ shared rate limiting keeps known denials closed and bounds outage fallback
✔ auth fetch prevents credential redirects, disables caching and respects cancellation
✔ structured audit uses only event, timestamp, request ID, and actor
✔ login stops before the auth provider when throttled and sends AAL1 sessions to MFA
✔ audit exporter sends only allowlisted fields, prevents redirects and reports delivery failure
✔ legacy payload is never read; cleanup removes only app-owned key
✔ blocked storage does not break samples; cleanup failure is signaled
✔ export policy hashes exact hydration bytes and precedes resources
✔ envelope roundtrip uses fresh data keys/IVs and rejects tampering or record substitution
✔ key rotation reads explicitly retained old versions and rejects missing or weak configuration
✔ vault actions reject absent auth, foreign ciphertext IDs and malformed inputs without plaintext disclosure
✔ vault reveal fails when durable authorization/audit RPC fails

ℹ tests 40
ℹ suites 0
ℹ pass 40
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

---

## 5. How to Run and Test in the Browser

1. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
2. **Access the Application:**
   - Open `http://localhost:3000` in any modern web browser.
   - If running offline without Supabase, the login page displays direct links to launch the **Activity 5 Offline Workspaces**:
     - *Team Lead Workspace (Hafiz Muhammad Rizwan)*: `http://localhost:3000/team-lead/`
     - *Security Analyst Workspace (Zaid Hassan)*: `http://localhost:3000/security-analyst/`
     - *Developer Workspace*: `http://localhost:3000/developer/`
     - *Module 1 (Secret Provisioning)*: `http://localhost:3000/provision-secret/`
     - *Module 2 (Secrets Directory)*: `http://localhost:3000/secrets-directory/`
3. **Interactive Demonstrations Available in the UI:**
   - **Task 1 (Validation):** Try submitting empty or invalid inputs; see immediate inline validation feedback.
   - **Task 2 (XSS):** Click the one-click XSS test buttons (`<script>`, `<img>`, `<svg>`) in Module 1 and Module 2 to verify inert data rendering.
   - **Task 3 (File Selection):** Test uploading allowed (`.env`, `.json`), disallowed (`.exe`), and oversized (`>50KB`) files using the quick test buttons.
   - **Task 4 (Sensitive Data & Logout):** Observe 10-second auto-masking on secret reveal; click "Sign out" to verify UI state and browser storage clearance.
   - **Task 5 (Password Strength):** Type in the password field or click Weak, Moderate, Strong buttons to see live strength evaluation and feedback.
