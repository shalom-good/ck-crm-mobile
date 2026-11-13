import { Oil } from "@/components/orchard/Illos";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { TalkFoot } from "@/components/orchard/family/TalkFoot";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Lock, Play } from "@phosphor-icons/react";
import { LESSONS, lessonImage } from "@/lib/lessons";
import { fetchAcademyJoin, fetchAcademyProgress } from "@/lib/portalApi";
import { CounselorCard, JoinCard, JOIN_KEY, StepsSummary } from "@/components/orchard/family/AcademyJoin";
import { CountUp } from "@/components/gv";
import { AcademyReel } from "@/components/orchard/AcademyReel";
import { FamHead, NextCard, OBtn, Panel, Stepper } from "@/components/orchard/family/FamKit";

/** CK Academy: the eight-episode course, with progress from the portal.
 *  ORCHARD (2026-11-05): a lilac progress card, the next episode as the one
 *  lime card, then every episode in a white list.
 *  2026-11-11: a family joins CK Academy first (one agreement, which makes
 *  their Academy student); until then the episodes are locked. Joined
 *  families get their guidance counselor and the Episode I steps. While the
 *  CRM does not have the join route yet, the tab works as it did before.
 *  Same day: the course preview plays at the top until they have watched
 *  an episode, and the next episode shows its own frame to tap. */
export function FamilyLearnPage() {
  const router = useIonRouter();
  const q = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 30_000, retry: 1 });
  const watched = q.data?.watched ?? [];
  const nextUp = LESSONS.find((l) => !watched.includes(l.id)) ?? null;
  const jq = useQuery({ queryKey: JOIN_KEY, queryFn: fetchAcademyJoin, staleTime: 30_000, retry: 1 });
  const join = jq.data;
  // Locked only when we know they have not joined. A failed read never locks.
  const locked = !!join && join.live && !join.joined;
  const member = !!join && join.live && join.joined;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page ocf2-learn">
          <FamHead before={<img src="/logos/cka.png" alt="CK Academy by Collective Kindness" className="ocf2-learn-logo" />} title="Money that lasts" sub="Eight short episodes, about an hour all together. Watch at your own pace." />

          {(locked || (!q.isLoading && watched.length === 0)) && <AcademyReel className="gv-rise" />}

          {locked && join && <JoinCard join={join} />}

          <Panel tone="lilac">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
              <div>
                <span className="ocf2-big-l" style={{ color: "#2D3766" }}>Watched</span>
                <div className="ocf2-big" style={{ marginTop: 4, color: "#1F2752" }}><CountUp to={watched.length} /><span style={{ fontSize: 18, letterSpacing: "-.01em", opacity: .6 }}> of {LESSONS.length}</span></div>
              </div>
              {q.data?.allDone && <span className="ocf2-chip ocf2-t-mint">Finished</span>}
            </div>
            <Stepper total={LESSONS.length} done={watched.length} current={watched.length < LESSONS.length ? watched.length : undefined} />
          </Panel>

          {member && join && <CounselorCard join={join} />}

          {!locked && nextUp && (
            <NextCard kicker={`Next up · Episode ${nextUp.roman}`} title={nextUp.title} body={nextUp.blurb} cornerArt={locked ? undefined : <Oil name="book" w={84} corner className="oil-drop" />}
              art={
                <button type="button" className="olc-preview" aria-label={`Watch episode ${nextUp.roman}, ${nextUp.title}`} onClick={() => router.push(`/fam/learn/${nextUp.id}`)}>
                  <img src={`/academy/ep${nextUp.id}.webp`} alt="" loading="lazy" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                  <span className="olc-preview-play" aria-hidden><Play size={20} weight="fill" /></span>
                  <span className="olc-preview-len">{nextUp.duration}</span>
                </button>
              }>
              <OBtn onClick={() => router.push(`/fam/learn/${nextUp.id}`)}><Play size={16} weight="fill" /> Watch · {nextUp.duration}</OBtn>
            </NextCard>
          )}

          {member && join && <StepsSummary join={join} watchedOne={watched.includes(1)} onOpen={() => router.push("/fam/learn/1")} />}

          <Panel style={{ padding: "6px 16px" }}>
            <div className="ocf2-rows">
              {LESSONS.map((l) => {
                const done = watched.includes(l.id);
                const next = nextUp?.id === l.id;
                return (
                  <button type="button" key={l.id} className={`ocf2-row${locked ? " olc-dim" : ""}`} style={{ minHeight: 64 }} disabled={locked} aria-label={locked ? `Episode ${l.roman}, ${l.title}. Join CK Academy to open.` : undefined} onClick={() => router.push(`/fam/learn/${l.id}`)}>
                    <img src={lessonImage(l)} alt="" width={60} height={46} className="ocf2-thumb" loading="lazy" />
                    <span className="ocf2-row-t">
                      <b style={{ fontWeight: done ? 600 : 800, color: done ? "var(--oc-mid)" : "var(--oc-ink)" }}><span style={{ color: "#8A968F", marginRight: 6 }}>{l.roman}</span>{l.title}</b>
                      <small style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {l.duration}</small>
                    </span>
                    {locked ? <span className="olc-rowlock" aria-hidden><Lock size={13} weight="bold" /></span> : done ? <span className="ocf2-tick is-done" style={{ width: 26, height: 26 }} aria-label="Watched"><Check size={13} weight="bold" /></span> : next ? <span className="ocf2-chip ocf2-t-lilac">Next</span> : null}
                  </button>
                );
              })}
            </div>
          </Panel>
          <TalkFoot />
        </div>
      </IonContent>
    </IonPage>
  );
}
