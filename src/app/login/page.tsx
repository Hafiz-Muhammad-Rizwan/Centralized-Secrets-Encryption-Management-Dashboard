"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const accounts = {
    Hafiz: "/team-lead",
    Rizwan: "/developer",
    Zaid: "/security-analyst",
  } as const;

  return (
    <main className="login-shell">
      <section className="login-visual">
        <div className="visual-noise" />
        <div className="login-brand"><div className="brand-mark"><LockKeyhole size={17} /></div><span>vaultline</span><span className="brand-dot">.</span></div>
        <div className="visual-copy"><div className="eyebrow"><span className="eyebrow-line" />Private by design</div><h1>Access should be<br /><em>intentional.</em></h1><p>One secure control plane for every secret, lease, and decision across your cloud.</p></div>
        <div className="visual-footer"><span><ShieldCheck size={15} /> Zero-knowledge architecture</span><span>v2.4.0 · SOC 2 ready</span></div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap"><div className="mobile-login-brand"><div className="brand-mark"><LockKeyhole size={17} /></div><span>vaultline</span><span className="brand-dot">.</span></div><div className="login-heading"><div className="login-icon"><Fingerprint size={20} /></div><span className="eyebrow">Welcome back</span><h2>Sign in to your workspace</h2><p>Use the credentials provided by your team lead.</p></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const username = String(form.get("username")); const password = String(form.get("password")); if (password !== "123456" || !(username in accounts)) { setError("Those credentials do not match an active workspace account."); return; } setError(""); router.push(accounts[username as keyof typeof accounts]); }}><label>Username<input name="username" type="text" placeholder="Hafiz, Rizwan, or Zaid" required /></label><label>Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{error && <p className="login-error">{error}</p>}<div className="form-row"><label className="checkbox-label"><input type="checkbox" /> <span>Remember this device</span></label><a href="mailto:security@acme.cloud">Need help?</a></div><button className="primary-button login-button" type="submit">Continue securely<ArrowRight size={16} /></button></form><div className="login-security"><div><ShieldCheck size={16} /></div><span>Protected by hardware-backed authentication<br />and automatic session expiry.</span></div><p className="login-admin">Access is provisioned by your team lead. <a href="mailto:security@acme.cloud">Contact security</a></p></div>
      </section>
    </main>
  );
}
