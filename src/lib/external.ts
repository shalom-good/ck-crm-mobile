/**
 * external.ts — open a web address outside the app.
 *
 * Native shell: the system browser sheet (SFSafariViewController on iOS,
 * a Custom Tab on Android) via @capacitor/browser, so the person keeps
 * their place in the app and their Safari cookies (the donor portal and
 * the give page both sign people in by email code).
 * Web: a new tab.
 */
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      /* plugin missing from the native build: fall through to window.open */
    }
  }
  window.open(url, "_blank", "noopener");
}
