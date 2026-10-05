"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Check,
  ClipboardCheck,
  Clock,
  Eye,
  FileKey2,
  Fingerprint,
  Globe,
  Hash,
  KeyRound,
  LayoutGrid,
  Lock,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  UsersRound,
  X,
  Zap,
  LogOut,
} from "lucide-react";

export type WorkspaceRole = "Team Lead" | "Developer" | "Security Analyst";

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const roleContent = {
  "Team Lead": {
    eyebrow: "Team lead workspace",
    title: "Command the access queue.",
    description: "Review requests, govern secret ownership, and keep delivery moving without widening access.",
    primary: "Review approval queue",
    metrics: [
      ["Pending approvals", "07", "3 production requests"],
      ["Active leases", "24", "Across 12 engineers"],
      ["Rotation health", "96%", "2 schedules due soon"],
      ["Team access score", "94", "Excellent posture"],
    ],
    rows: [
      ["payments-prod", "Maya Chen", "PROD", "4 hours", "Jira PLAT-1842", "pending"],
      ["github-app-private-key", "Noah Williams", "DEV", "1 hour", "Task DEV-720", "pending"],
      ["orders-db-readonly", "Priya Shah", "STAGING", "8 hours", "Jira DATA-91", "approved"],
    ],
  },
  Developer: {
    eyebrow: "Developer workspace",
    title: "Access, with intent.",
    description: "Only the short-lived credentials you need, scoped to the work in front of you.",
    primary: "Request secret access",
    metrics: [
      ["Active leases", "03", "1 expires in 47m"],
      ["Time remaining", "11h", "Next in 47 minutes"],
      ["Security score", "98", "Excellent posture"],
      ["Requests this month", "12", "8 approved"],
    ],
    rows: [
      ["payments-prod", "Checkout API", "PROD", "47 minutes", "Approved lease", "active"],
      ["stripe-webhook", "Billing service", "STAGING", "3h 12m", "Approved lease", "active"],
      ["orders-db-readonly", "Orders platform", "DEV", "7h 05m", "Approved lease", "active"],
    ],
  },
  "Security Analyst": {
    eyebrow: "Security analyst workspace",
    title: "See every access signal.",
    description: "Investigate anomalies, audit the trail, and revoke risk before it becomes an incident.",
    primary: "Open audit trail",
    metrics: [
      ["Events today", "1,284", "+12% vs yesterday"],
      ["Anomalies", "02", "1 needs review"],
      ["Open incidents", "01", "Kill switch ready"],
      ["Audit coverage", "100%", "All workspaces"],
    ],
    rows: [
      ["Production request without ticket", "Hafiz Khan", "HIGH", "8 minutes ago", "10.24.8.12", "alert"],
      ["Repeated failed reveal attempts", "svc-ci-runner", "MEDIUM", "27 minutes ago", "10.24.4.9", "alert"],
      ["Lease revoked early", "Jordan Davis", "LOW", "1 hour ago", "10.24.7.31", "resolved"],
    ],
  },
} as const;

import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; icon: LucideIcon; count?: string; danger?: boolean };

const navByRole: Record<WorkspaceRole, NavItem[]> = {
  "Team Lead": [
    { label: "Overview", icon: LayoutGrid },
    { label: "Approval queue", icon: ClipboardCheck, count: "7" },
    { label: "Secrets inventory", icon: Server },
    { label: "Rotation schedules", icon: RefreshCw },
    { label: "Team directory", icon: Users },
  ],
  Developer: [
    { label: "Overview", icon: LayoutGrid },
    { label: "My active leases", icon: KeyRound, count: "3" },
    { label: "Request access", icon: Plus },
    { label: "Request history", icon: Clock },
    { label: "Security posture", icon: ShieldCheck },
  ],
  "Security Analyst": [
    { label: "Overview", icon: LayoutGrid },
    { label: "Audit trail", icon: Activity },
    { label: "Anomaly center", icon: AlertTriangle, count: "2" },
    { label: "Kill switch", icon: Zap, danger: true },
    { label: "Incident history", icon: Shield },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   BRAND
   ═══════════════════════════════════════════════════════════════ */

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><LockKeyhole size={16} /></div>
      <span>vaultline</span>
      <span className="brand-dot">.</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: TEAM LEAD — APPROVAL QUEUE
   ═══════════════════════════════════════════════════════════════ */

function ApprovalQueuePage({ onAction }: { onAction: () => void }) {
  const requests = [
    { secret: "payments-prod", user: "Maya Chen", env: "PROD", ttl: "4 hours", ticket: "Jira PLAT-1842", status: "pending" },
    { secret: "github-app-private-key", user: "Noah Williams", env: "DEV", ttl: "1 hour", ticket: "Task DEV-720", status: "pending" },
    { secret: "orders-db-readonly", user: "Priya Shah", env: "STAGING", ttl: "8 hours", ticket: "Jira DATA-91", status: "pending" },
    { secret: "redis-cache-prod", user: "Jordan Davis", env: "PROD", ttl: "2 hours", ticket: "Jira CACHE-45", status: "pending" },
    { secret: "aws-deploy-key", user: "Liam Anderson", env: "STAGING", ttl: "30 minutes", ticket: "Task CI-901", status: "approved" },
    { secret: "monitoring-api-token", user: "Sophia Martinez", env: "DEV", ttl: "12 hours", ticket: "Jira OBS-33", status: "approved" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Approval queue</div>
        <h2>Requests needing your decision</h2>
        <p>Approve, reduce TTL, or reject access requests from your team.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card amber-accent">
          <div className="stat-label">Pending review</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>4</div>
          <div className="stat-sub">3 production requests</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Approved today</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>2</div>
          <div className="stat-sub">Average TTL: 4.5h</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected this week</div>
          <div className="stat-value">0</div>
          <div className="stat-sub">Clean decision log</div>
        </div>
      </div>

      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-input">
            <Search size={15} />
            <input placeholder="Search requests..." />
          </div>
          <button className="filter-button active">All</button>
          <button className="filter-button">Pending</button>
          <button className="filter-button">Approved</button>
        </div>
      </div>

      <div className="data-table">
        <div className="data-table-head cols-5">
          <span>Secret</span>
          <span>Requester</span>
          <span>Environment</span>
          <span>TTL / Ticket</span>
          <span>Action</span>
        </div>
        {requests.map((r) => (
          <div className="data-table-row cols-5" key={r.secret + r.user}>
            <div><strong>{r.secret}</strong></div>
            <span>{r.user}</span>
            <span className={`env ${r.env === "PROD" ? "amber" : r.env === "STAGING" ? "emerald" : "slate"}`}>{r.env}</span>
            <div>
              <span style={{ color: "var(--text)", fontSize: "11.5px" }}>{r.ttl}</span>
              <span style={{ color: "var(--dim)", fontSize: "10px", marginTop: "2px", display: "block" }}>{r.ticket}</span>
            </div>
            <button className={`status-pill ${r.status}`} onClick={onAction}>
              {r.status === "pending" ? "Review" : "Approved"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: TEAM LEAD — SECRETS INVENTORY
   ═══════════════════════════════════════════════════════════════ */

function SecretsInventoryPage() {
  const secrets = [
    { name: "payments-prod", type: "API Key", env: "PROD", lastRotated: "3 days ago", accessCount: 12 },
    { name: "stripe-webhook", type: "Webhook Secret", env: "STAGING", lastRotated: "7 days ago", accessCount: 8 },
    { name: "orders-db-readonly", type: "DB Credential", env: "DEV", lastRotated: "14 days ago", accessCount: 5 },
    { name: "github-app-private-key", type: "SSH Key", env: "PROD", lastRotated: "1 day ago", accessCount: 3 },
    { name: "redis-cache-prod", type: "Password", env: "PROD", lastRotated: "21 days ago", accessCount: 15 },
    { name: "aws-deploy-key", type: "IAM Key", env: "STAGING", lastRotated: "5 days ago", accessCount: 7 },
    { name: "monitoring-api-token", type: "API Token", env: "DEV", lastRotated: "10 days ago", accessCount: 2 },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Secrets inventory</div>
        <h2>All managed secrets</h2>
        <p>View and manage secrets across your workspace environments.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Total secrets</div>
          <div className="stat-value">7</div>
          <div className="stat-sub">Across 3 environments</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Production</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>3</div>
          <div className="stat-sub">All rotated within SLA</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total access events</div>
          <div className="stat-value">52</div>
          <div className="stat-sub">Last 30 days</div>
        </div>
      </div>

      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-input">
            <Search size={15} />
            <input placeholder="Search secrets..." />
          </div>
        </div>
        <div className="action-bar-right">
          <button className="filter-button active">All</button>
          <button className="filter-button">PROD</button>
          <button className="filter-button">STAGING</button>
          <button className="filter-button">DEV</button>
        </div>
      </div>

      <div className="data-table">
        <div className="data-table-head cols-5">
          <span>Secret name</span>
          <span>Type</span>
          <span>Environment</span>
          <span>Last rotated</span>
          <span>Access</span>
        </div>
        {secrets.map((s) => (
          <div className="data-table-row cols-5" key={s.name}>
            <div>
              <strong>{s.name}</strong>
            </div>
            <span>{s.type}</span>
            <span className={`env ${s.env === "PROD" ? "amber" : s.env === "STAGING" ? "emerald" : "slate"}`}>{s.env}</span>
            <span>{s.lastRotated}</span>
            <span>{s.accessCount} events</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: TEAM LEAD — ROTATION SCHEDULES
   ═══════════════════════════════════════════════════════════════ */

function RotationSchedulesPage() {
  const schedules = [
    { name: "payments-prod", interval: "Every 7 days", lastRotated: "3 days ago", nextRotation: "In 4 days", status: "ok" },
    { name: "stripe-webhook", interval: "Every 14 days", lastRotated: "12 days ago", nextRotation: "In 2 days", status: "due" },
    { name: "github-app-private-key", interval: "Every 30 days", lastRotated: "1 day ago", nextRotation: "In 29 days", status: "ok" },
    { name: "redis-cache-prod", interval: "Every 7 days", lastRotated: "8 days ago", nextRotation: "Overdue", status: "overdue" },
    { name: "orders-db-readonly", interval: "Every 14 days", lastRotated: "5 days ago", nextRotation: "In 9 days", status: "ok" },
    { name: "aws-deploy-key", interval: "Every 30 days", lastRotated: "5 days ago", nextRotation: "In 25 days", status: "ok" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Rotation schedules</div>
        <h2>Secret rotation management</h2>
        <p>Monitor rotation compliance and trigger manual rotations when needed.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Rotation health</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>96%</div>
          <div className="stat-sub">5 of 6 on schedule</div>
          <div className="progress-bar"><div className="progress-fill emerald" style={{ width: "96%" }} /></div>
        </div>
        <div className="stat-card amber-accent">
          <div className="stat-label">Due soon</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>1</div>
          <div className="stat-sub">stripe-webhook in 2 days</div>
        </div>
        <div className="stat-card crimson-accent">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: "var(--crimson)" }}>1</div>
          <div className="stat-sub">redis-cache-prod</div>
        </div>
      </div>

      <div className="data-table">
        {schedules.map((s) => (
          <div className="rotation-item" key={s.name}>
            <div className={`rotation-icon ${s.status}`}>
              <RefreshCw size={16} />
            </div>
            <div className="rotation-body">
              <strong>{s.name}</strong>
              <span>{s.interval} · Last rotated {s.lastRotated}</span>
            </div>
            <span style={{ color: "var(--muted)", fontSize: "11px", minWidth: "100px", textAlign: "right" }}>{s.nextRotation}</span>
            <span className={`rotation-status ${s.status}`}>
              {s.status === "ok" ? "On schedule" : s.status === "due" ? "Due soon" : "Overdue"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: TEAM LEAD — TEAM DIRECTORY
   ═══════════════════════════════════════════════════════════════ */

function TeamDirectoryPage() {
  const members = [
    { name: "Hafiz Khan", initials: "HK", role: "Team Lead", type: "lead", activeLeases: 2, score: 94, lastActive: "Now" },
    { name: "Maya Chen", initials: "MC", role: "Developer", type: "dev", activeLeases: 4, score: 97, lastActive: "5m ago" },
    { name: "Noah Williams", initials: "NW", role: "Developer", type: "dev", activeLeases: 1, score: 99, lastActive: "12m ago" },
    { name: "Priya Shah", initials: "PS", role: "Developer", type: "dev", activeLeases: 3, score: 95, lastActive: "1h ago" },
    { name: "Jordan Davis", initials: "JD", role: "Developer", type: "dev", activeLeases: 2, score: 98, lastActive: "32m ago" },
    { name: "Zaid Ahmed", initials: "ZA", role: "Security Analyst", type: "security", activeLeases: 0, score: 100, lastActive: "3m ago" },
    { name: "Liam Anderson", initials: "LA", role: "Developer", type: "dev", activeLeases: 1, score: 96, lastActive: "2h ago" },
    { name: "Sophia Martinez", initials: "SM", role: "Developer", type: "dev", activeLeases: 2, score: 93, lastActive: "45m ago" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Team directory</div>
        <h2>Your team members</h2>
        <p>Manage team access and view individual security posture scores.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Team members</div>
          <div className="stat-value">8</div>
          <div className="stat-sub">6 developers, 1 lead, 1 analyst</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Avg. security score</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>96.5</div>
          <div className="stat-sub">Excellent team posture</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active leases</div>
          <div className="stat-value">15</div>
          <div className="stat-sub">Across all members</div>
        </div>
      </div>

      <div className="team-grid">
        {members.map((m) => (
          <div className="team-card" key={m.name}>
            <div className={`team-avatar ${m.type}`}>{m.initials}</div>
            <div className="team-info">
              <strong>{m.name}</strong>
              <span>{m.activeLeases} active leases · Score: {m.score} · {m.lastActive}</span>
              <span className={`team-role ${m.type}`}>{m.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: DEVELOPER — MY ACTIVE LEASES
   ═══════════════════════════════════════════════════════════════ */

function MyActiveLeasesPage({ onAction }: { onAction: () => void }) {
  const leases = [
    { name: "payments-prod", service: "Checkout API", env: "PROD", tone: "emerald", icon: "P", expires: "47 minutes", approved: "Today, 10:23 AM", ttl: "2 hours" },
    { name: "stripe-webhook", service: "Billing service", env: "STAGING", tone: "amber", icon: "S", expires: "3h 12m", approved: "Today, 8:45 AM", ttl: "4 hours" },
    { name: "orders-db-readonly", service: "Orders platform", env: "DEV", tone: "slate", icon: "O", expires: "7h 05m", approved: "Today, 6:12 AM", ttl: "8 hours" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Active leases</div>
        <h2>Your active secret leases</h2>
        <p>Manage and monitor your currently active access leases.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Active leases</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>3</div>
          <div className="stat-sub">All approved and scoped</div>
        </div>
        <div className="stat-card amber-accent">
          <div className="stat-label">Expiring soon</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>1</div>
          <div className="stat-sub">payments-prod in 47m</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Total access time</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>11h</div>
          <div className="stat-sub">Across all leases</div>
        </div>
      </div>

      <div className="lease-cards">
        {leases.map((l) => (
          <div className="lease-card" key={l.name}>
            <div className="lease-card-top">
              <div className={`lease-card-icon ${l.tone}`}>{l.icon}</div>
              <div className="lease-card-info">
                <strong>{l.name}</strong>
                <span>{l.service} · <span className={`env ${l.tone}`}>{l.env}</span></span>
              </div>
            </div>
            <div className="lease-card-meta">
              <span>Expires in <strong className={l.expires === "47 minutes" ? "warning-text" : ""}>{l.expires}</strong></span>
              <span>TTL: {l.ttl}</span>
            </div>
            <div className="lease-card-actions">
              <button className="outline-button" onClick={onAction}><Eye size={14} /> Reveal</button>
              <button className="outline-button" onClick={onAction}><RefreshCw size={14} /> Extend</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: DEVELOPER — REQUEST ACCESS (FORM)
   ═══════════════════════════════════════════════════════════════ */

function RequestAccessPage({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Request access</div>
        <h2>Request secret access</h2>
        <p>Your request will be routed to the owning team lead for approval.</p>
      </div>

      <div style={{ maxWidth: "520px" }}>
        <div className="request-modal" style={{ background: "linear-gradient(165deg, rgba(23,23,27,.9), rgba(14,14,17,.95))", border: "1px solid var(--border)", boxShadow: "none", animation: "fadeUp .35s ease-out both" }}>
          <label>Secret or KMS key
            <div className="input-wrap">
              <FileKey2 size={16} />
              <select>
                <option>github-app-private-key</option>
                <option>payments-prod</option>
                <option>orders-db-readonly</option>
                <option>redis-cache-prod</option>
                <option>aws-deploy-key</option>
              </select>
            </div>
          </label>
          <label>Purpose or ticket ID
            <div className="input-wrap">
              <Hash size={16} />
              <input placeholder="e.g. PLAT-1842 · Debug webhook retries" />
            </div>
          </label>
          <label>Requested time-to-live
            <div className="ttl-grid">
              <button className="ttl active">1 hour<span>Recommended</span></button>
              <button className="ttl">4 hours</button>
              <button className="ttl">8 hours</button>
            </div>
          </label>
          <div className="modal-note">
            <ShieldCheck size={16} />
            <span>Access is scoped, logged, and automatically revoked when the lease expires.</span>
          </div>
          <button className="primary-button full" onClick={onSubmit}>Submit request <ArrowUpRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: DEVELOPER — REQUEST HISTORY
   ═══════════════════════════════════════════════════════════════ */

function RequestHistoryPage() {
  const history = [
    { secret: "payments-prod", status: "approved", time: "Today, 10:23 AM", ttl: "2 hours", approver: "Hafiz Khan" },
    { secret: "stripe-webhook", status: "approved", time: "Today, 8:45 AM", ttl: "4 hours", approver: "Hafiz Khan" },
    { secret: "orders-db-readonly", status: "approved", time: "Today, 6:12 AM", ttl: "8 hours", approver: "Hafiz Khan" },
    { secret: "redis-cache-prod", status: "denied", time: "Yesterday, 4:30 PM", ttl: "24 hours", approver: "Hafiz Khan" },
    { secret: "github-app-private-key", status: "approved", time: "Yesterday, 11:00 AM", ttl: "1 hour", approver: "Hafiz Khan" },
    { secret: "monitoring-api-token", status: "expired", time: "2 days ago", ttl: "4 hours", approver: "System" },
    { secret: "aws-deploy-key", status: "approved", time: "3 days ago", ttl: "30 minutes", approver: "Hafiz Khan" },
    { secret: "payments-prod", status: "approved", time: "4 days ago", ttl: "2 hours", approver: "Hafiz Khan" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Request history</div>
        <h2>Your access request history</h2>
        <p>Track all your past secret access requests and their outcomes.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Total requests</div>
          <div className="stat-value">12</div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approval rate</div>
          <div className="stat-value">92%</div>
          <div className="stat-sub">11 of 12 approved</div>
          <div className="progress-bar"><div className="progress-fill emerald" style={{ width: "92%" }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. response time</div>
          <div className="stat-value">4m</div>
          <div className="stat-sub">Faster than team average</div>
        </div>
      </div>

      <div className="data-table">
        <div className="data-table-head cols-5">
          <span>Secret</span>
          <span>Status</span>
          <span>Requested</span>
          <span>TTL</span>
          <span>Approver</span>
        </div>
        {history.map((h, i) => (
          <div className="data-table-row cols-5" key={h.secret + i}>
            <div><strong>{h.secret}</strong></div>
            <span className={`env ${h.status === "approved" ? "emerald" : h.status === "denied" ? "amber" : "slate"}`}>
              {h.status.toUpperCase()}
            </span>
            <span>{h.time}</span>
            <span>{h.ttl}</span>
            <span>{h.approver}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: DEVELOPER — SECURITY POSTURE
   ═══════════════════════════════════════════════════════════════ */

function SecurityPosturePage() {
  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Security posture</div>
        <h2>Your security health</h2>
        <p>Monitor your access patterns and compliance status.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Security score</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>98</div>
          <div className="stat-sub">Excellent posture</div>
          <div className="progress-bar"><div className="progress-fill emerald" style={{ width: "98%" }} /></div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">MFA status</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>Active</div>
          <div className="stat-sub">Hardware key enrolled</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last audit</div>
          <div className="stat-value">Today</div>
          <div className="stat-sub">Continuous monitoring</div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="setting-card">
          <div className="setting-icon emerald"><ShieldCheck size={20} /></div>
          <div className="setting-body">
            <strong>Multi-factor authentication</strong>
            <span>FIDO2 hardware key enrolled and active</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon emerald"><Lock size={20} /></div>
          <div className="setting-body">
            <strong>Zero plaintext exposure</strong>
            <span>No secrets stored in plaintext anywhere</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon emerald"><Activity size={20} /></div>
          <div className="setting-body">
            <strong>Audit logging</strong>
            <span>All access events are continuously logged</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon emerald"><RefreshCw size={20} /></div>
          <div className="setting-body">
            <strong>Auto-revocation</strong>
            <span>Leases automatically expire and revoke</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon amber"><AlertTriangle size={20} /></div>
          <div className="setting-body">
            <strong>Lease expiry warning</strong>
            <span>1 lease (payments-prod) expires in 47 minutes</span>
          </div>
          <div className="setting-action">
            <button className="outline-button">Review</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: SECURITY ANALYST — AUDIT TRAIL
   ═══════════════════════════════════════════════════════════════ */

function AuditTrailPage() {
  const events = [
    { action: "Secret revealed", user: "Maya Chen", resource: "payments-prod", ip: "10.24.8.12", time: "2 minutes ago", color: "blue" as const, icon: Eye },
    { action: "Lease approved", user: "Hafiz Khan", resource: "github-app-private-key", ip: "10.24.3.8", time: "8 minutes ago", color: "green" as const, icon: Check },
    { action: "Access request submitted", user: "Noah Williams", resource: "redis-cache-prod", ip: "10.24.5.14", time: "15 minutes ago", color: "purple" as const, icon: Plus },
    { action: "Secret rotated", user: "System", resource: "orders-db-readonly", ip: "10.24.1.1", time: "27 minutes ago", color: "amber" as const, icon: RefreshCw },
    { action: "Lease revoked (expired)", user: "System", resource: "stripe-webhook", ip: "10.24.1.1", time: "42 minutes ago", color: "red" as const, icon: X },
    { action: "Failed reveal attempt", user: "svc-ci-runner", resource: "payments-prod", ip: "10.24.4.9", time: "1 hour ago", color: "red" as const, icon: AlertOctagon },
    { action: "MFA challenge passed", user: "Priya Shah", resource: "Session auth", ip: "10.24.7.22", time: "1h 15m ago", color: "green" as const, icon: Fingerprint },
    { action: "Secret viewed", user: "Jordan Davis", resource: "aws-deploy-key", ip: "10.24.7.31", time: "2h ago", color: "blue" as const, icon: Eye },
    { action: "Rotation completed", user: "System", resource: "monitoring-api-token", ip: "10.24.1.1", time: "3h ago", color: "amber" as const, icon: RefreshCw },
    { action: "Access denied", user: "Unknown", resource: "payments-prod", ip: "192.168.1.100", time: "4h ago", color: "red" as const, icon: ShieldOff },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Audit trail</div>
        <h2>Full access event log</h2>
        <p>Every action is recorded, timestamped, and attributable.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Events today</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>1,284</div>
          <div className="stat-sub">+12% vs yesterday</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Unique users</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>8</div>
          <div className="stat-sub">All team members active</div>
        </div>
        <div className="stat-card crimson-accent">
          <div className="stat-label">Failed attempts</div>
          <div className="stat-value" style={{ color: "var(--crimson)" }}>3</div>
          <div className="stat-sub">2 investigated</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Coverage</div>
          <div className="stat-value">100%</div>
          <div className="stat-sub">All workspaces monitored</div>
        </div>
      </div>

      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-input">
            <Search size={15} />
            <input placeholder="Search events, users, IPs..." />
          </div>
        </div>
        <div className="action-bar-right">
          <button className="filter-button active">All events</button>
          <button className="filter-button">Reveals</button>
          <button className="filter-button">Failures</button>
        </div>
      </div>

      <div className="data-table">
        <div className="timeline">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <div className="timeline-item" key={e.action + i}>
                <div className={`timeline-icon ${e.color}`}>
                  <Icon size={15} />
                </div>
                <div className="timeline-body">
                  <strong>{e.action}</strong>
                  <span>{e.user} · {e.resource} · {e.ip}</span>
                </div>
                <span className="timeline-time">{e.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: SECURITY ANALYST — ANOMALY CENTER
   ═══════════════════════════════════════════════════════════════ */

function AnomalyCenterPage({ onAction }: { onAction: () => void }) {
  const anomalies = [
    {
      title: "Production request without ticket",
      description: "Hafiz Khan requested access to payments-prod without a linked ticket or justification. This is unusual for production requests.",
      severity: "high" as const,
      user: "Hafiz Khan",
      ip: "10.24.8.12",
      time: "8 minutes ago",
      icon: AlertOctagon,
    },
    {
      title: "Repeated failed reveal attempts",
      description: "The service account svc-ci-runner attempted to reveal payments-prod 5 times within 2 minutes. All attempts were denied.",
      severity: "medium" as const,
      user: "svc-ci-runner",
      ip: "10.24.4.9",
      time: "27 minutes ago",
      icon: AlertTriangle,
    },
    {
      title: "Unusual access pattern detected",
      description: "Jordan Davis accessed 4 different secrets in rapid succession from an IP not previously associated with their account.",
      severity: "medium" as const,
      user: "Jordan Davis",
      ip: "192.168.1.100",
      time: "1 hour ago",
      icon: Activity,
    },
    {
      title: "Off-hours access attempt",
      description: "Login attempt detected outside of regular working hours (3:42 AM local time). Access was granted but flagged for review.",
      severity: "low" as const,
      user: "Noah Williams",
      ip: "10.24.5.14",
      time: "6 hours ago",
      icon: Clock,
    },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Anomaly center</div>
        <h2>Detected anomalies</h2>
        <p>Events that deviate from normal patterns and need investigation.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card crimson-accent">
          <div className="stat-label">High severity</div>
          <div className="stat-value" style={{ color: "var(--crimson)" }}>1</div>
          <div className="stat-sub">Needs immediate review</div>
        </div>
        <div className="stat-card amber-accent">
          <div className="stat-label">Medium severity</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>2</div>
          <div className="stat-sub">Investigation recommended</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Low severity</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>1</div>
          <div className="stat-sub">Informational</div>
        </div>
      </div>

      <div className="anomaly-cards">
        {anomalies.map((a) => {
          const Icon = a.icon;
          return (
            <div className={`anomaly-card ${a.severity}`} key={a.title}>
              <div className={`anomaly-card-icon`} style={{
                color: a.severity === "high" ? "var(--crimson)" : a.severity === "medium" ? "var(--amber)" : "var(--blue)",
                background: a.severity === "high" ? "rgba(248,113,113,.08)" : a.severity === "medium" ? "rgba(251,191,36,.08)" : "rgba(96,165,250,.08)",
              }}>
                <Icon size={17} />
              </div>
              <div className="anomaly-card-body">
                <strong>{a.title}</strong>
                <p>{a.description}</p>
                <div className="anomaly-meta">
                  <span className={`severity-badge ${a.severity}`}>{a.severity.toUpperCase()}</span>
                  <span>{a.user}</span>
                  <span><Globe size={11} /> {a.ip}</span>
                  <span><Clock size={11} /> {a.time}</span>
                </div>
              </div>
              <button className="outline-button" onClick={onAction} style={{ alignSelf: "flex-start", marginTop: "4px" }}>
                Investigate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: SECURITY ANALYST — KILL SWITCH
   ═══════════════════════════════════════════════════════════════ */

function KillSwitchPage({ onAction }: { onAction: () => void }) {
  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Emergency response</div>
        <h2>Kill switch</h2>
        <p>Revoke all active leases and lock down the workspace instantly.</p>
      </div>

      <div className="panel" style={{ overflow: "visible" }}>
        <div className="kill-switch-container">
          <button className="kill-switch-btn" onClick={onAction}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <Zap size={36} />
              <span style={{ fontSize: "11px", letterSpacing: "2px" }}>ACTIVATE</span>
            </div>
          </button>
          <h3 style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.5px", marginBottom: "8px" }}>Emergency Kill Switch</h3>
          <p className="kill-switch-status">System status: <span style={{ color: "var(--emerald)" }}>All systems operational</span></p>
          <div className="kill-switch-note">
            <AlertTriangle size={15} />
            <span>This action will immediately revoke all 24 active leases and lock the workspace. This cannot be undone.</span>
          </div>
        </div>
      </div>

      <div className="settings-grid" style={{ marginTop: "20px" }}>
        <div className="setting-card">
          <div className="setting-icon emerald"><Shield size={20} /></div>
          <div className="setting-body">
            <strong>Active leases to revoke</strong>
            <span>24 leases across 12 engineers will be terminated</span>
          </div>
          <span style={{ color: "var(--amber)", fontSize: "14px", fontWeight: 600 }}>24</span>
        </div>
        <div className="setting-card">
          <div className="setting-icon blue"><Users size={20} /></div>
          <div className="setting-body">
            <strong>Affected team members</strong>
            <span>All 8 team members will lose active access</span>
          </div>
          <span style={{ color: "var(--blue)", fontSize: "14px", fontWeight: 600 }}>8</span>
        </div>
        <div className="setting-card">
          <div className="setting-icon amber"><Clock size={20} /></div>
          <div className="setting-body">
            <strong>Recovery time estimate</strong>
            <span>Re-approval and lease re-issuance required for each member</span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "12px" }}>~15 min</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: SECURITY ANALYST — INCIDENT HISTORY
   ═══════════════════════════════════════════════════════════════ */

function IncidentHistoryPage() {
  const incidents = [
    { title: "Unauthorized access attempt blocked", severity: "high" as const, time: "2 days ago", status: "Resolved", resolution: "IP blocked, credentials rotated" },
    { title: "Unusual bulk secret access", severity: "medium" as const, time: "1 week ago", status: "Resolved", resolution: "Confirmed as deployment script" },
    { title: "Kill switch activated (drill)", severity: "low" as const, time: "2 weeks ago", status: "Resolved", resolution: "Quarterly security drill" },
    { title: "Failed MFA bypass attempt", severity: "high" as const, time: "3 weeks ago", status: "Resolved", resolution: "Account locked, user re-verified" },
    { title: "Stale credentials detected", severity: "medium" as const, time: "1 month ago", status: "Resolved", resolution: "Credentials rotated automatically" },
  ];

  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Incident history</div>
        <h2>Past security incidents</h2>
        <p>Complete history of security incidents and their resolutions.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Total incidents</div>
          <div className="stat-value">5</div>
          <div className="stat-sub">Last 30 days</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolution rate</div>
          <div className="stat-value" style={{ color: "var(--emerald)" }}>100%</div>
          <div className="stat-sub">All incidents resolved</div>
          <div className="progress-bar"><div className="progress-fill emerald" style={{ width: "100%" }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. resolution time</div>
          <div className="stat-value">23m</div>
          <div className="stat-sub">Under 30m SLA target</div>
        </div>
      </div>

      <div className="anomaly-cards">
        {incidents.map((inc) => (
          <div className={`anomaly-card ${inc.severity}`} key={inc.title}>
            <div className={`anomaly-card-icon`} style={{
              color: inc.severity === "high" ? "var(--crimson)" : inc.severity === "medium" ? "var(--amber)" : "var(--blue)",
              background: inc.severity === "high" ? "rgba(248,113,113,.08)" : inc.severity === "medium" ? "rgba(251,191,36,.08)" : "rgba(96,165,250,.08)",
            }}>
              <Shield size={17} />
            </div>
            <div className="anomaly-card-body">
              <strong>{inc.title}</strong>
              <p>{inc.resolution}</p>
              <div className="anomaly-meta">
                <span className={`severity-badge ${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                <span className={`env emerald`}>{inc.status.toUpperCase()}</span>
                <span><Clock size={11} /> {inc.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE: WORKSPACE SETTINGS (SHARED)
   ═══════════════════════════════════════════════════════════════ */

function WorkspaceSettingsPage() {
  return (
    <div className="sub-page">
      <div className="sub-page-header">
        <div className="eyebrow"><span className="eyebrow-line" />Settings</div>
        <h2>Workspace settings</h2>
        <p>Configure workspace-level security policies and preferences.</p>
      </div>

      <div className="settings-grid">
        <div className="setting-card">
          <div className="setting-icon emerald"><Shield size={20} /></div>
          <div className="setting-body">
            <strong>Enforce MFA for all members</strong>
            <span>Require multi-factor authentication for workspace access</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon blue"><Clock size={20} /></div>
          <div className="setting-body">
            <strong>Maximum lease TTL</strong>
            <span>Set the maximum time-to-live for any secret lease</span>
          </div>
          <div className="setting-action">
            <button className="outline-button">8 hours</button>
          </div>
        </div>
        <div className="setting-card">
          <div className="setting-icon amber"><RefreshCw size={20} /></div>
          <div className="setting-body">
            <strong>Auto-rotation policy</strong>
            <span>Automatically rotate secrets on a defined schedule</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon purple"><Activity size={20} /></div>
          <div className="setting-body">
            <strong>Continuous audit logging</strong>
            <span>Log every access event with full attribution and metadata</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon emerald"><Bell size={20} /></div>
          <div className="setting-body">
            <strong>Anomaly notifications</strong>
            <span>Send alerts when unusual access patterns are detected</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
        <div className="setting-card">
          <div className="setting-icon crimson"><Zap size={20} /></div>
          <div className="setting-body">
            <strong>Kill switch authorization</strong>
            <span>Require two-person authorization for emergency kill switch</span>
          </div>
          <div className="setting-action"><div className="toggle on" /></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW PAGE CONTENT (PER ROLE)
   ═══════════════════════════════════════════════════════════════ */

function OverviewContent({ role, content, onAction, onNavigate }: {
  role: WorkspaceRole;
  content: typeof roleContent[WorkspaceRole];
  onAction: () => void;
  onNavigate: (page: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />{content.eyebrow}</div>
          <h1>{content.title} <span className="wave">✦</span></h1>
          <p>{content.description}</p>
        </div>
        <button className="primary-button" onClick={onAction}>
          <Plus size={16} /> {content.primary}
        </button>
      </div>

      <div className="metric-grid">
        {content.metrics.map(([label, value, foot], index) => (
          <div className={`metric-card ${index === 0 ? "primary-metric" : ""}`} key={label}>
            <div className="metric-top">
              <span>{label}</span>
              <div className={`metric-icon ${index === 0 ? "emerald" : index === 1 ? "amber" : index === 2 ? "blue" : "purple"}`}>
                {role === "Security Analyst" && index === 2 ? <AlertOctagon size={16} /> :
                  role === "Team Lead" && index === 0 ? <UsersRound size={16} /> :
                    <KeyRound size={16} />}
              </div>
            </div>
            <strong>{value}</strong>
            <div className="metric-foot">
              <span className={index === 1 ? "amber-text" : "up"}>{foot}</span>
              <span>{role === "Security Analyst" ? "live" : "this month"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="role-panels">
        <div className="panel role-table-panel">
          <div className="panel-header">
            <div>
              <h2>{role === "Team Lead" ? "Requests needing your decision" : role === "Security Analyst" ? "Priority signals" : "Your active leases"}</h2>
              <p>{role === "Team Lead" ? "Approve, reduce TTL, or reject in one move." : role === "Security Analyst" ? "Events that deserve a closer look." : "Approved access currently assigned to you."}</p>
            </div>
            <button className="text-button" onClick={() => onNavigate(role === "Team Lead" ? "Approval queue" : role === "Security Analyst" ? "Audit trail" : "My active leases")}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="role-table">
            <div className="role-table-head">
              <span>Resource / event</span>
              <span>Owner</span>
              <span>Stage</span>
              <span>Context</span>
              <span>Status</span>
            </div>
            {content.rows.map((row) => (
              <div className="role-table-row" key={row[0]}>
                <div>
                  <strong>{row[0]}</strong>
                  <span>{row[4]}</span>
                </div>
                <span>{row[1]}</span>
                <span className={`env ${row[2] === "PROD" || row[2] === "HIGH" ? "amber" : "emerald"}`}>{row[2]}</span>
                <span>{row[3]}</span>
                <button className={`status-pill ${row[5]}`} onClick={onAction}>
                  {row[5] === "pending" ? "Review" : row[5] === "alert" ? "Investigate" : row[5] === "active" ? "Reveal" : row[5]}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel role-side-panel">
          <div className="panel-header">
            <div>
              <h2>{role === "Security Analyst" ? "Response readiness" : role === "Team Lead" ? "Team posture" : "Access posture"}</h2>
              <p>Updated just now.</p>
            </div>
          </div>
          <div className="score-ring">
            <div className="ring-inner">
              <strong>{role === "Security Analyst" ? "100" : role === "Team Lead" ? "94" : "98"}</strong>
              <span>Excellent</span>
            </div>
          </div>
          <div className="posture-items">
            <div>
              <span className="check-circle"><Check size={12} /></span>
              <span>MFA enforcement</span>
              <b>Secure</b>
            </div>
            <div>
              <span className="check-circle"><Check size={12} /></span>
              <span>Audit logging</span>
              <b>Live</b>
            </div>
            <div>
              <span className="warning-circle"><AlertTriangle size={12} /></span>
              <span>{role === "Security Analyst" ? "1 signal needs review" : "1 lease expires soon"}</span>
              <b className="warning-text">Review</b>
            </div>
          </div>
        </div>

        <div className="role-bottom-banner">
          <div>
            <span className="spark-icon"><ShieldCheck size={16} /></span>
            <div>
              <span className="eyebrow">Control plane status</span>
              <h2>Zero plaintext exposure across your workspace.</h2>
            </div>
          </div>
          <span><span className="live-dot" /> All systems operational</span>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function RoleWorkspace({ role }: { role: WorkspaceRole }) {
  const content = roleContent[role];
  const router = useRouter();
  const [active, setActive] = useState("Overview");
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    // Clear any session/local storage data
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.removeItem("currentUser");
    }
    setShowLogoutModal(false);
    router.push("/login");
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handlePrimaryAction = () => {
    if (role === "Developer") {
      setActive("Request access");
    } else if (role === "Team Lead") {
      setActive("Approval queue");
    } else {
      setActive("Audit trail");
    }
  };

  /* Render the active sub-page */
  function renderPage() {
    /* Settings (shared) */
    if (active === "Workspace settings") return <WorkspaceSettingsPage />;

    /* Team Lead pages */
    if (role === "Team Lead") {
      switch (active) {
        case "Approval queue": return <ApprovalQueuePage onAction={triggerToast} />;
        case "Secrets inventory": return <SecretsInventoryPage />;
        case "Rotation schedules": return <RotationSchedulesPage />;
        case "Team directory": return <TeamDirectoryPage />;
      }
    }

    /* Developer pages */
    if (role === "Developer") {
      switch (active) {
        case "My active leases": return <MyActiveLeasesPage onAction={triggerToast} />;
        case "Request access": return <RequestAccessPage onSubmit={triggerToast} />;
        case "Request history": return <RequestHistoryPage />;
        case "Security posture": return <SecurityPosturePage />;
      }
    }

    /* Security Analyst pages */
    if (role === "Security Analyst") {
      switch (active) {
        case "Audit trail": return <AuditTrailPage />;
        case "Anomaly center": return <AnomalyCenterPage onAction={triggerToast} />;
        case "Kill switch": return <KillSwitchPage onAction={triggerToast} />;
        case "Incident history": return <IncidentHistoryPage />;
      }
    }

    /* Overview (default) */
    return <OverviewContent role={role} content={content} onAction={handlePrimaryAction} onNavigate={setActive} />;
  }

  return (
    <main className={`role-shell role-${role.toLowerCase().replace(" ", "-")}`}>
      {/* ── SIDEBAR ── */}
      <aside className="role-sidebar">
        <Brand />

        <div className="workspace-switcher">
          <div className="workspace-avatar">AC</div>
          <div>
            <strong>Acme Cloud</strong>
            <span>{role}</span>
          </div>
        </div>

        <nav className="role-nav">
          <p>Workspace</p>
          {navByRole[role].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`nav-item ${active === item.label ? "active" : ""} ${item.danger ? "danger" : ""}`}
                onClick={() => setActive(item.label)}
              >
                <span className="nav-symbol"><Icon size={17} /></span>
                <span>{item.label}</span>
                {item.count && <b>{item.count}</b>}
              </button>
            );
          })}

          <p className="nav-label-gap">System</p>
          <button
            className={`nav-item ${active === "Workspace settings" ? "active" : ""}`}
            onClick={() => setActive("Workspace settings")}
          >
            <span className="nav-symbol"><Settings2 size={17} /></span>
            <span>Workspace settings</span>
          </button>
        </nav>

        <div className="security-status">
          <div className="status-icon"><ShieldCheck size={15} /></div>
          <div>
            <strong>Shield is active</strong>
            <span>All systems operational</span>
          </div>
          <span className="pulse" />
        </div>

        <div className="profile">
          <div className="profile-avatar">
            {role === "Developer" ? "RZ" : role === "Team Lead" ? "HK" : "ZA"}
          </div>
          <div>
            <strong>{role === "Developer" ? "Rizwan" : role === "Team Lead" ? "Hafiz" : "Zaid"}</strong>
            <span>{role}</span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={() => setShowLogoutModal(true)}
          title="Sign out of your workspace"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* ── CONTENT ── */}
      <section className="role-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button"><Search size={17} /></button>
            <button className="icon-button notification"><Bell size={17} /><i /></button>
          </div>
        </header>

        <div className="role-page">
          {renderPage()}
        </div>
      </section>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow"><span className="eyebrow-line" />{role === "Team Lead" ? "Approval action" : "New request"}</span>
                <h2>{role === "Team Lead" ? "Review access request" : "Request secret access"}</h2>
                <p>{role === "Team Lead" ? "Make a decision without exposing the secret value." : "Your request will be routed to the owning team lead."}</p>
              </div>
              <button className="close-button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="input-wrap">
              <FileKey2 size={16} />
              <span>{role === "Team Lead" ? "payments-prod · Maya Chen · PROD" : "github-app-private-key"}</span>
            </div>
            <div className="modal-note">
              <ShieldCheck size={16} />
              <span>Every action is scoped, logged, and automatically revoked when the lease expires.</span>
            </div>
            <button className="primary-button full" onClick={() => { setShowModal(false); triggerToast(); }}>
              {role === "Team Lead" ? "Approve request" : "Submit request"} <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── LOGOUT MODAL ── */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="request-modal logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow"><span className="eyebrow-line" />Session management</span>
                <h2>Sign out of vaultline.</h2>
                <p>Your active leases and session data will be cleared. You will be returned to the login page.</p>
              </div>
              <button className="close-button" onClick={() => setShowLogoutModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-note logout-note">
              <LogOut size={16} />
              <span>Signed in as <strong>{role === "Developer" ? "Rizwan" : role === "Team Lead" ? "Hafiz" : "Zaid"}</strong> · {role}</span>
            </div>
            <div className="logout-actions">
              <button className="secondary-button" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="danger-button" onClick={handleLogout}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {showToast && (
        <div className="toast">
          <div className="toast-check"><Check size={14} /></div>
          <div>
            <strong>Action recorded</strong>
            <span>The workspace has been updated.</span>
          </div>
          <button onClick={() => setShowToast(false)}><X size={14} /></button>
        </div>
      )}
    </main>
  );
}
