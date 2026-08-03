import { useMemo, useState } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Plus } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { money } from "@/lib/format";
import { Header } from "@/components/Header";
import { tintVars, type TintName } from "@/components/Tint";
import { TabPills } from "@/components/TabPills";
import { PaymentRow } from "@/components/PaymentRow";
import { EmptyState } from "@/components/EmptyState";

type PStatus = "all" | "overdue" | "due" | "paid";

export function PaymentsPage() {
  const router = useIonRouter();
  const { payments } = useAppData();
  const { openCapture } = useUI();
  const [tab, setTab] = useState<PStatus>("all");

  const rows = useMemo(() => (tab === "all" ? payments : payments.filter((p) => p.status === tab)), [payments, tab]);

  const billed = payments.reduce((s, p) => s + p.amount, 0);
  const collected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  const tabs = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue" },
    { key: "due", label: "Due" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <Header title="Payments" subtitle="your recent billing" />

          {/* month summary */}
          <div style={{ display: "flex", gap: 12, padding: "4px 16px 12px" }}>
            <Sum value={money(billed)} label="Billed" tint="sky" />
            <Sum value={money(collected)} label="Collected" tint="mint" />
            <Sum value={money(overdue)} label="Overdue" tint="rose" />
          </div>

          <div style={{ padding: "2px 16px 10px" }}><TabPills tabs={tabs} active={tab} onChange={(k) => setTab(k as PStatus)} /></div>
        </div>

        <div style={{ padding: "4px 16px 120px", display: "flex", flexDirection: "column", gap: 10, minHeight: "40vh" }}>
          {rows.length === 0 ? (
            <EmptyState stageColor="#3F7355" message="No billing in this bucket." buttonLabel="Add billing" onAdd={() => openCapture("add")} />
          ) : (
            rows.map((p) => <PaymentRow key={p.id} payment={p} onOpen={() => router.push(`/family/${p.familyId}`)} />)
          )}
        </div>

        {/* Add billing FAB */}
        <button
          aria-label="Add billing"
          onClick={() => openCapture("add")}
          style={{ position: "absolute", right: 16, bottom: "calc(24px + env(safe-area-inset-bottom))", height: 52, padding: "0 20px", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--ck-tint)", color: "#fff", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 6px 16px rgba(15,23,42,.18)" }}
        >
          <Plus size={20} weight="bold" /> Add billing
        </button>
      </IonContent>
    </IonPage>
  );
}

function Sum({ value, label, tint }: { value: string; label: string; tint: TintName }) {
  const t = tintVars(tint);
  return (
    <div style={{ flex: 1, minWidth: 0, backgroundColor: t.bg, borderRadius: 18, padding: "14px 13px" }}>
      <div className="tnum" style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)" }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.fg, marginTop: 3 }}>{label}</div>
    </div>
  );
}
