import { TopBar } from "@/components/TopBar";
import { useMemo, useState } from "react";
import { IonPage, IonHeader, IonContent, IonSearchbar } from "@ionic/react";
import { useAppData } from "@/lib/appData";
import { Btn, Chips, Eyebrow, Empty } from "@/components/gv";
import { ResourceRow } from "@/components/ResourceRow";
import { SkeletonCard } from "@/components/Skeleton";

/** Rows rendered per page; the directory is ~460 deep, so the list grows
 *  40 at a time from a ghost "Show 40 more" and resets on every search. */
const PAGE = 40;
/** Category chips in the sticky header: All + the busiest categories. */
const TOP_CATEGORIES = 6;
const ALL = "all";
const catKey = (c: string) => `c:${c}`;

export function ResourcesPage() {
  const { resources, resourcesLoading } = useAppData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(ALL);
  const [limit, setLimit] = useState(PAGE);

  // Any change to the search or the category starts again from the first page.
  const search = (v: string) => { setQ(v); setLimit(PAGE); };
  const pick = (k: string) => { setCat(k); setLimit(PAGE); };
  const clear = () => { setQ(""); setCat(ALL); setLimit(PAGE); };

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of resources) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP_CATEGORIES);
    return [{ key: ALL, label: "All", count: resources.length }, ...top.map(([c, n]) => ({ key: catKey(c), label: c, count: n }))];
  }, [resources]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const c = cat === ALL ? null : cat.slice(2);
    return resources.filter((r) =>
      (!c || r.category === c) &&
      (!t || `${r.name} ${r.category} ${r.description ?? ""} ${r.contact ?? ""}`.toLowerCase().includes(t)));
  }, [resources, q, cat]);

  // Group only the visible slice by category (grouping headers stay).
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const r of filtered.slice(0, limit)) m.set(r.category, [...(m.get(r.category) ?? []), r]);
    return [...m.entries()];
  }, [filtered, limit]);

  const shown = Math.min(limit, filtered.length);
  const remaining = filtered.length - shown;
  const catLabel = cat === ALL ? null : cat.slice(2);
  let k = 0; // running stagger index across groups (capped so late rows don't wait)

  return (
    <IonPage>
      {/* Title, search and the category chips stay put while the list scrolls. */}
      <IonHeader className="ion-no-border">
        <div style={{ background: "var(--gv-paper)", padding: "calc(env(safe-area-inset-top) + 10px) 0 10px" }}>
          <div style={{ padding: "0 20px" }}>
            <TopBar space="Team" />
            <h1 className="gv-h1" style={{ marginTop: 10 }}>Resources</h1>
            <div className="gv-meta" style={{ marginTop: 4 }}>{resourcesLoading ? "Loading…" : `${resources.length} in the directory`}</div>
          </div>
          {/* IonSearchbar handles mobile focus/keyboard reliably; themed globally */}
          <IonSearchbar
            value={q}
            onIonInput={(e) => search(e.detail.value ?? "")}
            onIonClear={() => search("")}
            placeholder="Search resources"
            debounce={100}
            inputMode="search"
            style={{ padding: "10px 16px 0" }}
          />
          {chips.length > 1 && (
            <div style={{ padding: "10px 20px 0" }}><Chips items={chips} active={cat} onChange={pick} /></div>
          )}
        </div>
      </IonHeader>

      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px 120px" }}>
          {resourcesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          )}
          {groups.map(([category, items]) => (
            <div key={category}>
              <Eyebrow>{category}</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    i={Math.min(k++, 8)}
                    onOpen={() => {
                      if (r.link) window.open(r.link.startsWith("http") ? r.link : `https://${r.link}`, "_blank");
                      else if (r.phone) window.location.href = `tel:${r.phone}`;
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div style={{ marginTop: 14 }}>
              <Btn ghost block onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, remaining)} more</Btn>
              <p className="gv-meta" style={{ textAlign: "center", margin: "8px 0 0" }}>Showing {shown} of {filtered.length}</p>
            </div>
          )}
          {!resourcesLoading && groups.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <Empty action={q || catLabel ? "Clear" : undefined} onAction={clear}>
                {q ? <>No resources match “{q.trim()}”{catLabel ? <> in {catLabel}</> : null}.</> : catLabel ? <>Nothing filed under {catLabel} yet.</> : "No resources in the directory yet."}
              </Empty>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
