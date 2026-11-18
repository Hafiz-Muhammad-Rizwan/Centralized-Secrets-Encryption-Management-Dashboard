import 'server-only';
import { currentAccess } from '@/lib/auth/access';
import { createAuthClient } from '@/lib/supabase/server';

export function vaultEnabled() {
  return process.env.VAULT_ENABLED === 'true' && process.env.SECURITY_DATA_ENABLED === 'true';
}
export async function vaultAccess() {
  if (!vaultEnabled()) {
    const missing: string[] = [];
    if (process.env.VAULT_ENABLED !== 'true') missing.push('VAULT_ENABLED=true');
    if (process.env.SECURITY_DATA_ENABLED !== 'true') missing.push('SECURITY_DATA_ENABLED=true');
    throw Error(`Vault configuration incomplete: missing ${missing.join(', ')}`);
  }
  const client = await createAuthClient(true);
  const access = await currentAccess(client);
  if (!access) throw Error('Session expired or access denied: user not found in workspace_members');
  if (!access.mfaVerified) throw Error('Multi-factor authentication (AAL2) required. Please verify TOTP');
  return { client, access };
}
