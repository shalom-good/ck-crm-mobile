/**
 * lock.ts — the Face ID / passcode gate over a TEAM session in the native
 * app. On the web it never engages (Capacitor.isNativePlatform() is false).
 *
 * The app locks on a cold start that restores a team session, and whenever
 * it comes back from the background after LOCK_AFTER_MS. Unlocking runs
 * NativeBiometric.verifyIdentity (Face ID / Touch ID / fingerprint with the
 * device passcode as fallback). When biometrics are unavailable or the
 * plugin throws, there is no lock: the gate must never trap a teammate out
 * of the app. Family sessions are not locked for now.
 *
 * A tiny module store (useSyncExternalStore) so the App shell and the
 * LockScreen share one `locked` flag without a provider. Every native call
 * is dynamic and wrapped in try/catch so the web build stays clean.
 */
import { useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/** Away this long and the app asks again on return. */
const LOCK_AFTER_MS = 5 * 60_000;

export const isNativeApp: boolean = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

let locked = false;
let hiddenAt: number | null = null;
let verifying: Promise<boolean> | null = null;
let coldStartHandled = false;
let sawSignedOut = false;
const subs = new Set<() => void>();

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
function setLocked(next: boolean) {
  if (locked === next) return;
  locked = next;
  subs.forEach((fn) => fn());
}

async function biometricsAvailable(): Promise<boolean> {
  if (!isNativeApp) return false;
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    const r = await NativeBiometric.isAvailable({ useFallback: true });
    return !!r?.isAvailable;
  } catch {
    return false;
  }
}

async function verifyIdentity(): Promise<boolean> {
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({ reason: "Unlock CK", title: "Unlock CK", useFallback: true, negativeButtonText: "Cancel" });
    return true;
  } catch {
    // Cancelled, failed or locked out: stay locked; the screen offers a retry.
    return false;
  }
}

/** Ask again. Resolves true once the person is through. A prompt already
 *  on screen is reused, so a double tap never stacks two prompts. */
export function unlock(): Promise<boolean> {
  if (verifying) return verifying;
  verifying = (async () => {
    // Biometrics may have gone away since we locked (passcode removed,
    // plugin trouble): never trap the person behind a prompt that cannot run.
    const ok = (await biometricsAvailable()) ? await verifyIdentity() : true;
    if (ok) setLocked(false);
    return ok;
  })().finally(() => { verifying = null; });
  return verifying;
}

/** Lock first (so nothing shows beneath), then prompt. Quietly unlocks
 *  again when biometrics are unavailable. */
async function lockAndVerify(): Promise<void> {
  if (!isNativeApp) return;
  setLocked(true);
  if (!(await biometricsAvailable())) { setLocked(false); return; }
  await unlock();
}

/** Drop the gate without a prompt (sign-out). */
export function clearLock() {
  hiddenAt = null;
  setLocked(false);
}

/** Read the gate: `locked` re-renders on change; `unlock()` re-prompts. */
export function useLock(): { locked: boolean; unlock: () => Promise<boolean> } {
  const l = useSyncExternalStore(subscribe, () => locked, () => false);
  return { locked: l, unlock };
}

/**
 * Installed once by the App shell. `enabled` = a team session is signed in.
 * `signedOut` lets the guard tell a restored session (cold start → lock)
 * from a fresh sign-in (the person just typed a code; no second prompt).
 */
export function useLockGuard({ enabled, signedOut }: { enabled: boolean; signedOut: boolean }): void {
  useEffect(() => { if (signedOut) sawSignedOut = true; }, [signedOut]);

  useEffect(() => {
    if (!isNativeApp || !enabled) { clearLock(); return; }

    if (!coldStartHandled) {
      coldStartHandled = true;
      if (!sawSignedOut) void lockAndVerify();
    }

    let cancelled = false;
    let handle: { remove: () => Promise<void> } | null = null;
    (async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const h = await CapApp.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            if (hiddenAt == null) hiddenAt = Date.now();
            return;
          }
          const away = hiddenAt == null ? 0 : Date.now() - hiddenAt;
          hiddenAt = null;
          if (away > LOCK_AFTER_MS) void lockAndVerify();
        });
        if (cancelled) void h.remove().catch(() => undefined);
        else handle = h;
      } catch {
        /* plugin missing: no background lock */
      }
    })();
    return () => {
      cancelled = true;
      void handle?.remove().catch(() => undefined);
    };
  }, [enabled]);
}
