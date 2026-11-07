import { allowAttempt } from '@/lib/security/rate-limit';
import { clientAddress } from '@/lib/security/client-address';
export async function POST(request: Request) {
  const ip = await clientAddress();
  if (!await allowAttempt('csp-report', ip ?? 'unknown-ingress', 30, 60_000)) return new Response(null, { status: 204 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 204 });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const reports = Array.isArray(input) ? input.slice(0, 10).map(r => r.body) : [input['csp-report']];
    for (const r of reports) {
      const directive = r?.['effective-directive'] ?? r?.effectiveDirective;
      if (typeof directive === 'string' && /^[a-z-]{1,40}$/.test(directive)) {
        // Reports are untrusted telemetry. Never retain URL queries, samples,
        // referrers or request bodies (they may contain recovery tokens/secrets).
        console.info(JSON.stringify({ type: 'csp-report', untrusted: true, directive }));
      }
    }
  } catch { /* Malformed reports never expose parser diagnostics. */ }
  return new Response(null, { status: 204 });
}
