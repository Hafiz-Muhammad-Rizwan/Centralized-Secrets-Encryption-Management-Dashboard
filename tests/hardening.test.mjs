import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function load(path, imports = {}, env = {}, extras = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const ctx = { exports: {}, process: { env }, URL, AbortSignal, fetch, console, ...extras, require(name) {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return crypto;
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
    return imports[name];
  }};
  vm.runInNewContext(code, ctx);
  return ctx.exports;
}
const factorId = '12345678-1234-1234-1234-123456789abc';
const redirect = path => { throw Error(`redirect:${path}`); };
function mfa({ active = true, foreign = false, verified = false, upgrade = true, limited = false, error = false, bootstrap = true } = {}) {
  let verifyCalls = 0; let enrollCalls = 0; let unenrollCalls = 0;
  const member = { userId: 'owner', role: 'developer', mfaVerified: verified, factors: verified ? [{ id: factorId, type: 'totp' }] : [] };
  const client = { rpc: async () => ({ data: bootstrap, error: null }), auth: {
    getUser: async () => ({ data: { user: { id: 'owner', factors: foreign ? [] : [{ id: factorId, factor_type: 'totp', status: verified ? 'verified' : 'unverified' }] } }, error: null }),
    mfa: {
      challengeAndVerify: async () => { verifyCalls++; member.mfaVerified = upgrade; return { error: error ? Error('provider private info') : null }; },
      enroll: async () => { enrollCalls++; return { data: { id: factorId, totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'private-seed' } }, error: null }; },
      unenroll: async () => { unenrollCalls++; return { error: null }; },
    },
  }};
  const actions = load('src/app/mfa/actions.ts', {
    'next/navigation': { redirect },
    '@/lib/supabase/server': { createAuthClient: async () => client },
    '@/lib/auth/access': { currentAccess: async () => active ? member : null },
    '@/lib/auth/policy': { ROLE_PATHS: { developer: '/developer/' } },
    '@/lib/security/audit': { audit() {} },
    '@/lib/security/rate-limit': { allowAttempt: async () => !limited },
  });
  return { actions, calls: () => ({ verifyCalls, enrollCalls, unenrollCalls }) };
}

test('MFA action rejects foreign factors, unauthenticated users, malformed codes, and rate-limited attempts', async () => {
  for (const settings of [{ foreign: true }, { active: false }, { limited: true }, { badCode: true }]) {
    const { actions, calls } = mfa(settings);
    const form = new FormData(); form.set('factorId', factorId); form.set('code', settings.badCode ? '12345x' : '123456');
    assert.match((await actions.verifyAuthenticator({}, form)).error, /Unable/);
    assert.equal(calls().verifyCalls, 0);
  }
});
test('MFA accepts only an upgraded verified session; provider errors remain generic', async () => {
  for (const settings of [{ upgrade: false }, { error: true }, {}]) {
    const { actions } = mfa(settings);
    const form = new FormData(); form.set('factorId', factorId); form.set('code', '123456');
    if (!Object.keys(settings).length) await assert.rejects(actions.verifyAuthenticator({}, form), { message: 'redirect:/developer/' });
    else assert.match((await actions.verifyAuthenticator({}, form)).error, /^Unable to complete/);
  }
});
test('password-only requests cannot remove or replace an existing verified factor', async () => {
  for (const settings of [{ verified: true }, { active: false }, { limited: true }, { bootstrap: false }]) {
    const { actions, calls } = mfa(settings);
    assert.match((await actions.enrollAuthenticator('a'.repeat(64))).error, /Unable/);
    assert.equal(calls().enrollCalls, 0);
    assert.equal(calls().unenrollCalls, 0);
  }
  const { actions, calls } = mfa();
  assert.equal((await actions.enrollAuthenticator('a'.repeat(64))).factorId, factorId);
  assert.equal(calls().unenrollCalls, 1);
});
test('local rate buckets enforce counts and expire', async () => {
  let now = 1000;
  const rate = load('src/lib/security/rate-limit.ts', {}, {}, { Date: { now: () => now } });
  assert.equal(await rate.allowAttempt('login', 'person', 2, 100), true);
  assert.equal(await rate.allowAttempt('login', 'PERSON', 2, 100), true);
  assert.equal(await rate.allowAttempt('login', 'person', 2, 100), false);
  now = 1101;
  assert.equal(await rate.allowAttempt('login', 'person', 2, 100), true);
});
test('shared rate limiting keeps known denials closed and bounds outage fallback', async () => {
  const env = { SECURITY_REDIS_REST_URL: 'https://redis.example.com', SECURITY_REDIS_REST_TOKEN: 'private-token' };
  for (const result of [{ result: 1 }, { result: 3 }, { error: 'bad command' }]) {
    const rate = load('src/lib/security/rate-limit.ts', {}, env, { fetch: async (_url, options) => {
      const command = JSON.parse(options.body);
      assert.equal(options.redirect, 'error');
      assert.equal(command[0], 'EVAL'); assert.match(command[1], /PEXPIRE/);
      assert.ok(!command[3].includes('person@example.com'));
      return { ok: true, json: async () => result };
    }});
    assert.equal(await rate.allowAttempt('login', 'person@example.com', 2, 100), result.result === 1);
  }
  const failed = load('src/lib/security/rate-limit.ts', {}, env, { fetch: async () => { throw Error('offline'); } });
  assert.equal(await failed.allowAttempt('login', 'person', 2, 100), true);
  assert.equal(await failed.allowAttempt('login', 'person', 2, 100), true);
  assert.equal(await failed.allowAttempt('login', 'person', 2, 100), false);
  assert.equal(await load('src/lib/security/rate-limit.ts', {}, { SECURITY_REDIS_REST_TOKEN: 'only' }).allowAttempt('login', 'person', 2, 100), false);
  for (const url of ['http://redis.example.com', 'https://user:pass@redis.example.com', 'https://redis.example.com/unexpected', 'https://redis.example.com/?token=x']) {
    let calls = 0;
    const invalid = load('src/lib/security/rate-limit.ts', {}, { ...env, SECURITY_REDIS_REST_URL: url }, { fetch: async () => { calls++; throw Error('unexpected fetch'); } });
    assert.equal(await invalid.allowAttempt('login', 'person', 2, 100), false);
    assert.equal(calls, 0);
  }
});

test('auth fetch prevents credential redirects, disables caching and respects cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  const { authFetch } = load('src/lib/supabase/config.ts', {}, {}, { fetch: async (_url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal.aborted, true);
    return new Response();
  }});
  await authFetch('https://project.supabase.co/auth/v1/user', { signal: controller.signal, redirect: 'follow', cache: 'force-cache' });
});
test('structured audit uses only event, timestamp, request ID, and actor', () => {
  const logs = [];
  const { audit } = load('src/lib/security/audit.ts', {}, {}, { console: { info: text => logs.push(JSON.parse(text)) } });
  audit('mfa_verified', 'user-uuid');
  assert.deepEqual(Object.keys(logs[0]).sort(), ['actor','at','event','id','type']);
  assert.equal(logs[0].event, 'mfa_verified');
});

test('login stops before the auth provider when throttled and sends AAL1 sessions to MFA', async () => {
  for (const limited of [true, false]) {
    let providerCalls = 0;
    const client = { auth: {
      signInWithPassword: async () => { providerCalls++; return { data: { user: { id: 'owner' } }, error: null }; },
    }};
    const actions = load('src/app/login/actions.ts', {
      'next/navigation': { redirect },
      '@/lib/supabase/server': { createAuthClient: async () => client },
      '@/lib/auth/access': { currentAccess: async () => ({ userId: 'owner', role: 'developer', mfaVerified: false }) },
      '@/lib/auth/policy': { credentials: () => ({ email: 'user@example.com', password: 'not-logged' }), ROLE_PATHS: { developer: '/developer/' } },
      '@/lib/security/audit': { audit() {} },
      '@/lib/security/rate-limit': { allowAttempt: async () => !limited },
      '@/lib/security/client-address': { clientAddress: async () => null },
    });
    if (limited) {
      assert.match((await actions.signIn({}, new FormData())).error, /Unable to sign in/);
      assert.equal(providerCalls, 0);
    } else {
      await assert.rejects(actions.signIn({}, new FormData()), { message: 'redirect:/mfa/' });
      assert.equal(providerCalls, 1);
    }
  }
});

test('audit exporter sends only allowlisted fields, prevents redirects and reports delivery failure', async () => {
  const entries = [], warnings = []; let requests = 0;
  const logger = load('src/lib/security/audit.ts', {}, { SECURITY_AUDIT_SINK_URL: 'https://logs.example.com/append', SECURITY_AUDIT_SINK_TOKEN: 'test-only-token' }, {
    console: { info: text => entries.push(JSON.parse(text)), warn: text => warnings.push(JSON.parse(text)) },
    fetch: async (_url, options) => {
      requests++;
      assert.equal(options.redirect, 'error');
      const body=JSON.parse(options.body);
      assert.deepEqual(Object.keys(body).sort(), ['actor','at','event','id','type']);
      assert.equal(options.headers['Idempotency-Key'],body.id);
      return { ok:false };
    },
  });
  await logger.audit('password_changed','test-user');
  assert.equal(requests,1); assert.equal(entries.length,1);
  assert.equal(warnings[0].event,'audit_export_failed');
  assert.ok(!JSON.stringify(warnings).includes('test-only-token'));
});
