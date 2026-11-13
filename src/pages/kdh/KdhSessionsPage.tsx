import { Oil } from "@/components/orchard/Illos";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CaretRight, WhatsappLogo } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { openExternal } from "@/lib/external";
import { Loading, OBtn, Panel, SoftError } from "@/components/orchard/family/FamKit";
import { KDH_KEY, KdhBrand, fmtDay, useKdhHome } from "./kdhShared";

/** ORCHARD (2026-11-05): every call with the expert and how much of each
 *  homework set is done. A card opens that call's homework. */
export function KdhSessionsPage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const q = useKdhHome();
  const d = q.data;
  const sessions = d?.sessions || [];
  const first = d?.expert?.firstName || "your expert";
  const stepsDone = sessions.reduce((n, s) => n + s.doneCount, 0);
  const stillOpen = sessions.reduce((n, s) => n + (s.total - s.doneCount), 0);
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await qc.invalidateQueries({ queryKey: KDH_KEY }); e.detail.complete(); };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page">
          <div className="ocf2-top"><KdhBrand sub="Your sessions" /></div>
          <div>
            <h1 className="ocf2-title">Your sessions</h1>
            <p className="ocf2-sub">Every call with {first} and what came out of it.</p>
          </div>

          {q.isLoading ? <Loading /> : q.isError ? (
            <SoftError onRetry={() => void q.refetch()}>We could not load your sessions. Check your connection and try again.</SoftError>
          ) : (<>
            <div className="okh-tiles">
              <div className="ocf2-t-white"><b>{sessions.length}</b><span>Call{sessions.length === 1 ? "" : "s"}</span></div>
              <div className="ocf2-t-white"><b>{stepsDone}</b><span>Steps done</span></div>
              <div className="ocf2-t-butter"><b>{stillOpen}</b><span>Still open</span></div>
            </div>

            {sessions.length === 0 && (
              <Panel tone="mint" className="oil-stack">
                <Oil name="call" w={128} />
                <p className="ocf2-p">Your calls show up here once your expert sends homework. Nothing to do until then.</p>
              </Panel>
            )}

            {sessions.map((s, k) => {
              const all = s.total > 0 && s.doneCount === s.total;
              const left = s.total - s.doneCount;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`ocf2-panel ocf2-t-white okh-sess${k === 0 ? " is-latest" : ""}`}
                  onClick={() => router.push(k === 0 ? "/kdh/homework" : `/kdh/session/${s.id}`)}
                >
                  <div className="okh-sess-top">
                    <b>{fmtDay(s.date)}{s.steps[0]?.title ? ` · ${s.steps[0].title}` : ""}</b>
                    <span className={`okh-pill ${k === 0 ? "is-lime" : all ? "is-ok" : "is-warn"}`}>
                      {k === 0 ? "This week" : all ? "All done" : `${left} left`}
                    </span>
                  </div>
                  <div className="okh-track" aria-hidden>{s.steps.map((st, j) => <i key={j} className={st.done ? "done" : ""} />)}</div>
                  <div className="okh-sess-foot"><span>{s.doneCount} of {s.total} done</span><CaretRight size={16} weight="bold" /></div>
                </button>
              );
            })}

            {d?.expert?.whatsapp && (
              <OBtn kind="light" block onClick={() => void openExternal(d.expert!.whatsapp!)}><WhatsappLogo size={18} weight="bold" />WhatsApp {first}</OBtn>
            )}
          </>)}

          <button type="button" className="ocf2-link" style={{ alignSelf: "center", padding: 12 }} onClick={() => void signOut()}>Sign out</button>
        </div>
      </IonContent>
    </IonPage>
  );
}
