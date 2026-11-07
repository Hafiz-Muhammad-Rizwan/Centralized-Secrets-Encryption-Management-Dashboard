import 'server-only';
import { createHash } from 'node:crypto';

const buckets = new Map<string, { count: number; expires: number }>();
const MAX_BUCKETS = 5000;
const SCRIPT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n";
let retryAfter = 0;
function local(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  const bucket = buckets.get(key);
  if (bucket) { bucket.count++; return bucket.count <= limit; }
  if (buckets.size >= MAX_BUCKETS) return false;
  buckets.set(key, { count: 1, expires: now + windowMs });
  return true;
}
export async function allowAttempt(scope: string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `vaultline:${scope}:${createHash('sha256').update(identity.toLowerCase()).digest('hex')}`;
  const url = process.env.SECURITY_REDIS_REST_URL, token = process.env.SECURITY_REDIS_REST_TOKEN;
  if (!url && !token) return local(key, limit, windowMs);
  // Misconfiguration is different from an outage: never silently accept bad config.
  if (!url || !token) return false;
  let endpoint: URL;
  try {
    endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) return false;
  } catch { return false; }
  // Count locally even while Redis is healthy: an outage must not reset attempts.
  const localAllowed = local(key, limit, windowMs);
  if (Date.now() < retryAfter) return localAllowed;
  try {
    const response = await fetch(endpoint.origin, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', SCRIPT, '1', key, String(windowMs)]),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(1500),
    });
    // Authentication/command errors indicate configuration failure, not transient downtime.
    if (response.status === 401 || response.status === 403) return false;
    if (!response.ok) throw Error('limiter unavailable');
    const data = await response.json();
    if (!Number.isInteger(data.result) || data.result < 1) return false;
    // A known Redis denial is never bypassed with local fallback.
    return data.result <= limit && localAllowed;
  } catch {
    retryAfter = Date.now() + 15_000;
    console.warn(JSON.stringify({ type: 'security', event: 'rate_limit_degraded', retrySeconds: 15 }));
    return localAllowed;
  }
}
