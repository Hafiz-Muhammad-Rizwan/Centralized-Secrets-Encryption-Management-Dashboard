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
  ShieldCheck,
  X,
} from "lucide-react";
import { SecretRecord } from "./secretsStore";

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
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<"ALL" | "PROD" | "STAGING" | "DEV">("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Inspection modal state
  const [inspectingSecret, setInspectingSecret] = useState<SecretRecord | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

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
      onTriggerToast("Demo sample shown (10s display timer).");
    }
  };

  // Filtered secrets computation
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      // Environment filter
      if (selectedEnv !== "ALL" && s.env !== selectedEnv) {
        return false;
      }
      // Type filter
      if (selectedType !== "ALL" && s.type !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesService = s.service.toLowerCase().includes(q);
        const matchesType = s.type.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        return matchesName || matchesService || matchesType || matchesId;
      }
      return true;
    });
  }, [secrets, selectedEnv, selectedType, searchQuery]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = secrets.length;
    const prodCount = secrets.filter((s) => s.env === "PROD").length;
    const stagingCount = secrets.filter((s) => s.env === "STAGING").length;
    const devCount = secrets.filter((s) => s.env === "DEV").length;
    const totalAccess = secrets.reduce((acc, curr) => acc + curr.accessCount, 0);
    return { total, prodCount, stagingCount, devCount, totalAccess };
  }, [secrets]);

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
      onTriggerToast("Demo fingerprint status copied to clipboard");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedEnv("ALL");
    setSelectedType("ALL");
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
                Activity 3 — Parallel Development
              </span>
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: "4px 0" }}>
              Secrets Directory &amp; Audit Explorer
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13.5px" }}>
              Real-time directory of all managed cryptographic credentials across environments. Filter, search, inspect
              key details, and execute authorized zero-downtime key rotations.
            </p>
          </div>

          {/* Quick link to Module 1 */}
          <button
            onClick={onNavigateToProvision}
            className="primary-button"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", fontWeight: "600" }}
          >
            <Plus size={16} />
            Provision New Secret (Module 1)
          </button>
        </div>
      </div>

      {/* Dynamic Statistics Cards */}
      <div className="stats-row" style={{ marginTop: "8px", marginBottom: "24px" }}>
        <div className="stat-card accent">
          <div className="stat-label">Total Managed Secrets</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Across 3 environments</div>
        </div>
        <div className="stat-card amber-accent">
          <div className="stat-label">Production Secrets</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>{stats.prodCount}</div>
          <div className="stat-sub">Strict rotation policy active</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Total Access Events</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>{stats.totalAccess}</div>
          <div className="stat-sub">Real-time lease calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Staging &amp; Dev Secrets</div>
          <div className="stat-value">{stats.stagingCount + stats.devCount}</div>
          <div className="stat-sub">{stats.stagingCount} staging · {stats.devCount} dev</div>
        </div>
      </div>

      {/* Search and Filter Action Bar */}
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
            All ({secrets.length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "PROD" ? "active" : ""}`}
            onClick={() => setSelectedEnv("PROD")}
          >
            PROD ({secrets.filter((s) => s.env === "PROD").length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "STAGING" ? "active" : ""}`}
            onClick={() => setSelectedEnv("STAGING")}
          >
            STAGING ({secrets.filter((s) => s.env === "STAGING").length})
          </button>
          <button
            className={`filter-button ${selectedEnv === "DEV" ? "active" : ""}`}
            onClick={() => setSelectedEnv("DEV")}
          >
            DEV ({secrets.filter((s) => s.env === "DEV").length})
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
              {/* Secret Name & Service */}
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
                    onTriggerToast(`Rotated secret '${secret.name}' in the demo; no credential was changed.`);
                  }}
                  className="filter-button"
                  style={{
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "var(--emerald)",
                    borderColor: "rgba(52,211,153,0.25)",
                  }}
                  title="Trigger key rotation"
                >
                  <RefreshCw size={12} />
                  Rotate
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(251,191,36,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amber)" }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <strong style={{ fontSize: "15px", display: "block", color: "var(--text)" }}>
              No matching secrets found
            </strong>
            <p style={{ color: "var(--muted)", fontSize: "12.5px", maxWidth: "380px", margin: "4px auto 0" }}>
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

      {/* Secret Inspection Modal */}
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
                  <span style={{ color: "var(--dim)", fontSize: "10px" }}>Demo fingerprint status</span>
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

              {/* Masked Value with 10s auto-mask countdown */}
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
