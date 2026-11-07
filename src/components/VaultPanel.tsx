'use client';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { changeSecret, revealSecret } from '@/app/vault/actions';
export type VaultRow = { id: string; name: string; owner_id: string; version: number; updated_at: string };
function SecretCard({ row, canManage }: { row: VaultRow; canManage: boolean }) {
  const [state, action, pending] = useActionState(changeSecret, { error: '' });
  const [revealed, setRevealed] = useState('');
  const [error, setError] = useState('');
  const [working, start] = useTransition();
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(''), 30_000);
    const hide = () => setRevealed('');
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    return () => { clearTimeout(timer); window.removeEventListener('blur', hide); window.removeEventListener('pagehide', hide); };
  }, [revealed]);
  return <article className="vault-card"><h2>{row.name}</h2><p>Version {row.version} · Updated {row.updated_at}</p>
    <button className="secondary-button" disabled={working} onClick={() => start(async () => {
      try { const result = await revealSecret(row.id); setRevealed(result.value ?? ''); setError(result.error); }
      catch { setError('Unable to reveal this secret.'); }
    })}>Reveal for 30 seconds</button>
    {revealed && <div><pre>{revealed}</pre><button onClick={() => setRevealed('')}>Hide now</button></div>}
    <p role="status">{error}</p>
    {canManage && <form action={action}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="version" value={row.version} />
      <label>Replacement value<input type="password" name="value" autoComplete="off" maxLength={8192} /></label>
      <button name="operation" value="replace" disabled={pending}>Replace stored value</button>
      <p>Replacing this value does not rotate the credential at its external provider.</p>
      <label>Recipient user UUID<input name="recipient" maxLength={36} /></label>
      <button name="operation" value="grant" disabled={pending}>Grant access for 1 hour</button>{' '}
      <button name="operation" value="revoke" disabled={pending}>Revoke recipient access</button>
      <details><summary>Delete this secret</summary><p>Deletes the current record and grants. Audit events and backups are retained.</p><button name="operation" value="delete" disabled={pending}>Confirm deletion</button></details>
      <p role="status">{state.error || state.message}</p>
    </form>}
  </article>;
}
export default function VaultPanel({ rows, userId, canCreate }: { rows: VaultRow[]; userId: string; canCreate: boolean }) {
  const [state, action, pending] = useActionState(changeSecret, { error: '' });
  return <>
    {canCreate && <form action={action} className="vault-card"><h2>Create encrypted secret</h2><input type="hidden" name="operation" value="create" />
      <label>Name (not encrypted)<input name="name" maxLength={120} required /></label>
      <label>Secret value<input type="password" name="value" maxLength={8192} autoComplete="off" required /></label>
      <button className="primary-button" disabled={pending}>{pending ? 'Saving…' : 'Encrypt and save'}</button><p role="status">{state.error || state.message}</p>
    </form>}
    {rows.length === 0 && <p>No secrets are currently accessible to your account.</p>}
    {rows.map(row => <SecretCard key={`${row.id}:${row.version}`} row={row} canManage={canCreate && row.owner_id === userId} />)}
  </>;
}
