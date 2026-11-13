import { useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { useAppData } from "@/lib/appData";
import { SearchBar } from "@/components/orchard/Orchard";
import { ToolHero, ToolEmpty, tintOf } from "@/components/orchard/tools/ToolsKit";
import { ResourceCard } from "@/components/orchard/tools/ResourceCard";
import { SkeletonCard } from "@/components/Skeleton";

/** Rows rendered per page; the directory is ~460 deep, so the list grows
 *  40 at a time from "Show 40 more" and resets on every search. */
const PAGE = 40;
const ALL = "all";
const catKey = (c: string) => `c:${c}`;

/**
 * Resources, in ORCHARD (2026-11-05), mirroring the CRM directory: a sage
 * hero ("Resources. N ways to help a family."), the search right under it,
 * one scrolling row of pastel category chips, then white cards grouped by
 * category with Call / Email / Website pills.
 */
export function ResourcesPage() {
  const { resources: allResources, resourcesLoading } = useAppData();
  // Signed confidentiality agreements / NDAs are people's files, not
  // resources (the CRM hides them too, 2026-11-04), so they never list here.
  const resources = useMemo(
    () => allResources.filter((r) => !/confidential|\bnda\b|non[- ]?disclosure/i.test(`${r.category ?? ""} ${(r as { name?: string }).name ?? ""}`)),
    [allResources],
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(ALL);
  const [limit, setLimit] = useState(PAGE);

  // Any change to the search or the category starts again from the first page.
  const search = (v: string) => { setQ(v); setLimit(PAGE); };
  const pick = (k: string) => { setCat(k); setLimit(PAGE); };
  const clear = () => { setQ(""); setCat(ALL); setLimit(PAGE); };

  // Every category, busiest first; the row scrolls inside itself.
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of resources) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const all = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return [{ key: ALL, label: "All", count: resources.length }, ...all.map(([c, n]) => ({ key: catKey(c), label: c, count: n }))];
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
  const term = q.trim();
  let k = 0; // running stagger index across groups (capped so late rows don't wait)

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="oc-root oco-page">
          <ToolHero
            title="Resources."
            tone={resourcesLoading ? "Loading the directory" : `${resources.length} ways to help a family.`}
            sub="Search by name, need or contact."
          />

          <SearchBar value={q} onChange={search} count={term ? filtered.length : undefined}
            placeholder="Search a name, a need, a contact" label="Search resources" />

          {chips.length > 1 && (
            <div className="oco-cats" role="toolbar" aria-label="Categories">
              {chips.map((c) => {
                const t = c.key === ALL ? { bg: "var(--oc-summary)", ink: "var(--oc-forest)" } : tintOf(c.label);
                return (
                  <button key={c.key} type="button" className="oco-cat" aria-pressed={cat === c.key}
                    onClick={() => pick(cat === c.key && c.key !== ALL ? ALL : c.key)}>
                    <i style={{ background: t.bg, color: t.ink }} aria-hidden="true">{c.key === ALL ? "✦" : c.label.trim().charAt(0).toUpperCase()}</i>
                    <span>{c.label}</span><em>{c.count}</em>
                  </button>
                );
              })}
            </div>
          )}

          {resourcesLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          )}

          {groups.map(([category, items]) => (
            <section key={category} className="oco-list" aria-label={category}>
              <div className="oco-group">{category}<em>{items.length}</em></div>
              {items.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  i={Math.min(k++, 8)}
                  onOpen={() => {
                    if (r.link) window.open(r.link.startsWith("http") ? r.link : `https://${r.link}`, "_blank");
                    else if (r.phone) window.location.href = `tel:${r.phone}`;
                  }}
                />
              ))}
            </section>
          ))}

          {remaining > 0 && (
            <div className="oco-more">
              <button type="button" className="oc-btn oc-btn--light" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, remaining)} more</button>
              <small>Showing {shown} of {filtered.length}</small>
            </div>
          )}

          {!resourcesLoading && groups.length === 0 && (
            <ToolEmpty action={q || catLabel ? "Clear" : undefined} onAction={clear}>
              {q ? <>No resources match "{term}"{catLabel ? <> in {catLabel}</> : null}.</> : catLabel ? <>Nothing filed under {catLabel} yet.</> : "No resources in the directory yet."}
            </ToolEmpty>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
