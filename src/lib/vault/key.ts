import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { KeyManager } from './crypto';

function decodeKey(value: unknown): Buffer {
  if (typeof value !== 'string') throw Error('Vault key is not configured');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) { key.fill(0); throw Error('Vault key must be 32 random bytes in canonical base64'); }
  return key;
}
function binding(context: Record<string, string>) {
  return Buffer.from(JSON.stringify(['vaultline-data-key', 1, context.secret_id, context.owner_id]));
}
export function keyManager(): KeyManager {
  const keyId = process.env.ENCRYPTION_KEY_ID ?? 'v1';
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(keyId)) throw Error('Invalid key version');
  // Validate configuration immediately, including on a read-only list deployment check.
  decodeKey(process.env.ENCRYPTION_KEY).fill(0);
  function master(id: string) {
    if (id === keyId) return decodeKey(process.env.ENCRYPTION_KEY);
    const previous: unknown = JSON.parse(process.env.ENCRYPTION_PREVIOUS_KEYS ?? '{}');
    if (!previous || typeof previous !== 'object' || Array.isArray(previous) || !Object.hasOwn(previous, id)) throw Error('Unknown key version');
    return decodeKey((previous as Record<string, unknown>)[id]);
  }
  return {
    async generate(context) {
      const root = master(keyId), plaintext = randomBytes(32), iv = randomBytes(12);
      try {
        const cipher = createCipheriv('aes-256-gcm', root, iv);
        cipher.setAAD(binding(context));
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        // Fixed-size versioned binary envelope: version + IV + tag + data key.
        const wrapped = Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), encrypted]);
        return { plaintext, wrapped, keyId };
      } catch (error) { plaintext.fill(0); throw error; }
      finally { root.fill(0); }
    },
    async unwrap(wrapped, id, context) {
      if (wrapped.length !== 61 || wrapped[0] !== 1) throw Error('Invalid wrapped key');
      const root = master(id);
      try {
        const decipher = createDecipheriv('aes-256-gcm', root, wrapped.subarray(1,13));
        decipher.setAAD(binding(context)); decipher.setAuthTag(wrapped.subarray(13,29));
        return Buffer.concat([decipher.update(wrapped.subarray(29)), decipher.final()]);
      } finally { root.fill(0); }
    },
  };
}
