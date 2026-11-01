import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "net.collectivekindness.ckteam",
  appName: "Collective Kindness",
  webDir: "dist",
  backgroundColor: "#F3F5F1",
  ios: { contentInset: "always" },
  plugins: {
    // Native fetch: the CRM API sends no CORS headers, so the webview's
    // cross-origin fetch would die; CapacitorHttp patches window.fetch to
    // go through the native layer instead.
    CapacitorHttp: { enabled: true },
    Keyboard: { resize: "native" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#F3F5F1",
      showSpinner: false,
    },
  },
};

export default config;
