import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CaretRight } from "@phosphor-icons/react";
import { LESSONS, lessonEmbed } from "@/lib/lessons";
import { fetchAcademyJoin, fetchAcademyProgress, markLessonWatched } from "@/lib/portalApi";
import { JOIN_KEY, LessonOneSteps, LockedNote } from "@/components/orchard/family/AcademyJoin";
import { useUI } from "@/lib/ui";
import { OBtn, Panel } from "@/components/orchard/family/FamKit";

/** One episode: the video, the idea, a three-question check, "I watched this". */
export function FamilyLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const qc = useQueryClient();
  const { showToast } = useUI();
  const lesson = LESSONS.find((l) => l.id === Number(id)) ?? LESSONS[0];
  const next = LESSONS.find((l) => l.id === lesson.id + 1) ?? null;
  const q = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 30_000, retry: 1 });
  const done = (q.data?.watched ?? []).includes(lesson.id);
  const jq = useQuery({ queryKey: JOIN_KEY, queryFn: fetchAcademyJoin, staleTime: 30_000, retry: 1 });
  const join = jq.data;
  const locked = !!join && join.live && !join.joined;
  const member = !!join && join.live && join.joined;
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const mark = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      const p = await markLessonWatched(lesson.id);
      qc.setQueryData(["academy"], p);
      showToast(p.allDone ? "That was the whole course. Beautifully done." : "Marked as watched");
    } catch { showToast("Could not save that. Try again."); }
    finally { setBusy(false); }
  };

  const correct = lesson.quiz.filter((qz, k) => picked[k] === qz.answer).length;
  const answered = Object.keys(picked).length;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/fam/learn" /></IonButtons>
          <span className="ocf2-kicker" style={{ paddingLeft: 4, color: "var(--oc-mid)", opacity: 1 }}>Episode {lesson.roman} of {LESSONS.length}</span>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        {locked ? (
        <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 120 }}>
          <h1 className="ocf2-title" style={{ fontSize: 26 }}>{lesson.title}</h1>
          <LockedNote onBack={() => router.push("/fam/learn", "back", "pop")} />
        </div>
        ) : (
        <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 120 }}>
          <div className="ocf2-video gv-rise">
            <iframe src={lessonEmbed(lesson)} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <h1 className="ocf2-title" style={{ fontSize: 26 }}>{lesson.title}</h1>
              {done && <span className="ocf2-chip ocf2-t-mint" style={{ marginTop: 4 }}><Check size={12} weight="bold" /> Watched</span>}
            </div>
            <p className="ocf2-meta" style={{ marginTop: 6 }}>{lesson.duration}</p>
          </div>
          <p className="ocf2-p" style={{ color: "var(--oc-ink)", fontWeight: 700, fontSize: 15 }}>{lesson.blurb}</p>
          {lesson.body && <p className="ocf2-p" style={{ marginTop: -4 }}>{lesson.body}</p>}

          {lesson.inspiration && (
            <Panel tone="butter" style={{ gap: 6 }}>
              <span className="ocf2-kicker">You leave with</span>
              <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 600 }}>{lesson.inspiration}</p>
            </Panel>
          )}

          {lesson.quiz.length > 0 && (
            <Panel>
              <div className="ocf2-panel-h">
                <h3>Quick check</h3>
                {answered === lesson.quiz.length && <span className={`ocf2-chip ocf2-t-${correct === lesson.quiz.length ? "mint" : "butter"}`}>{correct} of {lesson.quiz.length}</span>}
              </div>
              {lesson.quiz.map((qz, k) => (
                <div key={k} style={{ paddingTop: k === 0 ? 0 : 14, borderTop: k === 0 ? 0 : "1px solid var(--oc-hair)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--oc-ink)", lineHeight: 1.4 }}>{qz.prompt}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {qz.choices.map((c, ci) => {
                      const chosen = picked[k] === ci;
                      const reveal = picked[k] != null;
                      const right = ci === qz.answer;
                      const cls = reveal && right ? " is-right" : reveal && chosen && !right ? " is-wrong" : "";
                      return (
                        <button type="button" key={ci} className={`ocf2-choice${cls}`} aria-pressed={chosen} onClick={() => setPicked((p) => (p[k] != null ? p : { ...p, [k]: ci }))} style={{ cursor: reveal ? "default" : "pointer" }}>
                          {reveal && right && <Check size={16} weight="bold" style={{ flex: "none", marginTop: 1 }} />}
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Panel>
          )}

          {lesson.id === 1 && member && join && <LessonOneSteps join={join} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!done && <OBtn block disabled={busy} onClick={() => void mark()} style={{ minHeight: 54 }}>{busy ? "Saving…" : "I watched this"}</OBtn>}
            {next && <OBtn block kind={done ? "lime" : "light"} onClick={() => router.push(`/fam/learn/${next.id}`, "forward", "replace")}>Next: {next.title} <CaretRight size={16} weight="bold" /></OBtn>}
          </div>
        </div>
        )}
      </IonContent>
    </IonPage>
  );
}
