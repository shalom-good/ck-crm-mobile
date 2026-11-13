import { useEffect, useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { CaretRight, Clock, Play, SpeakerHigh } from "@phosphor-icons/react";
import { AcademyMark } from "@/components/gv";
import { AcademyReel } from "@/components/orchard/AcademyReel";
import { BackButton } from "@/components/BackButton";
import { Panel } from "@/components/orchard/family/FamKit";
import { useSwipeBack } from "@/lib/swipeBack";
import { useAuth } from "@/lib/auth";
import { LESSONS } from "@/lib/lessons";
import { ACADEMY_STATS_FALLBACK, fetchAcademyStats } from "@/lib/academyApi";


export const episodeFrame = (n: number) => `/academy/ep${n}.webp`;

/**
 * 15-second teaser per episode (Leivi 2026-11-11). The clips do not exist
 * yet, so every entry is empty and the strip looks as it always did. When
 * the video team supplies them, put each file at the path noted here and
 * fill in the entry: tapping that episode then plays its teaser, muted, in
 * the thumbnail, once.
 *   public/academy/teasers/ep1.mp4 ... ep8.mp4
 *   MP4 (H.264, no audio track needed), 15 seconds, 16:10 or 16:9,
 *   720p, under about 1.5 MB each.
 */
export const EPISODE_TEASERS: Record<number, string> = {
  // 1: "/academy/teasers/ep1.mp4",
};
export const episodeTeaser = (n: number): string | null => EPISODE_TEASERS[n] || null;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** A number that glides from the last value to the new one, so the live
 *  count visibly ticks when another couple signs up. */
function Ticker({ to, className }: { to: number; className?: string }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  const [bump, setBump] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    const start = first.current ? Math.max(0, to - 40) : from.current;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!first.current && to !== from.current) setBump((b) => b + 1);
    first.current = false;
    if (reduce || start === to) { setV(to); from.current = to; return; }
    const t0 = performance.now();
    const ms = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = to; };
  }, [to]);
  return <b key={bump} className={`${className ?? ""}${bump ? " is-bump" : ""}`}>{v.toLocaleString("en-US")}</b>;
}

/**
 * The CK Academy door (Shalom 2026-11-10): a moving preview, the eight
 * episodes as small previews, the live count of couples signed up, then
 * sign up or sign in right here in the app.
 */
export function AcademyStartPage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const { status, kind } = useAuth();
  const inCourse = status === "signedIn" && kind === "academy";
  const [pick, setPick] = useState(1);
  const [teaserOn, setTeaserOn] = useState<number | null>(null);
  const ep = LESSONS.find((l) => l.id === pick) ?? LESSONS[0];
  const minutes = LESSONS.reduce((t, l) => t + (parseInt(l.duration, 10) || 0), 0);

  // The live count: asked again every 30 seconds while the screen is open.
  const q = useQuery({ queryKey: ["academy-stats"], queryFn: fetchAcademyStats, refetchInterval: 30_000, refetchIntervalInBackground: false, staleTime: 20_000, retry: 0 });
  const stats = q.data ?? ACADEMY_STATS_FALLBACK;

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/start" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door ocf2-ak-door">
          <AcademyReel className="gv-rise" />

          <div className="gv-rise" style={{ "--i": 1, padding: "0 4px" } as React.CSSProperties}>
            <span className="ocf2-kicker" style={{ color: "#2D3766" }}>Newlyweds Financial Mastery</span>
            <h1 className="ocf2-h1" style={{ marginTop: 4 }}><span>Money that <mark>lasts.</mark></span></h1>
            <p className="ocf2-hero-sub">Eight short episodes for couples. Watch one, take one real step, and talk it over with your guidance counselor.</p>
          </div>

          <section className="ocf2-ak-live gv-rise" style={{ "--i": 2 } as React.CSSProperties} aria-live="polite">
            <span className="ocf2-ak-live-k"><i className="ocf2-ak-dot" aria-hidden />{stats.live ? "Signed up so far, live" : "Signed up so far"}</span>
            <div className="ocf2-ak-live-row">
              <div style={{ minWidth: 0 }}>
                <Ticker to={stats.students} className="ocf2-ak-live-n" />
                <span className="ocf2-ak-live-u">couples and singles</span>
              </div>
              {stats.last7 > 0 && <span className="ocf2-ak-live-w">+{stats.last7} this week</span>}
            </div>
            <div className="ocf2-ak-live-s">
              <div><b>{stats.accountsOpened.toLocaleString("en-US")}</b><span>retirement accounts opened</span></div>
              <div><b>{usd(stats.monthlyAutomated)}</b><span>now invested every month</span></div>
            </div>
          </section>

          <div className="ocf2-ak-sech gv-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <h2>The 8 episodes</h2>
            <span>{minutes} minutes in all</span>
          </div>
          <div className="ocf2-ak-eps gv-rise" style={{ "--i": 3 } as React.CSSProperties}>
            {LESSONS.map((l) => {
              const teaser = episodeTeaser(l.id);
              const playing = !!teaser && l.id === pick && teaserOn === l.id;
              return (
                <button type="button" key={l.id} className={`ocf2-ak-ep${l.id === pick ? " is-on" : ""}`} aria-pressed={l.id === pick} aria-label={teaser ? `${l.title}. Play the 15 second teaser` : l.title}
                  onClick={() => { setPick(l.id); setTeaserOn(teaser ? l.id : null); }}>
                  <span className="ocf2-ak-ep-pic">
                    <img src={episodeFrame(l.id)} alt="" loading="lazy" />
                    {playing && <video src={teaser!} poster={episodeFrame(l.id)} muted playsInline autoPlay preload="metadata" onEnded={() => setTeaserOn(null)} onError={() => setTeaserOn(null)} />}
                    <i>{l.roman}</i>
                    {l.id === 1 && <u>Free</u>}
                    {teaser && !playing
                      ? <em className="is-teaser"><Play size={10} weight="fill" />0:15</em>
                      : !playing && <em><Clock size={11} weight="bold" />{l.duration}</em>}
                  </span>
                  <b>{l.title}</b>
                </button>
              );
            })}
          </div>

          <Panel tone="white" style={{ gap: 6 }}>
            <span className="ocf2-kicker" style={{ color: "var(--oc-mid)" }}>Episode {ep.roman} · {ep.duration}</span>
            <p className="ocf2-p" style={{ color: "var(--oc-ink)", fontWeight: 800, fontSize: 15.5, lineHeight: 1.35 }}>{ep.blurb}</p>
            <p className="ocf2-p">{ep.inspiration}</p>
          </Panel>

          {inCourse ? (
            <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} onClick={() => router.push("/academy", "root", "replace")}>
              Go to my course <CaretRight size={18} weight="bold" />
            </button>
          ) : (
            <>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} onClick={() => router.push("/start/academy/signup")}>
                Sign up. Episode 1 is free <CaretRight size={18} weight="bold" />
              </button>
              <button type="button" className="ocf2-btn ocf2-btn--light is-block" style={{ marginTop: -4 }} onClick={() => router.push("/start/academy/signin")}>
                I already signed up
              </button>
              <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px" }}>
                Signed up on the website? Use the same email here. After Episode 1 the course is $100 once, or free with a partner code.
              </p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
