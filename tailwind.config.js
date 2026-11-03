/**
 * Tailwind theme — the CK look token layer (2026-11-02). No page uses these
 * utilities for colour today; the CSS variables in src/theme/variables.css
 * (html[data-look="ck"]) are the real source of truth. Keep the hexes below
 * in lockstep with variables.css + src/theme/tokens.ts.
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
        paper: "#EDF1EB",
        hairline: "#E1E7DF",
        title: "#17241F",
        body: "#52625B",
        muted: "#6B7A73",
        tint: "#2E5146",
        "tint-soft": "#EAF7B8",
        ink: "#17241F",
        lime: "#D7F36E",
        coral: "#EE7A5B",
        blue: "#33415F",
        gold: "#8A3A22",
        navy: "#17241F",
        danger: "#B8492C",
        success: "#2E5146",
        "coral-bg": "#FADDD3",  "coral-fg": "#9A3B22",
        "butter-bg": "#F5EDB4", "butter-fg": "#5E5418",
        "lavender-bg": "#EADCF5", "lavender-fg": "#5B2D7A",
        "mist-bg": "#EDF1EB",   "mist-fg": "#52625B",
      },
      borderRadius: {
        card: "22px",
        hero: "24px",
        input: "14px",
        pill: "999px",
        chip: "999px",
        sheet: "26px",
      },
      boxShadow: {
        card: "none",
        pop: "0 14px 30px -18px rgba(23,36,31,.35)",
        fab: "0 14px 30px -18px rgba(23,36,31,.35)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "screen-title": ["26px", { lineHeight: "30px", fontWeight: "800", letterSpacing: "-0.02em" }],
        "card-name": ["15px", { lineHeight: "20px", fontWeight: "700", letterSpacing: "-0.01em" }],
        pill: ["12px", { lineHeight: "16px", fontWeight: "700" }],
        body: ["14.5px", { lineHeight: "21px", fontWeight: "450" }],
        timestamp: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
