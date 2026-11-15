"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { enrollAuthenticator, verifyAuthenticator, type MfaState } from "@/app/mfa/actions";
import { signOut } from "@/app/login/actions";

export default function MfaForm({ factors, hasOtherFactor }: { factors: string[]; hasOtherFactor: boolean }) {
  const [enrollment, setEnrollment] = useState<MfaState>({ error: "" });
  const [state, verify, pending] = useActionState(verifyAuthenticator, { error: "" });
  const [working, startTransition] = useTransition();
  const [factorId, setFactorId] = useState(factors[0] ?? "");
  const [error, setError] = useState("");
  return (
    <main className="login-form-side" style={{ minHeight: "85vh" }}>
      <section className="login-form-wrap">
        <h1>Verify your identity</h1>
        <p>Use an authenticator app to complete sign-in. A password alone cannot open a workspace.</p>
        <p>Your app generates codes on your device; no email or text message is needed. Set up your own authenticator and never share its setup key or codes.</p>
        {!factorId && !hasOtherFactor && <button className="primary-button login-button" disabled={working} onClick={() => startTransition(async () => {
          try {
            const result = await enrollAuthenticator();
            setEnrollment(result);
            if (result.factorId) setFactorId(result.factorId);
          } catch { setError("Unable to set up your authenticator. Please try again."); }
        })}>{working ? "Preparing…" : "Set up authenticator"}</button>}
        {!factorId && hasOtherFactor && <p role="alert">Contact your administrator to use a supported TOTP authenticator. Your existing factor has not been removed.</p>}
        {enrollment.qr && <div>
          <p>Scan this code with your authenticator app. Keep the setup key private.</p>
          <Image src={enrollment.qr} alt="Authenticator setup QR code" width={240} height={240} unoptimized />
          <details><summary>Enter setup key manually</summary><code style={{ overflowWrap: "anywhere" }}>{enrollment.secret}</code></details>
        </div>}
        {factorId && <form action={verify}>
          {factors.length > 1 ? <label>Authenticator<select name="factorId" value={factorId} onChange={e => setFactorId(e.target.value)}>{factors.map((id, i) => <option key={id} value={id}>Authenticator {i + 1}</option>)}</select></label> : <input type="hidden" name="factorId" value={factorId} />}
          <label>Six-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={pending} /></label>
          <button className="primary-button login-button" disabled={pending}>{pending ? "Verifying…" : "Verify and continue"}</button>
        </form>}
        {(state.error || enrollment.error || error) && <p className="login-error" role="alert">{state.error || enrollment.error || error}</p>}
        <p>Lost your authenticator? Contact your administrator for identity verification and recovery.</p>
        <button className="secondary-button" disabled={working} onClick={() => startTransition(async () => {
          try { const result = await signOut(); if (result?.error) setError(result.error); }
          catch { setError("Unable to sign out. Please try again."); }
        })}>Sign out</button>
      </section>
    </main>
  );
}
