import type { KeyboardEvent, SyntheticEvent } from "react";
import { MapPin, Phone, ChatCircle } from "@phosphor-icons/react";
import type { Family } from "@/lib/types";
import { money } from "@/lib/format";
import { Av, Card, Pill, Track } from "./gv";

interface Props {
  family: Family;
  onOpen: () => void;
  /** Rise-in stagger index (optional). */
  i?: number;
}

const JOURNEY = ["Applied", "Intake", "Success Plan", "Active care", "Graduation"] as const;

/** Loose match of the roster stage string onto the 5-step journey. */
function journeyIndex(f: Family): number | null {
  const s = `${f.stage || ""} ${f.lifecycleStatus || ""}`.toLowerCase();
  if (/graduat/.test(s)) return 4;
  if (/active|ongoing|care|support/.test(s)) return 3;
  if (/success plan|plan for success|planning/.test(s)) return 2;
  if (/intake|assess/.test(s)) return 1;
  if (/appli|new|lead/.test(s)) return 0;
  return null;
}

/** Touch pill from REAL note recency (daysSinceLastNote) — mint when
 *  fresh, rose when quiet, plain when no notes exist. Never clock time:
 *  the roster carries day-resolution data only, so any "3:45 PM" here
 *  would be an invented render-time value. */
function quiet(f: Family): { label: string; tone: "ok" | "warn" | "none" } {
  const d = f.daysSinceLastNote;
  if (typeof d !== "number" || Number.isNaN(d)) return { label: "No notes yet", tone: "none" };
  if (d <= 0) return { label: "Noted today", tone: "ok" };
  if (d < 4) return { label: `Noted ${d}d`, tone: "ok" };
  return { label: `${d}d quiet`, tone: "warn" };
}

/** Swallow the tap so the card underneath does not also open the profile,
 *  and stop the pointer so SwipeRow never treats a button tap as a drag. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Caseload card in the Grove idiom: white card (no border), initials on
 *  a pastel, name, place, two visible Call / Text buttons (44px, only when
 *  the family has a phone), the 5-step journey as track segments (done =
 *  forest, current = lime) with the note-recency pill, a plain CM pill +
 *  labels, and money only when the record actually carries figures (KDH)
 *  — no dash placeholders, no invented timestamps. The card itself is a
 *  role=button div (not a <button>) so the two links inside stay valid. */
export function FamilyCard({ family, onOpen, i }: Props) {
  // Every card gets the 5-step bar: unmatched stage on an active family
  // reads as Active care; otherwise the bar renders neutral (no step lit).
  const idx = journeyIndex(family) ?? (family.active ? 3 : null);
  const q = quiet(family);
  const hasMoney = (family.estimatedDebt ?? 0) > 0 || (family.amountPaid ?? 0) > 0;
  const cm = family.assignments.case_manager;
  const place = [family.city, family.state].filter(Boolean).join(", ");
  const phone = (family.phone || "").trim();
  const labels = family.labels.filter(
    (l) => l.toLowerCase() !== "behind on payments" && l.toLowerCase() !== "some behind",
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
  };

  return (
    <div role="button" tabIndex={0} aria-label={`Open ${family.name}`} onClick={onOpen} onKeyDown={onKey} style={{ cursor: "pointer", outline: "none" }}>
      <Card i={i} style={{ display: "block", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Av name={family.name} photo={family.photo} size={44} round tint={family.kind === "kdh" ? "apricot" : "mint"} className="keep" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.005em", color: "var(--gv-ink)", lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{family.name}</div>
            {place && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 12, color: "var(--gv-mid)", minWidth: 0 }}>
                <MapPin size={12} weight="regular" style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place}</span>
              </div>
            )}
          </div>
          {phone && (
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              <a className="gv-ib" href={`tel:${phone}`} aria-label={`Call ${family.name}`} onClick={stop} onPointerDown={stop} onKeyDown={stop} style={{ width: 44, height: 44, textDecoration: "none" }}>
                <Phone size={18} weight="regular" />
              </a>
              <a className="gv-ib" href={`sms:${phone}`} aria-label={`Text ${family.name}`} onClick={stop} onPointerDown={stop} onKeyDown={stop} style={{ width: 44, height: 44, textDecoration: "none" }}>
                <ChatCircle size={18} weight="regular" />
              </a>
            </div>
          )}
        </div>

        {/* The 5-step journey renders on every card; idx null (inactive,
            unmatched stage) shows a neutral track with the raw status text. */}
        <div style={{ marginTop: 13 }}>
          <Track total={JOURNEY.length} done={idx ?? 0} current={idx ?? undefined} />
          <div style={{ display: "flex", alignItems: "center", marginTop: 8, gap: 8, minWidth: 0 }}>
            <span style={{
              flex: 1, minWidth: 0,
              fontSize: 12, fontWeight: idx == null ? 500 : 700,
              color: idx == null ? "var(--gv-quiet)" : "var(--gv-go)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {idx != null ? JOURNEY[idx] : (family.stage || family.lifecycleStatus || "No stage on file")}
            </span>
            <span className="gv-meta" style={{ flex: "none", fontWeight: 600 }}>
              {family.program === "Kosher Debt Help" ? "KDH" : family.program}
            </span>
            <Pill tint={q.tone === "warn" ? "rose" : q.tone === "ok" ? "mint" : "none"} style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>{q.label}</Pill>
          </div>
        </div>

        {hasMoney && (
          <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
            {(family.estimatedDebt ?? 0) > 0 && <Meta label="Est. debt" value={money(family.estimatedDebt)} />}
            {(family.amountPaid ?? 0) > 0 && <Meta label="Paid" value={money(family.amountPaid)} />}
          </div>
        )}

        {(cm || labels.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
            {cm && (
              <Pill><span style={{ color: "var(--gv-quiet)" }}>CM</span>{cm}</Pill>
            )}
            {labels.slice(0, 2).map((l) => (
              <Pill key={l}>{l}</Pill>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="tnum" style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gv-ink)", letterSpacing: "-0.01em" }}>{value}</div>
      <div className="gv-meta" style={{ fontSize: 12, marginTop: 1 }}>{label}</div>
    </div>
  );
}
