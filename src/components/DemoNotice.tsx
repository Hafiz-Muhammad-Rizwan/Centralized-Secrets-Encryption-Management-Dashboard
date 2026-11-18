"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearLegacySecrets } from "./secretsStore";
import { auditAndCleanBrowserStorage } from "@/lib/security/secure-coding";

export default function DemoNotice() {
  const pathname = usePathname();
  const realPage = ["/vault", "/account", "/audit", "/mfa", "/login"].some(p => pathname.startsWith(p));
  const [cleanupFailed, setCleanupFailed] = useState(false);
  useEffect(() => {
    const legacyCleaned = clearLegacySecrets();
    // Task 4: purge any sensitive values that may have been left in browser
    // storage by an older build before this session begins.
    auditAndCleanBrowserStorage();
    const timer = setTimeout(() => setCleanupFailed(!legacyCleaned), 0);
    return () => clearTimeout(timer);
  },  []);
  return (
    <aside className="demo-notice" aria-label="Demo limitations">
      {realPage ? <><strong>Vaultline security workspace.</strong> Production use requires administrator configuration and release verification.</> : <><strong>DEMO WORKSPACE.</strong> Metrics and approval workflows are simulated. Secret Provisioning and Secrets Directory are database-backed when the vault migration and server encryption key are configured; never enter real production credentials.</>}
      <nav><a href="/vault/">Vault</a> · <a href="/audit/">Recorded audit events</a> · <a href="/account/">Account security</a></nav>
      {cleanupFailed && <p role="alert">Legacy browser data could not be removed. Clear this site’s storage in your browser settings.</p>}
    </aside>
  );
}
