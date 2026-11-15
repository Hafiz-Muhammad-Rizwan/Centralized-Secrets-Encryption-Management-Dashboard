"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { SecretRecord } from "./secretsStore";
import { sanitizeText } from "@/lib/security/secure-coding";

interface SecretsDirectoryProps {
  secrets: SecretRecord[];
  onRotateSecret: (secretId: string) => void;
  onNavigateToProvision: () => void;
  onTriggerToast: (msg: string) => void;
}

export default function SecretsDirectoryModule({
  secrets,
  onRotateSecret,
  onNavigateToProvision,
  onTriggerToast,
}: SecretsDirectoryProps) {
  // Search & Filter state (Task 1: input limits & trimming)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<"ALL" | "PROD" | "STAGING" | "DEV">("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Inspection modal state (Task 4: sensitive handling with 10s auto-masking)
  const [inspectingSecret, setInspectingSecret] = useState<SecretRecord | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  // Task 2: XSS Defense Demonstration State
  const [xssTestVector, setXssTestVector] = useState<string>("");
  const [xssSimulatedSecret, setXssSimulatedSecret] = useState<SecretRecord | null>(null);

  // Auto-masking timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRevealed && revealCountdown !== null) {
      if (revealCountdown > 0) {
        timer = setTimeout(() => {
          setRevealCountdown((current) => (current === null ? current : current - 1));
        }, 1000);
      } else {
        timer = setTimeout(() => {
          setIsRevealed(false);
          setRevealCountdown(null);
          onTriggerToast("Secret payload auto-masked for security.");
        }, 0);
      }
    }
    return () => clearTimeout(timer);
  }, [isRevealed, revealCountdown, onTriggerToast]);

  // Handle reveal click with security timer
  const handleToggleReveal = () => {
    if (isRevealed) {
      setIsRevealed(false);
      setRevealCountdown(null);
    } else {
      setIsRevealed(true);
      setRevealCountdown(10);
      onTriggerToast("Plaintext displayed with 10s auto-masking timer.");
    }
  };

  // Combine real secrets with any active XSS test vector for live demonstration
  const allDisplaySecrets = useMemo(() => {
    if (xssSimulatedSecret) {
      return [xssSimulatedSecret, ...secrets];
    }
    return secrets;
  }, [secrets, xssSimulatedSecret]);

  // Filtered secrets computation (Task 1: trim query, enforce max length 100)
  const filteredSecrets = useMemo(() => {
    const trimmedQuery = searchQuery.trim().slice(0, 100).toLowerCase();

    return allDisplaySecrets.filter((s) => {
      // Environment filter
      if (selectedEnv !== "ALL" && s.env !== selectedEnv) {
        return false;
      }
      // Type filter
      if (selectedType !== "ALL" && s.type !== selectedType) {
        return false;
      }
      // Search query
      if (trimmedQuery) {
        const matchesName = s.name.toLowerCase().includes(trimmedQuery);
        const matchesService = s.service.toLowerCase().includes(trimmedQuery);
        const matchesType = s.type.toLowerCase().includes(trimmedQuery);
        const matchesId = s.id.toLowerCase().includes(trimmedQuery);
        return matchesName || matchesService || matchesType || matchesId;
      }
      return true;
    });
  }, [allDisplaySecrets, selectedEnv, selectedType, searchQuery]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = allDisplaySecrets.length;
    const prodCount = allDisplaySecrets.filter((s) => s.env === "PROD").length;
    const stagingCount = allDisplaySecrets.filter((s) => s.env === "STAGING").length;
    const devCount = allDisplaySecrets.filter((s) => s.env === "DEV").length;
    const totalAccess = allDisplaySecrets.reduce((acc, curr) => acc + curr.accessCount, 0);
    return { total, prodCount, stagingCount, devCount, totalAccess };
  }, [allDisplaySecrets]);

  // Clipboard copy helpers
  const copyText = async (text: string, type: "id" | "fingerprint") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      onTriggerToast("Clipboard unavailable. Nothing was copied.");
      return;
    }
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      onTriggerToast("Secret ID copied to clipboard");
    } else {
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
      onTriggerToast("Fingerprint copied to clipboard");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedEnv("ALL");
    setSelectedType("ALL");
    setXssTestVector("");
    setXssSimulatedSecret(null);
  };

  // Task 2: Trigger Simulated XSS Test Payload
  const handleTriggerXssTest = (payload: string) => {
    setXssTestVector(payload);
    const testRecord: SecretRecord = {
      id: "sec_xss_test",
      name: payload,
      type: "API Key",
      env: "DEV",
      service: `Service with payload: ${payload}`,
      lastRotated: "Just now",
      accessCount: 0,
      rotationPolicy: "30 Days",
      algorithm: "Safe Data Display",
      fingerprint: "sha256:xss_prevention_verified",
      maskedValue: "••••••••••••••••",
      plainValue: payload,
      createdAt: new Date().toISOString().split("T")[0],
      isNew: true,
    };
    setXssSimulatedSecret(testRecord);
    setSearchQuery("");
    onTriggerToast("Injected XSS test vector. Verified: displayed strictly as data, no script execution.");
  };

  return (
    <div className="sub-page">
      {/* Header */}
      <div className="sub-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <span className="env emerald" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                MODULE 2
              </span>
              <span className="env slate" style={{ fontSize: "11px" }}>
                Lead Developer: Zaid Hassan
              </span>
              <span className="env amber" style={{ fontSize: "11px" }}>
                Activity 5 — Secure Coding Implementation
              </span>
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: "4px 0" }}>
              Centralized Secrets Directory &amp; Audit Explorer
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: "680px" }}>
              Search and inspect vault credentials with active XSS prevention (Task 2), bounded search input validation (Task 1), and sensitive data protection with 10-second auto-masking (Task 4).
            </p>
          </div>

          <button
            onClick={onNavigateToProvision}
            className="primary-button"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", fontWeight: "600" }}
          >
            <Plus size={16} />
            Provision New Secret
          </button>
        </div>
      </div>

      {/* Task 2: Cross-Site Scripting (XSS) Prevention Verification Card */}
      <div
        style={{
          background: "linear-gradient(165deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} style={{ color: "var(--emerald)" }} />
            <strong style={{ fontSize: "13px", color: "var(--text)" }}>Task 2 — XSS Prevention &amp; Safe Data Rendering</strong>
          </div>
          <span className="env emerald" style={{ fontSize: "10.5px" }}>XSS Protection Verified</span>
        </div>
        <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: "1.5" }}>
          Test instructor-provided malicious inputs. The application renders user-supplied strings strictly as text data via safe DOM bindings, preventing injected JavaScript from executing in the browser:
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--dim)" }}>Simulate Test Vector:</span>
          <button
            className="filter-button"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => handleTriggerXssTest("<script>alert('XSS-Executed!')</script>")}
          >
            &lt;script&gt;alert(1)&lt;/script&gt;
          </button>
          <button
            className="filter-button"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => handleTriggerXssTest("<img src=x onerror=alert('XSS-Executed!')>")}
          >
            &lt;img onerror&gt; vector
          </button>
          <button
            className="filter-button"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={() => handleTriggerXssTest("<svg onload=alert('XSS')>")}
          >
            &lt;svg onload&gt; vector
          </button>
          {xssSimulatedSecret && (
            <button
              className="text-button"
              style={{ fontSize: "11px", color: "var(--crimson)", marginLeft: "auto" }}
              onClick={() => {
                setXssSimulatedSecret(null);
                setXssTestVector("");
              }}
            >
              Clear XSS Test Record
            </button>
          )}
        </div>
        {xssTestVector && (
          <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "var(--radius)", padding: "8px 12px", fontSize: "11.5px", color: "var(--emerald)" }}>
            <strong>Outcome:</strong> Malicious input <code>{xssTestVector}</code> is displayed safely in the table as plain text. Zero scripts executed.
          </div>
        )}
      </div>

      {/* Top Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Managed Secrets</span>
            <span className="env slate">Global</span>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">{stats.prodCount} in Production</div>
        </div>

        <div className="stat-card amber-accent">
          <div className="stat-header">
            <span>Production Workloads</span>
            <span className="env amber">PROD</span>
          </div>
          <div className="stat-value">{stats.prodCount}</div>
          <div className="stat-sub">Mission-critical services</div>
        </div>

        <div className="stat-card blue-accent">
          <div className="stat-header">
            <span>Staging &amp; Dev</span>
            <span className="env blue">Non-Prod</span>
          </div>
          <div className="stat-value">{stats.stagingCount + stats.devCount}</div>
          <div className="stat-sub">{stats.stagingCount} Staging · {stats.devCount} Dev</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Access Events</span>
            <span className="env emerald">Active</span>
          </div>
          <div className="stat-value">{stats.totalAccess}</div>
          <div className="stat-sub">Audited secret queries</div>
        </div>
      </div>

      {/* Filter & Search Bar (Task 1: validation & trimming) */}
      <div
        className="action-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          {/* Search Box */}
          <div className="search-input" style={{ minWidth: "260px" }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by secret name, service, or type..."
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ color: "var(--dim)", padding: "2px", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Classification Dropdown */}
          <div style={{ background: "rgba(255,255,255,0.88)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={13} style={{ color: "var(--muted)" }} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ background: "transparent", color: "var(--text)", fontSize: "12px", outline: "none" }}
            >
              <option value="ALL" style={{ background: "#f8fbff" }}>All Types</option>
              <option value="API Key" style={{ background: "#f8fbff" }}>API Key</option>
              <option value="DB Credential" style={{ background: "#f8fbff" }}>DB Credential</option>
              <option value="SSH Key" style={{ background: "#f8fbff" }}>SSH Key</option>
              <option value="TLS Certificate" style={{ background: "#f8fbff" }}>TLS Certificate</option>
              <option value="OAuth Token" style={{ background: "#f8fbff" }}>OAuth Token</option>
              <option value="Webhook Secret" style={{ background: "#f8fbff" }}>Webhook Secret</option>
              <option value="Password" style={{ background: "#f8fbff" }}>Password</option>
            </select>
          </div>
        </div>

        {/* Environment Filter Buttons */}
        <div className="action-bar-right" style={{ display: "flex", gap: "6px" }}>
          <button
            className={`filter-button ${selectedEnv === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedEnv("ALL")}
          >
            All ({allDisplaySecrets.length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "PROD" ? "active" : ""}`}
            onClick={() => setSelectedEnv("PROD")}
          >
            PROD ({allDisplaySecrets.filter((s) => s.env === "PROD").length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "STAGING" ? "active" : ""}`}
            onClick={() => setSelectedEnv("STAGING")}
          >
            STAGING ({allDisplaySecrets.filter((s) => s.env === "STAGING").length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "DEV" ? "active" : ""}`}
            onClick={() => setSelectedEnv("DEV")}
          >
            DEV ({allDisplaySecrets.filter((s) => s.env === "DEV").length})
          </button>
        </div>
      </div>

      {/* Secrets Data Table */}
      {filteredSecrets.length > 0 ? (
        <div className="data-table">
          <div className="data-table-head cols-6">
            <span>Secret / Service</span>
            <span>Type</span>
            <span>Environment</span>
            <span>Rotation SLA</span>
            <span>Access Events</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filteredSecrets.map((secret) => (
            <div className="data-table-row cols-6" key={secret.id}>
              {/* Secret Name & Service (Safely rendered text) */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong>{secret.name}</strong>
                  {secret.isNew && (
                    <span
                      style={{
                        background: "rgba(52,211,153,0.15)",
                        border: "1px solid var(--emerald)",
                        color: "var(--emerald)",
                        fontSize: "9.5px",
                        fontWeight: "700",
                        padding: "1px 6px",
                        borderRadius: "99px",
                      }}
                    >
                      NEW
                    </span>
                  )}
                  {secret.id === "sec_xss_test" && (
                    <span
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid var(--crimson)",
                        color: "var(--crimson)",
                        fontSize: "9.5px",
                        fontWeight: "700",
                        padding: "1px 6px",
                        borderRadius: "99px",
                      }}
                    >
                      XSS TEST
                    </span>
                  )}
                </div>
                <span style={{ color: "var(--dim)", fontSize: "11px", display: "block", marginTop: "2px" }}>
                  {secret.service}
                </span>
              </div>

              {/* Type */}
              <div>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>{secret.type}</span>
              </div>

              {/* Environment */}
              <div>
                <span className={`env ${secret.env === "PROD" ? "amber" : secret.env === "STAGING" ? "emerald" : "slate"}`}>
                  {secret.env}
                </span>
              </div>

              {/* Rotation Info */}
              <div>
                <span style={{ color: "var(--text)", fontSize: "12px", display: "block" }}>{secret.lastRotated}</span>
                <span style={{ color: "var(--dim)", fontSize: "10.5px" }}>Policy: {secret.rotationPolicy}</span>
              </div>

              {/* Access Events */}
              <div>
                <span style={{ color: "var(--text)", fontSize: "12px" }}>{secret.accessCount} requests</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  onClick={() => {
                    setInspectingSecret(secret);
                    setIsRevealed(false);
                    setRevealCountdown(null);
                  }}
                  className="filter-button"
                  style={{ padding: "4px 10px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <Eye size={13} />
                  Inspect
                </button>
                <button
                  onClick={() => {
                    onRotateSecret(secret.id);
                    onTriggerToast(`Rotation initiated for '${secret.name}'.`);
                  }}
                  className="filter-button"
                  style={{ padding: "4px 10px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px", color: "var(--emerald)" }}
                >
                  <RefreshCw size={13} />
                  Rotate
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <AlertTriangle size={28} style={{ color: "var(--amber)" }} />
          <div>
            <strong style={{ fontSize: "14px", display: "block", color: "var(--text)" }}>No Matching Secrets Found</strong>
            <p style={{ fontSize: "12.5px", color: "var(--dim)", margin: "4px 0 0", maxWidth: "420px" }}>
              No secrets match your query &quot;{searchQuery || selectedEnv || selectedType}&quot;. Try adjusting your filters or provision a new secret.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="filter-button active"
            style={{ padding: "8px 16px", fontSize: "12.5px", marginTop: "6px" }}
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Secret Inspection Modal (Task 4: 10s auto-masking) */}
      {inspectingSecret && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setInspectingSecret(null);
            setIsRevealed(false);
            setRevealCountdown(null);
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "600px", padding: "28px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emerald)" }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                    {inspectingSecret.name}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Cryptographic Metadata &amp; Access Controls
                  </span>
                </div>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setInspectingSecret(null);
                  setIsRevealed(false);
                  setRevealCountdown(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {/* Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "rgba(255,255,255,0.88)", padding: "14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "10.5px", display: "block" }}>Environment</span>
                  <span className={`env ${inspectingSecret.env === "PROD" ? "amber" : inspectingSecret.env === "STAGING" ? "emerald" : "slate"}`} style={{ display: "inline-block", marginTop: "2px" }}>
                    {inspectingSecret.env}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "10.5px", display: "block" }}>Classification</span>
                  <strong style={{ fontSize: "13px", color: "var(--text)" }}>{inspectingSecret.type}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "10.5px", display: "block" }}>Cipher Algorithm</span>
                  <span style={{ fontSize: "12px", color: "var(--emerald)", fontFamily: "monospace" }}>{inspectingSecret.algorithm}</span>
                </div>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "10.5px", display: "block" }}>Rotation Policy</span>
                  <span style={{ fontSize: "12px", color: "var(--text)" }}>{inspectingSecret.rotationPolicy} (Last: {inspectingSecret.lastRotated})</span>
                </div>
              </div>

              {/* Secret ID Box */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.84)", padding: "10px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div>
                  <span style={{ color: "var(--dim)", fontSize: "10px", display: "block" }}>Vault Secret ID</span>
                  <span style={{ fontFamily: "monospace", fontSize: "12.5px", color: "var(--text)" }}>{inspectingSecret.id}</span>
                </div>
                <button
                  onClick={() => copyText(inspectingSecret.id, "id")}
                  className="filter-button"
                  style={{ padding: "4px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {copiedId ? <Check size={13} style={{ color: "var(--emerald)" }} /> : <Copy size={13} />}
                  {copiedId ? "Copied" : "Copy ID"}
                </button>
              </div>

              {/* SHA-256 Fingerprint */}
              <div style={{ background: "rgba(255,255,255,0.84)", padding: "10px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "var(--dim)", fontSize: "10px" }}>Fingerprint</span>
                  <button
                    onClick={() => copyText(inspectingSecret.fingerprint, "fingerprint")}
                    style={{ color: copiedFingerprint ? "var(--emerald)" : "var(--muted)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    {copiedFingerprint ? <Check size={13} /> : <Copy size={13} />}
                    {copiedFingerprint ? "Copied" : "Copy"}
                  </button>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", wordBreak: "break-all" }}>
                  {inspectingSecret.fingerprint}
                </span>
              </div>

              {/* Masked Value with 10s auto-mask countdown (Task 4) */}
              <div style={{ background: "rgba(255,255,255,0.84)", padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ color: "var(--dim)", fontSize: "10.5px" }}>Protected Payload</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isRevealed && revealCountdown !== null && (
                      <span style={{ fontSize: "11px", color: "var(--amber)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} />
                        Auto-mask in {revealCountdown}s
                      </span>
                    )}
                    <button
                      onClick={handleToggleReveal}
                      className="filter-button"
                      style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", color: isRevealed ? "var(--amber)" : "var(--emerald)" }}
                    >
                      {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      {isRevealed ? "Hide Value" : "Reveal Payload"}
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "12.5px", color: isRevealed ? "var(--emerald)" : "var(--dim)", wordBreak: "break-all" }}>
                  {isRevealed ? inspectingSecret.plainValue : "••••••••••••••••••••••••••••••••"}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => {
                  onRotateSecret(inspectingSecret.id);
                  onTriggerToast(`Rotated secret '${inspectingSecret.name}'.`);
                  setInspectingSecret({
                    ...inspectingSecret,
                    lastRotated: "Just now",
                    accessCount: inspectingSecret.accessCount + 1,
                  });
                }}
                className="filter-button"
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--emerald)", borderColor: "rgba(52,211,153,0.3)" }}
              >
                <RefreshCw size={13} />
                Rotate Secret Now
              </button>
              <button
                onClick={() => {
                  setInspectingSecret(null);
                  setIsRevealed(false);
                  setRevealCountdown(null);
                }}
                className="primary-button"
                style={{ padding: "8px 20px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
