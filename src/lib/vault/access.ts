import 'server-only';
import { currentAccess } from '@/lib/auth/access';
import { createAuthClient } from '@/lib/supabase/server';

export function vaultEnabled() {
  return process.env.VAULT_ENABLED === 'true' && process.env.SECURITY_DATA_ENABLED === 'true';
}
export async function vaultAccess() {
  if (!vaultEnabled()) throw Error('Vault not enabled');
  const client = await createAuthClient(true);
  const access = await currentAccess(client);
  if (!access?.mfaVerified) throw Error('Access denied');
  return { client, access };
}
