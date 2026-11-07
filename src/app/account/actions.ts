'use server';
import { createClient } from '@supabase/supabase-js';
import { createAuthClient } from '@/lib/supabase/server';
import { authFetch, supabaseConfig } from '@/lib/supabase/config';
import { currentAccess } from '@/lib/auth/access';
import { allowAttempt } from '@/lib/security/rate-limit';
import { clientAddress } from '@/lib/security/client-address';
import { audit } from '@/lib/security/audit';

export type AccountState = { error: string; message?: string };
const denied = { error: 'Unable to complete this request. Sign in again or contact your administrator.' };
const password = (v: unknown): v is string => typeof v === 'string' && v.length >= 12 && v.length <= 128;

export async function requestPasswordReset(_state: AccountState, form: FormData): Promise<AccountState> {
  const generic = { error: '', message: 'If this account can receive recovery email, a reset link will be sent. Check your inbox.' };
  try {
    const email = form.get('email');
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return generic;
    const ip = await clientAddress();
    if (!await allowAttempt('reset-account', email.trim(), 3, 15 * 60_000) || (ip && !await allowAttempt('reset-ip', ip, 10, 15 * 60_000))) return generic;
    const origin = new URL(process.env.APP_ORIGIN ?? '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return generic;
    const client = await createAuthClient(true);
    await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin.origin}/account/recover/` });
  } catch { /* Uniform response prevents account enumeration. */ }
  return generic;
}

export async function changePassword(_state: AccountState, form: FormData): Promise<AccountState> {
  if (process.env.SECURITY_DATA_ENABLED !== 'true') return denied;
  const nextPassword = form.get('password'), currentPassword = form.get('currentPassword');
  if (!password(nextPassword) || typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 1024 || nextPassword === currentPassword) return denied;
  try {
    const client = await createAuthClient(true);
    const access = await currentAccess(client);
    if (!access?.mfaVerified || !await allowAttempt('password-change', access.userId, 5, 15 * 60_000)) return denied;
    const config = supabaseConfig();
    if (!config) return denied;
    // Reauthenticate without replacing the existing MFA-verified cookie session.
    const verifier = createClient(config.url, config.key, { global: { fetch: authFetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await verifier.auth.signInWithPassword({ email: access.email, password: currentPassword });
    if (error || data.user?.id !== access.userId) return denied;
    await verifier.auth.signOut({ scope: 'local' });
    const { error: revokeError } = await client.rpc('revoke_workspace_sessions');
    if (revokeError) return denied;
    const { error: updateError } = await client.auth.updateUser({ password: nextPassword });
    const { error: logoutError } = await client.auth.signOut({ scope: 'global' });
    if (updateError || logoutError) return { error: 'Sessions were revoked, but the password change or provider sign-out did not fully complete. Sign in again or contact your administrator.' };
    await audit('password_changed', access.userId);
    return { error: '', message: 'Password changed and all sessions revoked. Sign in again.' };
  } catch { return denied; }
}

export async function finishPasswordReset(_state: AccountState, form: FormData): Promise<AccountState> {
  if (process.env.SECURITY_DATA_ENABLED !== 'true') return denied;
  const tokenHash = form.get('tokenHash'), nextPassword = form.get('password'), code = form.get('code');
  if (typeof tokenHash !== 'string' || !/^[a-f0-9]{40,128}$/i.test(tokenHash) || !password(nextPassword)) return denied;
  try {
    const ip = await clientAddress();
    if (!await allowAttempt('reset-token', tokenHash, 5, 15 * 60_000) || (ip && !await allowAttempt('recovery-ip', ip, 10, 15 * 60_000))) return denied;
    const client = await createAuthClient(true);
    // Explicit recovery type: signup/magic-link tokens cannot authorize a reset.
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error || !data.user) return denied;
    const { data: latest, error: userError } = await client.auth.getUser();
    if (userError || !latest.user || latest.user.id !== data.user.id) { await client.auth.signOut({ scope: 'local' }); return denied; }
    const factors = latest.user.factors?.filter(f => f.status === 'verified') ?? [];
    if (factors.length) {
      const totp = factors.find(f => f.factor_type === 'totp');
      if (!totp || typeof code !== 'string' || !/^\d{6}$/.test(code)) { await client.auth.signOut({ scope: 'local' }); return denied; }
      const { error: mfaError } = await client.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
      if (mfaError) { await client.auth.signOut({ scope: 'local' }); return denied; }
      const { data: verified, error: claimsError } = await client.auth.getClaims();
      if (claimsError || verified?.claims.sub !== data.user.id || verified.claims.aal !== 'aal2') {
        await client.auth.signOut({ scope: 'local' }); return denied;
      }
    }
    // Email recovery is not a bypass for an existing authenticator.
    const { error: revokeError } = await client.rpc('revoke_workspace_sessions');
    if (revokeError) { await client.auth.signOut({ scope: 'local' }); return denied; }
    const { error: updateError } = await client.auth.updateUser({ password: nextPassword });
    const { error: logoutError } = await client.auth.signOut({ scope: 'global' });
    if (updateError || logoutError) return denied;
    await audit('password_reset', data.user.id);
    return { error: '', message: 'Password reset and all sessions revoked. Sign in again with your authenticator.' };
  } catch { return denied; }
}

export async function revokeAllSessions(): Promise<AccountState> {
  if (process.env.SECURITY_DATA_ENABLED !== 'true') return denied;
  try {
    const client = await createAuthClient(true);
    const access = await currentAccess(client);
    if (!access?.mfaVerified) return denied;
    const { error } = await client.rpc('revoke_workspace_sessions');
    if (error) return denied;
    const { error: providerError } = await client.auth.signOut({ scope: 'global' });
    await audit('sessions_revoked', access.userId);
    return providerError ? { error: 'Workspace sessions revoked. Provider sign-out failed; contact your administrator to retry global revocation.' } : { error: '', message: 'All sessions revoked. Sign in again.' };
  } catch { return denied; }
}
