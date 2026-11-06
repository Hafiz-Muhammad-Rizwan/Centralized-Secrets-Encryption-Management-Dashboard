"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileKey2,
  Hash,
  Info,
  LockKeyhole,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SecretRecord } from "./secretsStore";

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

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [recentlyProvisioned, setRecentlyProvisioned] = useState<SecretRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRecentValue, setShowRecentValue] = useState(false);

  // Entropy calculation
  const calculateEntropy = (str: string) => {
    if (!str) return { score: 0, label: "Empty", color: "var(--dim)", width: "0%" };
    let score = 0;
    if (str.length >= 8) score += 25;
    if (str.length >= 16) score += 25;
    if (/[A-Z]/.test(str) && /[a-z]/.test(str)) score += 20;
    if (/[0-9]/.test(str)) score += 15;
    if (/[^A-Za-z0-9]/.test(str)) score += 15;

    if (score < 40) return { score, label: "Weak Entropy", color: "var(--crimson)", width: `${score}%` };
    if (score < 75) return { score, label: "Medium Entropy", color: "var(--amber)", width: `${score}%` };
    return { score, label: "Built-in sample", color: "var(--emerald)", width: "100%" };
  };

  const entropy = calculateEntropy(value);

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

  // Validation & Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    const trimmedName = name.trim().toLowerCase();
    const nameRegex = /^[a-z0-9-_]{3,50}$/;
    if (!trimmedName) {
      newErrors.push("Secret Identifier is required.");
    } else if (!nameRegex.test(trimmedName)) {
      newErrors.push(
        "Secret Identifier must be 3-50 characters using lowercase alphanumeric, hyphens (-), and underscores (_) only."
      );
    }

    if (!value.trim()) {
      newErrors.push("Secret Payload cannot be empty.");
    } else if (value.trim().length < 8) {
      newErrors.push("Secret Payload must be at least 8 characters long for cryptographic security.");
    }

    if (!service.trim()) {
      newErrors.push("Associated Service Name is required (e.g. Checkout API, Billing Service).");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    // This public demo accepts only its built-in sample payload.
    if (value !== "DEMO_ONLY_NOT_A_CREDENTIAL" || service.trim().length > 100) {
      setErrors(["Only the built-in sample payload and service names up to 100 characters are allowed."]);
      return;
    }
    const newId = `demo_${crypto.randomUUID()}`;
    const newFingerprint = "Not computed — demo data";

    const newSecret: SecretRecord = {
      id: newId,
      name: trimmedName,
      type,
      env,
      service: service.trim(),
      lastRotated: "Just now",
      accessCount: 1,
      rotationPolicy,
      algorithm: "None — demo data",
      fingerprint: newFingerprint,
      maskedValue: "••••••••••••••••",
      plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
      createdAt: new Date().toISOString().split("T")[0],
      isNew: true,
    };

    // Save and notify
    onSecretAdded(newSecret);
    setRecentlyProvisioned(newSecret);
    onTriggerToast(`Secret '${trimmedName}' added to the ${env} demo (memory only).`);

    // Reset form
    setName("");
    setValue("DEMO_ONLY_NOT_A_CREDENTIAL");
    setService("");
    setShowPassword(false);
  };

  const handleReset = () => {
    setName("");
    setValue("DEMO_ONLY_NOT_A_CREDENTIAL");
    setService("");
    setErrors([]);
    setShowPassword(false);
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
            Activity 3 — Parallel Development
          </span>
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: "4px 0" }}>
          Secret Provisioning &amp; Encryption Vault
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: "680px" }}>
          Add sample records to this browser view. Payloads are fixed demo text; no encryption or persistent storage is performed. The newest 100 records are kept until you leave or reload.
        </p>
      </div>

      {/* Validation Error Banner */}
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
            <span>Validation Prevented Provisioning ({errors.length} {errors.length === 1 ? "Error" : "Errors"})</span>
          </div>
          <ul style={{ margin: "0 0 0 24px", color: "var(--text)", fontSize: "12.5px", lineHeight: "1.6" }}>
            {errors.map((err, idx) => (
              <li key={idx} style={{ color: "#fca5a5" }}>{err}</li>
            ))}
          </ul>
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
            {/* Field 1: Secret Identifier */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px", color: "var(--muted)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Secret Identifier *</span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>Lowercase, numbers, dashes</span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Hash size={16} style={{ color: "var(--muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. stripe-prod-api-key"
                  value={name}
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

            {/* Field 4: Associated Service */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Associated Service / Workload *</span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>Owner service</span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Server size={16} style={{ color: "var(--muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. Checkout Service, Payment Gateway"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  style={{ width: "100%", color: "var(--text)", fontSize: "13px" }}
                />
              </div>
            </label>

            {/* Field 5: Plaintext Secret Payload with Show/Hide & Entropy */}
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>Secret Payload / Value *</span>
                <span style={{ fontSize: "11px", color: entropy.color, fontWeight: "500" }}>
                  {entropy.label}
                </span>
              </div>
              <div className="input-wrap" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <FileKey2 size={16} style={{ color: "var(--muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  aria-label="Built-in sample payload"
                  readOnly
                  value={value}

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

              {/* Entropy Bar */}
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
                <div
                  style={{
                    height: "100%",
                    width: entropy.width,
                    background: entropy.color,
                    transition: "width 0.3s ease, background 0.3s ease",
                  }}
                />
              </div>
            </label>

            {/* Field 6: Rotation SLA */}
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
                      transition: "var(--transition)",
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
        </div>

        {/* Right Column: Encryption Guarantee & Recently Provisioned Secret */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Cryptographic Standard Box */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emerald)" }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>Zero-Knowledge Vault</strong>
                <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Client-side cryptographic envelope</span>
              </div>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.5", margin: 0 }}>
              This demo does not encrypt data. Real secrets require an authenticated backend and managed encryption keys.
              Payloads are strictly masked by default to protect against unauthorized shoulder-surfing and memory snooping.
            </p>
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
                  <span style={{ color: "var(--dim)", fontSize: "11px", display: "block" }}>Secret Name</span>
                  <strong style={{ color: "var(--text)", fontSize: "14px" }}>{recentlyProvisioned.name}</strong>
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
                    <span style={{ color: "var(--dim)", fontSize: "10px", display: "block" }}>Demo fingerprint status</span>
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
                    <span style={{ color: "var(--dim)", fontSize: "10px" }}>Masked Payload</span>
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
                Complete the form to preview a sample record. Do not enter sensitive metadata.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
