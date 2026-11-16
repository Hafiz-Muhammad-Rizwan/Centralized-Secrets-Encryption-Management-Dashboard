import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function loadModules(imports = {}) {
  const code = ts.transpileModule(readFileSync('src/lib/vault/modules.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = {
    exports: {},
    Buffer,
    URL,
    AbortSignal,
    console,
    fetch,
    require(name) {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return crypto;
      if (name in imports) return imports[name];
      throw Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const ownerId = crypto.randomUUID();

function mockDeps(overrides = {}) {
  const calls = overrides.calls ?? [];
  const access = overrides.access ?? { role: 'team_lead', userId: ownerId };
  return {
    calls,
    modules: loadModules({
      './access': {
        vaultAccess: async () => ({
          access,
          client: {
            rpc: async (name, args) => {
              calls.push({ rpc: name, args });
              if (overrides.rpc) return overrides.rpc(name, args);
              return { error: null, data: null };
            },
          },
        }),
      },
      './crypto': {
        seal: overrides.seal ?? (async (value) => ({ v: 1, encrypted: true, length: value.length })),
        unseal: overrides.unseal ?? (async () => 'decrypted-secret-payload'),
      },
      './key': { keyManager: () => ({}) },
      '@/lib/security/rate-limit': {
        allowAttempt: overrides.allowAttempt ?? (async () => true),
      },
    }),
  };
}

test('Task 3: Form submission sends data from frontend, encrypts payload, and stores in database', async () => {
  const { modules, calls } = mockDeps();
  const formData = {
    name: 'database-creds-prod',
    value: 'SuperSecretDBPassword123!',
    type: 'DB Credential',
    env: 'PROD',
    service: 'Core Database Service',
    rotationPolicy: '30 Days',
  };

  const response = await modules.provisionModuleSecret(formData);
  assert.equal(response.error, '', 'Expected no error on valid submission');
  assert.match(response.message, /encrypted and stored/i, 'Expected success message');
  assert.equal(response.data.name, 'database-creds-prod');
  assert.equal(response.data.version, 1);
  assert.match(response.data.id, /^[0-9a-f-]{36}$/i);

  // Verifying backend database RPC was called with encrypted sealed payload
  assert.equal(calls.length, 1);
  assert.equal(calls[0].rpc, 'vault_create_module');
  assert.equal(calls[0].args.secret_name, 'database-creds-prod');
  assert.equal(calls[0].args.p_environment, 'PROD');
  assert.equal(calls[0].args.p_secret_type, 'DB Credential');
  assert.equal(calls[0].args.p_service, 'Core Database Service');
  assert.equal(calls[0].args.p_rotation_policy, '30 Days');
  assert.equal(calls[0].args.sealed.encrypted, true);
});

test('Task 3: Backend retrieves stored records to replace mock data in frontend interfaces', async () => {
  const dbRecord = {
    id: crypto.randomUUID(),
    name: 'api-gateway-key',
    owner_id: ownerId,
    version: 2,
    updated_at: new Date().toISOString(),
    secret_type: 'API Key',
    environment: 'PROD',
    service: 'API Gateway',
    rotation_policy: '60 Days',
    access_count: 5,
  };

  const { modules } = mockDeps({
    rpc: async (name) => {
      if (name === 'vault_list_modules') {
        return { error: null, data: [dbRecord] };
      }
      return { error: null, data: null };
    },
  });

  const listResponse = await modules.listModuleSecrets();
  assert.equal(listResponse.error, '');
  assert.equal(listResponse.data.length, 1);
  assert.equal(listResponse.data[0].name, 'api-gateway-key');
  assert.equal(listResponse.data[0].access_count, 5);
  // Ensure no ciphertext is present in the list response (zero leakage)
  assert.equal('envelope' in listResponse.data[0], false);
  assert.equal('plainValue' in listResponse.data[0], false);

  // Also verify recent provisions retrieval for Module 1
  const recentResponse = await modules.getRecentModuleSecrets(3);
  assert.equal(recentResponse.error, '');
  assert.equal(recentResponse.data.length, 1);
  assert.equal(recentResponse.data[0].id, dbRecord.id);
});

test('Task 3: Handles unsuccessful operations gracefully with appropriate user messages', async () => {
  // 1. Invalid input rejection
  const { modules } = mockDeps();
  const invalidData = {
    name: '<script>alert(1)</script>',
    value: 'short',
    type: 'InvalidType',
    env: 'NOT_AN_ENV',
    service: 'x',
    rotationPolicy: 'InvalidPolicy',
  };
  const failResponse = await modules.provisionModuleSecret(invalidData);
  assert.ok(failResponse.error);
  assert.match(failResponse.error, /invalid/i);

  // 2. Database outage / error fails closed with safe message
  const failingDb = mockDeps({
    rpc: async () => ({ error: { message: 'relation does not exist' }, data: null }),
  });
  const dbErrorResponse = await failingDb.modules.listModuleSecrets();
  assert.ok(dbErrorResponse.error);
  assert.equal(dbErrorResponse.data, undefined);
  // Message does not expose raw SQL or database internal names
  assert.ok(!dbErrorResponse.error.includes('relation'));
  assert.ok(!dbErrorResponse.error.includes('SQL'));
});

test('Task 3: Rotation and deletion operations process successfully through backend', async () => {
  const secretId = crypto.randomUUID();
  const { modules, calls } = mockDeps({
    rpc: async (name) => {
      if (name === 'vault_read') {
        return { error: null, data: { id: secretId, owner_id: ownerId, envelope: { v: 1 } } };
      }
      return { error: null, data: null };
    },
  });

  // Rotate operation
  const rotateResponse = await modules.rotateModuleSecret(secretId, 1);
  assert.equal(rotateResponse.error, '');
  assert.match(rotateResponse.message, /re-encrypted/i);
  assert.ok(calls.some((c) => c.rpc === 'vault_rotate_module'));

  // Delete operation
  const deleteResponse = await modules.deleteModuleSecret(secretId);
  assert.equal(deleteResponse.error, '');
  assert.match(deleteResponse.message, /permanently deleted/i);
  assert.ok(calls.some((c) => c.rpc === 'vault_delete'));
});
