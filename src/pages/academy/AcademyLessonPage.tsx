import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CaretRight, Check, DownloadSimple, Lock, WhatsappLogo } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { OBtn, Panel } from "@/components/orchard/family/FamKit";
import { LESSONS, lessonEmbed } from "@/lib/lessons";
import { ACADEMY_URL, isNativeShell } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import { useUI } from "@/lib/ui";
import { ACADEMY_DEMO_UNLOCK, academyUnlock, fetchAcademyMe, isAcademyDemo, postAcademyProgress, saveAcademyStep, type AcademyMe, type AcademyStepInput } from "@/lib/academyApi";
import { ACADEMY_COACH, LESSON_EXTRAS } from "@/lib/academyExtras";
import { waLink } from "./AcademyHomePage";
import { CodeCells, Fold, FurtherStudy, MoneySteps, Part, QuickCheck, Trail, type PartState } from "./LessonParts";

const VIMEO = "https://player.vimeo.com";
// The same two links the website's completion page gives a finished couple.
const ALUMNI_GROUP = "https://chat.whatsapp.com/ETRexvkIe2hHj9CSGEkFyC";
const SURVEY_URL = "https://crm.collectivekindness.net/academy-survey";
const WATCHED_AT = 0.9; // same bar as the website: 90% of the video

/**
 * One episode for a signed-in Academy couple, as the whole loop the
 * website runs (Shalom 2026-11-11: "make it like the full ck academy
 * experience"; Leivi: "missing the homework and Qs and place for next
 * code"). Everything is on the page from the start, as a checklist:
 *
 *   watch            the app keeps the watch time; 90% counts, as on the site
 *   1 quick check    the lesson's three questions; the first try is saved
 *   2 do it together the worksheet, and on Episode I the two real steps
 *                    (retirement account, Trump Account); the optional call
 *                    with the course coach; further study
 *   3 the code       the counselor's six characters open the next episode;
 *                    on the last one they finish the course
 *
 * A part that is waiting on the one before it says so instead of hiding.
 * Episode 1 is free; an unpaid couple meets the one-time enrollment step
 * there instead of the code.
 */
export function AcademyLessonPage() {
  const { n } = useParams<{ n: string }>();
  const router = useIonRouter();
  const qc = useQueryClient();
  const { showToast } = useUI();
  const lesson = LESSONS.find((l) => l.id === Number(n)) ?? LESSONS[0];
  const next = LESSONS.find((l) => l.id === lesson.id + 1) ?? null;
  const q = useQuery({ queryKey: ["academy-me"], queryFn: fetchAcademyMe, staleTime: 20_000, retry: 1 });
  const me = q.data;
  const current = Math.max(1, Number(me?.student.currentLesson) || 1);
  const locked = !!me && lesson.id > current;
  const isDone = !!me && lesson.id < current;
  const prog = me?.lessons.find((p) => p.n === lesson.id);
  const paywalled = lesson.id === 1 && !!me && me.student.paid === false;

  // ── watch time, from the Vimeo player's own events ──
  const frame = useRef<HTMLIFrameElement>(null);
  const seen = useRef({ seconds: 0, duration: 0, sent: 0 });
  const [local, setLocal] = useState({ seconds: 0, duration: 0 });

  const patch = useCallback((fn: (p: NonNullable<AcademyMe["lessons"][number]>) => void) => {
    qc.setQueryData<AcademyMe>(["academy-me"], (old) => {
      if (!old) return old;
      const lessons = old.lessons.some((p) => p.n === lesson.id) ? old.lessons : [...old.lessons, { n: lesson.id, watchSeconds: 0, durationSeconds: null, quizScore: null, quizTotal: null, pdfConfirmed: false, codeIssued: false, completedAt: null }];
      return { ...old, lessons: lessons.map((p) => { if (p.n !== lesson.id) return p; const c = { ...p }; fn(c); return c; }) };
    });
  }, [qc, lesson.id]);

  const beat = useCallback(async () => {
    const s = seen.current;
    const secs = Math.floor(s.seconds);
    if (!me || locked || secs <= s.sent || secs < 3) return;
    s.sent = secs;
    try {
      const snap = await postAcademyProgress({ action: "heartbeat", lesson: lesson.id, watchSeconds: secs, duration: Math.floor(s.duration) });
      patch((p) => { p.watchSeconds = snap.watchSeconds; p.durationSeconds = snap.videoDurationSeconds; });
    } catch { s.sent = 0; /* the next beat carries the full time again */ }
  }, [me, locked, lesson.id, patch]);

  useEffect(() => {
    seen.current = { seconds: 0, duration: 0, sent: 0 };
    setLocal({ seconds: 0, duration: 0 });
  }, [lesson.id]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== VIMEO || e.source !== frame.current?.contentWindow) return;
      let d: any = e.data;
      if (typeof d === "string") { try { d = JSON.parse(d); } catch { return; } }
      const post = (method: string, value: string) => frame.current?.contentWindow?.postMessage(JSON.stringify({ method, value }), VIMEO);
      if (d?.event === "ready") { post("addEventListener", "timeupdate"); post("addEventListener", "ended"); post("addEventListener", "pause"); return; }
      if (d?.event === "timeupdate" && d.data) {
        const s = seen.current;
        s.duration = Number(d.data.duration) || s.duration;
        // Only steady watching counts: a jump ahead of more than a few
        // seconds (a scrub) does not add to the furthest point reached.
        const t = Number(d.data.seconds) || 0;
        if (t > s.seconds && t - s.seconds < 4) s.seconds = t;
        else if (s.seconds === 0 && t < 4) s.seconds = t;
        if (Math.abs(s.seconds - local.seconds) >= 5 || s.duration !== local.duration) setLocal({ seconds: s.seconds, duration: s.duration });
      }
      if (d?.event === "ended" || d?.event === "pause") void beat();
    };
    window.addEventListener("message", onMsg);
    const iv = window.setInterval(() => void beat(), 15_000);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(iv); void beat(); };
  }, [beat, local.seconds, local.duration]);

  const duration = local.duration || prog?.durationSeconds || 0;
  const watchedSecs = Math.max(local.seconds, prog?.watchSeconds ?? 0);
  const pct = duration > 0 ? Math.min(1, watchedSecs / duration) : 0;
  const watched = isDone || pct >= WATCHED_AT;

  // ── the check (the first try is the one that is saved) ──
  const [busy, setBusy] = useState<string | null>(null);
  const quizDone = isDone || prog?.quizScore != null;
  useEffect(() => { setCode(""); setErr(null); }, [lesson.id]);

  const submitQuiz = async (answers: number[]) => {
    if (busy) return false;
    setBusy("quiz");
    try {
      const snap = await postAcademyProgress({ action: "quiz", lesson: lesson.id, answers });
      patch((p) => { p.quizScore = snap.quizScore; p.quizTotal = snap.quizTotal; p.codeIssued = snap.codeIssued; });
      return true;
    } catch { showToast("Could not save your answers. Try again."); return false; }
    finally { setBusy(null); }
  };

  const confirmSheet = async () => {
    if (busy || prog?.pdfConfirmed) return;
    setBusy("pdf");
    try {
      const snap = await postAcademyProgress({ action: "pdf", lesson: lesson.id });
      patch((p) => { p.pdfConfirmed = snap.pdfConfirmed; p.codeIssued = snap.codeIssued; });
    } catch { showToast("Could not save that. Try again."); }
    finally { setBusy(null); }
  };

  // ── the counselor's code ──
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const redeem = async () => {
    if (busy || code.length !== 6) return;
    setBusy("code"); setErr(null);
    try {
      const r = await academyUnlock(lesson.id, code);
      if (!r.ok) { setErr((r as { reason?: string }).reason === "lesson1_steps" ? "Finish the two Episode I steps first." : "That code does not match this episode. Check the message from your counselor."); return; }
      // Stay on the page: the card turns to "open" and offers the next episode
      // (or, on the last one, the finish card shows).
      await qc.invalidateQueries({ queryKey: ["academy-me"] });
      setCode("");
      showToast(r.done || !next ? "That was the whole course. Beautifully done." : `Episode ${next.roman} is open`);
    } catch { setErr("Could not check the code. Try again."); }
    finally { setBusy(null); }
  };

  const counselor = me?.student.counselor ?? null;
  const wa = waLink(counselor?.whatsapp);
  const counselorFirst = counselor?.name ? counselor.name.split(" ")[0] : "your guidance counselor";
  const extras = LESSON_EXTRAS[lesson.id];
  const embed = `${lessonEmbed(lesson)}&api=1&playsinline=1`;

  // Lesson I: the two real steps. Left out where the server does not send them yet.
  const steps = lesson.id === 1 ? me?.steps ?? null : null;
  const stepsDone = !steps || (steps.retirement.done && (steps.trump.done || steps.trump.available === false));
  const saveStep = async (body: AcademyStepInput) => {
    try {
      const r = await saveAcademyStep(body);
      qc.setQueryData<AcademyMe>(["academy-me"], (old) => (old ? { ...old, steps: r.steps, coach: r.coach ?? old.coach } : old));
      return true;
    } catch { return false; }
  };

  // The optional call with the course coach (on the coach lesson the code waits for it where the CRM tracks it).
  const coach = me?.coach ?? null;
  const bookUrl = coach?.bookingUrl || ACADEMY_COACH.bookingUrl;
  const coachFirst = coach?.firstName || ACADEMY_COACH.firstName;
  const coachHere = !!extras?.coachWhy;
  const coachWaits = coachHere && !!coach?.gates && coach.lesson === lesson.id && !coach.metAt;

  const sheetDone = !!prog?.pdfConfirmed || isDone;
  const togetherDone = isDone || (sheetDone && stepsDone);
  const quizState: PartState = quizDone ? "done" : watched ? "now" : "wait";
  const togetherState: PartState = togetherDone ? "done" : watched && quizDone ? "now" : "wait";
  const codeState: PartState = isDone ? "done" : togetherDone && watched && quizDone ? "now" : "wait";
  const finishedCourse = !next && isDone;
  const nextName = next ? `Episode ${next.roman}` : "the course";

  // Sample course only: nobody should have to sit through nine minutes to see the rest.
  const sampleWatch = async () => {
    try {
      const snap = await postAcademyProgress({ action: "heartbeat", lesson: lesson.id, watchSeconds: 600, duration: 600 });
      patch((p) => { p.watchSeconds = snap.watchSeconds; p.durationSeconds = snap.videoDurationSeconds; });
    } catch { /* noop */ }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/academy" /></IonButtons>
          <span className="ocf2-kicker" style={{ paddingLeft: 4, color: "var(--oc-mid)", opacity: 1 }}>Episode {lesson.roman} of {LESSONS.length}</span>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door oal" style={{ paddingBottom: 120 }}>
          {locked ? (
            <Panel tone="butter" style={{ gap: 10, alignItems: "flex-start" }}>
              <span className="ocf2-ak-lock" style={{ background: "#fff" }}><Lock size={14} weight="bold" /></span>
              <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 700 }}>Episode {lesson.roman} opens when you finish Episode {LESSONS[current - 1]?.roman ?? current} and enter your counselor's code.</p>
              <OBtn kind="light" onClick={() => router.push(`/academy/lesson/${current}`, "back", "replace")}>Go to Episode {LESSONS[current - 1]?.roman ?? current}</OBtn>
            </Panel>
          ) : (
            <>
              <div className="ocf2-video gv-rise">
                <iframe ref={frame} src={embed} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
              {!isDone && (
                <div aria-label={`${Math.round(pct * 100)} percent watched`} style={{ margin: "-4px 4px 0" }}>
                  <div className="ocf2-ak-prog"><i style={{ width: `${Math.round((watched ? 1 : pct / WATCHED_AT) * 100)}%` }} /></div>
                </div>
              )}

              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <h1 className="ocf2-title" style={{ fontSize: 26 }}>{lesson.title}</h1>
                  {isDone ? <span className="ocf2-chip ocf2-t-mint" style={{ marginTop: 4 }}><Check size={12} weight="bold" /> Done</span>
                    : watched ? <span className="ocf2-chip ocf2-t-mint" style={{ marginTop: 4 }}><Check size={12} weight="bold" /> Watched</span> : null}
                </div>
                <p className="ocf2-meta" style={{ marginTop: 6 }}>{lesson.duration}</p>
              </div>
              <p className="ocf2-p" style={{ color: "var(--oc-ink)", fontWeight: 700, fontSize: 15 }}>{lesson.blurb}</p>

              <Trail items={[
                { id: "oal-watch", label: "Watch", state: watched ? "done" : "now" },
                { id: "oal-check", label: "Quick check", state: quizState },
                { id: "oal-together", label: "Together", state: togetherState },
                { id: "oal-code", label: next ? "Code" : "Finish", state: codeState },
              ]} />

              <div id="oal-watch" className={`oal-watch${watched ? " is-done" : ""}`}>
                <span className="ocf2-kicker">{isDone ? "Done" : watched ? "Watched" : "First, the video"}</span>
                <p>{isDone ? "You finished this episode. Everything below stays here to look back on." : watched ? "The three parts below are yours now. Take them in order." : `Watch it through together. Then the quick check opens, then the homework, then the code for ${nextName}.`}</p>
                {!watched && isAcademyDemo() && <button type="button" className="oal-link" onClick={() => void sampleWatch()}>Sample course: mark the video watched</button>}
              </div>

              {extras?.quote && watched && (
                <figure className="oal-quote">
                  <blockquote>{extras.quote.text}</blockquote>
                  <figcaption>{extras.quote.author}{extras.quote.source ? `, ${extras.quote.source}` : ""}</figcaption>
                </figure>
              )}

              {lesson.quiz.length > 0 && (
                <Part id="oal-check" n={1} title="Quick check" state={quizState}
                  chip={prog?.quizScore != null ? <span className={`ocf2-chip ocf2-t-${prog.quizScore === (prog.quizTotal ?? lesson.quiz.length) ? "mint" : "butter"}`}>{prog.quizScore} of {prog.quizTotal ?? lesson.quiz.length}</span> : <span className="oal-count">{lesson.quiz.length} questions</span>}
                  waitLine={`${lesson.quiz.length === 3 ? "Three" : lesson.quiz.length} questions on what you just heard. They open when the video is done.`}>
                  <QuickCheck key={lesson.id} quiz={lesson.quiz} explain={extras?.explain ?? []} busy={busy === "quiz"}
                    saved={prog?.quizScore != null ? { score: prog.quizScore, total: prog.quizTotal ?? lesson.quiz.length } : null}
                    onSubmit={submitQuiz} />
                </Part>
              )}

              <Part id="oal-together" n={2} title="Do this together" state={togetherState}
                chip={togetherDone ? undefined : <span className="oal-count">Homework</span>}
                waitLine={lesson.id === 1 && steps ? "One worksheet and two real steps. They open after the quick check." : "One worksheet for the two of you. It opens after the quick check."}>
                <div className={`oal-sheet${sheetDone ? " is-done" : ""}`}>
                  <span className="ocf2-kicker">The worksheet</span>
                  <p className="ocf2-p">Sit down with it together. It takes about ten minutes and it is the part that changes things.</p>
                  <OBtn kind="light" block onClick={() => void openExternal(`${isNativeShell ? "https://ck-crm-mobile.vercel.app" : window.location.origin}/academy/worksheets/lesson-${lesson.id}.pdf`)} style={{ minHeight: 50 }}><DownloadSimple size={17} weight="bold" /> Open the worksheet</OBtn>
                  {sheetDone
                    ? <p className="oal-saved"><Check size={13} weight="bold" /> You did the worksheet.</p>
                    : <OBtn block disabled={busy === "pdf"} onClick={() => void confirmSheet()} style={{ minHeight: 50 }}>{busy === "pdf" ? "Saving…" : "We did it"}</OBtn>}
                </div>

                {steps && <MoneySteps steps={steps} counselor={counselorFirst} guide={extras?.guide ?? null} onSave={saveStep} />}

                {coachHere && (
                  <div className="oal-coach">
                    <span className="ocf2-kicker">{coachWaits ? "One call first" : "If you want it"}</span>
                    <p className="ocf2-p"><b>Want {extras!.coachWhy}?</b> Book 30 minutes with {coachFirst}, the course coach.{coachWaits ? ` Your code for ${nextName} comes after this call.` : ""}</p>
                    {coach?.metAt ? <p className="oal-saved"><Check size={13} weight="bold" /> You met with {coachFirst}.</p>
                      : coach?.bookedFor ? <p className="oal-saved"><CalendarBlank size={13} weight="bold" /> Booked for {new Date(coach.bookedFor).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.</p>
                      : <OBtn kind="light" block href={bookUrl} style={{ minHeight: 50 }}><CalendarBlank size={17} weight="bold" /> Book a time</OBtn>}
                  </div>
                )}

                <FurtherStudy items={extras?.resources ?? []} />
              </Part>

              {paywalled && !isDone ? (
                <Part id="oal-code" n={3} title="Keep going" state={codeState} waitLine="Opens when the check and the homework are done.">
                  <p className="ocf2-p" style={{ color: "var(--oc-ink)", fontWeight: 800, fontSize: 16 }}>Episodes 2 to 8, your counselor, and the certificate.</p>
                  <p className="ocf2-p">$100 once for the two of you. Free with a partner code from your school, shul or kallah teacher.</p>
                  <OBtn block onClick={() => void openExternal(`${ACADEMY_URL}/learn/lesson/1`)} style={{ minHeight: 52 }}>Finish enrolling <CaretRight size={16} weight="bold" /></OBtn>
                </Part>
              ) : (
                <Part id="oal-code" n={3} title={next ? `Open Episode ${next.roman}` : "Finish the course"} state={codeState}
                  waitLine={next ? `Your counselor's code opens Episode ${next.roman}. The box shows up once the check and the homework are done.` : "Your counselor's last code finishes the course. The box shows up once the check and the homework are done."}>
                  {isDone ? (
                    next ? (
                      <>
                        <p className="oal-saved"><Check size={13} weight="bold" /> Code entered. Episode {next.roman} is open.</p>
                        <OBtn block onClick={() => router.push(`/academy/lesson/${next.id}`, "forward", "replace")} style={{ minHeight: 52 }}>Watch Episode {next.roman}: {next.title} <CaretRight size={16} weight="bold" /></OBtn>
                      </>
                    ) : <p className="oal-saved"><Check size={13} weight="bold" /> Code entered. You finished all eight.</p>
                  ) : (
                    <>
                      <p className="ocf2-p">{coachWaits ? `After your call with ${coachFirst}, a six-character code comes to you. Type it here.` : `Tell ${counselorFirst} you finished. They send back a six-character code. Type it here.`}</p>
                      <CodeCells value={code} onChange={(v) => { setCode(v); setErr(null); }} onEnter={() => void redeem()} disabled={busy === "code"} />
                      {isAcademyDemo() && <p className="oal-note">Sample course: the code is {ACADEMY_DEMO_UNLOCK}.</p>}
                      {err && <div className="ocf2-gentle" role="alert">{err}</div>}
                      <OBtn block disabled={code.length !== 6 || busy === "code"} onClick={() => void redeem()} style={{ minHeight: 52 }}>{busy === "code" ? "Checking…" : next ? `Open Episode ${next.roman}` : "Finish the course"}</OBtn>
                      <Fold title="Where do I get the code?">
                        <p className="ocf2-p">From your guidance counselor{counselor ? `, ${counselor.name}` : ""}. When your check and homework are in, they see it. You talk it through for a few minutes, and they send you the code for {nextName}.</p>
                        <p className="ocf2-p">Each code works once, for this episode only. If nobody has reached out yet, they will shortly.</p>
                        <div className="oal-acts">
                          {wa && <OBtn kind="light" block href={`${wa}?text=${encodeURIComponent(`Hi, we finished Episode ${lesson.id} of CK Academy (${lesson.title}).`)}`} style={{ minHeight: 50 }}><WhatsappLogo size={18} weight="fill" /> Message {counselorFirst}</OBtn>}
                          <OBtn kind="light" block href={bookUrl} style={{ minHeight: 50 }}><CalendarBlank size={17} weight="bold" /> Book a time</OBtn>
                        </div>
                      </Fold>
                    </>
                  )}
                </Part>
              )}

              {finishedCourse && (
                <section className="oal-finish" aria-label="You finished the course">
                  <span className="ocf2-kicker">All eight, done</span>
                  <h2>You finished the course.</h2>
                  <p>Eight episodes, eight worksheets, and the two of you on the same page about money. That is the whole point.</p>
                  <OBtn block onClick={() => void openExternal(`${ACADEMY_URL}/learn/complete`)} style={{ minHeight: 52 }}>Get your certificate <CaretRight size={16} weight="bold" /></OBtn>
                  <OBtn block kind="light" href={ALUMNI_GROUP} style={{ minHeight: 50 }}><WhatsappLogo size={18} weight="fill" /> Join the alumni WhatsApp group</OBtn>
                  <OBtn block kind="light" href={SURVEY_URL} style={{ minHeight: 50 }}>Tell us how it went (2 minutes)</OBtn>
                </section>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
