import { useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { syncedAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { familyReasons } from "@/lib/attention";
import { Chips } from "@/components/gv";
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
  const behind = (f: typeof all[number]) => f.paymentStatus === "behind";
  const families = useMemo(() => {
    if (filter === "attention") return all.filter(needsMe);
    if (filter === "behind") return all.filter(behind);
    return all;
  }, [all, filter]);

  // Soft-chip filter row with counts: selected = soft green, others white hairline.
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "attention", label: "Needs attention", count: all.filter(needsMe).length },
    { key: "behind", label: "Behind", count: all.filter(behind).length },
  ];

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <Header title="Families" subtitle={`${role.label}${all.length ? ` · ${all.length} families` : ""} · ${syncedAgo(lastSync)}`} />
          <div style={{ padding: "6px 16px 10px" }}><Chips items={chips} active={filter} onChange={setFilter} /></div>
        </div>

        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        {/* 130px at the bottom clears the tab bar + the raised Ask button. */}
        <div style={{ padding: "4px 16px 130px", display: "flex", flexDirection: "column", gap: 12, minHeight: "50vh" }}>
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
            families.map((f, i) => (
              <SwipeRow
                key={f.id}
                i={Math.min(i, 8)}
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
