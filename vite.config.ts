import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    // Same-origin proxy for the CK CRM mobile API (its routes send no
    // CORS headers; the deployed web app proxies via a vercel.json
    // rewrite, dev proxies here, native Capacitor calls it directly).
    proxy: {
      "/api/mobile/academy": { target: process.env.ACADEMY_DEV_TARGET || "https://crm.collectivekindness.net", changeOrigin: true },
      "/api/public": { target: process.env.ACADEMY_DEV_TARGET || "https://crm.collectivekindness.net", changeOrigin: true },
      "/api/mobile": { target: "https://ck-crm.vercel.app", changeOrigin: true },
      ...(process.env.KDH_DEV_TARGET ? { "/api/portal/kdh": { target: process.env.KDH_DEV_TARGET, changeOrigin: true } } : {}),
      "/api/portal": { target: "https://crm.collectivekindness.net", changeOrigin: true },
    },
  },
});
