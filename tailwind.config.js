/**
 * Tailwind theme. This file and src/theme/tokens.ts are the two halves of one
 * token layer: this drives CSS utility classes, tokens.ts drives TS/inline
 * values (status pills, monogram tints, the Ionic gesture springs). Keep the
 * raw hexes below in lockstep with tokens.ts — nothing else hardcodes color.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm "stationery + dashboard" palette (light; CSS vars in variables.css).
        // Cream paper surfaces, deep ink, status via soft pastel badges only.
        canvas: "#F1ECE2",
        card: "#FFFFFF",
        paper: "#FAF7F1",
        hairline: "rgba(20,20,20,0.08)",
        title: "#111111",
        body: "#6B6B6B",
        muted: "#9A9A93",
        tint: "#141414",        // primary = ink
        "tint-soft": "#E4E0D5",
        ink: "#141414",
        blue: "#4A4A6B",        // lavender ink
        gold: "#8A6A1E",        // butter ink
        navy: "#111111",
        danger: "#B5483A",      // coral ink — alert
        success: "#3F7355",
        // status badge fills
        "coral-bg": "#F2D4CB",  "coral-fg": "#B5483A",
        "butter-bg": "#F4E4BF", "butter-fg": "#8A6A1E",
        "lavender-bg": "#D9D9E8", "lavender-fg": "#4A4A6B",
        "mist-bg": "#E4E0D5",   "mist-fg": "#4A4A4A",
      },
      borderRadius: {
        card: "20px",
        hero: "24px",
        input: "12px",
        pill: "999px",
        chip: "12px",
        sheet: "28px",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.06)",
        fab: "0 8px 22px rgba(20,20,20,0.22)",
      },
      fontFamily: {
        sans: ["Inter", "Geist", "system-ui", "sans-serif"],
      },
      fontSize: {
        "screen-title": ["26px", { lineHeight: "31px", fontWeight: "600", letterSpacing: "-0.025em" }],
        "card-name": ["16px", { lineHeight: "20px", fontWeight: "600", letterSpacing: "-0.01em" }],
        pill: ["12px", { lineHeight: "16px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "450" }],
        timestamp: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
