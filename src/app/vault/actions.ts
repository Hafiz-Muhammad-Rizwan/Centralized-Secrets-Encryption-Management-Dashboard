'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { vaultAccess } from '@/lib/vault/access';
import { seal, unseal } from '@/lib/vault/crypto';
import { keyManager } from '@/lib/vault/key';
import { allowAttempt } from '@/lib/security/rate-limit';

export type VaultResult = { error: string; message?: string; value?: string };
const denied = { error: 'Unable to complete this operation. Check your access or contact the administrator.' };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);

export async function changeSecret(_previous: VaultResult, form: FormData): Promise<VaultResult> {
  try {
    const { client, access } = await vaultAccess();
    if (access.role !== 'team_lead' || !await allowAttempt('vault-write', access.userId, 30, 60_000)) return denied;
    const operation = form.get('operation');
    const suppliedId = form.get('id');
    const id = operation === 'create' ? randomUUID() : suppliedId;
    if (!uuid(id)) return denied;
    let result;
    if (operation === 'create' || operation === 'replace') {
      const value = form.get('value'), name = form.get('name');
      if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') < 1 || Buffer.byteLength(value, 'utf8') > 8192) return denied;
      if (operation === 'create' && (typeof name !== 'string' || !name.trim() || name.length > 120)) return denied;
      // For replace, DB ownership/version checks remain authoritative. Bind ciphertext to owner+ID.
      const sealed = await seal(value, { id, ownerId: access.userId }, keyManager());
      if (operation === 'create') result = await client.rpc('vault_create', { secret_id: id, secret_name: (name as string).trim(), sealed });
      else {
        const version = Number(form.get('version'));
        if (!Number.isSafeInteger(version) || version < 1) return denied;
        result = await client.rpc('vault_replace', { secret_id: id, expected_version: version, sealed });
      }
    } else if (operation === 'delete') {
      result = await client.rpc('vault_delete', { secret_id: id });
    } else if (operation === 'grant' || operation === 'revoke') {
      const recipient = form.get('recipient');
      if (!uuid(recipient)) return denied;
      result = await client.rpc('vault_grant', { secret_id: id, recipient, until_time: operation === 'revoke' ? null : new Date(Date.now() + 60 * 60_000).toISOString() });
    } else return denied;
    if (result.error) return denied;
    revalidatePath('/vault');
    return { error: '', message: 'Operation completed and recorded in the audit log.' };
  } catch { return denied; }
}

export async function revealSecret(id: string): Promise<VaultResult> {
  try {
    if (!uuid(id)) return denied;
    const { client, access } = await vaultAccess();
    if (!await allowAttempt('vault-read', access.userId, 30, 60_000)) return denied;
    const { data, error } = await client.rpc('vault_read', { secret_id: id });
    if (error || !data || data.id !== id || !uuid(data.owner_id)) return denied;
    // Ciphertext is released by a checked DB function only after a durable audit insert.
    const value = await unseal(data.envelope, { id, ownerId: data.owner_id }, keyManager());
    return { error: '', value };
  } catch { return denied; }
}
