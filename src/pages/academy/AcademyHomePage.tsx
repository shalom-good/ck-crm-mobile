import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Lock, Play, WhatsappLogo } from "@phosphor-icons/react";
import { LESSONS } from "@/lib/lessons";
import { useAuth } from "@/lib/auth";
import { fetchAcademyMe } from "@/lib/academyApi";
import { CountUp } from "@/components/gv";
import { FamBrand, NextCard, OBtn, Panel, Stepper } from "@/components/orchard/family/FamKit";
import { episodeFrame } from "@/pages/AcademyStartPage";

export const waLink = (n?: string | null) => (n ? `https://wa.me/${String(n).replace(/\D/g, "")}` : null);

/** A CK Academy couple's course: where they are, the next episode as the
 *  one lime card, every episode below (done, now, or locked), and their
 *  guidance counselor. */
export function AcademyHomePage() {
  const router = useIonRouter();
  const { family, signOut } = useAuth();
  const q = useQuery({ queryKey: ["academy-me"], queryFn: fetchAcademyMe, staleTime: 20_000, retry: 1 });
  const me = q.data;
  const current = Math.max(1, Number(me?.student.currentLesson) || 1);
  const finished = current > LESSONS.length || !!me?.student.completedAt;
  const done = finished ? LESSONS.length : current - 1;
  const now = finished ? null : LESSONS.find((l) => l.id === current) ?? null;
  const first = String(me?.student.name || family?.name || "").trim().split(/\s+/)[0] || "";
  const counselor = me?.student.counselor ?? (me?.student.counselorName ? { name: me.student.counselorName, whatsapp: null } : null);
  const wa = waLink(counselor?.whatsapp);
  const prog = me?.lessons.find((p) => p.n === current);
  const started = (prog?.watchSeconds ?? 0) > 30;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page ocf2-learn">
          <div className="ocf2-top"><FamBrand sub="CK Academy" /></div>
          <div style={{ padding: "0 4px" }}>
            <h1 className="ocf2-title">{first ? `Hi ${first}.` : "Your course."}</h1>
            <p className="ocf2-sub">{finished ? "You finished all eight. Beautifully done." : "Newlyweds Financial Mastery. One episode at a time."}</p>
          </div>

          {q.isError && !me ? (
            <Panel tone="butter" style={{ gap: 10 }}>
              <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 700 }}>We could not load your course just now.</p>
              <OBtn kind="light" onClick={() => void q.refetch()}>Try again</OBtn>
            </Panel>
          ) : (
            <>
              <Panel tone="lilac">
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <span className="ocf2-big-l" style={{ color: "#2D3766" }}>Episodes done</span>
                    <div className="ocf2-big" style={{ marginTop: 4, color: "#1F2752" }}><CountUp to={done} /><span style={{ fontSize: 18, letterSpacing: "-.01em", opacity: .6 }}> of {LESSONS.length}</span></div>
                  </div>
                  {finished && <span className="ocf2-chip ocf2-t-mint">Finished</span>}
                </div>
                <Stepper total={LESSONS.length} done={done} current={finished ? undefined : done} />
              </Panel>

              {now && (
                <NextCard kicker={`${started ? "Keep watching" : "Up next"} · Episode ${now.roman}`} title={now.title} body={now.blurb}>
                  <OBtn onClick={() => router.push(`/academy/lesson/${now.id}`)}><Play size={16} weight="fill" /> {started ? "Continue" : "Watch"} · {now.duration}</OBtn>
                </NextCard>
              )}

              <Panel style={{ padding: "6px 16px" }}>
                <div className="ocf2-rows">
                  {LESSONS.map((l) => {
                    const isDone = l.id <= done;
                    const isNow = now?.id === l.id;
                    const locked = !isDone && !isNow;
                    // Where this episode stands: watched, quick check, homework, code.
                    const lp = me?.lessons.find((p) => p.n === l.id);
                    const marks = isDone ? [true, true, true, true] : [
                      !!lp && !!lp.durationSeconds && lp.watchSeconds / lp.durationSeconds >= 0.9,
                      lp?.quizScore != null,
                      !!lp?.pdfConfirmed && (l.id !== 1 || !me?.steps || (me.steps.retirement.done && (me.steps.trump.done || me.steps.trump.available === false))),
                      false,
                    ];
                    const nextUp = ["Watch", "Quick check", "Homework", "Code"][marks.indexOf(false)] ?? "Done";
                    return (
                      <button type="button" key={l.id} className="ocf2-row" style={{ minHeight: 64, opacity: locked ? .62 : 1, cursor: locked ? "default" : "pointer" }} disabled={locked} aria-label={`Episode ${l.id}, ${l.title}${locked ? ", locked" : isDone ? ", done" : ""}`} onClick={() => router.push(`/academy/lesson/${l.id}`)}>
                        <img src={episodeFrame(l.id)} alt="" width={60} height={46} className="ocf2-thumb" loading="lazy" />
                        <span className="ocf2-row-t">
                          <b style={{ fontWeight: isDone ? 600 : 800, color: isDone ? "var(--oc-mid)" : "var(--oc-ink)" }}><span style={{ color: "#8A968F", marginRight: 6 }}>{l.roman}</span>{l.title}</b>
                          <small style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {l.duration}</small>
                          {isNow && <span className="oal-marks" aria-label={`Next here: ${nextUp}`}>{marks.map((on, k) => <i key={k} className={on ? "on" : ""} />)}<em>Next: {nextUp}</em></span>}
                        </span>
                        {isDone ? <span className="ocf2-tick is-done" style={{ width: 26, height: 26 }}><Check size={13} weight="bold" /></span>
                          : isNow ? <span className="ocf2-chip ocf2-t-lilac">Now</span>
                          : <span className="ocf2-ak-lock"><Lock size={13} weight="bold" /></span>}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {counselor && (
                <Panel tone="mint" style={{ gap: 8 }}>
                  <span className="ocf2-kicker">Your guidance counselor</span>
                  <p className="ocf2-p" style={{ color: "var(--oc-ink)", fontWeight: 800, fontSize: 16 }}>{counselor.name}</p>
                  <p className="ocf2-p">After each episode you do the quick check and the homework, then talk it through. They send the code that opens the next one.</p>
                  {wa && <OBtn kind="light" href={wa}><WhatsappLogo size={18} weight="fill" /> Message {counselor.name.split(" ")[0]}</OBtn>}
                </Panel>
              )}
            </>
          )}

          <button type="button" className="ocf2-link" style={{ alignSelf: "center", padding: 12, color: "var(--oc-mid)" }} onClick={() => router.push("/app-settings")}>Settings and feedback</button>
          <button type="button" className="ocf2-link" style={{ alignSelf: "center", padding: 12, color: "var(--oc-mid)" }} onClick={() => void signOut()}>Sign out</button>
        </div>
      </IonContent>
    </IonPage>
  );
}
