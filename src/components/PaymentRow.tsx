import type { CSSProperties } from "react";
import type { Payment } from "@/lib/types";
import { money } from "@/lib/format";
import { lastTouch } from "@/lib/time";
import { Av, Card, Pill, type Tint } from "./gv";

// paid = plain, due = yellow (to settle), overdue = rose (the blocker)
const STATUS_TINT: Record<Payment["status"], Tint> = { paid: "mint", due: "yellow", overdue: "rose" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  payment: Payment;
  onOpen?: () => void;
  /** Stagger index for the rise-in (optional). */
  i?: number;
}

const ellipsis: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** One billing line: white card, round pastel avatar, amount tabular on the right. */
export function PaymentRow({ payment, onOpen, i }: Props) {
  const meta = [payment.method, payment.initiative, lastTouch(payment.date)].filter(Boolean).join(" · ");
  return (
    <Card i={i} onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
      <Av name={payment.familyName} size={44} round tint={/kdh/i.test(payment.initiative || "") ? "apricot" : "mint"} className="keep" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gv-ink)", ...ellipsis }}>{payment.familyName}</div>
        <div className="gv-meta" style={{ marginTop: 2, ...ellipsis }}>{meta}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flex: "none" }}>
        <span className="tnum" style={{ fontSize: 16, fontWeight: 800, color: "var(--gv-ink)", letterSpacing: "-0.01em" }}>{money(payment.amount)}</span>
        <Pill tint={STATUS_TINT[payment.status]} sm>{cap(payment.status)}</Pill>
      </div>
    </Card>
  );
}
