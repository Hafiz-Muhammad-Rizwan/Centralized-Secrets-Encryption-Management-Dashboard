import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function load(imports = {}, env = {}) {
  const code = ts.transpileModule(readFileSync('src/lib/vault/modules.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    process: { env },
    Buffer,
    URL,
    AbortSignal,
    console,
    fetch,
    require(name) {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return crypto;
      if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
      return imports[name];
    },
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const owner = crypto.randomUUID();
const validInput = {
  name: 'payments-prod',
  value: 'Vault#2026!SecureKey',
  type: 'API Key',
  env: 'STAGING',
  service: 'Billing & Payments',
  rotationPolicy: '60 Days',
};

function deps(overrides = {}) {
  const calls = overrides.calls ?? [];
  const access = overrides.access ?? { role: 'team_lead', userId: owner };
  const rpc = overrides.rpc ?? (async () => ({ error: null, data: null }));
  return {
    calls,
    api: load({
      './access': {
        vaultAccess: async () => {
          if (overrides.accessThrows) throw Error('access unavailable');
          return {
            access,
            client: {
              rpc: async (name, args) => {
                calls.push({ rpc: name, args });
                return rpc(name, args);
              },
            },
          };
        },
      },
      './crypto': {
        seal: overrides.seal ?? (async () => ({ v: 1 })),
        unseal: overrides.unseal ?? (async () => 'plaintext'),
      },
      './key': { keyManager: () => ({}) },
      '@/lib/security/rate-limit': {
        allowAttempt: overrides.allowAttempt ?? (async () => true),
      },
    }),
  };
}

test('module provisioning rejects malformed fields before any database call', async () => {
  const { api, calls } = deps();
  const invalid = [
    null,
    {},
    { ...validInput, name: 'X' },
    { ...validInput, name: 'UPPER CASE' },
    { ...validInput, value: 'short' },
    { ...validInput, env: 'QA' },
    { ...validInput, type: 'Unknown classification' },
    { ...validInput, service: 'x' },
    { ...validInput, rotationPolicy: '7 Days' },
  ];
  for (const input of invalid) {
    const result = await api.provisionModuleSecret(input);
    assert.ok(result.error, `expected rejection for ${JSON.stringify(input)}`);
  }
  assert.equal(calls.length, 0);
});

test('module provisioning encrypts and inserts validated metadata', async () => {
  let sealed;
  const { api, calls } = deps({
    calls: [],
    seal: async (value, binding) => {
      sealed = { value, binding };
      return { v: 1, marker: 'sealed' };
    },
  });
  const result = await api.provisionModuleSecret({ ...validInput, name: ' Payments-Prod ' });
  assert.equal(result.error, '');
  assert.equal(result.data.name, 'payments-prod');
  assert.match(result.data.id, /^[a-f0-9-]{36}$/);
  assert.equal(sealed.value, validInput.value);
  assert.equal(sealed.binding.ownerId, owner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].rpc, 'vault_create_module');
  assert.equal(calls[0].args.secret_name, 'payments-prod');
  assert.equal(calls[0].args.p_secret_type, 'API Key');
  assert.equal(calls[0].args.p_environment, 'STAGING');
  assert.equal(calls[0].args.p_service, 'Billing & Payments');
  assert.equal(calls[0].args.p_rotation_policy, '60 Days');
  assert.deepEqual(calls[0].args.sealed, { v: 1, marker: 'sealed' });
});

test('module provisioning and rotation enforce team lead and rate limits', async () => {
  const developer = deps({ access: { role: 'developer', userId: owner } });
  assert.ok((await developer.api.provisionModuleSecret(validInput)).error);
  assert.equal(developer.calls.length, 0);

  const limited = deps({ allowAttempt: async () => false });
  assert.ok((await limited.api.provisionModuleSecret(validInput)).error);
  assert.equal(limited.calls.length, 0);

  const rotateDeveloper = deps({ access: { role: 'developer', userId: owner } });
  assert.ok((await rotateDeveloper.api.rotateModuleSecret(crypto.randomUUID(), 1)).error);
  assert.equal(rotateDeveloper.calls.length, 0);
});

test('module listing returns only validated rows and hides database errors', async () => {
  const row = {
    id: crypto.randomUUID(),
    name: 'payments-prod',
    owner_id: owner,
    version: 2,
    updated_at: '2026-11-16T12:00:00.000Z',
    secret_type: 'API Key',
    environment: 'STAGING',
    service: 'Billing & Payments',
    rotation_policy: '60 Days',
    access_count: 7,
  };
  const success = deps({
    rpc: async () => ({ error: null, data: [row, { id: 'not-a-uuid' }, null] }),
  });
  const result = await success.api.listModuleSecrets();
  assert.equal(result.error, '');
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, row.id);
  assert.equal(result.data[0].environment, 'STAGING');
  assert.equal(result.data[0].version, 2);
  assert.equal(result.data[0].access_count, 7);

  const failure = deps({
    rpc: async () => ({ error: Error('relation "vault_private.secrets" does not exist'), data: null }),
  });
  const failed = await failure.api.listModuleSecrets();
  assert.ok(failed.error);
  assert.ok(!failed.error.includes('vault_private'));
});

test('module rotation decrypts, re-encrypts, and uses optimistic versioning', async () => {
  const id = crypto.randomUUID();
  const calls = [];
  const { api } = deps({
    calls,
    unseal: async () => {
      calls.push({ step: 'unseal' });
      return 'plaintext-value';
    },
    seal: async (value, binding) => {
      calls.push({ step: 'seal', value, binding });
      return { v: 1, marker: 'rotated' };
    },
    rpc: async (name) => {
      if (name === 'vault_read') {
        return { error: null, data: { id, owner_id: owner, envelope: { v: 1 } } };
      }
      return { error: null, data: null };
    },
  });
  const result = await api.rotateModuleSecret(id, 4);
  assert.equal(result.error, '');
  assert.deepEqual(calls.map((call) => call.step ?? call.rpc), [
    'vault_read',
    'unseal',
    'seal',
    'vault_rotate_module',
  ]);
  const rotateCall = calls.find((call) => call.rpc === 'vault_rotate_module');
  assert.equal(rotateCall.args.expected_version, 4);
  assert.deepEqual(rotateCall.args.sealed, { v: 1, marker: 'rotated' });

  const foreign = deps({
    rpc: async (name) =>
      name === 'vault_read'
        ? { error: null, data: { id, owner_id: crypto.randomUUID(), envelope: { v: 1 } } }
        : { error: null, data: null },
  });
  assert.ok((await foreign.api.rotateModuleSecret(id, 1)).error);
  assert.ok(!foreign.calls.some((call) => call.rpc === 'vault_rotate_module'));

  const invalid = deps();
  assert.ok((await invalid.api.rotateModuleSecret('not-a-uuid', 1)).error);
  assert.ok((await invalid.api.rotateModuleSecret(id, 0)).error);
  assert.equal(invalid.calls.length, 0);
});

test('module recent provisions returns caller records bounded by limit', async () => {
  const row1 = {
    id: crypto.randomUUID(),
    name: 'secret-one',
    owner_id: owner,
    version: 1,
    updated_at: '2026-11-16T12:00:00.000Z',
    secret_type: 'API Key',
    environment: 'PROD',
    service: 'Core API',
    rotation_policy: '30 Days',
    access_count: 0,
  };
  const row2 = {
    id: crypto.randomUUID(),
    name: 'secret-two',
    owner_id: crypto.randomUUID(), // different owner
    version: 1,
    updated_at: '2026-11-16T11:00:00.000Z',
    secret_type: 'SSH Key',
    environment: 'DEV',
    service: 'Bastion',
    rotation_policy: '90 Days',
    access_count: 1,
  };
  const success = deps({
    rpc: async () => ({ error: null, data: [row1, row2] }),
  });
  const result = await success.api.getRecentModuleSecrets(5);
  assert.equal(result.error, '');
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, row1.id);
  assert.equal(result.data[0].name, 'secret-one');
});

test('module deletion enforces team lead role, uuid format, and calls vault_delete', async () => {
  const id = crypto.randomUUID();
  const calls = [];
  const { api } = deps({ calls });
  const result = await api.deleteModuleSecret(id);
  assert.equal(result.error, '');
  assert.match(result.message, /permanently deleted/i);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].rpc, 'vault_delete');
  assert.equal(calls[0].args.secret_id, id);

  // Invalid uuid rejected without rpc call
  const invalid = deps({ calls: [] });
  assert.ok((await invalid.api.deleteModuleSecret('invalid-id')).error);
  assert.equal(invalid.calls.length, 0);

  // Non-team-lead rejected
  const dev = deps({ access: { role: 'developer', userId: owner }, calls: [] });
  assert.ok((await dev.api.deleteModuleSecret(id)).error);
  assert.equal(dev.calls.length, 0);
});

