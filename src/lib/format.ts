/** $84,000 — whole dollars, tabular. */
export function money(n?: number): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export type Tone = "red" | "amber" | "blue" | "green" | "violet" | "cyan" | "gray";

// Grove pills: pastel fill + matching ink, 12px/700, radius 8 (see Pill.tsx).
export const TONE: Record<Tone, { bg: string; text: string }> = {
  red: { bg: "#FBE0E6", text: "#9B2C4A" },    // rose — attention / blocker
  amber: { bg: "#FFF0A3", text: "#6B5A00" },  // yellow — to settle / next
  blue: { bg: "#DCEBFA", text: "#1F4E79" },   // sky — place, dates
  green: { bg: "#DDF3E6", text: "#1F5E3A" },  // mint — active, follow-ups
  violet: { bg: "#E9D5F5", text: "#5B2D7A" }, // plum — milestones
  cyan: { bg: "#F3D9F7", text: "#6D3D7A" },   // lavender — questions, tasks
  gray: { bg: "#F4F6F2", text: "#5F6D68" },
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
