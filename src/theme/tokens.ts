/**
 * tokens.ts — the single source of truth for values that live in TypeScript:
 * stage identity, status pills, monogram tints, springs, touch minimums.
 *
 * Surface/text colors and radii are also expressed as Tailwind classes (see
 * tailwind.config.js) and as Ionic CSS variables (see variables.css). Those
 * three files are one token layer. No component hardcodes a hex value.
 */

// ---------------------------------------------------------------------------
// Stage identity — the spine of the pipeline. The dot color drives the pill,
// the focus ring, the swipe-commit chip. Array order is pipeline order.
// ---------------------------------------------------------------------------

export type StageKey =
  | "new"
  | "open"
  | "in_progress"
  | "open_deal"
  | "won"
  | "dead";

export interface Stage {
  key: StageKey;
  label: string;
  dot: string;
}

export const STAGES: Stage[] = [
  { key: "new", label: "New", dot: "#E8714F" },
  { key: "open", label: "Open", dot: "#1F4E79" },
  { key: "in_progress", label: "In Progress", dot: "#8A4B10" },
  { key: "open_deal", label: "Open Deal", dot: "#5B2D7A" },
  { key: "won", label: "Won", dot: "#2F7556" },
  { key: "dead", label: "Dead", dot: "#86928C" },
];

export const STAGE_BY_KEY: Record<StageKey, Stage> = STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<StageKey, Stage>,
);

export const stageIndex = (key: StageKey) =>
  STAGES.findIndex((s) => s.key === key);

/** The next pipeline stage, or null at a terminal (Won / Dead). */
export const nextStage = (key: StageKey): Stage | null => {
  const i = stageIndex(key);
  if (i < 0 || i >= STAGES.length - 2) return null;
  return STAGES[i + 1];
};

// ---------------------------------------------------------------------------
// Status pills — pastel fill at ~12% of a hue, text at full saturation. These
// are arbitrary lead statuses, independent of pipeline stage.
// ---------------------------------------------------------------------------

export type StatusKey =
  | "recycled"
  | "in_process"
  | "hot"
  | "nurture"
  | "proposal"
  | "dead";

export const STATUS_PILLS: Record<StatusKey, { label: string; bg: string; text: string }> = {
  recycled: { label: "Recycled", bg: "#DCEBFA", text: "#1F4E79" },
  in_process: { label: "In Process", bg: "#FFF0A3", text: "#6B5A00" },
  hot: { label: "Hot", bg: "#FBE0E6", text: "#9B2C4A" },
  nurture: { label: "Nurture", bg: "#DDF3E6", text: "#1F5E3A" },
  proposal: { label: "Proposal", bg: "#E9D5F5", text: "#5B2D7A" },
  dead: { label: "Dead", bg: "#F4F6F2", text: "#5F6D68" },
};

// ---------------------------------------------------------------------------
// Palette — both schemes, side by side. The app applies light values via
// Tailwind utilities and flips to dark with the `dark` class on <html>, which
// rebinds the Ionic CSS variables in variables.css.
// ---------------------------------------------------------------------------

export const palette = {
  light: {
    bg: "#F3F5F1",
    card: "#FFFFFF",
    hairline: "#EAEDE7",
    title: "#1C2E29",
    body: "#5F6D68",
    muted: "#86928C",
    tint: "#2F7556",
    lime: "#D7F36E",
    coral: "#E8714F",
    danger: "#B8463A",
    success: "#3B7A2A",
    inputBorder: "#E2E6E0",
  },
  dark: {
    bg: "#F3F5F1",
    card: "#FFFFFF",
    hairline: "#EAEDE7",
    title: "#1C2E29",
    body: "#5F6D68",
    muted: "#86928C",
    tint: "#2F7556",
    lime: "#D7F36E",
    coral: "#E8714F",
    danger: "#B8463A",
    success: "#3B7A2A",
    inputBorder: "#E2E6E0",
  },
} as const;

export type ColorScheme = keyof typeof palette;

// ---------------------------------------------------------------------------
// Radii / spacing / touch.
// ---------------------------------------------------------------------------

export const radii = { card: 20, input: 14, pill: 8, sheet: 28 } as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 16,
} as const;

export const touch = { min: 48, kebab: 44, swipeAction: 56 } as const;

export const avatarSize = { card: 48, detail: 96, owner: 24 } as const;

// ---------------------------------------------------------------------------
// Motion — spring only. damping 22 / stiffness 220 is the house spring. The
// Ionic Animations API takes durations, so we also derive a duration/easing
// that visually matches that spring for page and sheet transitions.
// ---------------------------------------------------------------------------

export const spring = {
  default: { damping: 22, stiffness: 220, mass: 1 },
  snappy: { damping: 20, stiffness: 280, mass: 0.9 },
} as const;

/** A cubic-bezier that reads like the house spring, for CSS/Ionic timelines. */
export const springCSS = {
  duration: 340,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export const HAPTIC_MS = 70; // 60–80ms window from the brief
