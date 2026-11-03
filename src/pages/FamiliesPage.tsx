import { useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { syncedAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { familyReasons } from "@/lib/attention";
import { Chips, Empty } from "@/components/gv";
import { FamilyCard } from "@/components/FamilyCard";
import { SwipeRow } from "@/components/SwipeRow";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";

type Filter = "all" | "attention" | "behind";

const norm = (s?: string | null) => (s || "").toLowerCase();

export function FamiliesPage() {
  const router = useIonRouter();
  const { role, me } = useRole();
  const { familiesForRole, lastSync, loading } = useAppData();
  const { openCapture } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const all = familiesForRole(role.key, me.name);
  const needsMe = (f: typeof all[number]) => familyReasons(f).reasons.length > 0;
  const behind = (f: typeof all[number]) => f.paymentStatus === "behind";
  const term = q.trim().toLowerCase();
  const families = useMemo(() => {
    const list = filter === "attention" ? all.filter(needsMe) : filter === "behind" ? all.filter(behind) : all;
    if (!term) return list;
    // Names first: a first or last name that STARTS with the query ranks
    // above a name that merely contains it; city matches come last.
    const rank = (f: typeof all[number]) => {
      const name = norm(f.name);
      if (name.startsWith(term) || name.split(/\s+/).some((w) => w.startsWith(term))) return 0;
      if (name.includes(term)) return 1;
      if (norm(f.city).includes(term) || norm(f.state).includes(term)) return 2;
      return 3;
    };
    return list
      .map((f, k) => ({ f, r: rank(f), k }))
      .filter((x) => x.r < 3)
      .sort((a, b) => a.r - b.r || a.k - b.k)
      .map((x) => x.f);
  }, [all, filter, term]);

  // Soft-chip filter row with counts: selected = soft green, others white hairline.
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "attention", label: "Needs attention", count: all.filter(needsMe).length },
    { key: "behind", label: "Behind", count: all.filter(behind).length },
  ];

  const toggleSearch = () => {
    if (searchOpen) setQ("");
    setSearchOpen((o) => !o);
  };

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
          <Header
            title="Families"
            subtitle={`${role.label}${all.length ? ` · ${all.length} families` : ""} · ${syncedAgo(lastSync)}`}
            onSearch={toggleSearch}
            searchActive={searchOpen}
          />
          {searchOpen && (
            <div style={{ padding: "8px 20px 2px" }}>
              <input
                className="gv-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a family"
                aria-label="Find a family"
                autoFocus
                autoCapitalize="words"
                autoCorrect="off"
                enterKeyHint="search"
              />
            </div>
          )}
          <div style={{ padding: "12px 20px 12px" }}><Chips items={chips} active={filter} onChange={setFilter} /></div>
        </div>

        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        {/* 120px at the bottom clears the floating tab bar. */}
        <div style={{ padding: "0 20px 120px", display: "flex", flexDirection: "column", gap: 12, minHeight: "50vh" }}>
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : families.length === 0 && term ? (
            <Empty action="Clear" onAction={() => setQ("")}>No family matches “{q.trim()}”.</Empty>
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
