import { Oil } from "@/components/orchard/Illos";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { TalkFoot } from "@/components/orchard/family/TalkFoot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowSquareOut, CaretRight, FileText } from "@phosphor-icons/react";
import { fetchPortalHome } from "@/lib/portalApi";
import { openExternal } from "@/lib/external";
import { FamHead, Loading, Panel, SoftError } from "@/components/orchard/family/FamKit";

/**
 * Docs (Leivi 2026-11-11: "its own tab"): the family's documents in one
 * place. Same /api/portal/me payload as Home, so nothing new is fetched.
 */
type Raw = Record<string, any>;

export function FamilyDocsPage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  // The success plan opens right here on the Plan tab: it always works, and
  // the web link needs a browser sign-in the app session does not carry
  // (Shalom 2026-11-11: "and this should work").
  const open = (doc: Raw) => { if (doc.kind === "plan") router.push("/fam/plan"); else void openExternal(String(doc.url)); };
  const q = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await qc.invalidateQueries({ queryKey: ["portalHome"] }); e.detail.complete(); };
  const docs: Raw[] = Array.isArray((q.data as Raw | undefined)?.documents) ? (q.data as Raw).documents : [];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page">
          <FamHead title="Your documents" art={docs.length > 0 ? <Oil name="folder" w={70} className="oil-drop" /> : undefined} sub={q.isLoading ? "Opening your documents." : docs.length ? "Everything your team has shared with you." : "Nothing here yet."} />
          {q.isLoading && <Loading />}
          {q.isError && !q.data && <SoftError onRetry={() => q.refetch()}>We couldn't open your documents just now.</SoftError>}
          {q.data && docs.length === 0 && (
            <Panel tone="mint" style={{ alignItems: "center", textAlign: "center" }}><Oil name="folder" w={128} /><p className="ocf2-p" style={{ color: "#276449", margin: 0 }}>Your plan and anything your team shares will show up here.</p></Panel>
          )}
          {docs.length > 0 && (
            <Panel>
              <div className="ocf2-rows">
                {docs.map((doc, k) => (
                  <button type="button" key={k} className="ocf2-row" style={{ minHeight: 60 }} onClick={() => open(doc)}>
                    <span className={`ocf2-ico ocf2-t-${doc.kind === "plan" ? "mint" : "sky"}`}><FileText size={19} weight="bold" /></span>
                    <span className="ocf2-row-t"><b>{doc.label}</b><small>{doc.kind === "plan" ? "Opens your plan, right here" : "Opens in your browser"}</small></span>
                    {doc.kind === "plan" ? <CaretRight size={16} weight="bold" color="#5B6B62" /> : <ArrowSquareOut size={16} color="#5B6B62" />}
                  </button>
                ))}
              </div>
            </Panel>
          )}
          <TalkFoot />
        </div>
      </IonContent>
    </IonPage>
  );
}
