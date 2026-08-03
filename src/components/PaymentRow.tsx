import type { Payment } from "@/lib/types";
import { money } from "@/lib/format";
import { lastTouch } from "@/lib/time";
import { Avatar } from "./Avatar";
import { StatusBadge, type BadgeTone } from "./StatusBadge";

const STATUS_TONE: Record<Payment["status"], BadgeTone> = { paid: "mist", due: "butter", overdue: "coral" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  payment: Payment;
  onOpen?: () => void;
}

/** One billing line. Amount is tabular and right-aligned for scanning. */
export function PaymentRow({ payment, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className="shadow-card"
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)",
        borderRadius: 20, padding: 14, display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <Avatar name={payment.familyName} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {payment.familyName}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ck-muted)", marginTop: 2 }}>
          {payment.method} · {payment.initiative} · {lastTouch(payment.date)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: "var(--ck-title)", letterSpacing: "-0.01em" }}>{money(payment.amount)}</div>
        <StatusBadge label={cap(payment.status)} tone={STATUS_TONE[payment.status]} dot={false} />
      </div>
    </button>
  );
}
