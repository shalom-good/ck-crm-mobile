import { useMemo, useState } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Plus } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { money } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { Strip, Chips, Empty } from "@/components/gv";
import { PaymentRow } from "@/components/PaymentRow";

type PStatus = "all" | "overdue" | "due" | "paid";

/** `money`, compacted above $10k so three cells fit a 320 strip. */
const fmt = (n: number) => {
  if (n < 10000) return money(n);
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

export function PaymentsPage() {
  const router = useIonRouter();
  const { payments } = useAppData();
  const { openCapture } = useUI();
  const [tab, setTab] = useState<PStatus>("all");

  const rows = useMemo(() => (tab === "all" ? payments : payments.filter((p) => p.status === tab)), [payments, tab]);

  const billed = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const count = (s: Payment["status"]) => payments.filter((p) => p.status === s).length;

  const chips: { key: PStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: payments.length },
    { key: "overdue", label: "Overdue", count: count("overdue") },
    { key: "due", label: "Due", count: count("due") },
    { key: "paid", label: "Paid", count: count("paid") },
  ];

  return (
    <IonPage>
      <IonContent>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 16px 0" }}>
          <h1 className="gv-h1">Payments</h1>
          <div className="gv-meta" style={{ marginTop: 4 }}>Your recent billing</div>

          {/* the one stat strip */}
          <div style={{ marginTop: 16 }}>
            <Strip
              i={0}
              stats={[
                { label: "Billed", value: billed, fmt },
                { label: "Collected", value: collected, fmt },
                { label: "Overdue", value: overdue, fmt, warn: overdue > 0 },
              ]}
            />
          </div>

          <div style={{ marginTop: 14 }}><Chips items={chips} active={tab} onChange={setTab} /></div>
        </div>

        <div style={{ padding: "12px 16px 120px", display: "flex", flexDirection: "column", gap: 10, minHeight: "40vh" }}>
          {rows.length === 0 ? (
            <Empty action="Add billing" onAction={() => openCapture("add")}>No billing in this bucket.</Empty>
          ) : (
            rows.map((p, k) => <PaymentRow key={p.id} payment={p} i={k + 1} onOpen={() => router.push(`/family/${p.familyId}`)} />)
          )}
        </div>

        {/* Add billing — the one forest primary on this screen, bottom-right so it clears the raised Ask button */}
        <button
          aria-label="Add billing"
          className="gv-btn"
          onClick={() => openCapture("add")}
          style={{ position: "absolute", right: 16, bottom: "calc(36px + env(safe-area-inset-bottom))", borderRadius: 999, zIndex: 5 }}
        >
          <Plus size={20} weight="bold" /> Add billing
        </button>
      </IonContent>
    </IonPage>
  );
}
