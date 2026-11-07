import "server-only";
import { createHash } from "node:crypto";

// Atomic fixed windows in Redis when configured. The bounded in-process fallback
// is only an additional brake; it is NOT distributed protection on Vercel.
const buckets = new Map<string, { count: number; expires: number }>();
const MAX_BUCKETS = 5000;
const SCRIPT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n";

export async function allowAttempt(scope: string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `vaultline:${scope}:${createHash("sha256").update(identity.toLowerCase()).digest("hex")}`;
  const url = process.env.SECURITY_REDIS_REST_URL;
  const token = process.env.SECURITY_REDIS_REST_TOKEN;
  if (url || token) {
    // Partial/broken configuration must not silently weaken the configured control.
    if (!url || !token) return false;
    try {
      const endpoint = new URL(url);
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
          endpoint.pathname !== "/" || endpoint.search || endpoint.hash) return false;
      const response = await fetch(endpoint.origin, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", SCRIPT, "1", key, String(windowMs)]),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return Number.isInteger(data.result) && data.result > 0 && data.result <= limit;
    } catch { return false; }
  }
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  const bucket = buckets.get(key);
  if (bucket) { bucket.count++; return bucket.count <= limit; }
  if (buckets.size >= MAX_BUCKETS) return false;
  buckets.set(key, { count: 1, expires: now + windowMs });
  return true;
}
