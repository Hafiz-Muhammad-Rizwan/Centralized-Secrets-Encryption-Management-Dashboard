import { redirect } from 'next/navigation';
import { currentAccess } from '@/lib/auth/access';
import { createAuthClient } from '@/lib/supabase/server';
export default async function AuditPage() {
  const access = await currentAccess();
  if (!access) redirect('/login/');
  if (!access.mfaVerified) redirect('/mfa/');
  if (process.env.SECURITY_DATA_ENABLED !== 'true') return <main className="secure-page"><h1>Audit database not configured</h1></main>;
  const client = await createAuthClient();
  const { data, error } = await client.rpc('vault_events');
  return <main className="secure-page"><h1>Recorded security events</h1><p>Most recent 100 database events. Analysts can see all events; other members see their own. Application users cannot edit these records; database administrators remain trusted. A read authorization records permission to retrieve ciphertext, not proof that decryption or delivery succeeded.</p><a href="/vault/">Vault</a>
    {error ? <p>Audit events unavailable.</p> : <table><thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Object</th><th>Recipient</th></tr></thead><tbody>{(data ?? []).map((e: { id: number; at: string; event: string; actor: string; object_id: string | null; subject: string | null }) => <tr key={e.id}><td>{e.at}</td><td>{e.event}</td><td>{e.actor}</td><td>{e.object_id ?? '—'}</td><td>{e.subject ?? '—'}</td></tr>)}</tbody></table>}
  </main>;
}
