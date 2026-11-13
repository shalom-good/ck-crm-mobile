import { useState } from "react";
import { clearLock, useLock } from "@/lib/lock";
import { useAuth } from "@/lib/auth";

/**
 * The gate over a locked team session: paper, the CK lockup, one forest
 * button that asks Face ID / the passcode again (a cancelled prompt can be
 * retried) and a quiet way out. Rendered by App above the router; sits over
 * Ionic's own overlays so an open sheet never shows through.
 */
export function LockScreen() {
  const { unlock } = useLock();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const tryUnlock = async () => {
    if (busy) return;
    setBusy(true);
    try { await unlock(); } catch { /* stays locked */ } finally { setBusy(false); }
  };
  const leave = async () => {
    try { await signOut(); } catch { /* noop */ }
    clearLock();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock CK"
      style={{
        position: "fixed", inset: 0, zIndex: 99999, background: "var(--gv-paper)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "calc(var(--ion-safe-area-top, 0px) + 24px) 24px calc(var(--ion-safe-area-bottom, 0px) + 28px)",
      }}
    >
      <img src="/ck-logo.png" alt="Collective Kindness" style={{ width: 160, maxWidth: "70%", height: "auto", display: "block" }} />
      <h1 className="gv-h1" style={{ marginTop: 30, fontSize: 24 }}>Unlock to continue</h1>
      <p className="gv-sub" style={{ marginTop: 8, maxWidth: 280 }}>Confirm it is you with Face ID or your passcode.</p>
      <button className="gv-btn" onClick={() => void tryUnlock()} disabled={busy} style={{ marginTop: 28, width: "100%", maxWidth: 320 }}>
        {busy ? "Unlocking…" : "Unlock"}
      </button>
      <button className="gv-link" onClick={() => void leave()} style={{ marginTop: 16, minHeight: 44, padding: "0 12px", color: "var(--gv-quiet)" }}>
        Sign out instead
      </button>
    </div>
  );
}
