import "server-only";
import { randomUUID } from "node:crypto";

type SecurityEvent = "login_denied" | "login_password_verified" | "logout" | "logout_failed" | "access_denied" | "auth_unavailable" | "mfa_enrolled" | "mfa_verified" | "mfa_denied" | "rate_limited";

// An allowlisted schema prevents accidental logging of passwords, tokens, email,
// MFA seeds, request bodies or exception objects. Export these logs to a protected
// retention sink before claiming immutability/non-repudiation.
export function audit(event: SecurityEvent, userId?: string) {
  console.info(JSON.stringify({
    type: "security", id: randomUUID(), at: new Date().toISOString(), event,
    ...(userId ? { actor: userId } : {}),
  }));
}
