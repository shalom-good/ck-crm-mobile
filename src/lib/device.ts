/**
 * device.ts — the web test frame (public/device.html) shows the app inside
 * a drawn iPhone or Android phone. An iframe has no notch, so the frame
 * tells the app which phone it is in (?device=ios|android) and the app
 * sets the same safe-area numbers the real phone would report. Every
 * screen reads them through --ion-safe-area-*, exactly as on a device.
 *
 * Outside the frame (a real phone, the native shell) this does nothing.
 */
export type TestDevice = "ios" | "android";

const KEY = "ck.testDevice";
const INSETS: Record<TestDevice, { top: number; bottom: number }> = {
  ios: { top: 59, bottom: 34 },      // iPhone 15 Pro: Dynamic Island + home bar
  android: { top: 36, bottom: 24 },  // Pixel 8: status bar + gesture bar
};

export const inTestFrame = (() => {
  try { return typeof window !== "undefined" && window.self !== window.top; } catch { return true; }
})();

export function initTestDevice(): TestDevice | null {
  if (!inTestFrame) return null;
  let device: string | null = null;
  try {
    device = new URLSearchParams(window.location.search).get("device");
    if (device === "ios" || device === "android") sessionStorage.setItem(KEY, device);
    else device = sessionStorage.getItem(KEY);
  } catch { /* storage blocked: fall through */ }
  if (device !== "ios" && device !== "android") return null;
  const root = document.documentElement;
  const inset = INSETS[device];
  root.style.setProperty("--ion-safe-area-top", `${inset.top}px`);
  root.style.setProperty("--ion-safe-area-bottom", `${inset.bottom}px`);
  root.classList.add("ck-test-frame", `ck-test-${device}`);
  return device;
}

/** Leave the frame for a full-page trip (Google sign-in refuses to load
 *  inside a frame); the frame page puts the app back when it returns. */
export function leaveTo(url: string) {
  try {
    if (inTestFrame && window.top) { window.top.location.href = url; return; }
  } catch { /* cross-origin parent: use this window */ }
  window.location.href = url;
}
