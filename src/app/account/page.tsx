import { redirect } from 'next/navigation';
import { currentAccess } from '@/lib/auth/access';
import { createAuthClient } from '@/lib/supabase/server';
import AccountForms from '@/components/AccountForms';

export default async function AccountPage() {
  const access = await currentAccess();
  if (!access) redirect('/login/');
  if (!access.mfaVerified) redirect('/mfa/');
  if (process.env.SECURITY_DATA_ENABLED !== 'true') return <main className="secure-page"><h1>Account security</h1><p>Session management is awaiting the security database migration. Contact your administrator.</p></main>;
  const client = await createAuthClient();
  const { data, error } = await client.rpc('workspace_sessions');
  return <main className="secure-page"><h1>Account security</h1><p>{access.email}</p><AccountForms mode="account" />
    <h2>Workspace sessions</h2><p>Sessions observed by this application, most recent 100. Expiry below is the last observed access-token expiry; the provider may refresh a session later. This is not a full Supabase device inventory.</p>
    {error ? <p>Session inventory unavailable.</p> : <table><thead><tr><th>Session</th><th>Last seen</th><th>Token expiry</th><th>Status</th></tr></thead><tbody>{(data ?? []).map((s: { id: string; is_current: boolean; last_seen: string; expires_at: string; revoked_at: string | null }) => <tr key={s.id}><td>{s.is_current ? 'This session' : s.id.slice(0, 8)}</td><td>{s.last_seen}</td><td>{s.expires_at}</td><td>{s.revoked_at ? 'Revoked' : 'Not revoked'}</td></tr>)}</tbody></table>}
    <a href="/vault/">Vault</a>
  </main>;
}
