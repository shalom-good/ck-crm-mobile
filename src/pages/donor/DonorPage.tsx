import { Oil } from "@/components/orchard/Illos";
import { useFitScreen } from "@/lib/useFitScreen";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { ArrowRight, CalendarCheck, CaretRight, Check, Binoculars, Gift, GlobeHemisphereWest, GraduationCap, HandHeart, HouseLine, MapPin, Scales } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { Ticker } from "@/components/Ticker";
import { GiftArt } from "@/components/gv";
import { MiniBars, Panel } from "@/components/orchard/family/FamKit";
import { useSwipeBack } from "@/lib/swipeBack";
import { leaveTo } from "@/lib/device";
import { ApiError } from "@/lib/mobileApi";
import {
  DONOR_DEMO_EMAIL, donorAskForCode, donorCodeLogin, donorGoogleUrl, donorNotLive, loadAsked, saveAsked,
  fetchDonorImpact, fetchDonorMe, fetchRaises, guessDonorArea, hideRaiseAsk, orderRaises, raiseAskHidden, raiseMatches, setRaiseAlerts, isDonorDemo, loadAnswers, loadDonor, saveAnswers, saveDonor, saveDonorInterests,
  type DonorAnswers, type DonorImpact, type DonorMe, type DonorSession, type GiveStyle, type Interest, type Raise,
} from "@/lib/donorApi";

/** A date-only value is a calendar day, not midnight UTC. */
const day = (s: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s);
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const short = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : usd(n));

const INTERESTS: { id: Interest; title: string; sub: string; tone: string; icon: ReactNode }[] = [
  { id: "education", title: "Financial education", sub: "Couples learning to manage money early", tone: "lilac", icon: <GraduationCap size={26} weight="duotone" /> },
  { id: "single_mothers", title: "Single mothers", sub: "A plan and a team behind one parent", tone: "rose", icon: <HandHeart size={26} weight="duotone" /> },
  { id: "debt", title: "Debt help", sub: "Getting families out from under card debt", tone: "sky", icon: <Scales size={26} weight="duotone" /> },
  { id: "general", title: "Wherever it is needed", sub: "Families working back to steady ground", tone: "mint", icon: <HouseLine size={26} weight="duotone" /> },
];
const STYLES: { id: GiveStyle; title: string; sub: string; icon: ReactNode }[] = [
  { id: "monthly", title: "Every month", sub: "A steady gift a family can plan around", icon: <CalendarCheck size={26} weight="duotone" /> },
  { id: "once", title: "Once in a while", sub: "When something moves me", icon: <Gift size={26} weight="duotone" /> },
  { id: "looking", title: "Just looking for now", sub: "Show me what the giving does", icon: <Binoculars size={26} weight="duotone" /> },
];
const interestLabel = (id: Interest) => INTERESTS.find((i) => i.id === id)?.title ?? id;

const GOOGLE_RETURN = Capacitor.isNativePlatform()
  ? "net.collectivekindness.ckteam://donor-auth"
  : (typeof window !== "undefined" ? `${window.location.origin}/start/donor` : "");

type Stage = "questions" | "gate" | "impact" | "raises";

/**
 * The donor door (Shalom 2026-11-10). Three short questions about what the
 * donor cares about, one sign-in step, then an impact page shaped by the
 * answers on live CRM numbers, with their own giving over time.
 */
export function DonorPage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const [session, setSession] = useState<DonorSession | null>(() => loadDonor());
  const [answers, setAnswers] = useState<DonorAnswers>(() => loadAnswers() ?? { interests: [], city: null, give: null });
  const [stage, setStage] = useState<Stage>(() => (loadDonor() ? "impact" : loadAnswers()?.give ? "gate" : "questions"));
  const [step, setStep] = useState(0);
  const [gNote, setGNote] = useState<string | null>(null);

  const impactQ = useQuery({ queryKey: ["donor-impact"], queryFn: fetchDonorImpact, refetchInterval: 60_000, staleTime: 30_000, retry: 1 });

  const signedIn = (s: DonorSession) => {
    saveDonor(s); setSession(s); setStage("impact");
    void saveDonorInterests(s, answers);
  };

  // The Google hand-back: #donor_token=…&email=…&name=…, or #dg=<reason>.
  const takeReturn = (hash: string) => {
    const q = new URLSearchParams(hash.replace(/^#/, ""));
    const token = q.get("donor_token");
    if (token) { signedIn({ token, email: q.get("email") || "", name: q.get("name") || "" }); return; }
    const g = q.get("dg");
    if (g) setGNote(g === "off" ? "Google sign-in is not switched on yet. Ask for your code instead." : g === "cancel" ? "Google sign-in was closed before it finished. Try again, or ask for your code." : "Google sign-in did not go through. Try again, or ask for your code.");
  };
  useEffect(() => {
    if (typeof window !== "undefined" && /(^|[#&])(donor_token|dg)=/.test(window.location.hash)) {
      const h = window.location.hash;
      window.history.replaceState(null, "", window.location.pathname);
      takeReturn(h);
    }
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = CapApp.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith("net.collectivekindness.ckteam://donor-auth")) return;
      void Browser.close().catch(() => {});
      takeReturn(url.slice(url.indexOf("#")));
    });
    return () => { void sub.then((h) => h.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishQuestions = (a: DonorAnswers) => {
    saveAnswers(a); setAnswers(a);
    if (session) { void saveDonorInterests(session, a); setStage("impact"); } else setStage("gate");
  };
  const redo = () => { setStep(0); setStage("questions"); };
  const signOut = () => { saveDonor(null); saveAnswers(null); saveAsked(null); setSession(null); setAnswers({ interests: [], city: null, give: null }); setStep(0); setStage("questions"); };

  // The full raises list opens at its top, not where the impact page was scrolled to.
  const contentRef = useRef<HTMLIonContentElement>(null);
  useEffect(() => { if (stage === "raises") void contentRef.current?.scrollToTop(0); }, [stage]);

  const back = stage === "questions" && step > 0 ? () => setStep(step - 1)
    : stage === "gate" ? () => { setStep(2); setStage("questions"); }
    : stage === "raises" ? () => setStage("impact")
    : undefined;
  // A gift from the donor's page: to the general fund, or to one raise (?c=<slug>).
  const give = (opts: { cause?: Interest; slug?: string } = {}) => {
    const sp = new URLSearchParams();
    if (answers.give === "monthly" && !opts.slug) sp.set("freq", "monthly");
    if (opts.slug) sp.set("c", opts.slug);
    else if (opts.cause && opts.cause !== "general") sp.set("for", opts.cause);
    const qs = sp.toString();
    router.push(qs ? `/start/give?${qs}` : "/start/give");
  };

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      {stage !== "gate" && (
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/start" onClick={back} /></IonButtons>
          {stage === "questions" && (
            <div className="ocf2-dn-steps" role="img" aria-label={`Question ${step + 1} of 3`}>
              {[0, 1, 2].map((k) => <i key={k} className={k < step ? "done" : k === step ? "now" : ""} />)}
            </div>
          )}
        </IonToolbar>
      </IonHeader>
      )}
      <IonContent ref={contentRef} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        {stage === "questions" && <Questions step={step} setStep={setStep} start={answers} cities={impactQ.data?.cities ?? []} onDone={finishQuestions} />}
        {stage === "gate" && <Gate answers={answers} note={gNote} onSignedIn={signedIn} onBack={back} />}
        {stage === "impact" && session && (
          <Impact session={session} answers={answers} impact={impactQ.data} loading={impactQ.isLoading} failed={impactQ.isError} onRetry={() => void impactQ.refetch()}
            onRedo={redo} onSignOut={signOut} onExpired={() => { saveDonor(null); setSession(null); setStage("gate"); }}
            onGive={(cause) => give({ cause })} onGiveRaise={(slug) => give({ slug })} onAllRaises={() => setStage("raises")} />
        )}
        {stage === "raises" && session && (
          <RaisesAll session={session} answers={answers} onGiveRaise={(slug) => give({ slug })} onGiveGeneral={() => give()} />
        )}
      </IonContent>
    </IonPage>
  );
}

/* ── the three questions ───────────────────────────────────────────── */
function Questions({ step, setStep, start, cities, onDone }: { step: number; setStep: (n: number) => void; start: DonorAnswers; cities: DonorImpact["cities"]; onDone: (a: DonorAnswers) => void }) {
  const [interests, setInterests] = useState<Interest[]>(start.interests);
  const [city, setCity] = useState<string | null>(start.city);
  const [typed, setTyped] = useState(start.city && !cities.some((c) => c.city === start.city) ? start.city : "");
  const [where, setWhere] = useState<"home" | "any" | null>(start.city ? "home" : start.give ? "any" : null);

  // Preselect the donor's own area the first time through (never over a choice they made).
  const guessed = useRef(false);
  useEffect(() => {
    if (guessed.current || start.city || start.give || !cities.length) return;
    guessed.current = true;
    void guessDonorArea(cities.map((c) => c.city)).then((g) => {
      if (!g.area && !g.city) return;
      setWhere((w) => {
        if (w) return w;
        if (g.area) setCity(g.area); else if (g.city) setTyped(g.city);
        return "home";
      });
    });
  }, [cities, start.city, start.give]);

  const toggle = (id: Interest) => setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const chosenCity = where === "home" ? (city || typed.trim() || null) : null;

  return (
    <div className="ocf2 ocf2-page--door ocf2-dn-q" key={step}>
      {step === 0 && (
        <>
          <Ask n={1} lead="What moves" mark="you most?" sub="Pick one or a few. Your page is built around them." />
          <div className="ocf2-dn-opts">
            {INTERESTS.map((o, k) => (
              <Opt key={o.id} i={k} on={interests.includes(o.id)} tone={o.tone} icon={o.icon} title={o.title} sub={o.sub} onClick={() => toggle(o.id)} />
            ))}
          </div>
          <NextBtn disabled={!interests.length} onClick={() => setStep(1)} />
        </>
      )}
      {step === 1 && (
        <>
          <Ask n={2} lead="Where should" mark="it land?" sub="Some donors want to lift their own city. Others give wherever the need is." />
          <div className="ocf2-dn-opts">
            <Opt i={0} on={where === "home"} tone="butter" icon={<MapPin size={26} weight="duotone" />} title="Close to home" sub="Show me my area first" onClick={() => setWhere("home")} />
            {where === "home" && (
              <div className="ocf2-dn-city">
                {cities.length > 0 && (
                  <div className="ocf2-dn-chips">
                    {cities.slice(0, 8).map((c) => (
                      <button type="button" key={c.city} className={`ocf2-dn-chip${city === c.city ? " is-on" : ""}`} aria-pressed={city === c.city} onClick={() => { setCity(city === c.city ? null : c.city); setTyped(""); }}>{c.city}</button>
                    ))}
                  </div>
                )}
                <input className="ocf2-input" aria-label="Your city" placeholder={cities.length ? "Somewhere else" : "Your city"} autoCapitalize="words" value={typed} onChange={(e) => { setTyped(e.target.value.slice(0, 40)); setCity(null); }} />
              </div>
            )}
            <Opt i={1} on={where === "any"} tone="mint" icon={<GlobeHemisphereWest size={26} weight="duotone" />} title="Wherever it is needed" sub="Everywhere CK serves" onClick={() => setWhere("any")} />
          </div>
          <NextBtn disabled={!where || (where === "home" && !chosenCity)} onClick={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Ask n={3} lead="How do you" mark="like to give?" sub="No commitment here. It only shapes what we show you." />
          <div className="ocf2-dn-opts">
            {STYLES.map((o, k) => (
              <Opt key={o.id} i={k} on={start.give === o.id} tone="butter" icon={o.icon} title={o.title} sub={o.sub} arrow onClick={() => onDone({ interests, city: chosenCity, give: o.id })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Ask({ n, lead, mark, sub }: { n: number; lead: string; mark: string; sub: string }) {
  return (
    <div className="ocf2-dn-ask">
      <span className="ocf2-dn-count">{n} of 3</span>
      <h1 className="ocf2-h1" style={{ fontSize: 32 }}><span>{lead}</span><span><mark>{mark}</mark></span></h1>
      <p className="ocf2-hero-sub">{sub}</p>
    </div>
  );
}

function Opt({ i, on, tone, icon, title, sub, arrow, onClick }: { i: number; on: boolean; tone: string; icon: ReactNode; title: string; sub: string; arrow?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ocf2-dn-opt${on ? " is-on" : ""}`} aria-pressed={on} style={{ "--i": i } as React.CSSProperties} onClick={onClick}>
      <span aria-hidden className={`ocf2-dn-opt-ic ocf2-t-${tone}`}>{icon}</span>
      <span className="ocf2-dn-opt-t"><b>{title}</b><small>{sub}</small></span>
      <span aria-hidden className={`ocf2-dn-opt-ck${arrow && !on ? " is-arrow" : ""}`}>{arrow && !on ? <CaretRight size={15} weight="bold" /> : <Check size={15} weight="bold" />}</span>
    </button>
  );
}

function NextBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="ocf2-btn ocf2-btn--primary is-block ocf2-dn-next" style={{ minHeight: 54 }} disabled={disabled} onClick={onClick}>
      Next <ArrowRight size={18} weight="bold" />
    </button>
  );
}

/* ── one step before the page: name and email, then the code ───────── */
function Gate({ answers, note, onSignedIn, onBack }: { answers: DonorAnswers; note: string | null; onSignedIn: (s: DonorSession) => void; onBack?: () => void }) {
  const asked = useMemo(() => loadAsked(), []);
  const [mode, setMode] = useState<"ask" | "code">(asked ? "code" : "ask");
  const [how, setHow] = useState<"team" | "emailed" | "have">(asked?.how ?? "team");
  const [name, setName] = useState(asked?.name ?? "");
  const [email, setEmail] = useState(asked?.email ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [error, setError] = useState<string | null>(note);
  const clean = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  const nameOk = name.trim().length >= 2;
  const first = name.trim().split(/\s+/)[0] || "";

  useEffect(() => { setError(note); setGBusy(false); }, [note]);
  // The fit rule: one page, no scroll (2026-11-11).
  const fitRef = useFitScreen<HTMLDivElement>(5, [mode, error, how]);

  const ask = async () => {
    if (!emailOk || !nameOk || busy) return;
    setBusy(true); setError(null);
    try {
      const h = await donorAskForCode(name, clean, answers);
      saveAsked({ name: name.trim(), email: clean, how: h });
      setHow(h); setCode(""); setMode("code");
    } catch (e) { setError(e instanceof ApiError && e.status === 0 ? "No connection. Try again in a moment." : "We could not take your request just now. Please try again in a moment."); }
    finally { setBusy(false); }
  };
  const open = async () => {
    if (code.length < 6 || !emailOk || busy) return;
    setBusy(true); setError(null);
    try { const s = await donorCodeLogin(clean, code, name.trim()); saveAsked(null); onSignedIn(s); }
    catch (e) { setError(e instanceof ApiError && e.status === 0 ? "No connection. Try again in a moment." : "That code did not match this email. Check both and try again."); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setGBusy(true); setError(null);
    const url = donorGoogleUrl(GOOGLE_RETURN);
    if (Capacitor.isNativePlatform()) { try { await Browser.open({ url }); } catch { setGBusy(false); setError("Google sign-in did not open. Ask for your code instead."); } }
    else leaveTo(url);
  };

  return (
    <div ref={fitRef} className="ocf2 ocf2-page--door ocf2-dn-q ocf2-fitpage ocf2-fitpage--gate" key={mode}>
      <section className="ocf2-hero ocf2-t-butter ocf2-dn-ready">
        <span className="ocf2-fitback"><BackButton href="/start" onClick={onBack} /></span>
        <div className="ocf2-hero-art"><GiftArt width={mode === "ask" ? 80 : 64} /></div>
        {mode === "ask"
          ? <h1 className="ocf2-h1"><span>Your page <mark>is ready.</mark></span></h1>
          : how === "have"
            ? <h1 className="ocf2-h1"><span>Welcome <mark>back.</mark></span></h1>
            : <h1 className="ocf2-h1"><span>Thank you{first ? `, ${first}` : ""}.</span><span><mark>Your code is coming.</mark></span></h1>}
        <p className="ocf2-hero-sub" style={{ color: "#574A0E" }}>
          {mode === "ask" ? "Tell us who you are, and an assistant from Collective Kindness will reach out to give you your code."
            : how === "team" ? "An assistant from Collective Kindness will reach out to give you your code. When you have it, enter it here."
            : how === "emailed" ? "We emailed your code. Enter it here to open your page."
            : "Enter your email and the code you were given."}
        </p>
        {mode === "ask" && (
          <div className="ocf2-dn-picked">
            {answers.interests.map((i) => <span key={i}>{interestLabel(i)}</span>)}
            <span>{answers.city || "Every city"}</span>
          </div>
        )}
      </section>

      {mode === "ask" && (
        <>
          <label>
            <span className="ocf2-label">Your name</span>
            <input className="ocf2-input" autoComplete="name" autoCapitalize="words" placeholder="First and last name" value={name} onChange={(e) => { setName(e.target.value.slice(0, 80)); setError(null); }} />
          </label>
          <label>
            <span className="ocf2-label">Your email</span>
            <input className="ocf2-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="The email you give with" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void ask(); }} />
          </label>
          <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={!emailOk || !nameOk || busy} onClick={() => void ask()}>{busy ? "Sending…" : "Request my code"}</button>
          <button type="button" className="ocf2-link" style={{ alignSelf: "center" }} onClick={() => { setHow("have"); setMode("code"); setError(null); }}>I already have my code</button>
          <div className="ocf2-or">or</div>
          <button type="button" className="ocf2-gbtn" onClick={() => void google()} disabled={gBusy}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {gBusy ? "Opening Google…" : "Continue with Google"}
          </button>
        </>
      )}

      {mode === "code" && (
        <>
          <label>
            <span className="ocf2-label">Your email</span>
            <input className="ocf2-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="The email you give with" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          </label>
          <label>
            <span className="ocf2-label">Your code</span>
            <input className="ocf2-input ocf2-ak-codein" aria-label="Your code" autoCapitalize="characters" autoCorrect="off" autoComplete="one-time-code" spellCheck={false} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void open(); }} />
          </label>
          <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={code.length < 6 || !emailOk || busy} onClick={() => void open()}>{busy ? "Checking…" : "Open my page"}</button>
          <button type="button" className="ocf2-link" style={{ alignSelf: "center", color: "var(--oc-mid)" }} onClick={() => { saveAsked(null); setMode("ask"); setHow("team"); setCode(""); setError(null); }}>{how === "have" ? "I need a code" : "Ask again with a different email"}</button>
        </>
      )}

      {error && <div className="ocf2-gentle" role="alert">{error}</div>}
      <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px" }}>No password. We never share your email.</p>
    </div>
  );
}

/* ── the impact page ───────────────────────────────────────────────────
   2026-11-11 (Leivi's notes, Shalom: "way more emotional ... be in the
   head of donors"). Each interest is its own page: only that program's
   moment, numbers and ask. The city card and "Adopt a family" belong to
   CK families ("Wherever it is needed") and show nowhere else. Every
   section opens on one small human moment, then the number as proof, then
   what gifts like theirs did. Numbers are the live ones; nothing invented. */
function Impact({ session, answers, impact, loading, failed, onRetry, onRedo, onSignOut, onExpired, onGive, onGiveRaise, onAllRaises }: {
  session: DonorSession; answers: DonorAnswers; impact?: DonorImpact; loading: boolean; failed: boolean; onRetry: () => void;
  onRedo: () => void; onSignOut: () => void; onExpired: () => void; onGive: (cause?: Interest) => void;
  onGiveRaise: (slug: string) => void; onAllRaises: () => void;
}) {
  const adoptRouter = useIonRouter();
  const meQ = useQuery<DonorMe>({ queryKey: ["donor-me", session.token], queryFn: () => fetchDonorMe(session), staleTime: 60_000, retry: 0 });
  useEffect(() => { if (meQ.error instanceof ApiError && meQ.error.status === 401) onExpired(); }, [meQ.error, onExpired]);

  // "Tell me when a new raise opens": the CRM's answer, then whatever they
  // tap here. null = that part of the CRM is not switched on, so nothing shows.
  const [alertLocal, setAlertLocal] = useState<boolean | null>(null);
  const [alertBusy, setAlertBusy] = useState(false);
  const alerts: boolean | null = alertLocal ?? meQ.data?.raiseAlerts ?? null;
  const setAlerts = async (on: boolean): Promise<boolean> => {
    if (alertBusy) return false;
    setAlertBusy(true);
    const ok = await setRaiseAlerts(session, on);
    if (ok) setAlertLocal(on);
    setAlertBusy(false);
    return ok;
  };

  const picked = answers.interests.length ? answers.interests : (["general"] as Interest[]);
  const rest = (["general", "education", "debt", "single_mothers"] as Interest[]).filter((i) => !picked.includes(i));
  const first = (meQ.data?.name || session.name || "").trim().split(/\s+/)[0];
  const hasFamilies = picked.includes("general");
  const cityRow = useMemo(() => (answers.city && impact ? impact.cities.find((c) => c.city.toLowerCase() === answers.city!.toLowerCase()) ?? null : null), [answers.city, impact]);
  // "Since March 2024 you have been part of this.": only for a donor with gifts on file.
  const g = meQ.data?.giving;
  const since = g && g.count > 0 && g.firstDate ? day(g.firstDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;

  return (
    <div className="ocf2 ocf2-page--door ocf2-dn-q ocf2-dn-impact">
      <div className="ocf2-dn-ask">
        <span className="ocf2-dn-count"><i className="ocf2-ak-dot" aria-hidden />{impact?.live ? "Live from the CK team's system" : "Your impact page"}</span>
        <h1 className="ocf2-h1" style={{ fontSize: 30 }}>
          <span>{first ? `${first}, this is` : "This is"}</span>
          <span><mark>what your giving does.</mark></span>
        </h1>
        <div className="ocf2-dn-picked is-plain">
          {picked.map((i) => <span key={i}>{interestLabel(i)}</span>)}
          {hasFamilies && <span>{answers.city || "Every city"}</span>}
          <button type="button" onClick={onRedo}>Change</button>
        </div>
      </div>

      {loading && !impact && <div className="ocf2-skel" style={{ height: 190 }} />}
      {failed && !impact && (
        <Panel><p className="ocf2-p">The numbers did not load. Check your connection.</p><div><button type="button" className="ocf2-btn ocf2-btn--light" onClick={onRetry}>Try again</button></div></Panel>
      )}

      {impact && picked.map((id, k) => (
        <Program key={id} id={id} impact={impact} i={k} since={k === 0 ? since : null} onGive={() => onGive(id)}>
          {id === "general" && (
            <>
              {answers.city && (
                <div className="ocf2-dn-city-in">
                  <span className="ocf2-dn-k"><MapPin size={15} weight="fill" /> {answers.city}</span>
                  {cityRow ? (
                    <p className="ocf2-dn-cityline"><Ticker to={cityRow.families} className="ocf2-dn-cityn" run={1} /> families in {cityRow.city} carried by CK</p>
                  ) : (
                    <p className="ocf2-dn-line">{impact.cities.length
                      ? `We do not have enough families in ${answers.city} yet to show a number without pointing at anyone. Here is where CK is working now.`
                      : `Your city is saved. The count for ${answers.city} will show here as soon as it is switched on.`}</p>
                  )}
                  {impact.cities.length > 0 && (
                    <div className="ocf2-dn-cities">
                      {impact.cities.filter((c) => c.city !== cityRow?.city).slice(0, 4).map((c) => <span key={c.city}><b>{c.families}</b>{c.city}</span>)}
                    </div>
                  )}
                </div>
              )}
              <button type="button" className="oad-entry" onClick={() => adoptRouter.push("/start/adopt")}>
                <span className="oad-entry-art" aria-hidden><i /><i /><i /></span>
                <span className="oad-entry-t"><b>Adopt a family</b><small>Stand behind one family for a year. Matched by our team, private both ways.</small></span>
                <span className="oad-entry-go" aria-hidden>›</span>
              </button>
            </>
          )}
        </Program>
      ))}

      <RaisesNow session={session} interests={picked} alerts={alerts} onAlerts={setAlerts} onGiveRaise={onGiveRaise} onAll={onAllRaises} />

      <Giving q={meQ} demo={isDonorDemo(session)} onGive={() => onGive(picked.length === 1 ? picked[0] : undefined)} monthly={answers.give === "monthly"} />

      {impact && rest.length > 0 && (
        <>
          <div className="ocf2-ak-sech"><h2>Also happening</h2></div>
          <div className="ocf2-dn-also">
            {rest.map((id) => <Small key={id} id={id} impact={impact} />)}
          </div>
        </>
      )}

      {alerts != null && (
        <div className="orz-foot">
          <span><b>New raise emails</b><small>{alerts ? `On. We email ${session.email || "you"} when a new raise is published.` : "Off."}</small></span>
          <button type="button" role="switch" aria-checked={alerts} aria-label="Email me when a new raise is published" className={`orz-switch${alerts ? " is-on" : ""}`} disabled={alertBusy} onClick={() => void setAlerts(!alerts)}><i aria-hidden /></button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <button type="button" className="ocf2-quiet" onClick={onRedo}>Change my answers</button>
        <button type="button" className="ocf2-quiet" onClick={() => { window.location.assign("/app-settings"); }}>Settings and feedback</button>
        <button type="button" className="ocf2-quiet" onClick={onSignOut}>Sign out</button>
      </div>
      {session.email && <p className="ocf2-meta" style={{ textAlign: "center", marginTop: -8 }}>Signed in as {session.email}{session.email === DONOR_DEMO_EMAIL ? " (sample donor)" : ""}</p>}
    </div>
  );
}

interface BlockView {
  tone: string; kicker: string; icon: ReactNode; big: number | null; money?: boolean; unit: string; subs: { v: string; l: string }[]; line?: string;
  /** One small human moment, before any number. Two short lines. */
  moment: [string, string];
  /** What gifts like theirs did. */
  because: string;
  /** The ask, in this program's own words. */
  ask: string;
}

function view(id: Interest, m: DonorImpact): BlockView {
  if (id === "education") {
    const e = m.education;
    return { tone: "lilac", kicker: "Financial education", icon: <GraduationCap size={15} weight="fill" />, big: e?.students ?? null, unit: "couples and singles in CK Academy",
      subs: e ? [{ v: e.accountsOpened.toLocaleString("en-US"), l: "retirement accounts opened" }, { v: usd(e.monthlyAutomated), l: "now invested every month" }] : [],
      line: e && e.last7 > 0 ? `${e.last7} more signed up this week.` : undefined,
      moment: ["Married three months. Tonight, for the first time, they open the bank app together.", "Nobody is hiding a number. That is where a steady home starts."],
      because: "Gifts like yours keep the course open to every couple, with a guidance counselor to talk it through.",
      ask: "Give to financial education" };
  }
  if (id === "debt") {
    const d = m.debt;
    const subs: { v: string; l: string }[] = [];
    if (d?.clients != null) subs.push({ v: d.clients.toLocaleString("en-US"), l: "people helped with debt" });
    if (d?.avgAprBefore != null && d?.avgAprAfter != null) subs.push({ v: `${Math.round(d.avgAprBefore)}% to ${Math.round(d.avgAprAfter)}%`, l: "average card rate, before and after" });
    return { tone: "sky", kicker: "Debt help", icon: <Scales size={15} weight="fill" />, big: d?.moneySaved ?? null, money: true, unit: "saved in interest and settlements", subs,
      moment: ["There is an envelope on the fridge. It has been there three weeks. Nobody opens it.", "Then one call with a debt expert, and the number finally has a plan next to it."],
      because: "Because of gifts like yours, someone who knows the way out is on the other end of that call.",
      ask: "Give to debt help" };
  }
  if (id === "single_mothers") {
    const s = m.singleMothers;
    return { tone: "rose", kicker: "Single parents", icon: <HandHeart size={15} weight="fill" />, big: s?.families ?? null, unit: "single-parent families with a plan and a team",
      subs: s?.children != null ? [{ v: s.children.toLocaleString("en-US"), l: "children at home" }] : [],
      line: s?.families == null ? "Single parents are among the families CK carries. Their own count shows here as soon as it is switched on." : undefined,
      moment: ["The children are asleep. She is at the kitchen table with the bills, and there is no one to hand the worry to.", "Now there is. A case manager who knows her plan picks up the phone."],
      because: "Because of gifts like yours, she does not carry it alone.",
      ask: "Stand with a single parent" };
  }
  const g = m.general;
  const subs: { v: string; l: string }[] = [];
  if (g?.activeFamilies != null) subs.push({ v: g.activeFamilies.toLocaleString("en-US"), l: "in the program today" });
  if (g?.graduated) subs.push({ v: g.graduated.toLocaleString("en-US"), l: "graduated" });
  return { tone: "mint", kicker: "Families", icon: <HouseLine size={15} weight="fill" />, big: g?.families ?? null, unit: "families carried by CK so far", subs,
    moment: ["Two working parents. The paycheck ends before the month does, and they have told no one.", "For one year a whole team sits beside them, until they stand on their own."],
    because: "Because of gifts like yours, a family gets a team beside them, not only a check.",
    ask: "Give to a family's year" };
}

/** One program, start to finish: the moment, the proof, what gifts did, the ask. */
function Program({ id, impact, i, since, onGive, children }: { id: Interest; impact: DonorImpact; i: number; since: string | null; onGive: () => void; children?: ReactNode }) {
  const v = view(id, impact);
  return (
    <section className={`ocf2-dn-prog ocf2-dn-prog--${v.tone}`} style={{ "--i": i } as React.CSSProperties}>
      <div className="ocf2-dn-moment">
        <div className="ocf2-dn-momenthead">
          <span className="ocf2-dn-k">{v.icon} {v.kicker}</span>
          <Oil name={id === "education" ? "phone2" : id === "debt" ? "fridge" : id === "single_mothers" ? "table" : "family"} w={104} />
        </div>
        <p className="ocf2-dn-m1">{v.moment[0]}</p>
        <p className="ocf2-dn-m2">{v.moment[1]}</p>
      </div>
      <div className={`ocf2-dn-block ocf2-t-${v.tone}`}>
        {v.big != null && (
          <>
            <Ticker to={Math.round(v.big)} className="ocf2-dn-n" prefix={v.money ? "$" : ""} />
            <span className="ocf2-dn-u">{v.unit}</span>
          </>
        )}
        {v.line && <p className="ocf2-dn-line">{v.line}</p>}
        {v.subs.length > 0 && (
          <div className={`ocf2-dn-s${v.subs.length === 1 ? " is-one" : ""}`}>
            {v.subs.map((s) => <div key={s.l}><b>{s.v}</b><span>{s.l}</span></div>)}
          </div>
        )}
      </div>
      <p className="ocf2-dn-because">{v.because}{since ? <> <b>Since {since} you have been part of this.</b></> : null}</p>
      {children}
      <button type="button" className="ocf2-btn ocf2-btn--light is-block ocf2-dn-askbtn" onClick={onGive}>{v.ask} <CaretRight size={16} weight="bold" /></button>
    </section>
  );
}

function Small({ id, impact }: { id: Interest; impact: DonorImpact }) {
  const v = view(id, impact);
  if (v.big == null) return null;
  return (
    <div className={`ocf2-dn-small ocf2-t-${v.tone}`}>
      <b>{v.money ? short(v.big) : Math.round(v.big).toLocaleString("en-US")}</b>
      <span>{v.unit}</span>
    </div>
  );
}

/** The donor's own giving, and only theirs (Leivi: "if this is about me it
 *  should just be about me"). Light card, ink numbers. */
function Giving({ q, demo, monthly, onGive }: { q: { data?: DonorMe; isLoading: boolean; error: unknown }; demo: boolean; monthly: boolean; onGive: () => void }) {
  const g = q.data?.giving;
  const notLive = donorNotLive(q.error);
  const year = new Date().getFullYear();
  return (
    <section className="ocf2-dn-give">
      <div className="ocf2-dn-give-h">
        <span className="ocf2-dn-k">Your giving{demo ? " (sample)" : ""}</span>
        {g?.monthly ? <span className="ocf2-dn-give-mo">{usd(g.monthly)} every month</span> : null}
      </div>
      {q.isLoading && <div className="ocf2-skel" style={{ height: 90 }} />}
      {g && g.count > 0 && (
        <>
          <div>
            <Ticker to={Math.round(g.total)} className="ocf2-dn-n" prefix="$" />
            <span className="ocf2-dn-u">{g.count} {g.count === 1 ? "gift" : "gifts"}{g.firstDate ? ` since ${day(g.firstDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""}</span>
          </div>
          <p className="ocf2-dn-give-line">{g.count === 1 ? "One gift. It reached a family." : `${g.count} gifts. Every one of them reached a family.`}</p>
          {g.years.length > 1 && (
            <div className="ocf2-dn-years"><MiniBars height={92} bars={g.years.map((y) => ({ label: `${y.year} · ${short(y.total)}`, n: y.total, hi: y.year === year }))} /></div>
          )}
          {g.recent.length > 0 && (
            <ul className="ocf2-dn-recent">
              {g.recent.slice(0, 4).map((r, k) => (
                <li key={k}><span>{day(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}<small>{r.label}{r.recurring ? " · monthly" : ""}</small></span><b>{usd(r.amount)}</b></li>
              ))}
            </ul>
          )}
        </>
      )}
      {g && g.count === 0 && <p className="ocf2-dn-line">No gifts under this email yet. Your first one shows up here, and every one after it.</p>}
      {!g && !q.isLoading && <p className="ocf2-dn-line">{notLive ? "Your giving history is being switched on. It will fill in here on its own." : "Your giving did not load. Pull down or come back in a moment."}</p>}
      <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} onClick={onGive}>
        {monthly && !g?.monthly ? "Start a monthly gift" : "Make a gift"} <CaretRight size={18} weight="bold" />
      </button>
    </section>
  );
}

export default DonorPage;

/* ── raises: CK's live campaigns, one card each (Shalom 2026-11-11) ────────
   The general fund is not a raise: it stays the page's main give button.
   Raises that match what the donor picked lead. At most three here (two when
   one program was picked), then "See all raises". Nothing renders until the
   CRM's list answers, so a CRM without the route simply shows no section. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function RaiseCard({ r, tag, i, onGive }: { r: Raise; tag?: string | null; i: number; onGive: () => void }) {
  const pct = r.goal ? Math.max(r.raised > 0 ? 4 : 0, Math.min(100, Math.round((r.raised / r.goal) * 100))) : null;
  return (
    <article className="orz-card gv-rise" style={{ "--i": i } as React.CSSProperties}>
      {tag && <span className="orz-tag">{tag}</span>}
      <h3 className="orz-name">{r.name}</h3>
      {r.line && <p className="orz-line">{r.line}</p>}
      {pct != null && <div className="orz-bar" role="img" aria-label={`${usd0(r.raised)} of ${usd0(r.goal!)} raised`}><i style={{ width: `${pct}%` }} /></div>}
      <div className="orz-row">
        <span className="orz-nums">
          {r.raised > 0 || r.goal ? <><b>{usd0(r.raised)}</b>{r.goal ? ` of ${usd0(r.goal)}` : " raised"}</> : <b className="orz-first">Be the first to give</b>}
          {r.gifts > 0 && <small>{r.gifts} {r.gifts === 1 ? "gift" : "gifts"}</small>}
        </span>
        <button type="button" className="ocf2-btn ocf2-btn--primary orz-give" onClick={onGive} aria-label={`Give to ${r.name}`}>Give</button>
      </div>
    </article>
  );
}

const TAG: Partial<Record<Interest, string>> = { single_mothers: "For single parents", debt: "For debt help", education: "For financial education" };
const tagFor = (r: Raise, interests: Interest[]) => { const hit = interests.find((k) => raiseMatches(r, [k])); return hit ? TAG[hit] ?? null : null; };

function RaisesNow({ session, interests, alerts, onAlerts, onGiveRaise, onAll }: {
  session: DonorSession; interests: Interest[]; alerts: boolean | null; onAlerts: (on: boolean) => Promise<boolean>; onGiveRaise: (slug: string) => void; onAll: () => void;
}) {
  const q = useQuery({ queryKey: ["donor-raises", isDonorDemo(session)], queryFn: () => fetchRaises(session), staleTime: 60_000, retry: 0 });
  const [hidden, setHidden] = useState(() => raiseAskHidden());
  const [justOn, setJustOn] = useState(false);
  const [missed, setMissed] = useState(false);
  const all = q.data?.raises ?? [];
  if (!all.length) return null;
  const ordered = orderRaises(all, interests);
  const focus = interests.length === 1 && interests[0] !== "general" && ordered.some((r) => raiseMatches(r, interests));
  const shown = ordered.slice(0, focus ? 2 : 3);
  const tellMe = async () => { setMissed(false); const ok = await onAlerts(true); if (ok) { setJustOn(true); hideRaiseAsk(false); } else setMissed(true); };
  return (
    <>
      <div className="ocf2-ak-sech"><h2>Raises happening now</h2>{q.data?.sample ? <span>Sample</span> : null}</div>
      <div className="orz-list">
        {shown.map((r, k) => <RaiseCard key={r.slug} r={r} i={k} tag={tagFor(r, interests)} onGive={() => onGiveRaise(r.slug)} />)}
        {all.length > shown.length && (
          <button type="button" className="orz-all" onClick={onAll}>
            <span>See all raises<small>{all.length} open now</small></span><CaretRight size={16} weight="bold" aria-hidden />
          </button>
        )}
      </div>
      {alerts != null && justOn && (
        <div className="orz-ask is-on" role="status">
          <b>You are on the list.</b>
          <p>We will email {session.email || "you"} when a new raise is published. Nothing else.</p>
        </div>
      )}
      {alerts === false && !justOn && !hidden && (
        <div className="orz-ask">
          <b>Want to know when a new raise opens?</b>
          <p>We will email you when a new raise is published. Nothing else.</p>
          <div className="orz-ask-a">
            <button type="button" className="ocf2-btn ocf2-btn--primary" onClick={() => void tellMe()}>Tell me</button>
            <button type="button" className="ocf2-quiet" onClick={() => { hideRaiseAsk(); setHidden(true); }}>No thanks</button>
          </div>
          {missed && <p className="orz-miss" role="alert">We could not save that just now. Try again in a little while.</p>}
        </div>
      )}
    </>
  );
}

/** Every open raise, on its own screen. The general fund sits at the foot. */
function RaisesAll({ session, answers, onGiveRaise, onGiveGeneral }: { session: DonorSession; answers: DonorAnswers; onGiveRaise: (slug: string) => void; onGiveGeneral: () => void }) {
  const q = useQuery({ queryKey: ["donor-raises", isDonorDemo(session)], queryFn: () => fetchRaises(session), staleTime: 60_000, retry: 0 });
  const interests = answers.interests.length ? answers.interests : (["general"] as Interest[]);
  const ordered = orderRaises(q.data?.raises ?? [], interests);
  return (
    <div className="ocf2 ocf2-page--door ocf2-dn-q">
      <div className="ocf2-dn-ask">
        <span className="ocf2-dn-count"><i className="ocf2-ak-dot" aria-hidden />{q.data?.sample ? "Sample raises" : "Open now"}</span>
        <h1 className="ocf2-h1" style={{ fontSize: 30 }}><span>All <mark>raises</mark></span></h1>
        <p className="ocf2-hero-sub" style={{ margin: 0 }}>Each one is a real need the team is raising for right now.</p>
      </div>
      {q.isLoading && <div className="ocf2-skel" style={{ height: 160 }} />}
      {!q.isLoading && ordered.length === 0 && <Panel><p className="ocf2-p" style={{ margin: 0 }}>No raises are open right now.</p></Panel>}
      <div className="orz-list">
        {ordered.map((r, k) => <RaiseCard key={r.slug} r={r} i={k} tag={tagFor(r, interests)} onGive={() => onGiveRaise(r.slug)} />)}
      </div>
      <button type="button" className="orz-all" onClick={onGiveGeneral}>
        <span>Give where it is needed most<small>The general fund</small></span><CaretRight size={16} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
