import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { fetchDonorImpact } from "@/lib/donorApi";
import { useSwipeBack } from "@/lib/swipeBack";
import { tapLight } from "@/lib/haptics";
import { BackButton } from "@/components/BackButton";

/**
 * ADOPT A FAMILY (Shalom 2026-11-11): "show regions without too much info.
 * their struggle, how we'll help and what we hope the ending will be ...
 * protecting families ... but also inspiring."
 *
 * How it protects families (from a review of how nonprofits do this well):
 *  - The donor never picks a family from a list. They choose a region and
 *    an amount; the CK team matches the gift. No catalog, no "shopping".
 *  - Private both ways: the donor never learns who, the family never
 *    learns who gave.
 *  - A region shows only when enough families live there (MIN_REGION) that
 *    no one can be pointed at; smaller places fold into "greatest need".
 *  - Stories are composites, labeled as such: no names, towns, children,
 *    jobs, dates or dollar figures. Hopes, never promises.
 *  - Drawings and abstract shapes, never photos.
 * The gift itself is the app's own gift page (Stripe); the region rides
 * along as a note for the team.
 */
const MIN_REGION = 11;
const ANY = "Where the need is greatest";

/** `real` marks a story a family has agreed, in writing, to have told
 *  (still no names or places). None yet: every story below is a composite. */
interface Story { who: string; struggle: string; help: string; hope: string; real?: boolean }
const STORIES: Story[] = [
  { who: "Two working parents",
    struggle: "He takes the long way home now, so he does not pass the grocery where the card was declined.",
    help: "A case manager sits at their table. A budgeting coach and a debt expert build one plan with them, and stay for the year.",
    hope: "That one evening he drives home the short way and does not even notice." },
  { who: "A family with a steady paycheck",
    struggle: "There is an envelope on the fridge. It has been there three weeks. Nobody opens it.",
    help: "We open it with them. Then every other one. Then we call whoever needs calling.",
    hope: "The first month the rent goes out on time, and nobody in the house holds their breath." },
  { who: "A family after a hard medical year",
    struggle: "The savings went to the hospital. At the table on Friday night they smile. They have told no one.",
    help: "A team that keeps their confidence, sorts the bills one by one, and plans the way back.",
    hope: "A small cushion in the bank, and a table where nobody is pretending." },
  { who: "A family that always gave to others",
    struggle: "For years they were the ones who quietly covered someone else's bill. Now the bill is theirs, and asking feels impossible.",
    help: "One call a week, one plan, one team beside them for the year. Nobody else has to know.",
    hope: "That next year they are the ones giving again." },
  { who: "A mother raising her children alone",
    struggle: "After the children are asleep she sits at the kitchen table with the bills. There is no one to hand the worry to.",
    help: "A case manager who knows her plan and picks up the phone. A coach for the budget. Experts when she needs them.",
    hope: "That one night she closes the folder, turns off the light, and sleeps." },
];
const BEATS = [
  { key: "struggle", label: "Their struggle" },
  { key: "help", label: "How we will help" },
  { key: "hope", label: "What we hope" },
] as const;
const BEAT_MS = 5200;
const AMOUNTS = [
  { amount: 8800, title: "A whole family", sub: "The team, for the year" },
  { amount: 4400, title: "Partner with another donor", sub: "Together you carry one family for the year" },
];
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function useReducedMotion() {
  const [r, setR] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const on = () => setR(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return r;
}

/** One house, three moments: rain, the team arriving, morning. */
function Scene({ beat }: { beat: number }) {
  return (
    <div className="oad-scene" data-beat={beat} aria-hidden>
      <svg viewBox="0 0 360 210" preserveAspectRatio="xMidYMax slice">
        <g className="oad-sun"><g className="oad-rays">{Array.from({ length: 10 }, (_, i) => <line key={i} x1="282" y1="38" x2="282" y2="28" transform={`rotate(${i * 36} 282 62)`} />)}</g><circle cx="282" cy="62" r="17" /></g>
        <g className="oad-cloud oad-cloud--a"><path d="M52 62a15 15 0 0 1 29-5 12 12 0 0 1 21 7 10 10 0 0 1-2 20H56a12 12 0 0 1-4-22z" /><g className="oad-rain">{[62, 76, 90, 70, 84].map((x, i) => <line key={i} x1={x} y1={92 + (i % 2) * 6} x2={x - 3} y2={102 + (i % 2) * 6} style={{ animationDelay: `${i * 0.17}s` }} />)}</g></g>
        <g className="oad-cloud oad-cloud--b"><path d="M196 44a13 13 0 0 1 25-4 10 10 0 0 1 18 6 9 9 0 0 1-2 17h-38a10 10 0 0 1-3-19z" /><g className="oad-rain">{[206, 220, 232].map((x, i) => <line key={i} x1={x} y1={70 + (i % 2) * 6} x2={x - 3} y2={80 + (i % 2) * 6} style={{ animationDelay: `${0.1 + i * 0.21}s` }} />)}</g></g>
        <path className="oad-hill" d="M-10 210v-34c60-22 130-26 190-20s130 4 190 22v32z" />
        <g className="oad-sprout"><path d="M92 172v-22" /><path d="M92 158c-9 0-13-6-13-12 8 0 13 5 13 12z" /><path d="M92 152c8 0 12-6 12-11-8 0-12 5-12 11z" /></g>
        <g className="oad-house">
          <path className="oad-wall" d="M128 172v-62l52-40 52 40v62z" />
          <path className="oad-roof" d="M120 112l60-46 60 46" />
          <rect className="oad-chim" x="206" y="72" width="12" height="22" />
          <rect className="oad-win oad-win--1" x="143" y="118" width="24" height="22" rx="3" />
          <rect className="oad-win oad-win--2" x="193" y="118" width="24" height="22" rx="3" />
          <path className="oad-wbars" d="M155 118v22M143 129h24M205 118v22M193 129h24" />
          <rect className="oad-door" x="170" y="140" width="20" height="32" rx="3" />
          <circle className="oad-knob" cx="185" cy="157" r="1.6" />
          <path className="oad-heart" d="M180 96c-5-4-9-7-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-4 7-9 11z" />
        </g>
        <g className="oad-team">
          <g className="oad-mate oad-mate--1"><circle cx="258" cy="160" r="9" /><path d="M258 169v12" /></g>
          <g className="oad-mate oad-mate--2"><circle cx="284" cy="164" r="9" /><path d="M284 173v10" /></g>
          <g className="oad-mate oad-mate--3"><circle cx="310" cy="168" r="9" /><path d="M310 177v8" /></g>
        </g>
        <path className="oad-ground" d="M40 172h280" />
      </svg>
    </div>
  );
}

export function AdoptPage() {
  const swipe = useSwipeBack("/start/donor");
  const router = useIonRouter();
  const reduced = useReducedMotion();
  const q = useQuery({ queryKey: ["donor-impact"], queryFn: fetchDonorImpact, staleTime: 30_000, retry: 0 });

  // Only regions large enough that nobody can be pointed at.
  const regions = useMemo(() => (q.data?.cities || []).filter((c) => c.families >= MIN_REGION).slice(0, 5), [q.data]);
  const [region, setRegion] = useState<string>(ANY);
  const [storyAt, setStoryAt] = useState(0);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  const [amount, setAmount] = useState(AMOUNTS[0].amount);
  const tick = useRef(0);

  // Each region opens on a different composite, so the page never reads as
  // "the family from X".
  const pickRegion = (r: string) => {
    void tapLight();
    setRegion(r);
    const idx = r === ANY ? 0 : (regions.findIndex((x) => x.city === r) + 1) % STORIES.length;
    setStoryAt(idx); setBeat(0); tick.current++;
  };
  const story = STORIES[storyAt % STORIES.length];

  useEffect(() => {
    if (reduced || paused) return;
    const t = window.setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => window.clearTimeout(t);
  }, [beat, reduced, paused, storyAt]);

  const where = region === ANY ? "where the need is greatest" : `in ${region}`;
  const partner = amount === AMOUNTS[1].amount;
  const give = () => { void tapLight(); router.push(`/start/give?amount=${amount}&adopt=${encodeURIComponent(region)}${partner ? "&partner=1" : ""}`); };
  const text = (k: (typeof BEATS)[number]["key"]) => story[k];

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="ocf2 ocf2-page oad">
          <div className="ocf2-top"><BackButton href="/start/donor" /><span className="oad-eyebrow"><i aria-hidden />Adopt a family</span></div>

          <section className="oad-hero gv-rise" data-beat={reduced ? 2 : beat}>
            <Scene beat={reduced ? 2 : beat} />
            <div className="oad-hero-t">
              <h1 className="ocf2-h1"><span>Stand behind</span><span><mark>one family.</mark></span></h1>
              <p>Somewhere tonight a working family is holding it together and telling no one. For one year, you put a whole team beside them. You never learn who they are. They never learn who you are.</p>
            </div>
          </section>

          <section className="oad-block gv-rise" style={{ "--i": 1 } as CSSProperties}>
            <h2 className="oad-h2">Where would you like to help?</h2>
            <div className="oad-chips" role="radiogroup" aria-label="Region">
              {[ANY, ...regions.map((r) => r.city)].map((r) => (
                <button key={r} type="button" role="radio" aria-checked={region === r} className={`oad-chip${region === r ? " is-on" : ""}`} onClick={() => pickRegion(r)}>{r}</button>
              ))}
            </div>
            <p className="oad-fine">We only name a region when enough families live there that no one can be pointed at.</p>
          </section>

          <section className="oad-story gv-rise" style={{ "--i": 2 } as CSSProperties}
            onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
            <div className="oad-story-top">
              <span className="oad-who">{story.who}{region === ANY ? "" : `, ${region}`}</span>
              <span className={`oad-tag${story.real ? " is-real" : ""}`}>{story.real ? "Told with the family's permission" : "Composite story"}</span>
            </div>
            {reduced ? (
              <div className="oad-all">
                {BEATS.map((b) => <div key={b.key}><b>{b.label}</b><p>{text(b.key)}</p></div>)}
              </div>
            ) : (<>
              <div className="oad-bars" role="tablist" aria-label="Story">
                {BEATS.map((b, i) => (
                  <button key={b.key} type="button" role="tab" aria-selected={beat === i} className={i < beat ? "is-done" : i === beat ? "is-on" : ""} onClick={() => { void tapLight(); setBeat(i); }}>
                    <i><em key={`${storyAt}-${beat}-${tick.current}`} style={{ animationDuration: `${BEAT_MS}ms`, animationPlayState: paused ? "paused" : "running" }} /></i>
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>
              <div className="oad-beat" key={`${storyAt}-${beat}`} role="tabpanel" aria-live="polite">
                <p>{text(BEATS[beat].key)}</p>
              </div>
            </>)}
            <div className="oad-story-foot">
              <span>{story.real ? "Shared with this family's permission. Names and details are left out so they cannot be recognized." : "Drawn from what families bring to us. Details are changed so no family can be recognized. Stories told with a family's own permission are coming."}</span>
              <button type="button" onClick={() => { void tapLight(); setStoryAt((n) => (n + 1) % STORIES.length); setBeat(0); }}>Another story</button>
            </div>
          </section>

          <section className="oad-how gv-rise" style={{ "--i": 3 } as CSSProperties}>
            <h2 className="oad-h2">How adopting works</h2>
            <ol>
              <li><b>You choose a region and a gift.</b><span>Not a family. Nobody is picked from a list.</span></li>
              <li><b>Our team matches your gift.</b><span>To a family waiting {where}, by need.</span></li>
              <li><b>Private both ways.</b><span>You know the region and that a family has a team because of you. That is all, and that is the point.</span></li>
            </ol>
            <blockquote>The highest giving helps someone stand on their own. The next is when neither side knows the other. This is both.<cite>After Maimonides, the eight levels of giving</cite></blockquote>
          </section>

          <section className="oad-block gv-rise" style={{ "--i": 4 } as CSSProperties}>
            <h2 className="oad-h2">Your gift</h2>
            <div className="oad-amts" role="radiogroup" aria-label="Amount">
              {AMOUNTS.map((a) => (
                <button key={a.amount} type="button" role="radio" aria-checked={amount === a.amount} className={`oad-amt${amount === a.amount ? " is-on" : ""}`} onClick={() => { void tapLight(); setAmount(a.amount); }}>
                  <b>{usd(a.amount)}</b><span>{a.title}</span><small>{a.sub}</small>
                </button>
              ))}
            </div>
            <button type="button" className="ocf2-link oad-other" onClick={() => router.push(`/start/give?adopt=${encodeURIComponent(region)}`)}>Give another amount toward a family</button>
          </section>

          <div className="oad-cta">
            <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 56 }} onClick={give}>{partner ? "Partner on a family" : "Adopt a family"} · {usd(amount)}</button>
            <p className="oad-fine" style={{ textAlign: "center" }}>Secured by Stripe · tax-deductible receipt by email</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default AdoptPage;
