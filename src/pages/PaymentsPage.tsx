import { useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Plus } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { money } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { ToolHero, ToolTiles, ToolEmpty } from "@/components/orchard/tools/ToolsKit";
import { PaymentCard } from "@/components/orchard/tools/PaymentCard";

type PStatus = "all" | "overdue" | "due" | "paid";

/** `money`, compacted above $10k so three tiles fit at 320. */
const fmt = (n: number) => {
  if (n < 10000) return money(n);
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

/**
 * Payments, in ORCHARD (2026-11-05). Hero, three money tiles (billed,
 * collected, overdue; peach when something is late), status chips, then
 * white billing cards coloured by meaning. Add billing stays the one
 * forest button, floating bottom right.
 */
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
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="oc-root oco-page">
          <ToolHero title="Payments." tone="Your recent billing." bg="var(--oc-sky)"
            sub={payments.length ? `${payments.length} ${payments.length === 1 ? "line" : "lines"} · ${count("overdue")} overdue` : "Nothing billed yet"} />

          <ToolTiles tiles={[
            { key: "billed", label: "Billed", value: fmt(billed), bg: "var(--oc-card)" },
            { key: "collected", label: "Collected", value: fmt(collected), bg: "var(--oc-mint)" },
            { key: "overdue", label: "Overdue", value: fmt(overdue), bg: overdue > 0 ? "var(--oc-peach)" : "var(--oc-card)" },
          ]} />

          <div className="oc-chips" role="toolbar" aria-label="Status">
            {chips.map((c) => (
              <button key={c.key} type="button" className="oc-chip" aria-pressed={tab === c.key} onClick={() => setTab(c.key)}>
                {c.label} · {c.count}
              </button>
            ))}
          </div>

          <div className="oco-list" style={{ minHeight: "30vh" }}>
            {rows.length === 0 ? (
              <ToolEmpty action="Add billing" onAction={() => openCapture("add")}>No billing in this bucket.</ToolEmpty>
            ) : (
              rows.map((p, k) => <PaymentCard key={p.id} payment={p} i={Math.min(k, 8)} onOpen={() => router.push(`/family/${p.familyId}`)} />)
            )}
          </div>
        </div>

        {/* Add billing: the one forest primary on this screen, bottom-right so it clears the raised Ask button */}
        <button type="button" slot="fixed" aria-label="Add billing" className="oco-fab" onClick={() => openCapture("add")}>
          <Plus size={20} weight="bold" /> Add billing
        </button>
      </IonContent>
    </IonPage>
  );
}
