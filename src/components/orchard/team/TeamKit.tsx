// components/orchard/team/TeamKit.tsx
// Small presentational bits for the team screens in the Orchard look
// (theme/orchard-team.css): square pastel initials and pastel chips.

import type { ReactNode } from "react";

/** Pastel pairs for initials (no greens that read as status). */
const AV_PAIRS: { bg: string; fg: string }[] = [
  { bg: "#DCE8F5", fg: "#23415F" }, // sky
  { bg: "#EBDDF5", fg: "#4A3566" }, // lilac
  { bg: "#F8DCC9", fg: "#6B3A1C" }, // peach
  { bg: "#FBEFA6", fg: "#574A0E" }, // butter
  { bg: "#DEE3F2", fg: "#2D3766" }, // periwinkle
  { bg: "#DDEFE3", fg: "#276449" }, // mint
];

export function pairFor(name?: string | null) {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_PAIRS[h % AV_PAIRS.length];
}

/** Family-friendly initials: "Baruch & Faigy Weiss" -> "BW" (first + last word, no "and" / "&"). */
export function familyInitials(name?: string | null): string {
  const words = String(name || "").replace(/\b(and)\b|&/gi, " ").replace(/[^A-Za-z\s'-]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const a = words[0][0] ?? "";
  const b = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return (a + b).toUpperCase() || "?";
}

export function SquareAv({ name, sm }: { name?: string | null; sm?: boolean }) {
  const p = pairFor(name);
  return (
    <span className={`oct-av${sm ? " oct-av--sm" : ""}`} style={{ background: p.bg, color: p.fg }} aria-hidden="true">
      {familyInitials(name)}
    </span>
  );
}

export type ChipTone = "quiet" | "mint" | "peach" | "rose" | "butter" | "sky" | "lilac" | "go";

export function Chip({ tone = "quiet", children, title }: { tone?: ChipTone; children: ReactNode; title?: string }) {
  return <span className={`oct-chip${tone === "quiet" ? "" : ` oct-chip--${tone}`}`} title={title}>{children}</span>;
}
