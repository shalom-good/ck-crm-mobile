import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter, useIonViewWillEnter } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { CaretRight, Check, LockSimple } from "@phosphor-icons/react";
import { openExternal } from "@/lib/external";
import { success, tapLight } from "@/lib/haptics";
import { loadStripeJs } from "@/lib/giveApi";
import {
  fetchKdhPlus, isSampleLink, kdhPlusAction, loadPlaidJs,
  type BudgetKey, type KdhPlusState, type PlusAction, type PlusPlan, type PlusPref, type PlusResult,
} from "@/lib/kdhPlusApi";
import { BackButton } from "@/components/BackButton";
import { Loading, OBtn, Panel, SoftError } from "@/components/orchard/family/FamKit";
import { PlusIllo, type IlloName } from "@/components/kdh/PlusIllos";
import { KDH_PLUS_KEY } from "./kdhShared";

/**
 * ORCHARD (2026-11-11): KDH Plus. A KDH client adds a budget and a budgeter
 * on top of the debt plan, in one sitting:
 *   a few questions → bank or five typed numbers → the money test (when the
 *   CRM has it on) → sessions through Stripe → matched, first call picked.
 * The CRM owns the step (state.step); this page only decides which screen
 * of that step to show and lets the person walk back to earlier ones.
 * The debt expert is two links away on every screen.
 */
type View = "intro" | "questions" | "bank" | "budget" | "test" | "result" | "pay" | "match" | "booked";
type PayStage = "choose" | "loading" | "card" | "confirming" | "sample" | "blocked";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const PREF_KEY = "ck.kdhplus.pref";
const SETTLED = ["succeeded", "processing", "requires_capture"];
const PREFS: [PlusPref, string][] = [["man", "A man"], ["woman", "A woman"], ["any", "Either"]];
const TONES: Record<BudgetKey, string> = { income: "mint", bills: "sky", daily: "butter", yearly: "lilac", owed: "peach" };
const PATTERN_ART: Record<string, IlloName> = { O: "hand", H: "search", K: "family", Q: "jar", S: "path" };
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] || String(n);

const when = (iso: string | null) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const dayShort = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const dayLong = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long" });
const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const nBooked = (s: KdhPlusState) => s.sessions.list.filter((x) => x.status === "booked" || x.status === "done").length;

function viewFor(s: KdhPlusState): View {
  switch (s.step) {
    case "questions": return s.started ? "questions" : "intro";
    case "bank": return s.budget.have || s.budget.pending ? "budget" : "bank";
    case "test": return "test";
    case "sessions": return "pay";
    case "budgeter": return "match";
    default: return "booked";
  }
}
const firstOpen = (s: KdhPlusState) => Math.max(0, Math.min(s.questions.length - 1, s.questions.findIndex((q) => !s.answers[q.key]) < 0 ? s.questions.length - 1 : s.questions.findIndex((q) => !s.answers[q.key])));

/** Stripe needs an https address to come back to after a bank check. */
function returnUrl(): string {
  const { protocol, origin } = window.location;
  return /^https?:$/.test(protocol) ? `${origin}/kdh/plus` : "https://ck-crm-mobile.vercel.app/kdh/plus";
}

export function KdhPlusPage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const [st, setSt] = useState<KdhPlusState | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [view, setView] = useState<View>("intro");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // questions + test
  const [qi, setQi] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [ti, setTi] = useState(0);
  const [tpicks, setTpicks] = useState<Record<string, number>>({});
  // bank + budget
  const [bankOff, setBankOff] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<BudgetKey, string>>>({});
  const [editing, setEditing] = useState<Partial<Record<BudgetKey, boolean>>>({});
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState<string | null>(null);
  // sessions
  const [plan, setPlan] = useState<PlusPlan>("pack");
  const [pref, setPref] = useState<PlusPref | null>(null);
  const [stage, setStage] = useState<PayStage>("choose");
  const [blocked, setBlocked] = useState("");
  const [charge, setCharge] = useState<{ amount: number; sessions: number } | null>(null);
  // budgeter
  const [slot, setSlot] = useState<string | null>(null);
  const [shown, setShown] = useState(6);
  const [slotsAsked, setSlotsAsked] = useState(false);

  const viewRef = useRef(view); viewRef.current = view;
  /** Confirmed sessions at the last look: one more means the calendar confirmed a time. */
  const bookedRef = useRef(0);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const peRef = useRef<any>(null);

  /** Take a fresh state from the server. Open times only come when asked
   *  for, so a state without them keeps the ones already on screen. */
  const apply = useCallback((s: KdhPlusState, hasSlots: boolean) => {
    setSt((prev) => {
      const next = hasSlots ? s : { ...s, slots: prev?.budgeter && s.budgeter && prev.budgeter.firstName === s.budgeter.firstName ? prev.slots : null };
      qc.setQueryData(KDH_PLUS_KEY, next);
      return next;
    });
    if (hasSlots) setSlotsAsked(true);
    if (s.genderPref) setPref((p) => p || s.genderPref);
    return s;
  }, [qc]);

  const go = (v: View) => { setErr(null); setNote(null); setView(v); };

  /** One POST. Shows the server's own words when it says no. */
  const run = async (body: PlusAction, hasSlots = false): Promise<PlusResult | null> => {
    setBusy(body.action); setErr(null);
    try {
      const r = await kdhPlusAction(body);
      if (r.state) apply(r.state, hasSlots);
      return r;
    } catch (e: any) {
      setErr(e?.status === 401 ? "Please sign in again." : e?.message || "That did not go through. Check your connection and try again.");
      return null;
    } finally { setBusy(null); }
  };

  const load = useCallback(async (first: boolean) => {
    try {
      let s = await fetchKdhPlus(false);
      const wantSlots = !!s.budgeter && (s.step === "budgeter" || viewRef.current === "match");
      if (wantSlots) { try { s = await fetchKdhPlus(true); } catch { /* keep the state without times */ } }
      apply(s, wantSlots);
      setLoadErr(false);
      if (first) {
        setPicks(s.answers || {});
        setQi(firstOpen(s));
        setTi(s.test ? Math.min(s.test.answered, s.test.questions.length - 1) : 0);
        setView(viewFor(s));
      } else if (viewRef.current === "match" && s.step === "done" && nBooked(s) > bookedRef.current) { void success(); setView("booked"); }
      bookedRef.current = nBooked(s);
      return s;
    } catch { if (first) setLoadErr(true); return null; }
  }, [apply]);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    // Back from a bank's own check on the card (3-D Secure): finish here.
    const sp = new URLSearchParams(window.location.search);
    const pi = sp.get("payment_intent");
    const failed = sp.get("redirect_status") === "failed";
    if (pi) { try { window.history.replaceState(null, "", window.location.pathname); } catch { /* noop */ } }
    void load(true).then((s) => {
      if (!s || !pi || !/^pi_[A-Za-z0-9]+$/.test(pi)) return;
      if (failed) { setView("pay"); setErr("That payment did not go through. Nothing was charged. Please try again."); return; }
      void credit(pi);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Coming back to the page (or to the app from the calendar page): look again.
  useIonViewWillEnter(() => { if (loaded.current && st) void load(false); }, [st, load]);
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible" && (viewRef.current === "match" || viewRef.current === "booked")) void load(false); };
    document.addEventListener("visibilitychange", on);
    window.addEventListener("focus", on);
    return () => { document.removeEventListener("visibilitychange", on); window.removeEventListener("focus", on); };
  }, [load]);
  // The budgeter's open times, the first time that screen opens.
  useEffect(() => {
    if (view !== "match" || !st?.budgeter || slotsAsked) return;
    void fetchKdhPlus(true).then((s) => apply(s, true)).catch(() => setSlotsAsked(true));
  }, [view, st?.budgeter, slotsAsked, apply]);

  function dropStripe() {
    try { peRef.current?.destroy(); } catch { /* already gone */ }
    peRef.current = null; elementsRef.current = null; stripeRef.current = null;
  }
  useEffect(() => () => dropStripe(), []);
  // Mount Stripe's fields only once their container is on the page.
  useEffect(() => {
    if (view !== "pay" || (stage !== "card" && stage !== "confirming")) return;
    const elements = elementsRef.current;
    if (!elements || peRef.current || !document.getElementById("okp-pe")) return;
    try {
      const pe = elements.create("payment", { layout: "tabs" });
      pe.mount("#okp-pe");
      peRef.current = pe;
    } catch (e: any) { setErr(e?.message || "The card form could not load. Please try again."); }
  }, [view, stage]);

  if (!st) {
    return (
      <Frame>
        <div className="okp-top"><BackButton href="/kdh/homework" /></div>
        {loadErr ? <SoftError onRetry={() => { setLoadErr(false); void load(true); }}>We could not load KDH Plus. Check your connection and try again.</SoftError> : <Loading />}
      </Frame>
    );
  }

  const expert = st.expert;
  const hasTest = !!st.test;
  const total = st.steps.length;
  const at = (k: string) => Math.max(1, st.steps.indexOf(k as (typeof st.steps)[number]) + 1);
  const bankOn = st.budget.bankReady && !bankOff;
  const paid = st.sessions.bought > 0;

  const afterTest = (s: KdhPlusState): View => (s.sessions.bought > 0 ? (s.step === "done" ? "booked" : "match") : "pay");
  const afterBudget = (s: KdhPlusState): View => {
    if (s.test && !s.test.done) { setTi(Math.min(s.test.answered, s.test.questions.length - 1)); return "test"; }
    return afterTest(s); // no pattern screen for the client (Shalom 2026-11-11: "erase it")
  };
  const leave = () => router.push("/kdh/homework", "back", "pop");

  const back = () => {
    setErr(null); setNote(null);
    if (view === "questions") { if (qi > 0) setQi(qi - 1); else setView("intro"); return; }
    if (view === "bank") { setQi(st.questions.length - 1); setView("questions"); return; }
    if (view === "budget") { setView("bank"); return; }
    if (view === "test") { if (ti > 0) setTi(ti - 1); else setView("budget"); return; }
    if (view === "result") { setTi((st.test?.questions.length || 1) - 1); setView("test"); return; }
    if (view === "pay") {
      if (stage !== "choose") { dropStripe(); setStage("choose"); return; }
      setView(st.pattern ? "result" : "budget"); return;
    }
    if (view === "match") { setView(st.pattern ? "result" : "budget"); return; }
    leave();
  };

  /** The two always-there links to the debt expert. */
  const link = (url: string | null | undefined) => {
    if (!url) return;
    if (isSampleLink(url)) { setNote("Sample: nothing was opened. A real client goes to WhatsApp or the calendar from here."); return; }
    void openExternal(url);
  };
  const help = expert && (expert.whatsapp || expert.followUp) ? (
    <div className="okp-help">
      <span>{view === "pay" ? "Cost a problem?" : `Need ${expert.firstName || "your debt expert"}?`}</span>
      {expert.whatsapp ? <button type="button" onClick={() => link(expert.whatsapp)}>{view === "pay" ? `Talk to ${expert.firstName || "your debt expert"}` : "Send a message"}</button> : null}
      {expert.whatsapp && expert.followUp ? <span aria-hidden>·</span> : null}
      {expert.followUp ? <button type="button" onClick={() => link(expert.followUp)}>Book a follow-up call</button> : null}
    </div>
  ) : null;
  const notices = (<>
    {note ? <p className="okp-note" role="status">{note}</p> : null}
    {err ? <p className="okp-err" role="alert">{err}</p> : null}
  </>);
  const top = (n: number, of: number, label: string, pct: number) => (
    <div className="okp-top">
      <BackButton onClick={back} />
      <div className="okp-bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <span className="okp-step">{label} {n} of {of}</span>
    </div>
  );
  const cta = (label: ReactNode, onClick: () => void, disabled = false) => (
    <button type="button" className="ocf2-btn ocf2-btn--primary is-block okp-cta" disabled={disabled || !!busy} onClick={onClick}>{label}</button>
  );

  /* ── 1 intro ── */
  if (view === "intro") {
    const steps: [string, string][] = [
      ["A few questions", "2 minutes"],
      bankOn ? ["Connect your bank", "Your budget fills itself in"] : ["Your budget", "Five numbers for a usual month"],
      ...(st.test ? [["The money test", `Optional. ${st.test.questions.length} questions on how you got here`] as [string, string]] : []),
      ["Meet your budgeter", "Matched to you, booked on the spot"],
    ];
    const start = async () => {
      void tapLight();
      if (st.started) { const v = viewFor(st); go(v === "intro" ? "questions" : v); return; }
      const r = await run({ action: "answers", answers: {} });
      if (r) { setQi(0); go("questions"); }
    };
    return (
      <Frame>
        <div className="okp-top is-brand">
          <BackButton onClick={leave} />
          <img src="/logos/kdh.png" alt="Kosher Debt Help by Collective Kindness" />
          <span className="okp-top-sp" />
        </div>
        <Panel tone="mint" className="okp-hero gv-rise">
          <PlusIllo name="path" size="sm" />
          <span className="okp-chip">KDH Plus</span>
          <h1 className="okp-h1">Your debt plan, <mark className="okn-hl">now your budget.</mark></h1>
          <p className="okp-sub">A real budget from your own numbers, with a budgeter matched to you.</p>
        </Panel>
        <Panel className="okp-list gv-rise" style={{ "--i": 2 } as CSSProperties}>
          {steps.map(([a, b], i) => (
            <div key={a} className="okp-row is-l" style={{ minHeight: 52 }}>
              <b className={`okp-num${i === 0 ? "" : " is-off"}`}>{i + 1}</b>
              <div className="okp-row-t"><b>{a}</b><span>{b}</span></div>
            </div>
          ))}
        </Panel>
        <p className="okp-sm" style={{ margin: "0 6px" }}>About 15 minutes. Stop any time, we keep your place. Sessions are {usd(st.prices.single.amount)}, or {st.prices.pack.sessions} for {usd(st.prices.pack.amount)}.</p>
        <div className="okp-foot">{notices}{cta(busy ? "One moment…" : st.started ? "Pick up where you left off" : "Start", () => void start())}{help}</div>
      </Frame>
    );
  }

  /* ── 2 a few questions ── */
  if (view === "questions") {
    const q = st.questions[Math.min(qi, st.questions.length - 1)];
    const val = picks[q.key] ?? st.answers[q.key] ?? null;
    const next = async () => {
      if (!val) return;
      const r = await run({ action: "answers", answers: { [q.key]: val } });
      if (!r?.state) return;
      if (qi < st.questions.length - 1) { setQi(qi + 1); return; }
      go(r.state.budget.have || r.state.budget.pending ? "budget" : "bank");
    };
    return (
      <Frame k={`q${qi}`}>
        {top(qi + 1, st.questions.length, "Question", Math.round(((qi + 1) / st.questions.length) * 100))}
        <PlusIllo name="family" size="xs" />
        <div className="okp-pad"><h1 className="okp-h1">{q.q}</h1>{q.sub ? <p className="okp-sub">{q.sub}</p> : null}</div>
        {q.options.map(([k, label], i) => (
          <button key={k} type="button" aria-pressed={val === k} className={`okp-opt gv-rise${val === k ? " is-on" : ""}`} style={{ "--i": i + 1 } as CSSProperties} onClick={() => { void tapLight(); setPicks((p) => ({ ...p, [q.key]: k })); setErr(null); }}>
            <span className="okp-dot" aria-hidden />{label}
          </button>
        ))}
        <div className="okp-foot">
          <p className="okp-sm is-c" style={{ margin: "0 8px 4px" }}>We have your name and debts from your first call. We will not ask again.</p>
          {notices}{cta(busy ? "Saving…" : "Next", () => void next(), !val)}{help}
        </div>
      </Frame>
    );
  }

  /* ── 3 connect the bank (or go type the numbers) ── */
  if (view === "bank") {
    const toTyping = () => { setTyping(true); go("budget"); };
    const connect = async () => {
      void tapLight();
      setBusy("plaid_link"); setErr(null);
      try {
        const r = await kdhPlusAction({ action: "plaid_link" });
        if (r.sample) {
          setBusy(null);
          const x = await run({ action: "plaid_exchange", public_token: "sample" });
          if (x) { go("budget"); setNote("Sample: no bank was connected. These are made-up numbers."); }
          return;
        }
        if (!r.link_token) throw new Error("Bank connection is not switched on yet. You can type your numbers in.");
        const Plaid = await loadPlaidJs();
        const handler = Plaid.create({
          token: r.link_token,
          onSuccess: (public_token: string) => {
            void run({ action: "plaid_exchange", public_token }).then((x) => { if (x) { setTyping(false); go("budget"); } });
          },
          onExit: (e: unknown) => { setBusy(null); if (e) setErr("Your bank did not connect. Try again, or type your numbers in."); },
        });
        setBusy(null);
        handler.open();
      } catch (e: any) {
        setBusy(null);
        // No bank connection on this server: lead with typing instead.
        setBankOff(true);
        setNote(e?.message || "Bank connection is not available right now. You can type your numbers in.");
      }
    };
    return (
      <Frame>
        {top(at("bank"), total, "Step", 38)}
        {bankOn ? (<>
          <Panel tone="mint" className="okp-hero gv-rise">
            <PlusIllo name="bank" size="sm" />
            <h1 className="okp-h1">Connect <mark className="okn-hl">your bank</mark></h1>
            <p className="okp-sub">We read the last 90 days so your budget fills itself in. You check it. Nothing to type.</p>
          </Panel>
          <Panel className="okp-list gv-rise" style={{ "--i": 2 } as CSSProperties}>
            {["Read only. We can never move money", "We never see your bank password", "Disconnect any time, from this page"].map((t) => (
              <div key={t} className="okp-row is-l"><span className="okp-check" aria-hidden><Check size={14} weight="bold" /></span><b style={{ fontWeight: 700, textAlign: "left" }}>{t}</b></div>
            ))}
          </Panel>
          <div className="okp-foot">
            {notices}
            {cta(busy ? "One moment…" : "Connect my bank", () => void connect())}
            <p className="okp-sm is-c">Secured by Plaid</p>
            <button type="button" className="okp-quiet" onClick={toTyping}>I will type my numbers in</button>
            {help}
          </div>
        </>) : (<>
          <Panel tone="mint" className="okp-hero gv-rise">
            <PlusIllo name="done" size="sm" />
            <h1 className="okp-h1">Your month, <mark className="okn-hl">in five numbers</mark></h1>
            <p className="okp-sub">Type what a usual month looks like. A good guess is fine. Your budgeter goes over every number with you.</p>
          </Panel>
          <div className="okp-foot">
            {notices}
            {cta("Type my numbers in", toTyping)}
            {help}
          </div>
        </>)}
      </Frame>
    );
  }

  /* ── 4 the budget ── */
  if (view === "budget") {
    const b = st.budget;
    const waiting = b.pending && !typing && !b.have;
    const fromBank = b.lines.some((l) => l.bank != null) && b.source === "plaid";
    const shownVal = (k: BudgetKey): number | null => {
      const raw = draft[k];
      if (raw !== undefined) return raw === "" ? null : Number(raw);
      return b.lines.find((l) => l.key === k)?.amount ?? null;
    };
    const vals = b.lines.map((l) => shownVal(l.key));
    const have = vals.some((v) => v != null);
    const sum = (ks: BudgetKey[]) => ks.reduce((n, k) => n + (shownVal(k) || 0), 0);
    const moneyIn = sum(["income"]), moneyOut = sum(["bills", "daily", "yearly", "owed"]);
    const edits = () => {
      const out: Partial<Record<BudgetKey, number | null>> = {};
      (Object.keys(draft) as BudgetKey[]).forEach((k) => { out[k] = draft[k] === "" || draft[k] === undefined ? null : Number(draft[k]); });
      return out;
    };
    const confirm = async () => {
      if (!have) { setErr("Add your numbers first, or skip and build it with your budgeter."); return; }
      const r = await run({ action: "budget", edits: edits(), ...(extra != null ? { extra } : {}), confirm: true });
      if (r?.state) { void success(); setDraft({}); setEditing({}); go(afterBudget(r.state)); }
    };
    const skip = async () => { const r = await run({ action: "budget", skip: true }); if (r?.state) go(afterBudget(r.state)); };
    const again = async () => { const r = await run({ action: "plaid_refresh" }); if (r && r.bankReady === false) setNote("Still loading. Banks can take a few minutes."); };
    const disconnect = async () => { const r = await run({ action: "plaid_disconnect" }); if (r) setNote("Your bank is disconnected."); };
    if (waiting) {
      return (
        <Frame>
          {top(at("bank"), total, "Step", 44)}
          <Panel tone="mint" className="okp-hero gv-rise">
            <PlusIllo name="bank" size="sm" />
            <h1 className="okp-h1">Your bank is <mark className="okn-hl">still loading</mark></h1>
            <p className="okp-sub">{b.institution ? `${b.institution} is connected. ` : ""}Reading 90 days can take a few minutes. You can wait here, come back later, or type your numbers in.</p>
          </Panel>
          <div className="okp-foot">
            {notices}
            {cta(busy ? "Checking…" : "Check again", () => void again())}
            <button type="button" className="okp-quiet" onClick={() => { setTyping(true); setErr(null); setNote(null); }}>Type them in instead</button>
            {help}
          </div>
        </Frame>
      );
    }
    return (
      <Frame>
        {top(at("bank"), total, "Step", 50)}
        <div className="okp-head2">
          <div>
            <h1 className="okp-h1">Here is <mark className="okn-hl">your month</mark></h1>
            <p className="okp-sub">{fromBank ? "From your bank. Tap anything that looks wrong." : b.have ? "Your own numbers. Tap any one to change it." : "Five numbers for a usual month. A good guess is fine."}</p>
          </div>
          <PlusIllo name="done" size="xs" />
        </div>
        <Panel className="okp-list gv-rise" style={{ padding: "4px 14px" }}>
          {b.lines.map((l) => {
            const open = editing[l.key] || l.amount == null;
            const left = <span className="okp-brow-l"><i className={`okp-sw ocf2-t-${TONES[l.key] || "mint"}`} aria-hidden /><b>{l.label}</b></span>;
            return open ? (
              <label key={l.key} className="okp-brow" style={{ cursor: "text" }}>
                {left}
                <span className="okp-amt"><span aria-hidden>$</span>
                  <input inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label={`${l.label}, dollars a month`} placeholder="0"
                    value={draft[l.key] ?? (l.amount != null ? String(l.amount) : "")}
                    onChange={(e) => { setDraft((d) => ({ ...d, [l.key]: e.target.value.replace(/[^0-9]/g, "").slice(0, 7) })); setErr(null); }} />
                </span>
              </label>
            ) : (
              <button key={l.key} type="button" className="okp-brow" aria-label={`${l.label}, ${usd(l.amount || 0)} a month. Change`} onClick={() => setEditing((e) => ({ ...e, [l.key]: true }))}>
                {left}
                <span className="okp-brow-r"><b>{usd(l.amount || 0)}</b><CaretRight size={14} weight="bold" aria-hidden /></span>
              </button>
            );
          })}
        </Panel>
        {extraOpen || b.extra ? (
          <label className="gv-rise">
            <span className="ocf2-label">Cash, checks or family help</span>
            <textarea className="okp-extra" maxLength={600} placeholder="Anything the bank does not show. For example: $400 a month in cash from tutoring." value={extra ?? b.extra} onChange={(e) => setExtra(e.target.value)} />
          </label>
        ) : (
          <button type="button" className="okp-add gv-rise" style={{ "--i": 3 } as CSSProperties} onClick={() => setExtraOpen(true)}>+ Add cash, checks or family help</button>
        )}
        {have ? (
          <Panel tone="forest" className="okp-first gv-rise" style={{ "--i": 4 } as CSSProperties}>
            <span>Your first number</span>
            <p>About <b>{usd(moneyIn)}</b> comes in and about <b>{usd(moneyOut)}</b> goes out each month.</p>
            <p>{moneyOut > moneyIn ? "That gap is what you and your budgeter work on." : "That is where you and your budgeter start."}</p>
          </Panel>
        ) : null}
        <div className="okp-foot">
          {notices}
          {cta(busy === "budget" ? "Saving…" : "This looks right", () => void confirm())}
          <button type="button" className="okp-quiet" disabled={!!busy} onClick={() => void skip()}>Skip. I will build it with my budgeter</button>
          {b.institution ? <button type="button" className="okp-quiet" disabled={!!busy} onClick={() => void disconnect()}>Disconnect {b.institution}</button> : null}
          {help}
        </div>
      </Frame>
    );
  }

  /* ── 5 the money test ── */
  if (view === "test" && st.test) {
    const qs = st.test.questions;
    const idx = Math.min(ti, qs.length - 1);
    const q = qs[idx];
    const val = tpicks[q.key] ?? null;
    const skipTest = async () => {
      const r = await run({ action: "test", skip: true });
      if (r?.state) go(afterTest(r.state));
    };
    const next = async () => {
      if (val == null) return;
      const r = await run({ action: "test", answers: { [q.key]: val } });
      if (!r?.state) return;
      if (idx < qs.length - 1) { setTi(idx + 1); return; }
      if (r.state.test?.done) { void success(); go(afterTest(r.state)); return; }
      if (!r.state.test) { go(afterTest(r.state)); return; }
      setTi(0); setErr("A few answers are missing. Please go through the questions once more.");
    };
    return (
      <Frame k={`t${idx}`}>
        {top(idx + 1, qs.length, "Question", Math.round(((idx + 1) / qs.length) * 100))}
        <PlusIllo name="search" size="xs" />
        <div className="okp-pad"><span className="okp-chip is-lilac">The money test</span><h1 className="okp-h1 is-q">{q.q}</h1></div>
        {q.options.map(([k, label], i) => (
          <button key={k} type="button" aria-pressed={val === Number(k)} className={`okp-opt gv-rise${val === Number(k) ? " is-on" : ""}`} style={{ "--i": i + 1 } as CSSProperties} onClick={() => { void tapLight(); setTpicks((p) => ({ ...p, [q.key]: Number(k) })); setErr(null); }}>
            <span className="okp-dot" aria-hidden />{label}
          </button>
        ))}
        <div className="okp-foot">
          <p className="okp-sm is-c" style={{ margin: "0 8px 4px" }}>No wrong answers. Only your budgeter sees this.</p>
          {notices}{cta(busy ? "Saving…" : "Next", () => void next(), val == null)}
          <button type="button" className="okp-quiet" disabled={!!busy} onClick={() => void skipTest()}>Skip the money test</button>
          {help}
        </div>
      </Frame>
    );
  }

  /* ── 6 the pattern ── */
  if (view === "result" && st.pattern) {
    const p = st.pattern;
    return (
      <Frame>
        {top(at("test"), total, "Step", 72)}
        <Panel tone="butter" className="okp-hero is-pattern gv-rise">
          <PlusIllo name={PATTERN_ART[p.key] || "hand"} size="sm" />
          <span className="okp-eb">Your money pattern</span>
          <h1 className="okp-h1"><mark className="okn-hl">{p.name}</mark></h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "#3F370B" }}>{p.line}</p>
          {p.second ? <span style={{ fontSize: 12.5, fontWeight: 700 }}>With some: {p.second}</span> : null}
        </Panel>
        <Panel className="okp-list gv-rise" style={{ "--i": 2, padding: "12px 16px 6px" } as CSSProperties}>
          <h2 className="okp-h2" style={{ marginBottom: 4 }}>{word(p.helps.length).replace(/^./, (c) => c.toUpperCase())} things that help</h2>
          {p.helps.map((t, i) => (
            <div key={i} className="okp-row is-l"><b className="okp-num is-done">{i + 1}</b><span className="okp-help-t">{t}</span></div>
          ))}
        </Panel>
        <p className="okp-sm" style={{ margin: "0 6px" }}>A starting point, not a verdict. Your budgeter talks it through with you.</p>
        <div className="okp-foot">{notices}{cta("Meet my budgeter", () => go(afterTest(st)))}{help}</div>
      </Frame>
    );
  }

  /* ── 7 sessions ── */
  if (view === "pay") {
    const P = st.prices;
    const amount = charge?.amount ?? P[plan].amount;
    const toMatch = async (p: PlusPref | null) => {
      if (!p) { go("match"); return; }
      const r = await run({ action: "match", pref: p }, true);
      setStage("choose"); setCharge(null);
      go("match");
      if (!r) setErr("You are paid up. We could not load your budgeter just now. Tap Find my budgeter to try again.");
    };
    const startPay = async () => {
      if (!pref) { setErr("Tell us who you would rather work with, then pay."); return; }
      void tapLight();
      try { localStorage.setItem(PREF_KEY, pref); } catch { /* noop */ }
      setErr(null); setStage("loading"); dropStripe();
      try {
        const r = await kdhPlusAction({ action: "checkout", plan });
        setCharge({ amount: Number(r.amount) || P[plan].amount, sessions: Number(r.sessions) || P[plan].sessions });
        if (r.sample) { setStage("sample"); return; }
        if (!r.clientSecret || !r.publishableKey) throw Object.assign(new Error("Payments are being switched on. Message your debt expert and we will sort it out."), { status: 503 });
        const Stripe = await loadStripeJs();
        const stripe = Stripe(r.publishableKey);
        stripeRef.current = stripe;
        elementsRef.current = stripe.elements({
          clientSecret: r.clientSecret,
          appearance: { theme: "stripe", variables: { colorPrimary: "#2F7556", colorText: "#16211C", colorBackground: "#FFFFFF", borderRadius: "14px", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif", fontSizeBase: "16px" } },
        });
        setStage("card");
      } catch (e: any) {
        const msg = e?.message || "Could not start the payment. Please try again in a moment.";
        if (e?.status === 503 || e?.status === 501) { setBlocked(msg); setStage("blocked"); }
        else { setStage("choose"); setErr(msg); }
      }
    };
    const payNow = async () => {
      const stripe = stripeRef.current, elements = elementsRef.current;
      if (!stripe || !elements) return;
      setErr(null); setStage("confirming");
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: returnUrl() } });
      if (error) { setStage("card"); setErr(error.message || "That did not go through. Please check the details and try again."); return; }
      if (paymentIntent && SETTLED.includes(paymentIntent.status)) await credit(paymentIntent.id);
      else setStage("card");
    };
    const sampleOn = async () => { const r = await run({ action: "confirm", paymentIntent: "sample" }); if (r) { void success(); await toMatch(pref); } };
    if (stage === "choose" || stage === "loading") {
      return (
        <Frame>
          {top(at("sessions"), total, "Step", 84)}
          <div className="okp-head2">
            <div><h1 className="okp-h1">Your <mark className="okn-hl">sessions</mark></h1><p className="okp-sub">{st.minutes} minutes each, on video or phone.</p></div>
            <PlusIllo name="jar" size="xs" />
          </div>
          {paid ? <p className="okp-note">You have {st.sessions.bought} session{st.sessions.bought === 1 ? "" : "s"} already, {st.sessions.left} left to book. Paying here adds more.</p> : null}
          <button type="button" aria-pressed={plan === "pack"} className={`okp-opt is-plan gv-rise${plan === "pack" ? " is-on" : ""}`} style={{ "--i": 1 } as CSSProperties} onClick={() => setPlan("pack")}>
            <span className="okp-dot" aria-hidden />
            <span className="okp-plan">
              <span className="okp-plan-top"><b>{P.pack.sessions} sessions</b><b>{usd(P.pack.amount)}</b></span>
              <span className="okp-plan-sub">Most families need about {word(P.pack.sessions)}</span>
              {P.pack.saves > 0 ? <span className="okp-chip">Saves {usd(P.pack.saves)}</span> : null}
            </span>
          </button>
          <button type="button" aria-pressed={plan === "single"} className={`okp-opt is-plan gv-rise${plan === "single" ? " is-on" : ""}`} style={{ "--i": 2 } as CSSProperties} onClick={() => setPlan("single")}>
            <span className="okp-dot" aria-hidden />
            <span className="okp-plan">
              <span className="okp-plan-top"><b>{P.single.sessions} session</b><b>{usd(P.single.amount)}</b></span>
              <span className="okp-plan-sub">Try one. Add more later</span>
            </span>
          </button>
          <p className="okp-why gv-rise" style={{ "--i": 3 } as CSSProperties}>A session costs us more than this. Donors cover the rest. We ask you to pay so the time counts.</p>
          <div className="gv-rise" style={{ "--i": 4, display: "flex", flexDirection: "column", gap: 8 } as CSSProperties}>
            <h2 className="okp-h2" style={{ margin: "0 4px" }}>Would you rather work with</h2>
            <div className="okp-times" role="group" aria-label="Would you rather work with">
              {PREFS.map(([k, label]) => <button key={k} type="button" aria-pressed={pref === k} className={`okp-time${pref === k ? " is-on" : ""}`} onClick={() => { setPref(k); setErr(null); }}>{label}</button>)}
            </div>
          </div>
          <div className="okp-foot">
            {notices}
            {cta(stage === "loading" ? "One moment…" : `Pay ${usd(P[plan].amount)}`, () => void startPay(), stage === "loading")}
            <p className="okp-sm is-c" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><LockSimple size={13} weight="bold" aria-hidden />Secured by Stripe</p>
            {help}
          </div>
        </Frame>
      );
    }
    return (
      <Frame>
        {top(at("sessions"), total, "Step", 88)}
        <Panel tone="mint" className="okp-paysum gv-rise">
          <div style={{ minWidth: 0 }}>
            <span className="okp-eb">{charge?.sessions ?? P[plan].sessions} session{(charge?.sessions ?? P[plan].sessions) === 1 ? "" : "s"}, {st.minutes} minutes each</span>
            <b>{usd(amount)}</b>
          </div>
          <button type="button" className="ocf2-link" disabled={stage === "confirming" || !!busy} onClick={back}>Change</button>
        </Panel>
        {stage === "blocked" ? (
          <Panel className="gv-rise"><p className="ocf2-p">{blocked}</p><p className="okp-sm">Nothing was charged.</p></Panel>
        ) : stage === "sample" ? (
          <Panel tone="butter" className="gv-rise">
            <b style={{ fontSize: 16, fontWeight: 800 }}>Sample: no payment taken</b>
            <p className="ocf2-p" style={{ color: "#574A0E" }}>A real client pays here with a card, Apple Pay or Google Pay. This is a sample, so nothing is charged.</p>
          </Panel>
        ) : (
          <div className="ocf2-give-pay gv-rise"><div id="okp-pe" /></div>
        )}
        <div className="okp-foot">
          {notices}
          {stage === "sample" ? cta(busy ? "One moment…" : "Continue", () => void sampleOn())
            : stage === "blocked" ? null
            : cta(stage === "confirming" || busy ? "Processing…" : `Pay ${usd(amount)}`, () => void payNow(), stage === "confirming")}
          {stage === "card" || stage === "confirming" ? <p className="okp-sm is-c" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><LockSimple size={13} weight="bold" aria-hidden />Secured by Stripe</p> : null}
          {help}
        </div>
      </Frame>
    );
  }

  /* ── 8 the budgeter ── */
  if (view === "match") {
    const bg = st.budgeter;
    const find = async (p: PlusPref | null, other = false) => {
      if (!p) { setErr("Pick one first."); return; }
      setSlot(null); setShown(6);
      await run({ action: "match", pref: p, ...(other ? { other: true } : {}) }, true);
    };
    if (!bg && st.needsMatch) {
      return (
        <Frame>
          {top(at("budgeter"), total, "Step", 94)}
          <Panel tone="mint" className="okp-hero gv-rise">
            <PlusIllo name="search" size="sm" />
            <h1 className="okp-h1">We are finding <mark className="okn-hl">your budgeter.</mark></h1>
            <p className="okp-sub">You will hear from us within one business day.</p>
          </Panel>
          <p className="okp-sm" style={{ margin: "0 6px" }}>Your {st.sessions.bought} session{st.sessions.bought === 1 ? " is" : "s are"} paid and waiting for you.</p>
          <div className="okp-foot">{notices}{cta("Back to my plan", leave)}{help}</div>
        </Frame>
      );
    }
    if (!bg) {
      return (
        <Frame>
          {top(at("budgeter"), total, "Step", 90)}
          <div className="okp-head2"><div><h1 className="okp-h1">Meet <mark className="okn-hl">your budgeter</mark></h1><p className="okp-sub">Your sessions are paid. One question and we match you.</p></div><PlusIllo name="pair" size="xs" /></div>
          <h2 className="okp-h2" style={{ margin: "0 4px" }}>Would you rather work with</h2>
          <div className="okp-times" role="group" aria-label="Would you rather work with">
            {PREFS.map(([k, label]) => <button key={k} type="button" aria-pressed={pref === k} className={`okp-time${pref === k ? " is-on" : ""}`} onClick={() => { setPref(k); setErr(null); }}>{label}</button>)}
          </div>
          <div className="okp-foot">{notices}{cta(busy ? "Finding…" : "Find my budgeter", () => void find(pref))}{help}</div>
        </Frame>
      );
    }
    const name = bg.firstName;
    const pronoun = bg.gender === "man" ? "he" : "she";
    const why = bg.reason && bg.reason.startsWith(`${name} `) ? `${pronoun} ${bg.reason.slice(name.length + 1)}` : bg.reason;
    const pending = st.sessions.list.find((s) => s.status === "pending") || null;
    const booked0 = st.sessions.list.some((s) => s.status === "booked" || s.status === "done");
    const slots = st.slots;
    const sel = slot ? when(slot) : null;
    const book = async (at: string | null) => {
      void tapLight();
      const r = await run({ action: "book", at });
      if (!r) return;
      // A real booking finishes on the budgeter's calendar page; it shows
      // here as "not confirmed yet" until the calendar says so.
      if (r.url) { void openExternal(r.url); return; }
      if (r.state?.step === "done") { void success(); go("booked"); }
    };
    return (
      <Frame>
        {top(at("budgeter"), total, "Step", 94)}
        <div className="okp-head2"><div><h1 className="okp-h1">Meet <mark className="okn-hl">your budgeter</mark></h1></div><PlusIllo name="pair" size="xs" /></div>
        <Panel className="gv-rise">
          <div className="okp-who">
            <span className="okp-face" aria-hidden>{bg.initial}</span>
            <div><span className="okp-eb">Your budgeter</span><b>{name}</b>{bg.bio ? <span className="okp-sm">{bg.bio}</span> : null}</div>
          </div>
          {why ? <p className="okp-reason"><b>Why {name}:</b> {why}</p> : null}
        </Panel>
        {pending ? (
          <Panel tone="butter" className="gv-rise">
            <b style={{ fontSize: 15, fontWeight: 800 }}>{when(pending.at) ? `${dayShort(when(pending.at)!)} at ${clock(when(pending.at)!)} is not confirmed yet` : "Your time is not confirmed yet"}</b>
            <p className="ocf2-p" style={{ color: "#574A0E" }}>Finish booking on the calendar page. We will show it here once it is confirmed.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <OBtn kind="primary" sm disabled={!!busy} onClick={() => void book(pending.at)}>Open the calendar page</OBtn>
              <OBtn kind="light" sm disabled={!!busy} onClick={() => { setBusy("check"); void load(false).finally(() => setBusy(null)); }}>{busy === "check" ? "Checking…" : "Check again"}</OBtn>
            </div>
          </Panel>
        ) : null}
        {!slotsAsked ? <div className="ocf2-skel" style={{ height: 112 }} aria-hidden /> : slots && slots.length > 0 ? (<>
          <h2 className="okp-h2" style={{ margin: "2px 4px 0" }}>{pending ? "Or pick another time" : booked0 ? "Pick a time for your next call" : "Pick a time for your first call"}</h2>
          <div className="okp-times">
            {slots.slice(0, shown).map((iso, i) => {
              const d = when(iso);
              return d ? (
                <button key={iso} type="button" aria-pressed={slot === iso} className={`okp-time gv-rise${slot === iso ? " is-on" : ""}`} style={{ "--i": i % 6 } as CSSProperties} onClick={() => { void tapLight(); setSlot(iso); setErr(null); }}>
                  <small>{dayShort(d)}</small>{clock(d)}
                </button>
              ) : null;
            })}
          </div>
          {slots.length > shown ? <button type="button" className="okp-quiet" onClick={() => setShown(shown + 6)}>Show more times</button> : null}
          <p className="okp-sm" style={{ margin: "0 6px" }}>Your time zone. {name} already has your budget and your answers.</p>
        </>) : (
          <p className="okp-sm" style={{ margin: "0 6px" }}>{slots ? `${name} has no open times showing this week. The calendar page has the full list.` : `Pick any open time on ${name}'s calendar page. ${name} already has your budget and your answers.`}</p>
        )}
        <div className="okp-foot">
          {notices}
          {slots && slots.length > 0
            ? cta(busy === "book" ? "One moment…" : sel ? `Book ${dayLong(sel)}, ${clock(sel)}` : "Pick a time above", () => void book(slot), !sel)
            : slotsAsked ? cta(busy === "book" ? "One moment…" : `Pick a time on ${name}'s calendar`, () => void book(null)) : null}
          <button type="button" className="okp-quiet" disabled={!!busy} onClick={() => void find(st.genderPref || pref || "any", true)}>{busy === "match" ? "Looking…" : "Choose someone else"}</button>
          {help}
        </div>
      </Frame>
    );
  }

  /* ── 9 booked ── */
  const booked = st.sessions.list.filter((s) => s.status === "booked" || s.status === "done");
  const bname = st.budgeter?.firstName || "your budgeter";
  const nextUp = booked.find((s) => { const d = when(s.at); return d && d.getTime() > Date.now() - 3600_000; }) || booked[booked.length - 1] || null;
  const addToCalendar = () => {
    const d = when(nextUp?.at || null);
    if (!d) return;
    const z = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Collective Kindness//KDH Plus//EN", "BEGIN:VEVENT", `UID:kdh-plus-${nextUp!.n}-${z(d)}@collectivekindness.net`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(d)}`, `DTEND:${z(new Date(d.getTime() + st.minutes * 60000))}`, `SUMMARY:Budget session with ${bname}`, ...(nextUp!.joinUrl ? [`URL:${nextUp!.joinUrl}`, `DESCRIPTION:${nextUp!.joinUrl}`] : []), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "budget-session.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  return (
    <Frame>
      <Panel tone="mint" className="okp-booked-art gv-rise"><PlusIllo name="session" /></Panel>
      <div className="okp-pad" style={{ paddingTop: 4 }}>
        <h1 className="okp-h1 is-big">You are <mark className="okn-hl">booked.</mark></h1>
        <p className="okp-sub">Bring nothing. {bname.replace(/^y/, "Y")} already has your debt plan, your budget and your answers.</p>
      </div>
      <Panel className="okp-list gv-rise" style={{ "--i": 2 } as CSSProperties}>
        {booked.map((s) => { const d = when(s.at); return (
          <div key={s.n} className="okp-row"><span>Session {s.n} of {Math.max(st.sessions.bought, s.n)}</span><b>{d ? `${dayShort(d)} · ${clock(d)}` : "Booked"}</b></div>
        ); })}
        <div className="okp-row"><span>With</span><b>{st.budgeter?.firstName || "Your budgeter"}{nextUp?.joinUrl ? ", on video" : ""}</b></div>
        <div className="okp-row"><span>Sessions</span><b>{st.sessions.bought} paid, {st.sessions.left} left to book</b></div>
      </Panel>
      <p className="okp-sm" style={{ margin: "0 6px" }}>Your calendar invite has the call link. To change the time, use the link in that email.</p>
      <div className="okp-foot">
        {notices}
        {cta("Back to my plan", leave)}
        {nextUp?.joinUrl ? <button type="button" className="okp-quiet" onClick={() => link(nextUp.joinUrl)}>Open the call link</button> : null}
        {!Capacitor.isNativePlatform() && when(nextUp?.at || null) ? <button type="button" className="okp-quiet" onClick={addToCalendar}>Add to my calendar</button> : null}
        {st.budgeter ? <button type="button" className="okp-quiet" onClick={() => { setSlot(null); go(st.sessions.left > 0 ? "match" : "pay"); }}>{st.sessions.left > 0 ? "Book another session" : "Add more sessions"}</button> : null}
        {help}
      </div>
    </Frame>
  );

  /** A confirmed card payment: credit the sessions, then match. The CRM's
   *  webhook credits them too, so a miss here is looked up again. */
  async function credit(piId: string) {
    setView("pay"); setStage("confirming"); setErr(null);
    let ok = false;
    try { const r = await kdhPlusAction({ action: "confirm", paymentIntent: piId }); if (r.state) { apply(r.state, false); ok = r.state.sessions.bought > 0; } }
    catch { const s = await load(false); ok = !!s && s.sessions.bought > 0; }
    dropStripe();
    if (!ok) { setStage("choose"); setCharge(null); setErr("Your payment went in, but your sessions are not showing yet. Give it a minute and open KDH Plus again. Please do not pay a second time."); return; }
    void success();
    let p: PlusPref | null = null;
    try { const v = localStorage.getItem(PREF_KEY); p = v === "man" || v === "woman" || v === "any" ? v : null; } catch { /* noop */ }
    setStage("choose"); setCharge(null);
    if (p) { try { const r = await kdhPlusAction({ action: "match", pref: p }); if (r.state) apply(r.state, true); } catch { /* the match screen asks again */ } }
    setErr(null); setNote(null); setView("match");
  }
}

function Frame({ children, k }: { children: ReactNode; k?: string }) {
  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div key={k} className="ocf2 ocf2-page okp">{children}</div>
      </IonContent>
    </IonPage>
  );
}

export default KdhPlusPage;
