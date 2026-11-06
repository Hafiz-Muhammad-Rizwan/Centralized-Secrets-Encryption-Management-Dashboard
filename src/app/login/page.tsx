"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const accounts = {
    Hafiz: "/team-lead",
    Rizwan: "/developer",
    Zaid: "/security-analyst",
  } as const;

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
          <p>One secure control plane for every secret, lease, and decision across your cloud.</p>
        </div>
        <div className="visual-footer">
          <span><ShieldCheck size={15} /> Public demonstration</span>
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
            <span className="eyebrow">Explore the demo</span>
            <h2>Choose a demo workspace</h2>
            <p>No account or password is needed. All roles are public.</p>
          </div>

          <div className="demo-role-picker">
            {Object.entries(accounts).map(([name, path]) => (
              <button className="primary-button login-button" key={path} onClick={() => router.push(path)}>
                {name} · {path.slice(1).replaceAll("-", " ")} <ArrowRight size={16} />
              </button>
            ))}
          </div>

          <div className="login-security">
            <div><ShieldCheck size={16} /></div>
            <span>Interface simulation only.<br />No authentication or encryption is performed.</span>
          </div>
          <p className="login-admin">Never enter real credentials into this demo. <a href="mailto:security@acme.cloud">Contact security</a></p>
        </div>
      </motion.section>
    </motion.main>
  );
}
