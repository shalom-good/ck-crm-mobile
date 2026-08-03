/** $84,000 — whole dollars, tabular. */
export function money(n?: number): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export type Tone = "red" | "amber" | "blue" | "green" | "violet" | "cyan" | "gray";

// Lightfield pills: soft cool-neutral bg + darker matching foreground, 11px
// medium, rounded-full (see Pill.tsx). Calm accents, no foreign red/purple.
export const TONE: Record<Tone, { bg: string; text: string }> = {
  red: { bg: "#F8E8DF", text: "#A8431A" },   // terracotta (attention)
  amber: { bg: "#F3EBD6", text: "#8A6A1E" },
  blue: { bg: "#EAF1FE", text: "#2B62C9" },
  green: { bg: "#E7F1EB", text: "#356048" },
  violet: { bg: "#ECEEF2", text: "#545B68" }, // de-saturated to cool neutral
  cyan: { bg: "#E8F0F4", text: "#3A6B7A" },
  gray: { bg: "#EEEFF1", text: "#6B6B70" },
};

const KNOWN: Record<string, Tone> = {
  "behind on payments": "red",
  "some behind": "red",
  "at risk": "red",
  "new intake": "blue",
  "intro scheduled": "blue",
  vip: "violet",
  "plan ready": "green",
  stable: "green",
  placed: "green",
  "needs budget": "amber",
  "needs resume": "amber",
  "job search": "amber",
};

/** Pick a tone for a free-form label. Known labels are mapped; the rest hash. */
export function toneForLabel(label: string): Tone {
  const k = label.trim().toLowerCase();
  if (KNOWN[k]) return KNOWN[k];
  const tones: Tone[] = ["blue", "violet", "cyan", "green", "amber"];
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return tones[h % tones.length];
}
