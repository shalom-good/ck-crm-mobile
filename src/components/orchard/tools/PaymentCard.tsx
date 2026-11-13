import type { CSSProperties } from "react";
import type { Payment } from "@/lib/types";
import { money } from "@/lib/format";
import { lastTouch } from "@/lib/time";
import { initialsOf } from "@/components/orchard/Orchard";

// colour by meaning: overdue = rose, due = butter, paid = mint
const STATUS: Record<Payment["status"], { chip: string; label: string; av: { bg: string; ink: string } }> = {
  overdue: { chip: "oco-chip--rose", label: "Overdue", av: { bg: "var(--oc-rose)", ink: "#9A3A22" } },
  due: { chip: "oco-chip--butter", label: "Due", av: { bg: "var(--oc-butter)", ink: "#6B5A00" } },
  paid: { chip: "oco-chip--mint", label: "Paid", av: { bg: "var(--oc-mint)", ink: "#1F5E3A" } },
};

/** One billing line in Orchard: tinted initials, name + meta, amount and a status chip. */
export function PaymentCard({ payment: p, onOpen, i = 0 }: { payment: Payment; onOpen?: () => void; i?: number }) {
  const s = STATUS[p.status] ?? STATUS.due;
  const meta = [p.method, p.initiative, lastTouch(p.date)].filter(Boolean).join(" · ");
  return (
    <button type="button" className="oco-card" onClick={onOpen} style={{ "--i": i } as CSSProperties} aria-label={`${p.familyName}, ${money(p.amount)}, ${s.label}`}>
      <div className="oco-card-hd">
        <span className="oco-av" style={{ background: s.av.bg, color: s.av.ink }} aria-hidden="true">{initialsOf(p.familyName)}</span>
        <div className="oco-main">
          <div className="oco-name">{p.familyName}</div>
          {meta && <div className="oco-meta">{meta}</div>}
        </div>
        <div className="oco-side">
          <span className="oco-amt" style={{ color: p.status === "overdue" ? "#9A3A22" : undefined }}>{money(p.amount)}</span>
          <span className={`oco-chip ${s.chip}`}>{s.label}</span>
        </div>
      </div>
    </button>
  );
}
