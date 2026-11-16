import 'server-only';
import { randomUUID } from 'node:crypto';
import { vaultAccess } from './access';
import { seal, unseal } from './crypto';
import { keyManager } from './key';
import { allowAttempt } from '@/lib/security/rate-limit';

export type ModuleEnvironment = 'PROD' | 'STAGING' | 'DEV';

export type ModuleSecretInput = {
  name: string;
  value: string;
  type: string;
  env: ModuleEnvironment;
  service: string;
  rotationPolicy: string;
};

export type ModuleSecretRow = {
  id: string;
  name: string;
  owner_id: string;
  version: number;
  updated_at: string;
  secret_type: string;
  environment: ModuleEnvironment;
  service: string;
  rotation_policy: string;
  access_count: number;
};

export type ModuleResult<T = undefined> = {
  error: string;
  message?: string;
  data?: T;
};

const denied = {
  error: 'Unable to complete this operation. Check your access or contact the administrator.',
};
const namePattern = /^[a-z0-9_-]{3,50}$/;
const typePattern = /^[A-Za-z0-9 ._-]{1,40}$/;
const servicePattern = /^[A-Za-z0-9 ._/&-]{3,100}$/;
const secretTypes = new Set([
  'API Key',
  'DB Credential',
  'SSH Key',
  'TLS Certificate',
  'OAuth Token',
  'Webhook Secret',
  'IAM Key',
  'API Token',
  'Password',
]);
const environments = new Set<ModuleEnvironment>(['PROD', 'STAGING', 'DEV']);
const rotationPolicies = new Set(['30 Days', '60 Days', '90 Days', '180 Days']);
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

type RawRecord = Record<string, unknown>;

function readString(record: RawRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function parseInput(input: unknown): ModuleSecretInput | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as RawRecord;
  const name = readString(record, 'name').trim().toLowerCase();
  const value = readString(record, 'value');
  const type = readString(record, 'type');
  const rawEnvironment = readString(record, 'env');
  const service = readString(record, 'service').trim();
  const rotationPolicy = readString(record, 'rotationPolicy');
  const env = environments.has(rawEnvironment as ModuleEnvironment)
    ? (rawEnvironment as ModuleEnvironment)
    : null;

  if (!namePattern.test(name)) return null;
  if (value.length < 8 || Buffer.byteLength(value, 'utf8') > 8192) return null;
  if (!secretTypes.has(type) || !typePattern.test(type)) return null;
  if (!env) return null;
  if (!servicePattern.test(service)) return null;
  if (!rotationPolicies.has(rotationPolicy)) return null;

  return { name, value, type, env, service, rotationPolicy };
}

export async function provisionModuleSecret(input: unknown): Promise<ModuleResult<{
  id: string;
  name: string;
  version: number;
}>> {
  try {
    const parsed = parseInput(input);
    if (!parsed) {
      return {
        error: 'Secret details are invalid. Check the identifier, payload, environment, classification, service, and rotation policy.',
      };
    }
    const { client, access } = await vaultAccess();
    if (access.role !== 'team_lead') return denied;
    if (!await allowAttempt('module-provision', access.userId, 30, 60_000)) return denied;

    const id = randomUUID();
    const sealed = await seal(parsed.value, { id, ownerId: access.userId }, keyManager());
    const { error } = await client.rpc('vault_create_module', {
      secret_id: id,
      secret_name: parsed.name,
      sealed,
      p_secret_type: parsed.type,
      p_environment: parsed.env,
      p_service: parsed.service,
      p_rotation_policy: parsed.rotationPolicy,
    });
    if (error) return denied;

    return {
      error: '',
      message: 'Secret encrypted and stored in the database.',
      data: { id, name: parsed.name, version: 1 },
    };
  } catch {
    return denied;
  }
}

export async function listModuleSecrets(): Promise<ModuleResult<ModuleSecretRow[]>> {
  try {
    const { client, access } = await vaultAccess();
    if (!await allowAttempt('module-list', access.userId, 120, 60_000)) return denied;
    const { data, error } = await client.rpc('vault_list_modules');
    if (error || !Array.isArray(data)) return denied;

    const rows: ModuleSecretRow[] = [];
    for (const candidate of data) {
      if (!candidate || typeof candidate !== 'object') continue;
      const row = candidate as RawRecord;
      if (!uuid(row.id) || !uuid(row.owner_id)) continue;
      const environment = readString(row, 'environment');
      const version = row.version;
      if (!Number.isSafeInteger(version) || (version as number) < 1) continue;
      if (!environments.has(environment as ModuleEnvironment)) continue;
      const updatedAt = readString(row, 'updated_at');
      if (!updatedAt) continue;
      rows.push({
        id: row.id as string,
        name: readString(row, 'name'),
        owner_id: row.owner_id as string,
        version: version as number,
        updated_at: updatedAt,
        secret_type: readString(row, 'secret_type') || 'API Key',
        environment: environment as ModuleEnvironment,
        service: readString(row, 'service'),
        rotation_policy: readString(row, 'rotation_policy') || '30 Days',
        access_count: Number.isSafeInteger(row.access_count) && (row.access_count as number) >= 0
          ? (row.access_count as number)
          : 0,
      });
    }
    return { error: '', data: rows };
  } catch {
    return denied;
  }
}

export async function rotateModuleSecret(
  id: unknown,
  expectedVersion: unknown,
): Promise<ModuleResult> {
  try {
    if (!uuid(id) || typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      return denied;
    }
    const { client, access } = await vaultAccess();
    if (access.role !== 'team_lead') return denied;
    if (!await allowAttempt('module-rotate', access.userId, 30, 60_000)) return denied;

    const { data, error } = await client.rpc('vault_read', { secret_id: id });
    if (error || !data || data.id !== id || !uuid(data.owner_id)) return denied;
    // Rotation is an owner-only operation. Do not decrypt a grantee-visible record.
    if (data.owner_id !== access.userId) return denied;

    const binding = { id, ownerId: data.owner_id };
    const value = await unseal(data.envelope, binding, keyManager());
    const sealed = await seal(value, binding, keyManager());
    const result = await client.rpc('vault_rotate_module', {
      secret_id: id,
      expected_version: expectedVersion,
      sealed,
    });
    if (result.error) return denied;

    return {
      error: '',
      message: 'Secret re-encrypted with a fresh data key and version incremented.',
    };
  } catch {
    return denied;
  }
}

export async function getRecentModuleSecrets(
  limit: number = 5,
): Promise<ModuleResult<ModuleSecretRow[]>> {
  try {
    const listResult = await listModuleSecrets();
    if (listResult.error || !listResult.data) {
      return { error: listResult.error || 'Unable to retrieve stored secrets.' };
    }
    const { access } = await vaultAccess();
    const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;
    const userSecrets = listResult.data
      .filter((row) => row.owner_id === access.userId)
      .slice(0, safeLimit);
    return { error: '', data: userSecrets };
  } catch {
    return denied;
  }
}

export async function deleteModuleSecret(id: unknown): Promise<ModuleResult> {
  try {
    if (!uuid(id)) return denied;
    const { client, access } = await vaultAccess();
    if (access.role !== 'team_lead') return denied;
    if (!await allowAttempt('module-delete', access.userId, 30, 60_000)) return denied;

    const { error } = await client.rpc('vault_delete', { secret_id: id });
    if (error) return denied;

    return {
      error: '',
      message: 'Secret permanently deleted from the vault.',
    };
  } catch {
    return denied;
  }
}

