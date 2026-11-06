"use client";

import { useEffect, useState } from "react";
import { clearLegacySecrets } from "./secretsStore";

export default function DemoNotice() {
  const [cleanupFailed, setCleanupFailed] = useState(false);
  useEffect(() => {
    const cleaned = clearLegacySecrets();
    const timer = setTimeout(() => setCleanupFailed(!cleaned), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <aside className="demo-notice" aria-label="Demo limitations">
      <strong>Public demo — sample data only.</strong> Roles, approvals, encryption, rotation,
      and audit events are simulations. Do not enter real secrets or sensitive metadata.
      Changes reset when you leave or reload.
      {cleanupFailed && <p role="alert">Legacy browser data could not be removed. Clear this site’s storage in your browser settings.</p>}
    </aside>
  );
}
