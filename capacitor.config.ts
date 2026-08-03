import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "net.collectivekindness.ckteam",
  appName: "CK Team",
  webDir: "dist",
  backgroundColor: "#F7F5F0",
  ios: { contentInset: "always" },
  plugins: {
    Keyboard: { resize: "native" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#F7F5F0",
      showSpinner: false,
    },
  },
};

export default config;
