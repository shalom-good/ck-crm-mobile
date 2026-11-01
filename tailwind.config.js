/**
 * Tailwind theme — the Grove / Emitly token layer (2026-10-31). Only a few
 * utilities are used (shadow-card, tnum); the CSS variables in
 * src/theme/variables.css are the real source of truth. Keep the hexes
 * below in lockstep with variables.css + src/theme/tokens.ts.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F5F1",
        card: "#FFFFFF",
        paper: "#F4F6F2",
        hairline: "#EAEDE7",
        title: "#1C2E29",
        body: "#5F6D68",
        muted: "#86928C",
        tint: "#2E5146",
        "tint-soft": "#E4ECE6",
        ink: "#1C2E29",
        lime: "#D7F36E",
        coral: "#E8714F",
        blue: "#1F4E79",
        gold: "#8A4B10",
        navy: "#1C2E29",
        danger: "#B8463A",
        success: "#3B7A2A",
        "coral-bg": "#FBE0E6",  "coral-fg": "#9B2C4A",
        "butter-bg": "#FFF0A3", "butter-fg": "#6B5A00",
        "lavender-bg": "#F3D9F7", "lavender-fg": "#6D3D7A",
        "mist-bg": "#F4F6F2",   "mist-fg": "#5F6D68",
      },
      borderRadius: {
        card: "20px",
        hero: "24px",
        input: "14px",
        pill: "8px",
        chip: "12px",
        sheet: "28px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,46,41,.04), 0 8px 24px rgba(28,46,41,.06)",
        fab: "0 10px 24px -10px rgba(46,81,70,.55)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "screen-title": ["28px", { lineHeight: "31px", fontWeight: "800", letterSpacing: "-0.025em" }],
        "card-name": ["15px", { lineHeight: "20px", fontWeight: "700", letterSpacing: "-0.01em" }],
        pill: ["12px", { lineHeight: "16px", fontWeight: "700" }],
        body: ["14.5px", { lineHeight: "21px", fontWeight: "450" }],
        timestamp: ["12.5px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
