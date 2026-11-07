import 'server-only';
import { randomUUID } from 'node:crypto';

type SecurityEvent = 'login_denied' | 'login_password_verified' | 'logout' | 'logout_failed' | 'access_denied' | 'auth_unavailable' | 'mfa_enrolled' | 'mfa_verified' | 'mfa_denied' | 'rate_limited' | 'password_changed' | 'password_reset' | 'sessions_revoked';

export async function audit(event: SecurityEvent, userId?: string) {
  const entry = { type: 'security', id: randomUUID(), at: new Date().toISOString(), event, ...(userId ? { actor: userId } : {}) };
  console.info(JSON.stringify(entry));
  const url = process.env.SECURITY_AUDIT_SINK_URL, token = process.env.SECURITY_AUDIT_SINK_TOKEN;
  if (!url && !token) return;
  try {
    if (!url || !token) throw Error('sink not configured');
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw Error('invalid sink');
    const result = await fetch(endpoint, { method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': entry.id },
      body: JSON.stringify(entry), signal: AbortSignal.timeout(3000) });
    if (!result.ok) throw Error('sink unavailable');
  } catch {
    // Auth availability must not depend on a secondary export. stdout is the
    // fallback; configure a platform log drain for durable retry/retention.
    console.warn(JSON.stringify({ type: 'security', event: 'audit_export_failed', id: entry.id }));
  }
}
