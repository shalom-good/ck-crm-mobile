import type { Family } from "./types";

/**
 * "What needs me" — ported verbatim from the CK-CRM /m Today screen
 * (app/m/page.jsx computeAttention). Scoring is the brain of the home screen,
 * so the numbers must match: change them only with intent.
 *
 *   CK families (lifecycleStatus Active), additive:
 *     director flag           +10  (rose)
 *     >30d no note            +5   (rose)
 *     14–30d no note          +2   (gold)
 *     cash-flow negative      +3   (rose)
 *
 *   KDH clients (active), mutually exclusive (if/elif):
 *     new intake — stage "assigned" & (no note or ≥7d)   +6  (rose)
 *     >30d no note                                       +5  (rose)
 *     14–30d no note                                     +2  (gold)
 *
 * Ranked by score desc, top 12.
 */

export type ReasonKind = "flag" | "stalled" | "risk" | "net" | "new";
export type Tone = "rose" | "gold";

export interface Reason {
  kind: ReasonKind;
  label: string;
  tone: Tone;
}

export interface AttentionItem {
  id: string;
  type: "ck" | "kdh";
  name: string;
  sub: string | null;
  phone?: string | null;
  score: number;
  reasons: Reason[];
}

export function familyReasons(f: Family): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = 0;
  const days = f.daysSinceLastNote;

  if (f.kind === "ck") {
    if (f.lifecycleStatus !== "Active") return { score: 0, reasons };
    if (f.directorFlag) {
      reasons.push({ kind: "flag", label: "Director flag", tone: "rose" });
      score += 10;
    }
    if (days != null && days > 30) {
      reasons.push({ kind: "stalled", label: `${days}d no note`, tone: "rose" });
      score += 5;
    } else if (days != null && days >= 14) {
      reasons.push({ kind: "risk", label: `${days}d no note`, tone: "gold" });
      score += 2;
    }
    if (typeof f.currentMonthlyNet === "number" && f.currentMonthlyNet < 0) {
      reasons.push({ kind: "net", label: "Cash-flow negative", tone: "rose" });
      score += 3;
    }
    if (f.paymentStatus === "behind") {
      reasons.push({ kind: "risk", label: "Payment behind", tone: "rose" });
      score += 4;
    }
  } else {
    // KDH — mutually exclusive branches
    if (!f.active) return { score: 0, reasons };
    const isAssigned = (f.stage || "").toLowerCase() === "assigned";
    if (isAssigned && (days == null || days >= 7)) {
      reasons.push({ kind: "new", label: "New intake, first contact", tone: "rose" });
      score += 6;
    } else if (days != null && days > 30) {
      reasons.push({ kind: "stalled", label: `${days}d no note`, tone: "rose" });
      score += 5;
    } else if (days != null && days >= 14) {
      reasons.push({ kind: "risk", label: `${days}d no note`, tone: "gold" });
      score += 2;
    }
    if (f.paymentStatus === "behind") {
      reasons.push({ kind: "risk", label: "Payment behind", tone: "rose" });
      score += 4;
    }
  }

  return { score, reasons };
}

/**
 * A 0–100 "on-track" score for a family, derived from the same real signals
 * the attention engine uses (payment, recency, cash flow, flags). Drives the
 * Lightfield dashed score bar. Higher = healthier.
 */
export function familyHealth(f: Family): number {
  let score = 100;
  if (f.paymentStatus === "behind") score -= 35;
  const days = f.daysSinceLastNote;
  if (days != null) {
    if (days > 30) score -= 30;
    else if (days >= 14) score -= 15;
  }
  if (typeof f.currentMonthlyNet === "number" && f.currentMonthlyNet < 0) score -= 15;
  if (f.directorFlag) score -= 20;
  if (f.kind === "ck" && f.lifecycleStatus && f.lifecycleStatus !== "Active") score -= 10;
  return Math.max(8, Math.min(100, score));
}

export function computeAttention(families: Family[]): AttentionItem[] {
  return families
    .map((f) => {
      const { score, reasons } = familyReasons(f);
      return { f, score, reasons };
    })
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ f, score, reasons }) => ({
      id: f.id,
      type: f.kind,
      name: f.name,
      sub: f.kind === "ck" ? f.assignments.case_manager ?? null : f.assignments.debt_expert ?? null,
      phone: f.phone ?? null,
      score,
      reasons,
    }));
}
