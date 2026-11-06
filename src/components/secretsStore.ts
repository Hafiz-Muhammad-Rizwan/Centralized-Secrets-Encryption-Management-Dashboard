export interface SecretRecord {
  id: string;
  name: string;
  type: string;
  env: "PROD" | "STAGING" | "DEV";
  service: string;
  lastRotated: string;
  accessCount: number;
  rotationPolicy: string;
  algorithm: string;
  fingerprint: string;
  maskedValue: string;
  plainValue: string;
  createdAt: string;
  isNew?: boolean;
}

export const INITIAL_SECRETS: SecretRecord[] = [
  {
    id: "sec_9a7b12e",
    name: "payments-prod",
    type: "API Key",
    env: "PROD",
    service: "Checkout API & Billing",
    lastRotated: "3 days ago",
    accessCount: 14,
    rotationPolicy: "30 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:4b91cf8e901a523e981aa71912ec081b3d5c90712a1",
    maskedValue: "••••••••••••••••",
    plainValue: "sk_live_948194819a8fbc8d01192",
    createdAt: "2026-09-15",
  },
  {
    id: "sec_82fa901",
    name: "stripe-webhook",
    type: "Webhook Secret",
    env: "STAGING",
    service: "Billing Event Webhooks",
    lastRotated: "7 days ago",
    accessCount: 8,
    rotationPolicy: "60 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:1a82e99bfca33789012cdfa10984ba0174aa88231c9",
    maskedValue: "••••••••••••••••",
    plainValue: "whsec_78912301984abcdef901234",
    createdAt: "2026-09-20",
  },
  {
    id: "sec_38cd104",
    name: "orders-db-readonly",
    type: "DB Credential",
    env: "DEV",
    service: "Orders Platform Database",
    lastRotated: "14 days ago",
    accessCount: 5,
    rotationPolicy: "90 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:88902cdbf10928aee90104bc12309851abb89210982",
    maskedValue: "••••••••••••••••",
    plainValue: "postgres://readonly_usr:Xk99!2aZ09@orders-db.internal:5432/orders",
    createdAt: "2026-09-01",
  },
  {
    id: "sec_49be082",
    name: "github-app-private-key",
    type: "SSH Key",
    env: "PROD",
    service: "CI/CD & GitHub Actions",
    lastRotated: "1 day ago",
    accessCount: 3,
    rotationPolicy: "30 Days",
    algorithm: "RSA-4096 / AES-GCM",
    fingerprint: "sha256:7789a01be182390192eabfa09182309192837bc9910",
    maskedValue: "••••••••••••••••",
    plainValue: "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA09x1...\n-----END RSA PRIVATE KEY-----",
    createdAt: "2026-10-01",
  },
  {
    id: "sec_66ad711",
    name: "redis-cache-prod",
    type: "Password",
    env: "PROD",
    service: "Distributed Session Cache",
    lastRotated: "21 days ago",
    accessCount: 15,
    rotationPolicy: "30 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:5519ab00129cf8901928abceef901238910293847aa",
    maskedValue: "••••••••••••••••",
    plainValue: "auth_redis_cluster_pw#2026!Prod",
    createdAt: "2026-08-25",
  },
  {
    id: "sec_12df932",
    name: "aws-deploy-key",
    type: "IAM Key",
    env: "STAGING",
    service: "AWS Infrastructure Pipeline",
    lastRotated: "5 days ago",
    accessCount: 7,
    rotationPolicy: "60 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:3901aa7728bc901a182746bcde0918234891029384b",
    maskedValue: "••••••••••••••••",
    plainValue: "AKIAIOSFODNN7EXAMPLE",
    createdAt: "2026-09-28",
  },
  {
    id: "sec_77bb459",
    name: "monitoring-api-token",
    type: "API Token",
    env: "DEV",
    service: "Datadog / Prometheus Agent",
    lastRotated: "10 days ago",
    accessCount: 2,
    rotationPolicy: "90 Days",
    algorithm: "AES-256-GCM",
    fingerprint: "sha256:99014ab882109847129384019283748291039485710",
    maskedValue: "••••••••••••••••",
    plainValue: "dd_api_key_889012309182309182390",
    createdAt: "2026-09-18",
  },
];

const STORAGE_KEY = "vaultline_secrets_records_v1";

export function loadSecrets(): SecretRecord[] {
  if (typeof window === "undefined") {
    return INITIAL_SECRETS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SECRETS));
      return INITIAL_SECRETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SECRETS;
  } catch {
    return INITIAL_SECRETS;
  }
}

export function saveSecrets(secrets: SecretRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
  } catch (e) {
    console.error("Failed to persist secrets to localStorage", e);
  }
}
