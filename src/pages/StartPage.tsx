import { useEffect, useState, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CaretRight, ChatCircleDots } from "@phosphor-icons/react";
import { HouseArt, GiftArt, AcademyMark } from "@/components/gv";
import { HomeScene } from "@/components/HomeScene";
import { SESSION_ENDED_KEY, LAST_DOOR_KEY } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { ACADEMY_STATS_FALLBACK, fetchAcademyStats } from "@/lib/academyApi";
import { DONOR_GIVING_FALLBACK, fetchDonorImpact } from "@/lib/donorApi";
import { useFitScreen } from "@/lib/useFitScreen";

// The words at the foot of the door. They trade places every few seconds.
const START_QUOTES = [
  { text: "Whoever saves a single life, it is as if they have saved an entire world.", source: "Talmud · Sanhedrin 4:5" },
  { text: "The highest level of charity, above which there is none, is to strengthen a person's hand until they no longer need to ask.", source: "Rambam · The eighth and highest level of charity" },
];

/**
 * ORCHARD (2026-11-05): mint hero with the welcome on a lime highlight,
 * pastel-tiled doors, one forest Donate.
 *
 * The one place to start. A soft green panel with the CK lockup and a
 * home that sketches itself in, then four doors: a family opens their
 * page with the 7-letter code, someone in debt applies to Kosher Debt Help
 * (2026-11-11: the same application as the website, inside the app), CK
 * Academy, and donors. Below them the one forest button, Donate, then
 * "Talk to a person" (Julie's booking calendar) beside a quiet team
 * sign-in. The whole door fits one screen:
 * the scene takes whatever height is left, so nothing scrolls.
 * Nothing red, no badges, nothing urgent.
 */
export function StartPage() {
  const router = useIonRouter();

  // A 401 brought the person here (lib/auth sets the flag): say so once.
  const [sessionEnded, setSessionEnded] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_ENDED_KEY) === "1") {
        // A-13: a family goes straight back to its code screen, which shows
        // the note on top (it clears the flag there).
        if (localStorage.getItem(LAST_DOOR_KEY) === "family") { router.push("/start/family", "forward", "replace"); return; }
        sessionStorage.removeItem(SESSION_ENDED_KEY);
        setSessionEnded(true);
      }
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The live Academy count on its door: asked again every minute.
  const statsQ = useQuery({ queryKey: ["academy-stats"], queryFn: fetchAcademyStats, refetchInterval: 60_000, staleTime: 20_000, retry: 0 });
  const signedUp = (statsQ.data ?? ACADEMY_STATS_FALLBACK).students;

  // How many people gave this week, on the donor door.
  const giveQ = useQuery({ queryKey: ["donor-impact"], queryFn: fetchDonorImpact, refetchInterval: 60_000, staleTime: 30_000, retry: 0 });
  const gave7 = (giveQ.data?.giving ?? DONOR_GIVING_FALLBACK).donors7;

  const [quoteAt, setQuoteAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQuoteAt((n) => (n + 1) % START_QUOTES.length), 7000);
    return () => clearInterval(t);
  }, []);

  // The fit rule: the door never scrolls, on any screen.
  const fitRef = useFitScreen<HTMLDivElement>(6, [sessionEnded, gave7 > 0]);

  return (
    <IonPage>
      <IonContent scrollY={false} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div ref={fitRef} data-fit="0" className="ocf2 ocf2-page--start">
          {/* mint hero: the CK lockup, a home that sketches itself in, the welcome */}
          <section className="ocf2-hero ocf2-hero--scene ocf2-t-mint gv-rise">
            <img src="/ck-logo.png" alt="Collective Kindness" className="ocf2-logo" />
            <h1 className="ocf2-h1">
              <span><mark>Welcome.</mark></span>
              <span className="ocf2-h1-2">What brings you here?</span>
            </h1>
            <div className="ck-scene-wrap"><HomeScene width="100%" /></div>
          </section>

          {sessionEnded && (
            <div role="status" className="ocf2-note ocf2-t-butter gv-rise" style={{ "--i": 1 } as React.CSSProperties}>
              It has been a while, so you were signed out. Pick your door below to pick up where you left off.
            </div>
          )}

          {/* the doors: anyone with a code (CK, KDH, Nurture), the Academy, donors */}
          <div className="ocf2-doors">
            <button type="button" onClick={() => router.push("/start/family")} className="ocf2-door ocf2-door--stack gv-rise" style={{ "--i": 2 } as React.CSSProperties}>
              <span>
                <span aria-hidden className="ocf2-door-art ocf2-t-mint"><HouseArt width={58} strokeWidth={6.5} still /></span>
                <span className="ocf2-door-t"><b>I have a code</b><small>Use the 7-letter code from your case manager or debt expert.</small></span>
                <span aria-hidden className="ocf2-door-go"><CaretRight size={16} weight="bold" /></span>
              </span>
              <span className="ocf2-door-chips">
                <span style={{ "--dot": "#3E8E6A" } as React.CSSProperties}>CK families</span>
                <span style={{ "--dot": "#3F78B5" } as React.CSSProperties}>Kosher Debt Help</span>
                <span style={{ "--dot": "#D9783F" } as React.CSSProperties}>Project Nurture</span>
                <span style={{ "--dot": "#5B62B8" } as React.CSSProperties}>Shluchim Thrive</span>
              </span>
            </button>
            <Door i={3} tone="sky" art={<i aria-hidden className="ocf2-kdhmark" />} title="Get help with debt" sub="Apply to Kosher Debt Help. Private, no judgment." onClick={() => router.push("/start/kdh")} />
            <Door i={4} tone="lilac" art={<AcademyMark size={28} color="#2D3766" />} title="CK Academy" sub="Eight episodes on money that lasts." extra={<span className="ocf2-door-live"><i aria-hidden />{signedUp.toLocaleString("en-US")} signed up</span>} onClick={() => router.push("/start/academy")} />
            <Door i={5} tone="butter" art={<GiftArt width={50} strokeWidth={4.4} />} title="I'm a donor" sub="See what giving does, and your own gifts over time." extra={gave7 > 0 ? <span className="ocf2-door-live"><i aria-hidden />{gave7.toLocaleString("en-US")} gave in the past 7 days</span> : undefined} onClick={() => router.push("/start/donor")} />
          </div>

          {/* the one forest button */}
          <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 6, minHeight: 54 } as React.CSSProperties} onClick={() => router.push("/start/give")}>
            Make a gift
          </button>

          {/* a person to talk to, and the quiet team door */}
          <div className="ocf2-startlinks gv-rise" style={{ "--i": 7 } as React.CSSProperties}>
            <button type="button" className="ocf2-talkbtn" onClick={() => router.push("/start/talk")}><ChatCircleDots size={17} weight="bold" aria-hidden />Talk to a person</button>
            <button type="button" className="ocf2-quiet" onClick={() => router.push("/start/team")}>Team sign-in</button>
          </div>

          {/* always at the foot: the two lines CK stands on */}
          <figure className="ocf2-startquote" aria-live="off">
            {START_QUOTES.map((q, n) => (
              <div key={q.source} className={n === quoteAt ? "is-on" : ""} aria-hidden={n !== quoteAt}>
                <blockquote>{"\u201C"}{q.text}{"\u201D"}</blockquote>
                <cite>{q.source}</cite>
              </div>
            ))}
          </figure>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** A white door: pastel art tile, title 16/800, 13px subline, round chevron. */
function Door({ i, tone, art, title, sub, extra, onClick }: { i: number; tone: "mint" | "butter" | "lilac" | "sky"; art: ReactNode; title: string; sub: string; extra?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ocf2-door gv-rise" style={{ "--i": i } as React.CSSProperties}>
      <span aria-hidden className={`ocf2-door-art ocf2-t-${tone}`}>{art}</span>
      <span className="ocf2-door-t"><b>{title}</b><small>{sub}</small>{extra}</span>
      <span aria-hidden className="ocf2-door-go"><CaretRight size={16} weight="bold" /></span>
    </button>
  );
}
