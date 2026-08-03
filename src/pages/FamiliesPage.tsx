import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { syncedAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { familyReasons } from "@/lib/attention";
import { TabPills } from "@/components/TabPills";
import { FamilyCard } from "@/components/FamilyCard";
import { SwipeRow } from "@/components/SwipeRow";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";

type Filter = "all" | "attention" | "behind";

export function FamiliesPage() {
  const router = useIonRouter();
  const { role, me } = useRole();
  const { familiesForRole, lastSync, loading } = useAppData();
  const { openCapture } = useUI();
  const [filter, setFilter] = useState<Filter>("all");

  const all = familiesForRole(role.key, me.name);
  const needsMe = (f: typeof all[number]) => familyReasons(f).reasons.length > 0;
  const families = useMemo(() => {
    if (filter === "attention") return all.filter(needsMe);
    if (filter === "behind") return all.filter((f) => f.paymentStatus === "behind");
    return all;
  }, [all, filter]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "attention", label: "Needs attention" },
    { key: "behind", label: "Behind" },
  ];

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <Header title="Families" subtitle={`${role.label} · ${syncedAgo(lastSync)}`} />
          <div style={{ padding: "2px 16px 10px" }}><TabPills tabs={tabs} active={filter} onChange={(k) => setFilter(k as Filter)} /></div>
        </div>

        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "4px 16px 120px", display: "flex", flexDirection: "column", gap: 12, minHeight: "50vh" }}>
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : families.length === 0 ? (
            <EmptyState
              stageColor={role.accent}
              message={`No families assigned to you as ${role.label}${filter !== "all" ? " match this filter" : " yet"}.`}
              buttonLabel="Add a note"
              onAdd={() => openCapture("add")}
            />
          ) : (
            families.map((f) => (
              <SwipeRow
                key={f.id}
                onCall={() => (window.location.href = `tel:${f.phone}`)}
                onMessage={() => (window.location.href = `sms:${f.phone}`)}
                onArchive={() => openCapture("add")}
              >
                <FamilyCard family={f} onOpen={() => router.push(`/family/${f.id}`)} />
              </SwipeRow>
            ))
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
