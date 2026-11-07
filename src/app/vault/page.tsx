import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccess } from '@/lib/auth/access';
import { createAuthClient } from '@/lib/supabase/server';
import { vaultEnabled } from '@/lib/vault/access';
import VaultPanel from '@/components/VaultPanel';
export default async function VaultPage() {
  const access = await currentAccess();
  if (!access) redirect('/login/');
  if (!access.mfaVerified) redirect('/mfa/');
  if (!vaultEnabled()) return <main className="secure-page"><h1>Vault not enabled</h1><p>The administrator must apply the migration, configure the server encryption key, and complete the release checks before enabling storage. Existing workspace screens remain demonstrations.</p><Link href="/">Workspace</Link></main>;
  const client = await createAuthClient();
  const { data, error } = await client.rpc('vault_list');
  return <main className="secure-page"><h1>Encrypted vault</h1><nav><Link href="/">Workspace</Link> · <a href="/account/">Account security</a> · <a href="/audit/">Audit events</a></nav>
    <p>Values are encrypted on the server using an environment-held encryption key. Authorized reveals deliver plaintext to your browser. Names and access metadata are not encrypted. This vault does not implement two-person approvals or automatic provider rotation.</p>
    {error ? <p>Vault unavailable. No sample records are substituted.</p> : <VaultPanel rows={data ?? []} userId={access.userId} canCreate={access.role === 'team_lead'} />}
  </main>;
}
