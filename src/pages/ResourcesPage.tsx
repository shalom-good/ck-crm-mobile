import { useMemo, useState } from "react";
import { IonPage, IonContent, IonSearchbar } from "@ionic/react";
import { useAppData } from "@/lib/appData";
import { Eyebrow, Empty } from "@/components/gv";
import { ResourceRow } from "@/components/ResourceRow";
import { SkeletonCard } from "@/components/Skeleton";

export function ResourcesPage() {
  const { resources, resourcesLoading } = useAppData();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return resources;
    return resources.filter((r) => `${r.name} ${r.category} ${r.description ?? ""} ${r.contact ?? ""}`.toLowerCase().includes(t));
  }, [resources, q]);

  // group by category
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const r of filtered) m.set(r.category, [...(m.get(r.category) ?? []), r]);
    return [...m.entries()];
  }, [filtered]);

  let k = 0; // running stagger index across groups

  return (
    <IonPage>
      <IonContent>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 16px 0" }}>
          <h1 className="gv-h1">Resources</h1>
          <div className="gv-meta" style={{ marginTop: 4 }}>{resourcesLoading ? "Loading…" : `${resources.length} in the directory`}</div>
        </div>
        {/* search — IonSearchbar handles mobile focus/keyboard reliably; themed globally */}
        <IonSearchbar
          value={q}
          onIonInput={(e) => setQ(e.detail.value ?? "")}
          onIonClear={() => setQ("")}
          placeholder="Search resources"
          debounce={100}
          inputMode="search"
          style={{ padding: "12px 12px 0" }}
        />

        <div style={{ padding: "0 16px 120px" }}>
          {resourcesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          )}
          {groups.map(([cat, items]) => (
            <div key={cat}>
              <Eyebrow>{cat}</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    i={k++}
                    onOpen={() => {
                      if (r.link) window.open(r.link.startsWith("http") ? r.link : `https://${r.link}`, "_blank");
                      else if (r.phone) window.location.href = `tel:${r.phone}`;
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {!resourcesLoading && groups.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <Empty action={q ? "Clear" : undefined} onAction={() => setQ("")}>
                {q ? <>No resources match “{q}”.</> : "No resources in the directory yet."}
              </Empty>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
