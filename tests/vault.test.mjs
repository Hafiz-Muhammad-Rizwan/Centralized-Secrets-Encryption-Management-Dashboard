import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
function load(path, imports = {}, env = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const ctx = { exports: {}, process: { env }, Buffer, URL, AbortSignal, console, fetch, require(name) {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return crypto;
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
    return imports[name];
  }};
  vm.runInNewContext(code, ctx);
  return ctx.exports;
}
const envelopeCrypto = load('src/lib/vault/crypto.ts');
const env = { ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'), ENCRYPTION_KEY_ID: 'test-v1' };
const binding = { id: crypto.randomUUID(), ownerId: crypto.randomUUID() };
const manager = (e = env) => load('src/lib/vault/key.ts', {}, e).keyManager();

test('envelope roundtrip uses fresh data keys/IVs and rejects tampering or record substitution', async () => {
  const first = await envelopeCrypto.seal('test-only-value', binding, manager());
  const second = await envelopeCrypto.seal('test-only-value', binding, manager());
  assert.equal(await envelopeCrypto.unseal(first, binding, manager()), 'test-only-value');
  assert.notEqual(first.iv, second.iv); assert.notEqual(first.wrappedKey, second.wrappedKey);
  assert.notEqual(first.ciphertext, second.ciphertext);
  assert.ok(!JSON.stringify(first).includes('test-only-value'));
  for (const field of ['ciphertext', 'tag', 'iv', 'wrappedKey']) {
    const bytes = Buffer.from(first[field], 'base64'); bytes[bytes.length - 1] ^= 1;
    await assert.rejects(envelopeCrypto.unseal({ ...first, [field]: bytes.toString('base64') }, binding, manager()));
  }
  await assert.rejects(envelopeCrypto.unseal(first, { ...binding, id: crypto.randomUUID() }, manager()));
  await assert.rejects(envelopeCrypto.unseal(first, { ...binding, ownerId: crypto.randomUUID() }, manager()));
  await assert.rejects(envelopeCrypto.unseal({ ...first, keyId: 'unknown' }, binding, manager()));
  await assert.rejects(envelopeCrypto.unseal({ ...first, v: 2 }, binding, manager()));
  await assert.rejects(envelopeCrypto.seal('x'.repeat(8193), binding, manager()));
});

test('key rotation reads explicitly retained old versions and rejects missing or weak configuration', async () => {
  for (const key of [undefined, 'short', Buffer.alloc(31).toString('base64')]) assert.throws(() => manager({ ENCRYPTION_KEY: key }));
  const first = await envelopeCrypto.seal('test-only-value', binding, manager());
  const rotated = { ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'), ENCRYPTION_KEY_ID: 'test-v2', ENCRYPTION_PREVIOUS_KEYS: JSON.stringify({ 'test-v1': env.ENCRYPTION_KEY }) };
  assert.equal(await envelopeCrypto.unseal(first, binding, manager(rotated)), 'test-only-value');
  await assert.rejects(envelopeCrypto.unseal(first, binding, manager({ ...rotated, ENCRYPTION_PREVIOUS_KEYS: '{}' })));
  const second = await envelopeCrypto.seal('updated-test-value', binding, manager(rotated));
  assert.equal(second.keyId, 'test-v2');
});

test('vault actions reject absent auth, foreign ciphertext IDs and malformed inputs without plaintext disclosure', async () => {
  let cryptoCalls = 0, rpcCalls = 0;
  const actions = (authorized, data) => load('src/app/vault/actions.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/vault/access': { vaultAccess: async () => { if (!authorized) throw Error('unauthorized'); return { access: { userId: binding.ownerId, role: 'developer' }, client: { rpc: async () => { rpcCalls++; return { data, error: null }; } } }; } },
    '@/lib/vault/crypto': { unseal: async () => { cryptoCalls++; return 'must not leak'; } },
    '@/lib/vault/key': { keyManager: manager },
    '@/lib/security/rate-limit': { allowAttempt: async () => true },
  });
  assert.ok((await actions(false).revealSecret(binding.id)).error);
  assert.equal(rpcCalls, 0);
  assert.ok((await actions(true, { id: crypto.randomUUID() }).revealSecret(binding.id)).error);
  assert.equal(cryptoCalls, 0);
  const form = new FormData(); form.set('operation','create'); form.set('value','example');
  assert.ok((await actions(true).changeSecret({},form)).error);
  assert.ok((await actions(true).revealSecret('not-a-uuid')).error);
});

test('vault reveal fails when durable authorization/audit RPC fails', async () => {
  let decrypted = false;
  const actions = load('src/app/vault/actions.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/vault/access': { vaultAccess: async () => ({ access: { userId: binding.ownerId }, client: { rpc: async () => ({ error: Error('audit unavailable'), data: null }) } }) },
    '@/lib/vault/crypto': { unseal: async () => { decrypted = true; } },
    '@/lib/vault/key': { keyManager: manager },
    '@/lib/security/rate-limit': { allowAttempt: async () => true },
  });
  assert.ok((await actions.revealSecret(binding.id)).error);
  assert.equal(decrypted, false);
});
