"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/app/login/actions";
import { ArrowRight, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export default function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();

  const shellMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      };

  return (
    <motion.main className="login-shell" {...shellMotion}>
      <motion.section
        className="login-visual"
        initial={reduceMotion ? false : { opacity: 0, x: -24 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="visual-noise" />
        <div className="login-brand">
          <div className="brand-mark"><LockKeyhole size={17} /></div>
          <span>vaultline</span>
          <span className="brand-dot">.</span>
        </div>
        <div className="visual-copy">
          <div className="eyebrow"><span className="eyebrow-line" />Private by design</div>
          <h1>Access should be<br /><em>intentional.</em></h1>
          <p>Sign in to your assigned workspace and configured vault.</p>
        </div>
        <div className="visual-footer">
          <span><ShieldCheck size={15} /> Authenticated workspace</span>
          <span>Sample data only</span>
        </div>
      </motion.section>

      <motion.section
        className="login-form-side"
        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <div className="login-form-wrap">
          <div className="mobile-login-brand">
            <div className="brand-mark"><LockKeyhole size={17} /></div>
            <span>vaultline</span>
            <span className="brand-dot">.</span>
          </div>

          <div className="login-heading">
            <div className="login-icon"><Fingerprint size={20} /></div>
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Use the email and password provisioned by your administrator.</p>
          </div>

          <form action={action}>
            <label>Email address
              <input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={pending || !configured} />
            </label>
            <label>Password
              <div className="password-input">
                <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={1024} disabled={pending || !configured} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </label>
            {!configured && <p className="login-error" role="alert">Sign-in is not configured. Ask your administrator to configure Supabase in Vercel.</p>}
            {state.error && <p className="login-error" role="alert">{state.error}</p>}
            <button className="primary-button login-button" type="submit" disabled={pending || !configured}>
              {pending ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
            </button>
          </form>

          <p><a href="/account/recover/">Forgot your password?</a></p>
          <div className="login-security">
            <div><ShieldCheck size={16} /></div>
            <span>Password verified by Supabase.<br />Workspace access checked on the server.</span>
          </div>
          <p className="login-admin">Accounts and roles are assigned by your administrator. Contact your organization’s administrator for support.</p>
        </div>
      </motion.section>
    </motion.main>
  );
}
