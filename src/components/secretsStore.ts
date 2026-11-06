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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
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
    algorithm: "None — demo data",
    fingerprint: "Not computed — demo data",
    maskedValue: "••••••••••••••••",
    plainValue: "DEMO_ONLY_NOT_A_CREDENTIAL",
    createdAt: "2026-09-18",
  },
];

// Demo records are fresh per workspace mount. Never read or persist user payloads.
export function loadSecrets(): SecretRecord[] {
  return INITIAL_SECRETS.map((record) => ({ ...record }));
}

// Delete only this app's legacy plaintext store; do not touch other apps' data.
export function clearLegacySecrets(): boolean {
  try {
    localStorage.removeItem("vaultline_secrets_records_v1");
    return true;
  } catch {
    return false;
  }
}
