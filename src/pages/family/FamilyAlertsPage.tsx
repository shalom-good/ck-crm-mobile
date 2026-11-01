import { useEffect, useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { CaretRight, ArrowSquareOut } from "@phosphor-icons/react";
import { useFamilyAlerts, type FamilyAlert } from "@/lib/familyAlerts";
import { Btn, Card, Eyebrow, Pill, PlantArt } from "@/components/gv";

/** Alerts — what needs the family now, soon, and for later. Each row goes
 *  where it is handled (a tab in the app or the booking / join link).
 *  Opening the screen marks everything seen (the bell badge clears); rows
 *  that were new when it opened keep a coral dot for the visit. */
export function FamilyAlertsPage() {
  const router = useIonRouter();
  const { alerts, loading, error, refetch, seenLoaded, markAllSeen } = useFamilyAlerts();

  // The unseen set is fixed when the screen opens (and only grows when a
  // later payload adds a new row), so dots never flicker as rows get marked.
  const [fresh, setFresh] = useState<ReadonlySet<string> | null>(null);
  const unseenRef = useRef<string[]>([]);
  unseenRef.current = alerts.filter((a) => !a.seen).map((a) => a.key);
  const unseenSig = unseenRef.current.join("\u0000");
  useEffect(() => {
    if (loading || !seenLoaded) return;
    const unseen = unseenRef.current;
    setFresh((prev) => {
      const next = new Set(prev ?? []);
      let grew = false;
      for (const k of unseen) if (!next.has(k)) { next.add(k); grew = true; }
      return prev && !grew ? prev : next;
    });
    void markAllSeen();
  }, [loading, seenLoaded, unseenSig, markAllSeen]);

  // The headline counts everything that asks for an action (seen or not);
  // the bell's unseen count is a different question.
  const needs = alerts.filter((a) => a.level !== "fyi").length;

  const groups: { key: FamilyAlert["level"]; label: string }[] = [
    { key: "now", label: "Needs you now" },
    { key: "soon", label: "Coming up" },
    { key: "fyi", label: "Good to know" },
  ];
  const open = (a: FamilyAlert) => {
    if (a.href && !a.to.startsWith("/fam/meetings") && a.key !== "book") { window.open(a.href, "_blank"); return; }
    router.push(a.to);
  };
  let i = 1;
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/fam/home" text="" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={async (e: CustomEvent<RefresherEventDetail>) => { refetch(); setTimeout(() => e.detail.complete(), 700); }}><IonRefresherContent /></IonRefresher>
        <div style={{ padding: "0 16px 120px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 className="gv-h1 gv-rise">Alerts</h1>
              <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>
                {loading ? "Looking…" : needs === 0 ? "Nothing is waiting on you. Keep going." : needs === 1 ? "One thing needs you." : `${needs} things need you.`}
              </p>
            </div>
            {needs > 0 && <Pill tint="lime" i={0} style={{ marginTop: 6 }}>{needs}</Pill>}
          </div>

          {error && <Card i={i++} style={{ marginTop: 16 }}><p className="gv-sub">We couldn't check just now.</p><div style={{ marginTop: 12 }}><Btn sm ghost onClick={refetch}>Try again</Btn></div></Card>}

          {!loading && alerts.length === 0 && (
            <Card i={i++} style={{ marginTop: 16, textAlign: "center" }}>
              <PlantArt width={130} />
              <p className="gv-sub" style={{ marginTop: 4 }}>All clear. We will show meetings, homework and anything to sign here.</p>
            </Card>
          )}

          {groups.map((g) => {
            const rows = alerts.filter((a) => a.level === g.key);
            if (!rows.length) return null;
            return (
              <div key={g.key}>
                <Eyebrow>{g.label}</Eyebrow>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rows.map((a) => (
                    <Card key={a.key} i={i++} onClick={() => open(a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(--gv-${a.tint === "lime" ? "lime" : a.tint})`, boxShadow: a.tint === "lime" ? "0 0 0 4px var(--gv-lime-soft)" : "none", flex: "none" }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--gv-ink)", lineHeight: 1.3 }}>
                          {fresh?.has(a.key) && <span role="img" aria-label="New" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--gv-coral)", marginRight: 7, verticalAlign: "middle", position: "relative", top: -1 }} />}
                          {a.title}
                        </b>
                        {a.sub && <span style={{ display: "block", fontSize: 12.5, color: "var(--gv-mid)", marginTop: 2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.sub}</span>}
                      </span>
                      {a.href && a.key !== "book" && !a.to.startsWith("/fam/meetings") ? <ArrowSquareOut size={16} color="var(--gv-quiet)" /> : <CaretRight size={16} weight="bold" color="var(--gv-quiet)" />}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          <p className="gv-meta" style={{ textAlign: "center", marginTop: 22, lineHeight: 1.5 }}>Alerts come from your plan, meetings, homework and budget. Pull down to refresh.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
