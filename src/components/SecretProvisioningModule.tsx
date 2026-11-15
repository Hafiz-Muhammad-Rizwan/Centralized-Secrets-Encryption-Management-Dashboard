"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileCheck2,
  FileKey2,
  FileX2,
  Hash,
  Info,
  LockKeyhole,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { SecretRecord } from "./secretsStore";
import { checkPasswordStrength } from "@/lib/security/password_strength_helper";
import {
  sanitizeText,
  validateFileSelection,
  ALLOWED_SECRET_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type FileValidationResult,
} from "@/lib/security/secure-coding";

interface SecretProvisioningProps {
  onSecretAdded: (secret: SecretRecord) => void;
  onNavigateToDirectory: () => void;
  onTriggerToast: (msg: string) => void;
}

export default function SecretProvisioningModule({
  onSecretAdded,
  onNavigateToDirectory,
  onTriggerToast,
}: SecretProvisioningProps) {
  // Form State
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"PROD" | "STAGING" | "DEV">("PROD");
  const [type, setType] = useState("API Key");
  const [value, setValue] = useState("DEMO_ONLY_NOT_A_CREDENTIAL");
  const [rotationPolicy, setRotationPolicy] = useState("30 Days");
  const [service, setService] = useState("");

  // File Upload / Selection State (Task 3)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<FileValidationResult | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [fileSuccess, setFileSuccess] = useState<string>("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [recentlyProvisioned, setRecentlyProvisioned] = useState<SecretRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRecentValue, setShowRecentValue] = useState(false);

  // XSS Defense Demonstration State (Task 2)
  const [xssTestMessage, setXssTestMessage] = useState<string>("");

  // Task 5: Password Strength Evaluation using checkPasswordStrength()
  const passwordStrength = checkPasswordStrength(value);

  const getStrengthBadgeClass = (str: string) => {
    if (str === "Strong") return "env emerald";
    if (str === "Moderate") return "env amber";
    return "env crimson";
  };

  const getStrengthBarWidth = (score: number) => {
    if (!value || value.length === 0) return "0%";
    if (score >= 4) return "100%";
    if (score === 3) return "75%";
    if (score === 2) return "50%";
    return "25%";
  };

  // Copy helper
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      onTriggerToast("Clipboard unavailable. Nothing was copied.");
      return;
    }
    setCopiedField(field);
    onTriggerToast(`Copied ${field} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Task 3: Handle Secure File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");
    setFileSuccess("");
    setFileValidation(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const result = validateFileSelection(file, ALLOWED_SECRET_EXTENSIONS, MAX_FILE_SIZE_BYTES);

    if (!result.valid) {
      setFileError(result.error || "File validation failed.");
      setSelectedFile(null);
      e.target.value = ""; // Reject & clear selection
      return;
    }

    // File passed client-side validation
    setSelectedFile(file);
    setFileValidation(result);
    setFileSuccess(
      `File validated successfully! Permitted type (${result.fileDetails?.extension}) and size (${result.fileDetails?.formattedSize}) verified.`
    );

    // Safely read file text to populate payload
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const sanitizedContent = content.trim();
        if (sanitizedContent.length > 0) {
          setValue(sanitizedContent.slice(0, 4096));
          if (!name) {
            const baseName = file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
            setName(baseName.slice(0, 50));
          }
          if (!service) {
            setService("Imported Config Workload");
          }
        }
      }
    };
    reader.readAsText(file);
  };

  // Simulated File Testing Helpers for Demonstration (Task 3)
  const handleSimulateFileTest = (scenario: "valid" | "invalid_ext" | "oversized") => {
    setFileError("");
    setFileSuccess("");

    if (scenario === "valid") {
      const dummyValid = new File(["DATABASE_URL=postgres://user:pass@host:5432/db\nAPI_KEY=prod_live_test"], "credentials.env", {
        type: "text/plain",
      });
      const result = validateFileSelection(dummyValid);
      setSelectedFile(dummyValid);
      setFileValidation(result);
      setFileSuccess("Allowed file (.env, 68 bytes) validated and accepted successfully.");
      setValue("DATABASE_URL=postgres://user:pass@host:5432/db");
      setName("credentials-env");
      setService("Database Service");
    } else if (scenario === "invalid_ext") {
      const dummyInvalid = new File(["malicious executable binary"], "payload.exe", {
        type: "application/x-msdownload",
      });
      const result = validateFileSelection(dummyInvalid);
      setSelectedFile(null);
      setFileValidation(null);
      setFileError(result.error || "Unsupported file extension.");
    } else if (scenario === "oversized") {
      const bigContent = new Uint8Array(60 * 1024);
      const dummyOversized = new File([bigContent], "huge_dump.json", {
        type: "application/json",
      });
      const result = validateFileSelection(dummyOversized);
      setSelectedFile(null);
      setFileValidation(null);
      setFileError(result.error || "File size exceeds 50 KB limit.");
    }
  };

  // Task 2: Simulated XSS Attack Test
  const handleSimulateXSS = (vector: string) => {
    setName("xss-test-record");
    setService(`Audit-${vector}`);
    setValue(vector);
    setXssTestMessage(`Injected test vector: "${vector}". Check below to verify that input validation and sanitization prevent executable script injection.`);
  };

  // Task 1: Secure Input Validation & Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // 1. Mandatory & Bounds Check: Secret Identifier
    const trimmedName = name.trim().toLowerCase();
    const nameRegex = /^[a-z0-9-_]{3,50}$/;
    if (!trimmedName) {
      newErrors.push("Secret Identifier is mandatory and cannot be empty.");
    } else if (trimmedName.length < 3 || trimmedName.length > 50) {
      newErrors.push(`Secret Identifier must be between 3 and 50 characters (current: ${trimmedName.length}).`);
    } else if (!nameRegex.test(trimmedName)) {
      newErrors.push("Secret Identifier format is invalid. Use lowercase alphanumeric characters, hyphens (-), and underscores (_) only.");
    }

    // 2. Mandatory & Bounds Check: Secret Payload
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      newErrors.push("Secret Payload is mandatory and cannot be empty.");
    } else if (trimmedValue.length < 8) {
      newErrors.push(`Secret Payload must be at least 8 characters long for security (current: ${trimmedValue.length}).`);
    } else if (trimmedValue.length > 4096) {
      newErrors.push(`Secret Payload cannot exceed 4096 characters (current: ${trimmedValue.length}).`);
    }

    // 3. Mandatory & Bounds Check: Associated Service
    const trimmedService = service.trim();
    const serviceRegex = /^[A-Za-z0-9\s._\-/]{3,100}$/;
    if (!trimmedService) {
      newErrors.push("Associated Service Name is mandatory (e.g. Checkout API, Billing Service).");
    } else if (trimmedService.length < 3 || trimmedService.length > 100) {
      newErrors.push(`Associated Service Name must be between 3 and 100 characters (current: ${trimmedService.length}).`);
    } else if (!serviceRegex.test(trimmedService)) {
      newErrors.push("Associated Service Name contains invalid characters. Use letters, numbers, spaces, dots, hyphens, and slashes only.");
    }

    // 4. XSS Guard check: reject script tags or dangerous javascript pseudo-protocols
    if (/<script|javascript:|onerror=|onload=/i.test(trimmedName) || /<script|javascript:|onerror=|onload=/i.test(trimmedService)) {
      newErrors.push("Malicious script pattern detected in input. Potentially hazardous tags or event handlers were blocked by input validation.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    // Task 2 & 4: Sanitize text and handle sensitive information in memory only
    const sanitizedName = sanitizeText(trimmedName);
    const sanitizedService = sanitizeText(trimmedService);
    const sanitizedPlainValue = sanitizeText(trimmedValue);

    const newId = `sec_${crypto.randomUUID().slice(0, 8)}`;
    const newFingerprint = `sha256:${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}...`;

    const newSecret: SecretRecord = {
      id: newId,
      name: sanitizedName,
      type,
      env,
      service: sanitizedService,
      lastRotated: "Just now",
      accessCount: 1,
      rotationPolicy,
      algorithm: "AES-256-GCM (Simulated in memory)",
      fingerprint: newFingerprint,
      maskedValue: "••••••••••••••••",
      plainValue: sanitizedPlainValue,
      createdAt: new Date().toISOString().split("T")[0],
      isNew: true,
    };

    // Save into in-memory state (Task 4: Never stored in localStorage / sessionStorage)
    onSecretAdded(newSecret);
    setRecentlyProvisioned(newSecret);
    onTriggerToast(`Secret '${sanitizedName}' securely validated and provisioned in memory.`);

    // Reset inputs
    setName("");
    setValue("DEMO_ONLY_NOT_A_CREDENTIAL");
    setService("");
    setSelectedFile(null);
    setFileValidation(null);
    setFileSuccess("");
    setShowPassword(false);
  };

  const handleReset = () => {
    setName("");
    setValue("DEMO_ONLY_NOT_A_CREDENTIAL");
    setService("");
    setSelectedFile(null);
    setFileValidation(null);
    setFileError("");
    setFileSuccess("");
    setErrors([]);
    setShowPassword(false);
    setXssTestMessage("");
  };

  return (
    <div className="sub-page" style={{ maxWidth: "980px", margin: "0 auto" }}>
      {/* Module Header */}
      <div className="sub-page-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          <span className="env emerald" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
            MODULE 1
          </span>
          <span className="env slate" style={{ fontSize: "11px" }}>
            Lead Developer: Hafiz Muhammad Rizwan
          </span>
          <span className="env amber" style={{ fontSize: "11px" }}>
            Activity 5 — Secure Coding Implementation
          </span>
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: "4px 0" }}>
          Secure Secret Provisioning &amp; Key Management
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: "680px" }}>
          Provision cryptographic secrets with strict client-side input validation (Task 1), XSS prevention (Task 2), secure file selection (Task 3), sensitive memory isolation (Task 4), and live password strength evaluation (Task 5).
        </p>
      </div>

      {/* Validation Error Banner (Task 1) */}
      {errors.length > 0 && (
        <div
          style={{
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.35)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
            marginBottom: "24px",
            animation: "fadeUp .25s ease-out both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--crimson)", fontWeight: "600", marginBottom: "8px" }}>
            <ShieldAlert size={18} />
            <span>Input Validation Prevented Submission ({errors.length} {errors.length === 1 ? "Error" : "Errors"})</span>
          </div>
          <ul style={{ margin: "0 0 0 24px", color: "var(--text)", fontSize: "12.5px", lineHeight: "1.6" }}>
            {errors.map((err, idx) => (
              <li key={idx} style={{ color: "#fca5a5" }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* XSS Test Notification (Task 2) */}
      {xssTestMessage && (
        <div
          style={{
            background: "rgba(96, 165, 250, 0.1)",
            border: "1px solid rgba(96, 165, 250, 0.3)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "12.5px",
            color: "var(--text)",
          }}
        >
          <strong>XSS Defense Test:</strong> {xssTestMessage}
        </div>
      )}

      {/* Main Form & Helper Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Form Container */}
        <div
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,.96), rgba(241,245,249,.94))",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Field 1: Secret Identifier (Task 1: Mandatory, limits, trimming, pattern) */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px", color: "var(--muted)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Secret Identifier *</span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>3–50 chars (lowercase, numbers, dashes)</span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Hash size={16} style={{ color: "var(--muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. payment-gateway-api-key"
                  value={name}
                  maxLength={50}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", color: "var(--text)", fontSize: "13px" }}
                />
              </div>
            </label>

            {/* Field 2 & 3: Environment & Secret Classification */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Environment *</span>
                <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "8px 12px" }}>
                  <select
                    value={env}
                    onChange={(e) => setEnv(e.target.value as "PROD" | "STAGING" | "DEV")}
                    style={{ width: "100%", background: "transparent", color: "var(--text)", fontSize: "13px" }}
                  >
                    <option value="PROD" style={{ background: "#f8fbff" }}>Production (PROD)</option>
                    <option value="STAGING" style={{ background: "#f8fbff" }}>Staging (STAGING)</option>
                    <option value="DEV" style={{ background: "#f8fbff" }}>Development (DEV)</option>
                  </select>
                </div>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Classification *</span>
                <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "8px 12px" }}>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: "100%", background: "transparent", color: "var(--text)", fontSize: "13px" }}
                  >
                    <option value="API Key" style={{ background: "#f8fbff" }}>API Key</option>
                    <option value="DB Credential" style={{ background: "#f8fbff" }}>Database Credential</option>
                    <option value="SSH Key" style={{ background: "#f8fbff" }}>SSH Key</option>
                    <option value="TLS Certificate" style={{ background: "#f8fbff" }}>TLS Certificate</option>
                    <option value="OAuth Token" style={{ background: "#f8fbff" }}>OAuth Token</option>
                    <option value="Webhook Secret" style={{ background: "#f8fbff" }}>Webhook Secret</option>
                    <option value="Password" style={{ background: "#f8fbff" }}>Service Password</option>
                  </select>
                </div>
              </label>
            </div>

            {/* Field 4: Associated Service (Task 1: Mandatory, limits, trimming) */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Associated Service / Workload *</span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>3–100 chars</span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Server size={16} style={{ color: "var(--muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. Checkout Service, Payment Gateway"
                  value={service}
                  maxLength={100}
                  onChange={(e) => setService(e.target.value)}
                  style={{ width: "100%", color: "var(--text)", fontSize: "13px" }}
                />
              </div>
            </label>

            {/* Field 5: Secret Payload & Password Strength Evaluator (Task 5) */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Secret Payload / Password *</span>
                <span className={getStrengthBadgeClass(passwordStrength.strength)} style={{ fontSize: "11px", fontWeight: "600" }}>
                  Strength: {passwordStrength.strength}
                </span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <FileKey2 size={16} style={{ color: "var(--muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secret payload or password (min 8 chars)"
                  value={value}
                  maxLength={4096}
                  onChange={(e) => setValue(e.target.value)}
                  style={{ width: "100%", color: "var(--text)", fontSize: "13px", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: "var(--muted)", padding: "2px 6px", display: "flex", alignItems: "center" }}
                  title={showPassword ? "Hide value" : "Reveal value"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Task 5: Password Strength Progress Bar & Evaluator Feedback */}
              <div style={{ width: "100%", height: "5px", background: "rgba(0,0,0,0.06)", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
                <div
                  style={{
                    height: "100%",
                    width: getStrengthBarWidth(passwordStrength.score),
                    background:
                      passwordStrength.strength === "Strong"
                        ? "var(--emerald)"
                        : passwordStrength.strength === "Moderate"
                        ? "var(--amber)"
                        : "var(--crimson)",
                    transition: "width 0.3s ease, background 0.3s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                {passwordStrength.feedback}
              </span>

              {/* Quick test buttons for Task 5 */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>Strength Tests:</span>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 6px" }}
                  onClick={() => setValue("pass")}
                >
                  Weak (&quot;pass&quot;)
                </button>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 6px" }}
                  onClick={() => setValue("Password12")}
                >
                  Moderate (&quot;Password12&quot;)
                </button>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 6px" }}
                  onClick={() => setValue("Vault#2026!SecureKey")}
                >
                  Strong (&quot;Vault#2026!SecureKey&quot;)
                </button>
              </div>
            </label>

            {/* Field 6: Rotation Policy */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              <span style={{ color: "var(--text)", fontWeight: "600" }}>Auto-Rotation Policy *</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {["30 Days", "60 Days", "90 Days", "180 Days"].map((pol) => (
                  <button
                    key={pol}
                    type="button"
                    onClick={() => setRotationPolicy(pol)}
                    style={{
                      padding: "8px 4px",
                      borderRadius: "var(--radius)",
                      border: rotationPolicy === pol ? "1px solid var(--emerald)" : "1px solid var(--border)",
                      background: rotationPolicy === pol ? "rgba(52, 211, 153, 0.12)" : "rgba(255,255,255,0.02)",
                      color: rotationPolicy === pol ? "var(--emerald)" : "var(--muted)",
                      fontSize: "12px",
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    {pol}
                  </button>
                ))}
              </div>
            </label>

            {/* Form Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                type="submit"
                className="primary-button"
                style={{ flex: 1, padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: "600" }}
              >
                <LockKeyhole size={16} />
                Provision &amp; Encrypt Secret
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="filter-button"
                style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: "6px" }}
                title="Clear form"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </form>

          {/* Task 2: Cross-Site Scripting (XSS) Prevention Test Controls */}
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px dashed var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong style={{ fontSize: "12.5px", color: "var(--text)" }}>Task 2 — XSS Prevention Testing:</strong>
              <span className="env emerald" style={{ fontSize: "10px" }}>Defense Active</span>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "0 0 8px" }}>
              Inject instructor-provided XSS payloads to demonstrate that inputs are safely sanitized and rendered as data rather than executed as code:
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="filter-button"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleSimulateXSS("<script>alert('XSS')</script>")}
              >
                &lt;script&gt; payload
              </button>
              <button
                type="button"
                className="filter-button"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleSimulateXSS("<img src=x onerror=alert('XSS')>")}
              >
                &lt;img onerror&gt; payload
              </button>
              <button
                type="button"
                className="filter-button"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleSimulateXSS("<svg/onload=alert('XSS')>")}
              >
                &lt;svg onload&gt; payload
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Task 3 (Secure File Selection) & Recently Provisioned Secret */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Task 3: Secure File Selection and Validation */}
          <div
            style={{
              background: "linear-gradient(165deg, rgba(255,255,255,.96), rgba(241,245,249,.94))",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue)" }}>
                <Upload size={18} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>Secure File Selection &amp; Import</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Task 3 — Client-side File Validation</span>
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px", lineHeight: "1.4" }}>
              Upload configuration or key files. Permitted extensions: <code>.json, .env, .pem, .key, .txt</code>. Maximum size: <strong>50 KB</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px",
                  border: "2px dashed var(--border-strong)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.7)",
                  transition: "var(--transition)",
                }}
              >
                <Upload size={20} style={{ color: "var(--muted)", marginBottom: "4px" }} />
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>
                  {selectedFile ? selectedFile.name : "Choose credential or config file"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>
                  Allowed: .json, .env, .pem, .key, .txt (Max 50 KB)
                </span>
                <input
                  type="file"
                  accept=".json,.env,.pem,.key,.txt"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              {/* File Validation Status Output */}
              {fileError && (
                <div style={{ background: "rgba(248, 113, 113, 0.12)", border: "1px solid rgba(248, 113, 113, 0.4)", borderRadius: "var(--radius)", padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <FileX2 size={16} style={{ color: "var(--crimson)", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "12px", color: "var(--crimson)" }}>{fileError}</span>
                </div>
              )}

              {fileSuccess && (
                <div style={{ background: "rgba(52, 211, 153, 0.12)", border: "1px solid rgba(52, 211, 153, 0.4)", borderRadius: "var(--radius)", padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <FileCheck2 size={16} style={{ color: "var(--emerald)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--emerald)", fontWeight: 600, display: "block" }}>{fileSuccess}</span>
                    {fileValidation?.fileDetails && (
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        File: {fileValidation.fileDetails.name} · Size: {fileValidation.fileDetails.formattedSize}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Task 3 Demonstration Helper Buttons */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--dim)", alignSelf: "center" }}>Quick Tests:</span>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                  onClick={() => handleSimulateFileTest("valid")}
                >
                  Test Allowed (.env)
                </button>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                  onClick={() => handleSimulateFileTest("invalid_ext")}
                >
                  Test Blocked (.exe)
                </button>
                <button
                  type="button"
                  className="filter-button"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                  onClick={() => handleSimulateFileTest("oversized")}
                >
                  Test Oversized (&gt;50KB)
                </button>
              </div>
            </div>
          </div>

          {/* Recently Provisioned Secret Card */}
          {recentlyProvisioned ? (
            <div
              style={{
                background: "linear-gradient(165deg, rgba(52,211,153,0.06), rgba(17,17,20,0.95))",
                border: "1px solid rgba(52,211,153,0.3)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                animation: "scaleIn .3s ease-out both",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} style={{ color: "var(--emerald)" }} />
                  <strong style={{ fontSize: "13.5px", color: "var(--emerald)" }}>Recently Provisioned</strong>
                </div>
                <span className="env emerald" style={{ fontSize: "11px" }}>{recentlyProvisioned.env}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "11px", display: "block" }}>Secret Identifier</span>
                  <strong style={{ color: "var(--text)", fontSize: "14px" }}>{recentlyProvisioned.name}</strong>
                </div>

                <div>
                  <span style={{ color: "var(--dim)", fontSize: "11px", display: "block" }}>Associated Service</span>
                  <span style={{ color: "var(--text)", fontSize: "13px" }}>{recentlyProvisioned.service}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.82)", padding: "8px 12px", borderRadius: "var(--radius)", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "var(--dim)", fontSize: "10px", display: "block" }}>Secret ID</span>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text)" }}>{recentlyProvisioned.id}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(recentlyProvisioned.id, "Secret ID")}
                    style={{ color: copiedField === "Secret ID" ? "var(--emerald)" : "var(--muted)", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                  >
                    {copiedField === "Secret ID" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedField === "Secret ID" ? "Copied" : "Copy"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.82)", padding: "8px 12px", borderRadius: "var(--radius)", alignItems: "center" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                    <span style={{ color: "var(--dim)", fontSize: "10px", display: "block" }}>Fingerprint</span>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>{recentlyProvisioned.fingerprint}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(recentlyProvisioned.fingerprint, "Fingerprint")}
                    style={{ color: copiedField === "Fingerprint" ? "var(--emerald)" : "var(--muted)", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                  >
                    {copiedField === "Fingerprint" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedField === "Fingerprint" ? "Copied" : "Copy"}
                  </button>
                </div>

                <div style={{ background: "rgba(255,255,255,0.82)", padding: "8px 12px", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ color: "var(--dim)", fontSize: "10px" }}>Masked Payload (Task 4)</span>
                    <button
                      onClick={() => setShowRecentValue(!showRecentValue)}
                      style={{ color: "var(--muted)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      {showRecentValue ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showRecentValue ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: showRecentValue ? "var(--emerald)" : "var(--muted)", wordBreak: "break-all" }}>
                    {showRecentValue ? recentlyProvisioned.plainValue : "••••••••••••••••••••"}
                  </span>
                </div>
              </div>

              {/* Seamless Jump to Module 2 */}
              <button
                onClick={onNavigateToDirectory}
                className="filter-button"
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "rgba(52,211,153,0.1)",
                  borderColor: "rgba(52,211,153,0.3)",
                  color: "var(--emerald)",
                  fontWeight: "600",
                }}
              >
                Inspect in Secrets Directory (Module 2)
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius-lg)",
                padding: "36px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Info size={24} style={{ color: "var(--dim)" }} />
              <strong style={{ fontSize: "13px", color: "var(--muted)" }}>No Secret Provisioned In This Session</strong>
              <p style={{ fontSize: "12px", color: "var(--dim)", margin: 0, maxWidth: "260px" }}>
                Complete the form to validate, encrypt, and provision a new secret.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
