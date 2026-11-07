import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type Envelope = { v: 1; keyId: string; wrappedKey: string; iv: string; tag: string; ciphertext: string };
export type Binding = { id: string; ownerId: string };
export interface KeyManager {
  generate(context: Record<string, string>): Promise<{ plaintext: Uint8Array; wrapped: Uint8Array; keyId: string }>;
  unwrap(wrapped: Uint8Array, keyId: string, context: Record<string, string>): Promise<Uint8Array>;
}
function context(binding: Binding) { return { application: 'vaultline', secret_id: binding.id, owner_id: binding.ownerId }; }
function aad(binding: Binding) { return Buffer.from(JSON.stringify(['vaultline', 1, binding.id, binding.ownerId])); }
function decode(value: unknown, max: number, exact?: number): Buffer {
  if (typeof value !== 'string' || value.length > max * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Invalid envelope');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value || bytes.length > max || (exact !== undefined && bytes.length !== exact)) throw Error('Invalid envelope');
  return bytes;
}
export async function seal(value: string, binding: Binding, manager: KeyManager): Promise<Envelope> {
  const plaintext = Buffer.from(value, 'utf8');
  if (plaintext.length < 1 || plaintext.length > 8192) { plaintext.fill(0); throw Error('Invalid secret size'); }
  let material: Awaited<ReturnType<KeyManager['generate']>> | undefined;
  try {
    material = await manager.generate(context(binding));
    if (material.plaintext.length !== 32) throw Error('Invalid data key');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', material.plaintext, iv);
    cipher.setAAD(aad(binding));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { v: 1, keyId: material.keyId, wrappedKey: Buffer.from(material.wrapped).toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  } finally { material?.plaintext.fill(0); plaintext.fill(0); }
}
export async function unseal(value: Envelope, binding: Binding, manager: KeyManager): Promise<string> {
  if (!value || value.v !== 1 || typeof value.keyId !== 'string' || value.keyId.length > 2048) throw Error('Invalid envelope');
  const iv = decode(value.iv, 12, 12), tag = decode(value.tag, 16, 16);
  const ciphertext = decode(value.ciphertext, 8192), wrapped = decode(value.wrappedKey, 6144);
  const key = await manager.unwrap(wrapped, value.keyId, context(binding));
  let plaintext: Buffer | undefined;
  try {
    if (key.length !== 32) throw Error('Invalid data key');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad(binding)); decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } finally { key.fill(0); plaintext?.fill(0); }
}
