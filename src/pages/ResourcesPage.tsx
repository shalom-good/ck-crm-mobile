import { useMemo, useState } from "react";
import { IonPage, IonContent, IonSearchbar } from "@ionic/react";
import { useAppData } from "@/lib/appData";
import { Header } from "@/components/Header";
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

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <Header title="Resources" subtitle={resourcesLoading ? "loading…" : `${resources.length} in the directory`} />
          {/* search — IonSearchbar handles mobile focus/keyboard reliably */}
          <IonSearchbar
            value={q}
            onIonInput={(e) => setQ(e.detail.value ?? "")}
            onIonClear={() => setQ("")}
            placeholder="Search resources"
            debounce={100}
            inputMode="search"
            style={{
              padding: "0 12px 8px",
              "--background": "var(--ck-card)",
              "--border-radius": "12px",
              "--box-shadow": "inset 0 0 0 1.5px var(--ck-input-border)",
              "--color": "var(--ck-title)",
              "--placeholder-color": "var(--ck-muted)",
              "--icon-color": "var(--ck-muted)",
              "--clear-button-color": "var(--ck-muted)",
            } as React.CSSProperties}
          />
        </div>

        <div style={{ padding: "0 16px 120px", display: "flex", flexDirection: "column", gap: 20 }}>
          {resourcesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          )}
          {groups.map(([cat, items]) => (
            <div key={cat}>
              <h2 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--ck-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{cat}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    onOpen={() => {
                      if (r.link) window.open(r.link.startsWith("http") ? r.link : `https://${r.link}`, "_blank");
                      else if (r.phone) window.location.href = `tel:${r.phone}`;
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--ck-muted)" }}>No resources match "{q}".</div>}
        </div>
      </IonContent>
    </IonPage>
  );
}
