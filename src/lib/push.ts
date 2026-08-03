// src/lib/push.ts
// ---------------------------------------------------------------------
// Push notification scaffold. Native-only (no-op in the browser).
//
// Flow: after sign in, ask permission -> register -> send the device
// token to /api/mobile/push-token. The server currently just accepts
// and logs the token (no storage table yet); once APNs/FCM keys exist
// and a token table is added, delivery gets wired without touching
// this file.
//
// Deliberately quiet on failure: push is an enhancement, never a
// blocker for using the app.
// ---------------------------------------------------------------------
import { Capacitor } from "@capacitor/core";
import { registerPushToken } from "./mobileApi";

export async function enablePushAfterSignIn(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return;

    PushNotifications.addListener("registration", (token) => {
      // Fire and forget; the endpoint answers {ok:true} and logs.
      registerPushToken(token.value, Capacitor.getPlatform()).catch(() => undefined);
    });

    // Foreground pushes: nothing custom yet. The chat screens already
    // poll; a received push simply wakes the user, not the UI.
    await PushNotifications.register();
  } catch {
    // Plugin missing or webview quirk: silently skip.
  }
}
