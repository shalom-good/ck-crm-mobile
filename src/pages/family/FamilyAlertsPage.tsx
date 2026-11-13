import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { CaretRight, ArrowSquareOut, Bank, CalendarBlank, ChatCircleText, Info, ListChecks, PenNib, PlayCircle } from "@phosphor-icons/react";
import { useFamilyAlerts, type FamilyAlert } from "@/lib/familyAlerts";
import { Oil } from "@/components/orchard/Illos";
import { Panel, SectionHead, SoftError, type Tone } from "@/components/orchard/family/FamKit";

/** Alerts — what needs the family now, soon, and for later. Each row goes
 *  where it is handled (a tab in the app or the booking / join link).
 *  Opening the screen marks everything seen (the bell badge clears); rows
 *  that were new when it opened keep a lime "New" tag for the visit.
 *  ORCHARD (2026-11-05): white rows with a pastel icon tile, no status dots. */
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
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/fam/home" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={async (e: CustomEvent<RefresherEventDetail>) => { refetch(); setTimeout(() => e.detail.complete(), 700); }}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 120 }}>
          <div className="ocf2-head">
            <div style={{ minWidth: 0 }}>
              <h1 className="ocf2-title">Alerts</h1>
              <p className="ocf2-sub">
                {loading ? "Looking." : needs === 0 ? "Nothing is waiting on you. You are doing fine." : needs === 1 ? "One small thing when you have a minute." : `${needs} small things. One at a time is plenty.`}
              </p>
            </div>
            {needs > 0 && <span className="ocf2-chip ocf2-t-lime" style={{ marginTop: 6, fontSize: 14, padding: "6px 12px" }}>{needs}</span>}
          </div>

          {error && <SoftError onRetry={refetch}>We couldn't check just now.</SoftError>}

          {!loading && alerts.length === 0 && (
            <Panel tone="mint" className="oil-stack">
              <Oil name="kite" w={150} />
              <p className="ocf2-p" style={{ color: "#276449" }}>All clear. Enjoy it. When there is a meeting, homework or something to sign, it shows up here.</p>
            </Panel>
          )}

          {groups.map((g) => {
            const rows = alerts.filter((a) => a.level === g.key);
            if (!rows.length) return null;
            return (
              <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionHead aux={String(rows.length)}>{g.label}</SectionHead>
                <div style={{ height: 2 }} />
                {rows.map((a) => {
                  const external = !!a.href && a.key !== "book" && !a.to.startsWith("/fam/meetings");
                  return (
                    <button type="button" key={a.key} className="ocf2-alert" onClick={() => open(a)}>
                      <span className={`ocf2-ico ocf2-t-${TONE[a.tint] ?? "mint"}`}>{iconFor(a)}</span>
                      <span className="ocf2-row-t">
                        <b>{fresh?.has(a.key) && <span className="ocf2-new">New</span>}{a.title}</b>
                        {a.sub && <small>{a.sub}</small>}
                      </span>
                      {external ? <ArrowSquareOut size={16} color="#5B6B62" /> : <CaretRight size={16} weight="bold" color="#5B6B62" />}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <p className="ocf2-meta" style={{ textAlign: "center", marginTop: 6 }}>Alerts come from your plan, meetings, homework and budget. Pull down to refresh.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Pastel per alert tint. Rose (an interview to book, a bank to reconnect)
 *  reads as warm peach; nothing here is red. */
const TONE: Partial<Record<string, Tone>> = { rose: "peach", sky: "sky", lime: "lime", mint: "mint", yellow: "butter", lavender: "lilac" };

function iconFor(a: FamilyAlert) {
  const p = { size: 19, weight: "bold" as const };
  if (a.key === "gate" || a.key === "book" || a.key.startsWith("meet-") || a.key === "meetcm") return <CalendarBlank {...p} />;
  if (a.key === "sign") return <PenNib {...p} />;
  if (a.key === "hw") return <ListChecks {...p} />;
  if (a.key === "review") return <ChatCircleText {...p} />;
  if (a.key === "bank") return <Bank {...p} />;
  if (a.key === "learn") return <PlayCircle {...p} />;
  return <Info {...p} />;
}
