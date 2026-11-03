import { TopBar } from "@/components/TopBar";
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
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 10px) 20px 0" }}>
          <TopBar space="Team" back="/tabs/home" />
          <h1 className="gv-h1" style={{ marginTop: 10 }}>Payments</h1>
          <div className="gv-meta" style={{ marginTop: 4 }}>Your recent billing</div>

          {/* the one stat strip */}
          <div style={{ marginTop: 14 }}>
            <Strip
              i={0}
              stats={[
                { label: "Billed", value: billed, fmt },
                { label: "Collected", value: collected, fmt },
                { label: "Overdue", value: overdue, fmt, warn: overdue > 0 },
              ]}
            />
          </div>

          <div style={{ marginTop: 12 }}><Chips items={chips} active={tab} onChange={setTab} /></div>
        </div>

        <div style={{ padding: "12px 20px 170px", display: "flex", flexDirection: "column", gap: 12, minHeight: "40vh" }}>
          {rows.length === 0 ? (
            <Empty action="Add billing" onAction={() => openCapture("add")}>No billing in this bucket.</Empty>
          ) : (
            rows.map((p, k) => <PaymentRow key={p.id} payment={p} i={k + 1} onOpen={() => router.push(`/family/${p.familyId}`)} />)
          )}
        </div>

        {/* Add billing — the one forest primary on this screen, bottom-right above the floating tab bar */}
        <button
          aria-label="Add billing"
          className="gv-btn"
          onClick={() => openCapture("add")}
          style={{ position: "absolute", right: 20, bottom: "calc(100px + env(safe-area-inset-bottom))", borderRadius: 999, zIndex: 5, boxShadow: "var(--gv-shadow-pop)" }}
        >
          <Plus size={20} weight="bold" /> Add billing
        </button>
      </IonContent>
    </IonPage>
  );
}
