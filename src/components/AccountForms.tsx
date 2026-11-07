'use client';
import { useActionState } from 'react';
import { changePassword, requestPasswordReset, finishPasswordReset, revokeAllSessions } from '@/app/account/actions';

export default function AccountForms({ mode, tokenHash = '' }: { mode: 'account' | 'request' | 'recover'; tokenHash?: string }) {
  const [state, action, pending] = useActionState(mode === 'account' ? changePassword : mode === 'request' ? requestPasswordReset : finishPasswordReset, { error: '' });
  const [revoked, revoke, revoking] = useActionState(revokeAllSessions, { error: '' });
  return <section>
    <form action={action}>
      {mode === 'request' && <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>}
      {mode === 'account' && <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" maxLength={1024} required /></label>}
      {mode !== 'request' && <label>New password (12–128 characters)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>}
      {mode === 'recover' && <><input type="hidden" name="tokenHash" value={tokenHash} /><label>Authenticator code (if enrolled)<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} /></label><p>A failed recovery attempt can consume the email token. Request a new link if needed. Lost your authenticator? Contact your administrator for identity-verified recovery.</p></>}
      <button className="primary-button" disabled={pending}>{pending ? 'Working…' : mode === 'request' ? 'Send recovery email' : 'Change password and revoke sessions'}</button>
      <p role="status">{state.error || state.message}</p>
    </form>
    {mode === 'account' && <form action={revoke}><button className="secondary-button" disabled={revoking}>Sign out all devices</button><p role="status">{revoked.error || revoked.message}</p></form>}
    <a href="/login/">Return to sign in</a>
  </section>;
}
