import { MapPin } from "@phosphor-icons/react";
import type { Family } from "@/lib/types";
import { lastTouch } from "@/lib/time";
import { money } from "@/lib/format";
import { Avatar } from "./Avatar";

interface Props {
  family: Family;
  onOpen: () => void;
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

/** Quiet pill, same idiom as Home: red when a family has gone quiet. */
function quiet(f: Family): { label: string; warn: boolean } | null {
  const d = f.daysSinceLastNote;
  if (typeof d !== "number" || Number.isNaN(d)) return null;
  if (d <= 0) return { label: "Today", warn: false };
  if (d < 4) return { label: `${d}d`, warn: false };
  return { label: `${d}d quiet`, warn: true };
}

/** Caseload card in the warm Brisk idiom: tinted avatar, name, place and
 *  last touch, the 5-step journey, and a quiet pill. Money only when the
 *  record actually carries figures (KDH) — no dash placeholders. */
export function FamilyCard({ family, onOpen }: Props) {
  const idx = journeyIndex(family);
  const q = quiet(family);
  const hasMoney = (family.estimatedDebt ?? 0) > 0 || (family.amountPaid ?? 0) > 0;
  const labels = family.labels.filter(
    (l) => l.toLowerCase() !== "behind on payments" && l.toLowerCase() !== "some behind",
  );

  return (
    <div
      onClick={onOpen}
      className="shadow-card"
      style={{ background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, padding: 15, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={family.name} photo={family.photo} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)", lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{family.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11.5, fontWeight: 500, color: "var(--ck-muted)", minWidth: 0 }}>
            <MapPin size={12} weight="regular" style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {family.city}{family.state ? `, ${family.state}` : ""} · {lastTouch(family.lastTouchedAt)}
            </span>
          </div>
        </div>
        {q && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, whiteSpace: "nowrap",
            background: q.warn ? "var(--ck-pill-warn-bg, #FAE5DE)" : "var(--ck-pill-ok-bg, #EAF3DE)",
            color: q.warn ? "var(--ck-pill-warn-ink, #B4351F)" : "var(--ck-pill-ok-ink, #27500A)",
          }}>{q.label}</span>
        )}
      </div>

      {idx != null && (
        <div style={{ marginTop: 13 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {JOURNEY.map((_, i) => (
              <span key={i} style={{
                flex: 1, height: 5, borderRadius: 3,
                background: i < idx ? "var(--ck-sage, #7FA24C)" : i === idx ? "var(--ck-tint)" : "var(--ck-hairline)",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ck-tint)" }}>{JOURNEY[idx]}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ck-muted)" }}>
              {family.program === "Kosher Debt Help" ? "KDH" : family.program}
            </span>
          </div>
        </div>
      )}
      {idx == null && (
        <div style={{ marginTop: 11, fontSize: 11.5, fontWeight: 500, color: "var(--ck-muted)" }}>
          {[family.stage || family.lifecycleStatus, family.program === "Kosher Debt Help" ? "KDH" : family.program].filter(Boolean).join(" · ")}
        </div>
      )}

      {hasMoney && (
        <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
          {(family.estimatedDebt ?? 0) > 0 && <Meta label="Est. debt" value={money(family.estimatedDebt)} />}
          {(family.amountPaid ?? 0) > 0 && <Meta label="Paid" value={money(family.amountPaid)} />}
        </div>
      )}

      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
          {labels.slice(0, 2).map((l) => (
            <span key={l} style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ck-body)", background: "var(--ck-paper, var(--ck-bg))", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: "var(--ck-title)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--ck-muted)", marginTop: 1 }}>{label}</div>
    </div>
  );
}
