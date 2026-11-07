"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearLegacySecrets } from "./secretsStore";

export default function DemoNotice() {
  const pathname = usePathname();
  const realPage = ["/vault", "/account", "/audit", "/mfa", "/login"].some(p => pathname.startsWith(p));
  const [cleanupFailed, setCleanupFailed] = useState(false);
  useEffect(() => {
    const cleaned = clearLegacySecrets();
    const timer = setTimeout(() => setCleanupFailed(!cleaned), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <aside className="demo-notice" aria-label="Demo limitations">
      {realPage ? <><strong>Vaultline security workspace.</strong> Production use requires administrator configuration and release verification.</> : <><strong>SIMULATED / DEMO ONLY.</strong> These role dashboards contain sample metrics and simulated workflows. Do not enter sensitive information here. Use the server-side vault for configured storage.</>}
      <nav><a href="/vault/">Vault</a> · <a href="/audit/">Recorded audit events</a> · <a href="/account/">Account security</a></nav>
      {cleanupFailed && <p role="alert">Legacy browser data could not be removed. Clear this site’s storage in your browser settings.</p>}
    </aside>
  );
}
