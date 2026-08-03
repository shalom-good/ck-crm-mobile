import type { Family } from "./types";
import type { RoleKey } from "./roles";

export type OvernightKind = "meeting" | "note" | "payment";

export interface OvernightItem {
  id: string;
  kind: OvernightKind;
  who: string; // the role/source that acted, e.g. "Budgeter"
  title: string;
  sub: string;
  familyId: string;
  familyName: string;
}

const ROLE_LABEL: Record<RoleKey, string> = {
  case_manager: "Case Manager",
  debt_expert: "Debt Expert",
  budgeter: "Budgeter",
  jpa: "Job Placement",
  coordinator: "Coordinator",
  director: "Director",
};

const PICK_ORDER: RoleKey[] = ["budgeter", "debt_expert", "case_manager", "jpa", "coordinator"];

/** The first assignment on the family that belongs to a role OTHER than the
 *  viewer's — i.e. a teammate who may have done something on this client. */
function otherAssignment(f: Family, myRole: RoleKey): { role: RoleKey; name: string } | null {
  for (const k of PICK_ORDER) {
    if (k === myRole) continue;
    const name = f.assignments[k];
    if (name) return { role: k, name };
  }
  return null;
}

/**
 * "Since last night" — cross-role activity on the worker's OWN families that
 * landed overnight and is waiting to be reviewed and resolved. This is the
 * morning-triage feed: e.g. a Case Manager sees the Budgeter meeting that ran
 * on their client the evening prior. Derived deterministically from the
 * caseload (scaffold until the activity feed is wired) so it stays tied to
 * real family + teammate names and reads true.
 */
export function overnightFor(families: Family[], myRole: RoleKey): OvernightItem[] {
  const sorted = [...families].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6);
  const out: OvernightItem[] = [];
  sorted.forEach((f, i) => {
    if (out.length >= 4) return;
    const other = otherAssignment(f, myRole);
    const slot = i % 3;
    if (slot === 0 && other) {
      out.push({
        id: `ov-mtg-${f.id}`, kind: "meeting", who: ROLE_LABEL[other.role], familyId: f.id, familyName: f.name,
        title: `${ROLE_LABEL[other.role]} met with ${f.name}`,
        sub: `${other.name} · last night`,
      });
    } else if (slot === 1 && (f.amountPaid ?? 0) > 0) {
      out.push({
        id: `ov-pay-${f.id}`, kind: "payment", who: "Payments", familyId: f.id, familyName: f.name,
        title: `Payment received: ${f.name}`,
        sub: "Posted overnight",
      });
    } else if (other) {
      out.push({
        id: `ov-note-${f.id}`, kind: "note", who: ROLE_LABEL[other.role], familyId: f.id, familyName: f.name,
        title: `${other.name} added a note on ${f.name}`,
        sub: "Last night",
      });
    }
  });
  return out;
}
