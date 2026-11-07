import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function account({ member = true, aal2 = true, recoveryError = false, factor = false, mfaError = false, revokeError = false, oldPasswordError = false, upgrade = true } = {}) {
  const calls = [];
  const client = { auth: {
    getUser: async () => ({ data: { user: { id: 'user', factors: factor ? [{ id: 'factor', status:'verified', factor_type:'totp' }] : [] } }, error:null }),
    getClaims: async () => ({ data: { claims: { sub:'user', aal: upgrade ? 'aal2' : 'aal1' } }, error:null }),
    verifyOtp: async value => { calls.push(['verify',value.type]); return { data: { user: { id: 'user', factors: factor ? [{ id: 'factor', status:'verified', factor_type:'totp' }] : [] } }, error: recoveryError ? Error() : null }; },
    updateUser: async () => { calls.push(['password']); return { error: null }; },
    signOut: async options => { calls.push(['logout',options.scope]); return { error:null }; },
    resetPasswordForEmail: async () => { calls.push(['email']); return { error:null }; },
    mfa: { challengeAndVerify: async () => ({ error: mfaError ? Error() : null }) },
  }, rpc: async name => { calls.push(['rpc',name]); return { error: revokeError ? Error() : null }; } };
  const imports = {
    '@supabase/supabase-js': { createClient: () => ({ auth: { signInWithPassword: async () => ({ data: { user: { id: 'user' } }, error: oldPasswordError ? Error() : null }), signOut: async () => ({ error:null }) } }) },
    '@/lib/supabase/server': { createAuthClient: async () => client },
    '@/lib/supabase/config': { supabaseConfig: () => ({ url:'https://example.com',key:'public' }) },
    '@/lib/auth/access': { currentAccess: async () => member ? { userId:'user',email:'test@example.com',mfaVerified:aal2 } : null },
    '@/lib/security/rate-limit': { allowAttempt: async () => true },
    '@/lib/security/client-address': { clientAddress: async () => null },
    '@/lib/security/audit': { audit: async () => {} },
  };
  const code = ts.transpileModule(readFileSync('src/app/account/actions.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022 } }).outputText;
  const ctx = { exports:{}, URL, process:{ env:{ SECURITY_DATA_ENABLED:'true',APP_ORIGIN:'https://app.example.com' } }, require(name) { if (!(name in imports)) throw Error(name); return imports[name]; } };
  vm.runInNewContext(code,ctx);
  return { actions:ctx.exports,calls };
}
function form() { const f=new FormData(); f.set('password','new-test-password'); f.set('currentPassword','old-test-password'); f.set('tokenHash','a'.repeat(64)); return f; }

test('password change requires current password, MFA and membership; database revocation precedes password change', async () => {
  for (const settings of [{member:false},{aal2:false},{oldPasswordError:true},{revokeError:true}]) {
    const {actions,calls}=account(settings);
    assert.ok((await actions.changePassword({},form())).error);
    assert.ok(!calls.some(c=>c[0]==='password'));
  }
  const {actions,calls}=account();
  assert.equal((await actions.changePassword({},form())).error,'');
  assert.deepEqual(calls.filter(c=>['rpc','password','logout'].includes(c[0])).map(c=>c.join(':')), ['rpc:revoke_workspace_sessions','password','logout:global']);
});

test('email recovery validates recovery token and retains existing MFA requirement', async () => {
  for (const settings of [{recoveryError:true},{factor:true},{factor:true,mfaError:true},{factor:true,upgrade:false},{revokeError:true}]) {
    const {actions,calls}=account(settings); const f=form();
    if(settings.mfaError || settings.upgrade === false) f.set('code','123456');
    assert.ok((await actions.finishPasswordReset({},f)).error);
    assert.ok(!calls.some(c=>c[0]==='password'));
  }
  const {actions,calls}=account({factor:true}); const f=form(); f.set('code','123456');
  assert.equal((await actions.finishPasswordReset({},f)).error,'');
  assert.deepEqual(calls[0],['verify','recovery']);
  assert.ok(calls.some(c=>c[0]==='logout'&&c[1]==='global'));
});

test('global sign-out requires MFA and fails closed if database revocation fails', async () => {
  for (const settings of [{aal2:false},{member:false},{revokeError:true}]) {
    const {actions}=account(settings); assert.ok((await actions.revokeAllSessions({},form())).error);
  }
  const {actions,calls}=account(); assert.equal((await actions.revokeAllSessions({},form())).error,'');
  assert.ok(calls.some(c=>c[0]==='logout'&&c[1]==='global'));
});
