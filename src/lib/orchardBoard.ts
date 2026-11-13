// lib/orchardBoard.ts
// Board logic for the Orchard Families screen: stage order per program,
// lanes, owner, search matching and the one status chip per card. Pure
// functions over the real Family rows; nothing here invents a value.

import type { Family } from "./types";
import { familyReasons } from "./attention";
import { OC_PASTELS, type BadgeTone } from "@/components/orchard/Orchard";

/** CK pipeline (new_clients.ck_client_flow), journey order from the CRM's
 *  lib/schema.js PIPELINE_STAGES. */
export const CK_STAGES = [
  "Client Begins Onboarding",
  "Assigning CM",
  "Interviewed",
  "Initial Budgeting and Debt Meetings",
  "Tasks in and assigned",
  "Care Package Sent",
  "Success Plan",
  "Success Plan Signed",
  "Past the Onboarding",
];

/** Short lane names for the long CK flow values. */
const CK_SHORT: Record<string, string> = {
  "Client Begins Onboarding": "Begins onboarding",
  "Initial Budgeting and Debt Meetings": "Budgeting and debt",
  "Tasks in and assigned": "Tasks assigned",
  "Past the Onboarding": "Past onboarding",
};

/** KDH pipeline (kdh_clients.mordy_view), the CRM's KDH_STAGES order. */
export const KDH_STAGES = [
  "Paid",
  "Assigned",
  "Contact Made",
  "Intake Done- Marinating",
  "Follow Up Booked",
  "Path Selected - Implementing",
  "Done",
  "Complex/Long Term",
  "Stalled/Delayed",
  "Ready To Offboard",
];

const KDH_SHORT: Record<string, string> = {
  "Intake Done- Marinating": "Intake done",
  "Path Selected - Implementing": "Path selected",
  "Complex/Long Term": "Complex",
  "Stalled/Delayed": "Stalled",
};

export const NO_STAGE = "__none";

const norm = (s?: string | null) => String(s ?? "").trim().toLowerCase();

export function stageOrder(kind: "ck" | "kdh"): string[] {
  return kind === "kdh" ? KDH_STAGES : CK_STAGES;
}

/** The stage a card sits in: the roster's stage string, matched loosely
 *  (trailing spaces, case) onto the known order. */
export function stageOf(f: Family): string {
  const raw = (f.stage || "").trim();
  if (!raw) return NO_STAGE;
  const hit = stageOrder(f.kind).find((s) => norm(s) === norm(raw));
  return hit ?? raw;
}

export function stageLabel(kind: "ck" | "kdh", key: string): string {
  if (key === NO_STAGE) return "No stage yet";
  return (kind === "kdh" ? KDH_SHORT : CK_SHORT)[key] ?? key;
}

/** 0-based position in the journey, or null when the stage is off the
 *  known order (no journey bar then). */
export function stagePosition(f: Family): { index: number; total: number; order: string[] } | null {
  // KDH: only the forward run (Paid .. Done) is a journey; Complex,
  // Stalled and Ready To Offboard sit off it.
  const order = f.kind === "kdh" ? KDH_STAGES.slice(0, 7) : CK_STAGES;
  const i = order.indexOf(stageOf(f));
  return i >= 0 ? { index: i, total: order.length, order } : null;
}

export interface Lane {
  key: string;
  label: string;
  bg: string;
  dot: string;
  families: Family[];
}

/** Lanes for one program: known stages in journey order (only the ones
 *  that hold families), then any stage the roster sends that the order
 *  does not know, then "No stage yet". Colours follow the journey slot
 *  so a stage keeps its pastel when other lanes come and go. */
export function buildLanes(kind: "ck" | "kdh", families: Family[]): Lane[] {
  const order = stageOrder(kind);
  const by = new Map<string, Family[]>();
  for (const f of families) {
    const k = stageOf(f);
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(f);
  }
  const extra = [...by.keys()].filter((k) => k !== NO_STAGE && !order.includes(k)).sort();
  const keys = [...order.filter((k) => by.has(k)), ...extra, ...(by.has(NO_STAGE) ? [NO_STAGE] : [])];
  return keys.map((k) => {
    const slot = order.indexOf(k);
    const p = k === NO_STAGE ? { bg: "#ECEAE4", dot: "#8A857C" } : OC_PASTELS[(slot >= 0 ? slot : order.length + extra.indexOf(k)) % OC_PASTELS.length];
    return { key: k, label: stageLabel(kind, k), bg: p.bg, dot: p.dot, families: by.get(k)! };
  });
}

/** Who owns the card: case manager on CK, debt expert on KDH. */
/** A person's name for a heading or a chip. The roster sometimes carries a
 *  raw email where a name belongs (rabbieinstein@…): never show that as a
 *  heading. "avi@caliber6.com" reads "Avi", "rabbieinstein@…" reads
 *  "Rabbi Einstein", "sari.rubin0@…" reads "Sari Rubin". */
export function tidyPerson(raw: string): string {
  const v = String(raw || "").trim();
  if (!v.includes("@")) return v;
  let local = v.split("@")[0].replace(/\d+/g, " ").replace(/[._\-+]+/g, " ").trim();
  local = local.replace(/^(rabbi|dr|mrs|mr)(?=[a-z]{3,})/i, "$1 ");
  const words = local.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return words.join(" ") || "Team member";
}

export function ownerOf(f: Family): string | null {
  const a = f.assignments;
  const own = f.kind === "kdh" ? a.debt_expert ?? a.case_manager : a.case_manager ?? a.debt_expert;
  const v = (own && String(own).trim()) || null;
  return v ? tidyPerson(v) : null;
}

export function ownerRoleLabel(f: Family): string {
  return f.kind === "kdh" ? "Debt expert" : "Case manager";
}

const digits = (s?: string | null) => String(s ?? "").replace(/\D/g, "");

/** Search: the Families screen's matching (names first, then city /
 *  state), extended to every field the Family row holds: phone (digits),
 *  email, owner and every assigned teammate, stage, status, labels,
 *  program, director flag. Returns null for no match, else a rank. */
export function matchRank(f: Family, term: string): number | null {
  if (!term) return 0;
  const name = norm(f.name);
  if (name.startsWith(term) || name.split(/\s+/).some((w) => w.startsWith(term))) return 0;
  if (name.includes(term)) return 1;
  if (norm(f.city).includes(term) || norm(f.state).includes(term)) return 2;
  const d = digits(term);
  if (d.length >= 3 && digits(f.phone).includes(d)) return 3;
  if (norm(f.email).includes(term)) return 3;
  const people = Object.values(f.assignments).filter(Boolean).map((v) => norm(String(v)));
  if (people.some((p) => p.includes(term))) return 4;
  const rest = [f.stage, f.lifecycleStatus, f.programLabel, f.program, f.directorFlag, ...f.labels].map(norm);
  if (rest.some((v) => v.includes(term))) return 5;
  return null;
}

/** The ONE status chip on a card (or none). */
export function statusChip(f: Family): { tone: BadgeTone; text: string } | null {
  if (f.directorFlag) return { tone: "bad", text: "Director flag" };
  if (f.lifecycleStatus && f.lifecycleStatus !== "Active") {
    return { tone: "quiet", text: f.lifecycleStatus === "Support From CM But Inactive" ? "CM support only" : f.lifecycleStatus };
  }
  if (f.paymentStatus === "behind") return { tone: "bad", text: "Behind on payments" };
  const r = familyReasons(f).reasons[0];
  if (r) return { tone: r.tone === "rose" ? "bad" : "warn", text: r.label };
  return null;
}

/** Last-activity text from REAL note recency only. */
export function activityText(f: Family): string | null {
  const d = f.daysSinceLastNote;
  if (typeof d !== "number" || Number.isNaN(d)) return null;
  if (d <= 0) return "Note logged today";
  if (d === 1) return "Last note yesterday";
  return `Last note ${d} days ago`;
}

export function needsAttention(f: Family): boolean {
  return familyReasons(f).reasons.length > 0;
}

export function isQuiet(f: Family): boolean {
  return typeof f.daysSinceLastNote === "number" && f.daysSinceLastNote >= 14;
}

/** Program cross-badges, only when the row says so. */
export function crossBadges(f: Family): { tone: BadgeTone; text: string }[] {
  const out: { tone: BadgeTone; text: string }[] = [];
  if ((f.amountPaid ?? 0) > 0) out.push({ tone: "paid", text: "Paid" });
  if (f.kind === "kdh" && f.labels.some((l) => /\bck\b.*client|ck client/i.test(l))) out.push({ tone: "ck", text: "CK client" });
  if (f.kind === "ck" && /kosher debt/i.test(f.programLabel ?? "")) out.push({ tone: "go", text: "KDH" });
  return out;
}
