import { MapPin } from "@phosphor-icons/react";
import type { Family } from "@/lib/types";
import { familyHealth } from "@/lib/attention";
import { lastTouch } from "@/lib/time";
import { money } from "@/lib/format";
import { Avatar } from "./Avatar";
import { StatusBadge, type BadgeTone } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";

interface Props {
  family: Family;
  onOpen: () => void;
}

function band(h: number): { tone: BadgeTone; label: string } {
  if (h >= 70) return { tone: "mist", label: "On track" };
  if (h >= 45) return { tone: "butter", label: "Watch" };
  return { tone: "coral", label: "Behind" };
}

/** Caseload card in the warm TaskCard idiom: bold name, a status badge, a
 *  financial glance, and an on-track progress bar. */
export function FamilyCard({ family, onOpen }: Props) {
  const health = familyHealth(family);
  const b = band(health);
  const labels = family.labels.filter(
    (l) => l.toLowerCase() !== "behind on payments" && l.toLowerCase() !== "some behind",
  );

  return (
    <div
      onClick={onOpen}
      className="shadow-card"
      style={{ background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, padding: 16, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={family.name} photo={family.photo} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)", lineHeight: "21px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{family.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 12, fontWeight: 500, color: "var(--ck-muted)" }}>
            <MapPin size={13} weight="regular" />
            {family.city}{family.state ? `, ${family.state}` : ""}
            <span>·</span>
            {lastTouch(family.lastTouchedAt)}
          </div>
        </div>
        <StatusBadge label={b.label} tone={b.tone} />
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        <Meta label="Est. debt" value={money(family.estimatedDebt)} />
        <Meta label="Paid" value={money(family.amountPaid)} />
        <Meta label="Program" value={family.program === "Kosher Debt Help" ? "KDH" : family.program} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ProgressBar value={health} />
      </div>

      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {labels.slice(0, 2).map((l) => (
            <span key={l} style={{ fontSize: 12, fontWeight: 500, color: "var(--ck-body)", background: "var(--ck-bg)", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="tnum" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ck-title)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ck-muted)", marginTop: 1 }}>{label}</div>
    </div>
  );
}
