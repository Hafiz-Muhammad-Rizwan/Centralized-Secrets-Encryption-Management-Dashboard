import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function moduleAt(path, imports = {}, env = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, process: { env }, URL, AbortSignal, fetch, atob, require(name) {
    if (name === 'server-only') return {};
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
    return imports[name];
  }};
  vm.runInNewContext(code, context);
  return context.exports;
}
const policy = moduleAt('src/lib/auth/policy.ts');
const redirect = (path) => { throw Error(`redirect:${path}`); };
function authModule({ user = { id: 'verified', user_metadata: { role: 'team_lead' } }, member = null, userError = null, memberError = null, offline = false, aal = 'aal2', claimsError = null, subject = 'verified' } = {}) {
  const client = {
    auth: { async getUser() { if (offline) throw Error('offline'); return { data: { user }, error: userError }; }, async getClaims() { return { data: { claims: { sub: subject, aal } }, error: claimsError }; } },
    from(table) {
      assert.equal(table, 'workspace_members');
      return { select() { return { eq(column, id) {
        assert.equal(column, 'user_id'); assert.equal(id, 'verified');
        return { async maybeSingle() { return { data: member, error: memberError }; } };
      } }; } };
    },
  };
  return moduleAt('src/lib/auth/access.ts', {
    'next/navigation': { redirect },
    '@/lib/supabase/server': { createAuthClient: async () => client },
    './policy': policy,
    '@/lib/security/audit': { audit() {} },
  });
}

test('no identity, forged metadata, missing role, disabled role, DB errors and outages deny access', async () => {
  for (const settings of [ {}, { user: null }, { userError: Error() }, { member: { role: 'team_lead', active: false } }, { member: { role: 'owner', active: true } }, { memberError: Error() }, { offline: true }, { member: { role: 'developer', active: true }, claimsError: Error() }, { member: { role: 'developer', active: true }, subject: 'forged' } ]) {
    const auth = authModule(settings);
    assert.equal(await auth.currentAccess(), null);
    await assert.rejects(auth.requireRole('team_lead'), /redirect:\/login/);
  }
});
test('verified role allows only its own workspace', async () => {
  for (const role of Object.keys(policy.ROLE_PATHS)) {
    const auth = authModule({ member: { role, active: true } });
    assert.equal((await auth.requireRole(role)).role, role);
    for (const other of Object.keys(policy.ROLE_PATHS).filter(r => r !== role)) {
      await assert.rejects(auth.requireRole(other), { message: `redirect:${policy.ROLE_PATHS[role]}` });
    }
  }
});
test('credentials are bounded, passwords preserved and prototype roles rejected', () => {
  const form = new FormData();
  form.set('email', ' user@example.com '); form.set('password', ' pass word ');
  assert.equal(policy.credentials(form).password, ' pass word ');
  form.set('password', 'x'.repeat(1025)); assert.equal(policy.credentials(form), null);
  form.set('password', 'abc'); form.set('email', 'invalid'); assert.equal(policy.credentials(form), null);
  assert.equal(policy.isRole('__proto__'), false);
  assert.equal(policy.isRole('constructor'), false);
});
test('missing or unsafe config fails closed; production cookies are HttpOnly and Secure', () => {
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: 'http://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test' }, { NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' }]) {
    assert.equal(moduleAt('src/lib/supabase/config.ts', {}, env).supabaseConfig(), null);
  }
  const config = moduleAt('src/lib/supabase/config.ts', {}, { NODE_ENV: 'production' });
  assert.equal(config.sessionCookieOptions.httpOnly, true);
  assert.equal(config.sessionCookieOptions.secure, true);
  assert.equal(config.sessionCookieOptions.sameSite, 'lax');
});

test('public API config rejects privileged keys and ambiguous endpoints while preserving legacy anon keys', () => {
  const jwt = role => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  const read = (key, url = 'https://project.supabase.co/') => moduleAt('src/lib/supabase/config.ts', {}, {
    NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  }).supabaseConfig();
  for (const key of ['sb_secret_private', jwt('service_role'), jwt('authenticated'), jwt(null), 'a.b.c', 'sb_publishable_', 'arbitrary', 'x'.repeat(4097)]) {
    assert.equal(read(key), null);
  }
  for (const key of ['sb_publishable_example-123', jwt('anon')]) {
    assert.equal(read(key).key, key);
    for (const url of ['http://project.supabase.co', 'https://user:pass@project.supabase.co', 'https://project.supabase.co/rest/v1', 'https://project.supabase.co/?key=x', 'https://project.supabase.co/#x']) {
      assert.equal(read(key, url), null);
    }
  }
});

test('login redirects only after verified credentials and an active database assignment', async () => {
  for (const [member, passwordError, expected] of [
    [null, null, null],
    [{ role: 'team_lead', active: false }, null, null],
    [{ role: 'team_lead', active: true }, Error('private auth diagnostic'), null],
    [{ role: 'developer', active: true }, null, '/developer/'],
  ]) {
    let signedOut = false;
    const client = {
      auth: {
        async signInWithPassword() { return { data: { user: { id: 'verified' } }, error: passwordError }; },
        async signOut() { signedOut = true; return { error: null }; },
        async getUser() { return { data: { user: { id: 'verified' } } }; },
      },
      from() { return { select() { return { eq() { return { async maybeSingle() { return { data: member, error: null }; } }; } }; } }; },
    };
    const actions = moduleAt('src/app/login/actions.ts', {
      'next/navigation': { redirect },
      '@/lib/supabase/server': { createAuthClient: async () => client },
      '@/lib/auth/policy': policy,
      '@/lib/auth/access': { currentAccess: async () => member?.active ? { role: member.role, userId: 'verified', mfaVerified: true } : null },
      '@/lib/security/rate-limit': { allowAttempt: async () => true },
      '@/lib/security/audit': { audit() {} },
    });
    const form = new FormData(); form.set('email', 'user@example.com'); form.set('password', 'test');
    if (expected) await assert.rejects(actions.signIn({}, form), { message: `redirect:${expected}` });
    else {
      const result = await actions.signIn({}, form);
      assert.match(result.error, /Unable to sign in/);
      assert.ok(!result.error.includes('private auth diagnostic'));
      if (!passwordError) assert.equal(signedOut, true);
    }
    await assert.rejects(actions.signOut(), { message: 'redirect:/login/' });
  }
});


test('a password-only session cannot enter any protected role even with a valid membership', async () => {
  for (const role of Object.keys(policy.ROLE_PATHS)) {
    const auth = authModule({ member: { role, active: true }, aal: 'aal1' });
    assert.equal((await auth.currentAccess()).mfaVerified, false);
    await assert.rejects(auth.requireRole(role), { message: 'redirect:/mfa/' });
  }
});
