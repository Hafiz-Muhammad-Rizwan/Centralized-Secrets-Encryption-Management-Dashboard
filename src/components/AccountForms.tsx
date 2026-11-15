'use client';
import { useActionState, useState } from 'react';
import { changePassword, requestPasswordReset, finishPasswordReset, revokeAllSessions } from '@/app/account/actions';
import { checkPasswordStrength } from '@/lib/security/password_strength_helper';

export default function AccountForms({ mode, tokenHash = '' }: { mode: 'account' | 'request' | 'recover'; tokenHash?: string }) {
  const [state, action, pending] = useActionState(mode === 'account' ? changePassword : mode === 'request' ? requestPasswordReset : finishPasswordReset, { error: '' });
  const [revoked, revoke, revoking] = useActionState(revokeAllSessions, { error: '' });
  const [newPassword, setNewPassword] = useState('');
  const [clientError, setClientError] = useState('');

  const strengthResult = checkPasswordStrength(newPassword);

  const getStrengthBadgeClass = (str: string) => {
    if (str === 'Strong') return 'env emerald';
    if (str === 'Moderate') return 'env amber';
    return 'env crimson';
  };

  const getStrengthBarWidth = (score: number) => {
    if (!newPassword) return '0%';
    if (score >= 4) return '100%';
    if (score === 3) return '75%';
    if (score === 2) return '50%';
    return '25%';
  };

  return <section>
    <form
      action={action}
      onSubmit={(e) => {
        setClientError('');
        if (mode !== 'request') {
          if (!newPassword.trim()) {
            e.preventDefault();
            setClientError('Password cannot be empty or contain only whitespace.');
            return;
          }
          if (newPassword.length < 12) {
            e.preventDefault();
            setClientError('Password must be at least 12 characters long.');
            return;
          }
        }
      }}
    >
      {mode === 'request' && <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>}
      {mode === 'account' && <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" maxLength={1024} required /></label>}
      {mode !== 'request' && (
        <div style={{ marginBottom: '16px' }}>
          <label>
            New password (12–128 characters)
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>

          {/* Task 5: Password Strength Evaluation Feedback */}
          {newPassword.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Password Strength:</span>
                <span className={getStrengthBadgeClass(strengthResult.strength)} style={{ fontSize: '11px', fontWeight: 600 }}>
                  {strengthResult.strength}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                <div
                  style={{
                    width: getStrengthBarWidth(strengthResult.score),
                    height: '100%',
                    background:
                      strengthResult.strength === 'Strong'
                        ? 'var(--emerald)'
                        : strengthResult.strength === 'Moderate'
                        ? 'var(--amber)'
                        : 'var(--crimson)',
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>

              {/* Feedback message */}
              <p style={{ fontSize: '12px', color: 'var(--text-subtle, var(--muted))', margin: 0 }}>
                {strengthResult.feedback}
              </p>
            </div>
          )}

          {/* Demonstration helpers for Activity 5 verification */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--dim)', alignSelf: 'center' }}>Test:</span>
            <button
              type="button"
              className="filter-button"
              style={{ fontSize: '11px', padding: '2px 8px' }}
              onClick={() => setNewPassword('pass123')}
            >
              Weak
            </button>
            <button
              type="button"
              className="filter-button"
              style={{ fontSize: '11px', padding: '2px 8px' }}
              onClick={() => setNewPassword('Password123')}
            >
              Moderate
            </button>
            <button
              type="button"
              className="filter-button"
              style={{ fontSize: '11px', padding: '2px 8px' }}
              onClick={() => setNewPassword('Vault#2026!SecureKey')}
            >
              Strong
            </button>
          </div>
        </div>
      )}
      {mode === 'recover' && <><input type="hidden" name="tokenHash" value={tokenHash} /><label>Authenticator code (if enrolled)<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} /></label><p>A failed recovery attempt can consume the email token. Request a new link if needed. Lost your authenticator? Contact your administrator for identity-verified recovery.</p></>}
      {clientError && <p className="login-error" role="alert">{clientError}</p>}
      <button className="primary-button" disabled={pending}>{pending ? 'Working…' : mode === 'request' ? 'Send recovery email' : 'Change password and revoke sessions'}</button>
      <p role="status">{state.error || state.message}</p>
    </form>
    {mode === 'account' && <form action={revoke}><button className="secondary-button" disabled={revoking}>Sign out all devices</button><p role="status">{revoked.error || revoked.message}</p></form>}
    <a href="/login/">Return to sign in</a>
  </section>;
}
