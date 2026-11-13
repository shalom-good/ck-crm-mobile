import { useEffect, useMemo, useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { Check, LockSimple } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { useSwipeBack } from "@/lib/swipeBack";
import { GIVE_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import {
  confirmGift, createGiveIntent, feeFor, fetchGiveCampaign, giveSlug, loadStripeJs, GIVE_SLUG,
  type GiveFrequency,
} from "@/lib/giveApi";

/**
 * A gift, in the app (Shalom 2026-11-10: "easy and quick and on the app
 * itself"). One screen: pick an amount, tap Give, pay with Apple Pay /
 * Google Pay / card in Stripe's own fields, see the thank-you. The gift
 * lands in the CRM's General fund exactly like one from the web page.
 */

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());
const SETTLED = ["succeeded", "processing", "requires_capture"];

type Stage = "amount" | "pay" | "thanks";
type Pay =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; total: number }
  | { state: "confirming"; total: number }
  | { state: "blocked"; message: string };

/** Stripe needs an https address to come back to after a bank check. */
function returnUrl(): string {
  const { protocol, origin, pathname } = window.location;
  return /^https?:$/.test(protocol) ? `${origin}${pathname}` : "https://ck-crm-mobile.vercel.app/start/give";
}

/** What a gift from the donor's impact page was about (a note for the team, and a chip here). */
const GIVE_FOR: Record<string, { chip: string; note: string }> = {
  education: { chip: "For financial education", note: "financial education (CK Academy)" },
  single_mothers: { chip: "For single parents", note: "single parents" },
  debt: { chip: "For debt help", note: "debt help (Kosher Debt Help)" },
};

export function GivePage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  // From "Raises happening now": ?c=<campaign slug>. The gift is made against
  // that campaign, so it counts there in the CRM. A bank's own check brings
  // the donor back without the query, so the slug is also kept for the return.
  const slug = useMemo(() => {
    if (typeof window === "undefined") return GIVE_SLUG;
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get("c");
    if (fromUrl) return giveSlug(fromUrl);
    if (sp.get("payment_intent")) { try { return giveSlug(sessionStorage.getItem("ck_give_slug")); } catch { /* private mode */ } }
    return GIVE_SLUG;
  }, []);
  const raise = slug !== GIVE_SLUG;
  const q = useQuery({ queryKey: ["giveCampaign", slug], queryFn: () => fetchGiveCampaign(slug), staleTime: 5 * 60_000, retry: 1 });
  const c = q.data;

  const [stage, setStage] = useState<Stage>("amount");
  // From "Adopt a family": ?amount=8800&adopt=<region>. The region rides
  // on the gift as a note for the team; CK matches the family.
  const adopt = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const amt = Number(sp.get("amount"));
    const region = (sp.get("adopt") || "").replace(/[^A-Za-z .'-]/g, "").slice(0, 40);
    return { amount: Number.isFinite(amt) && amt >= 1 && amt <= 100000 ? Math.round(amt) : null, region: sp.has("adopt") ? (region || "Where the need is greatest") : null, partner: sp.get("partner") === "1" };
  }, []);
  // From the donor's impact page: ?for=education|single_mothers|debt. What
  // the donor was reading about rides on the gift as a note for the team.
  const cause = useMemo(() => {
    const k = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("for") || "";
    return GIVE_FOR[k] ?? null;
  }, []);
  const [picked, setPicked] = useState<number | "other" | null>(adopt.amount);
  const [other, setOther] = useState("");
  const [freq, setFreq] = useState<GiveFrequency>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("freq") === "monthly" ? "monthly" : "once"));
  const [cover, setCover] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pay, setPay] = useState<Pay>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<{ amount: number | null; monthly: boolean }>({ amount: null, monthly: false });

  // The main CK list for this frequency ($8,800 Adopt a family and down).
  const tiers = useMemo(() => c?.tiers[freq] ?? [], [c, freq]);
  // The same amount starts selected as on the main CK page (the second one
  // of the promoted frequency), so Give is one tap away; switching One time
  // / Monthly picks again from that list.
  useEffect(() => {
    if (!tiers.length || picked === "other") return;
    if (picked == null || !tiers.some((t) => t.amount === picked)) setPicked(tiers[c?.promoted === freq ? Math.min(1, tiers.length - 1) : 0].amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiers, picked]);
  // The fee box starts the way the main page starts it.
  const coverSet = useRef(false);
  useEffect(() => { if (c && !coverSet.current) { coverSet.current = true; setCover(c.coverDefault); } }, [c]);

  const amount = picked === "other" ? Math.round((Number(other.replace(/[^0-9.]/g, "")) || 0) * 100) / 100 : (picked ?? 0);
  const minimum = c?.minimum ?? 1;
  const amountOk = amount >= minimum;
  const coverOn = cover && !!c?.coverFees;
  const total = Math.round((amount + (coverOn ? feeFor(amount) : 0)) * 100) / 100;
  const per = freq === "monthly" ? " a month" : "";

  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const eceRef = useRef<any>(null);
  const peRef = useRef<any>(null);
  const addrRef = useRef<any>(null);
  const intentKey = useRef<string>("");
  const donorRef = useRef({ name, email });
  donorRef.current = { name, email };

  function dropElements() {
    try { eceRef.current?.destroy(); } catch { /* already gone */ }
    try { peRef.current?.destroy(); } catch { /* already gone */ }
    try { addrRef.current?.destroy(); } catch { /* already gone */ }
    eceRef.current = null; peRef.current = null; addrRef.current = null;
  }
  useEffect(() => () => dropElements(), []);

  async function settle(piId: string, monthly: boolean) {
    let amt: number | null = null;
    try { const j = await confirmGift(piId, slug); amt = typeof j?.amount === "number" ? j.amount : null; } catch { /* the webhook records it too */ }
    dropElements();
    intentKey.current = "";
    setThanks({ amount: amt, monthly });
    setPay({ state: "idle" });
    setStage("thanks");
  }

  // Back from a bank's own check (3-D Secure redirect): finish here.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const pi = sp.get("payment_intent");
    if (!pi || !/^pi_[A-Za-z0-9]+$/.test(pi)) return;
    const failed = sp.get("redirect_status") === "failed";
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* noop */ }
    if (failed) { setError("That payment did not go through. Nothing was charged. Please try again."); return; }
    void settle(pi, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The intent is created once per (amount, frequency, fee) choice, and only
  // after the person asks to give: never on load, never per keystroke.
  async function startPayment() {
    const key = `${amount}|${freq}|${coverOn}|${freq === "monthly" ? email.trim().toLowerCase() : ""}`;
    if (intentKey.current === key && elementsRef.current) { setPay({ state: "ready", total }); return; }
    setPay({ state: "loading" });
    setError(null);
    dropElements();
    try {
      try { sessionStorage.setItem("ck_give_slug", slug); } catch { /* private mode */ }
      const j = await createGiveIntent({ slug, amount, frequency: freq, coverFee: coverOn, donor: { name: name.trim(), email: email.trim() }, comment: adopt.region ? `${adopt.partner ? "Adopt a family, partnering with another donor (app)" : "Adopt a family (app)"}. Region: ${adopt.region}. CK matches the family.` : raise ? "Given from the raises list on the donor's page (app)." : cause ? `Given from the donor's ${cause.note} page (app).` : undefined });
      const Stripe = await loadStripeJs();
      const stripe = Stripe(j.publishableKey);
      stripeRef.current = stripe;
      elementsRef.current = stripe.elements({
        clientSecret: j.clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#2F7556", colorText: "#16211C", colorBackground: "#FFFFFF", borderRadius: "14px", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif", fontSizeBase: "16px" },
        },
      });
      intentKey.current = key;
      setPay({ state: "ready", total: j.total });
    } catch (e: any) {
      intentKey.current = "";
      const msg = e?.message || "Could not start the payment. Please try again in a moment.";
      if (e?.status === 503 || e?.status === 501) setPay({ state: "blocked", message: msg });
      else { setPay({ state: "idle" }); setError(msg); }
    }
  }

  async function finish(billing: { name?: string; email?: string; phone?: string; address?: unknown }) {
    const stripe = stripeRef.current, elements = elementsRef.current;
    if (!stripe || !elements) return;
    const monthly = freq === "monthly";
    setError(null);
    setPay((p) => (p.state === "ready" ? { state: "confirming", total: p.total } : p));
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: returnUrl(), payment_method_data: { billing_details: billing } },
    });
    if (err) {
      setPay((p) => (p.state === "confirming" ? { state: "ready", total: p.total } : p));
      setError(err.message || "That did not go through. Please check the details and try again.");
      return;
    }
    if (paymentIntent && SETTLED.includes(paymentIntent.status)) await settle(paymentIntent.id, monthly);
    else setPay((p) => (p.state === "confirming" ? { state: "ready", total: p.total } : p));
  }

  // Mount Stripe's fields only once their containers are on the page.
  useEffect(() => {
    if (stage !== "pay" || (pay.state !== "ready" && pay.state !== "confirming")) return;
    const elements = elementsRef.current;
    if (!elements) return;
    if (!eceRef.current && document.getElementById("ck-give-ece")) {
      try {
        const ece = elements.create("expressCheckout", {
          buttonHeight: 50,
          layout: { maxColumns: 1, maxRows: 0, overflow: "never" },
          emailRequired: true,
          billingAddressRequired: true,
        });
        ece.on("confirm", (event: any) => {
          const bd = event?.billingDetails || {};
          const d = donorRef.current;
          const wemail = bd.email || d.email.trim();
          if (!emailOk(wemail || "")) { setError("An email is needed for your receipt."); return; }
          if (!d.email.trim()) setEmail(wemail);
          void finish({ name: bd.name || d.name.trim() || undefined, email: wemail, ...(bd.phone ? { phone: bd.phone } : {}), ...(bd.address ? { address: bd.address } : {}) });
        });
        ece.mount("#ck-give-ece");
        eceRef.current = ece;
      } catch { /* no wallet on this device: the card fields below still work */ }
    }
    if (!peRef.current && document.getElementById("ck-give-pe")) {
      try {
        // As on the main page: name and email come from the fields above and
        // the mailing address from the address field below (the tax receipt
        // carries it), so the card form asks for none of them again.
        const pe = elements.create("payment", { layout: "tabs", wallets: { applePay: "never", googlePay: "never" }, fields: { billingDetails: { name: "never", email: "never", phone: "never", address: "never" } } });
        pe.mount("#ck-give-pe");
        peRef.current = pe;
        // Created after the payment form on purpose: that is what switches
        // on Stripe's address type-ahead.
        if (!addrRef.current && document.getElementById("ck-give-addr")) {
          const addr = elements.create("address", { mode: "billing", autocomplete: { mode: "automatic" }, fields: { phone: "never" }, display: { name: "full" }, defaultValues: { name: donorRef.current.name.trim() || undefined } });
          addr.mount("#ck-give-addr");
          addrRef.current = addr;
        }
      } catch (e: any) { setError(e?.message || "The card form could not load. Please try again."); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pay.state]);

  function toPay() {
    if (!amountOk) { setError(`The smallest gift is ${usd(minimum)}.`); return; }
    setError(null);
    setStage("pay");
    // Monthly needs the email first (receipts every month), so wait for it.
    if (freq === "once" || emailOk(email)) void startPayment();
    else setPay({ state: "idle" });
  }
  function backToAmount() { setStage("amount"); setError(null); }

  function primary() {
    if (pay.state === "idle") {
      if (freq === "monthly" && !emailOk(email)) { setError("Please enter your email so we can send your receipts."); return; }
      void startPayment();
      return;
    }
    if (pay.state !== "ready") return;
    void payByCard();
  }

  // Card: the same checks the main page makes before it charges.
  async function payByCard() {
    if (!emailOk(email)) { setError("Please enter your email for the receipt."); return; }
    if (!addrRef.current) { setError("The card form is still loading. Please try again in a moment."); return; }
    let a: any;
    try { a = await addrRef.current.getValue(); } catch { a = null; }
    if (!a?.complete) { setError("Please finish your name and billing address. They go on your tax receipt."); return; }
    const fullName = String(a.value?.name || name).trim();
    if (fullName && !name.trim()) setName(fullName);
    void finish({ name: fullName || undefined, email: email.trim(), address: a.value?.address });
  }

  const ready = pay.state === "ready" || pay.state === "confirming";
  const shownTotal = ready ? (pay as { total: number }).total : total;

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/start" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door">

          {stage === "thanks" && (
            <>
              <section className="ocf2-hero ocf2-t-mint gv-rise" style={{ alignItems: "flex-start", paddingTop: 24 }}>
                <span className="ocf2-give-badge gv-pop" aria-hidden><Check size={26} weight="bold" /></span>
                <h1 className="ocf2-h1" style={{ marginTop: 8 }}>
                  <span>Thank you{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ""}.</span>
                  {thanks.amount != null && <span className="ocf2-h1-2"><mark>{usd(thanks.amount)}</mark>{thanks.monthly ? " every month" : ""} is on its way.</span>}
                </h1>
                <p className="ocf2-hero-sub">{c?.thankYou || "Your gift goes straight to a family's plan."}</p>
              </section>
              <p className="ocf2-meta gv-rise" style={{ "--i": 2, textAlign: "center", margin: "0 8px" } as React.CSSProperties}>
                Your receipt is on its way to your email.
              </p>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 3, minHeight: 54 } as React.CSSProperties} onClick={() => router.push("/start/donor", "back", "pop")}>
                Done
              </button>
            </>
          )}

          {stage === "amount" && (
            <>
              <div className="gv-rise" style={{ padding: "2px 4px 0" }}>
                <h1 className="ocf2-title">Make a <mark className="ocf2-give-mark">gift</mark></h1>
                <p className="ocf2-p" style={{ marginTop: 8 }}>Your gift helps a family work their way back to steady ground.</p>
              </div>

              {q.isLoading && <div className="ocf2-give-grid" aria-hidden>{[0, 1, 2, 3].map((k) => <span key={k} className="ocf2-give-amt ocf2-skel" />)}</div>}

              {q.isError && (
                <div className="ocf2-panel ocf2-t-white gv-rise">
                  <p className="ocf2-p">Giving in the app could not load just now.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <button type="button" className="ocf2-link" onClick={() => void q.refetch()}>Try again</button>
                    <button type="button" className="ocf2-link" onClick={() => void openExternal(GIVE_URL)}>Give on the website</button>
                  </div>
                </div>
              )}

              {c && (
                <>
                  {adopt.region && (
                    <p className="oad-givechip gv-rise"><i aria-hidden />{adopt.partner ? "Partner on a family" : "Adopt a family"} · {adopt.region}</p>
                  )}
                  {!adopt.region && raise && (
                    <p className="oad-givechip gv-rise"><i aria-hidden />For: {c.name}</p>
                  )}
                  {!adopt.region && !raise && cause && (
                    <p className="oad-givechip gv-rise"><i aria-hidden />{cause.chip}</p>
                  )}
                  {c.monthly && (
                    <div className="ocf2-give-seg gv-rise" role="tablist" aria-label="How often" style={{ "--i": 1 } as React.CSSProperties}>
                      {(["once", "monthly"] as const).map((f) => (
                        <button key={f} type="button" role="tab" aria-selected={freq === f} className={freq === f ? "is-on" : ""} onClick={() => setFreq(f)}>
                          {f === "once" ? "One time" : "Monthly"}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="ocf2-give-grid gv-rise" style={{ "--i": 2 } as React.CSSProperties}>
                    {tiers.map((t) => (
                      <button key={t.amount} type="button" className={`ocf2-give-amt${picked === t.amount ? " is-on" : ""}`} aria-pressed={picked === t.amount} onClick={() => { setPicked(t.amount); setError(null); }}>
                        <b>{usd(t.amount)}</b>
                        {t.label && <small>{t.label}</small>}
                      </button>
                    ))}
                    {!c.hideOther && <button type="button" className={`ocf2-give-amt ocf2-give-amt--other${tiers.length % 2 === 0 ? " is-wide" : ""}${picked === "other" ? " is-on" : ""}`} aria-pressed={picked === "other"} onClick={() => { setPicked("other"); setError(null); }}>
                      <b>Other</b>
                    </button>}
                  </div>

                  {picked === "other" && (
                    <label className="ocf2-give-other gv-rise">
                      <span aria-hidden>$</span>
                      <input className="ocf2-input" inputMode="decimal" autoFocus placeholder="Amount" aria-label="Amount in dollars" value={other} onChange={(e) => { setOther(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8)); setError(null); }} />
                    </label>
                  )}

                  {c.coverFees && (
                    <label className="ocf2-give-cover gv-rise" style={{ "--i": 3 } as React.CSSProperties}>
                      <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} />
                      <span className="ocf2-give-box" aria-hidden>{cover && <Check size={14} weight="bold" />}</span>
                      <span>Add 2.9% + 30¢ so all of it reaches a family{amountOk && cover ? ` (${usd(feeFor(amount))})` : ""}</span>
                    </label>
                  )}

                  {error && <p className="ocf2-give-err" role="alert">{error}</p>}

                  <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 4, minHeight: 56, fontSize: 16 } as React.CSSProperties} disabled={!amountOk} onClick={toPay}>
                    {amountOk ? `Give ${usd(total)}${per}` : "Give"}
                  </button>
                  <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                    <LockSimple size={13} weight="bold" aria-hidden /> Secured by Stripe · tax-deductible receipt by email
                  </p>
                </>
              )}
            </>
          )}

          {stage === "pay" && (
            <>
              <div className="ocf2-panel ocf2-t-mint gv-rise" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", background: "var(--oc-summary)" }}>
                <div style={{ minWidth: 0 }}>
                  <span className="ocf2-kicker">Your gift</span>
                  <div className="ocf2-give-total">{usd(shownTotal)}<small>{per}</small></div>
                </div>
                <button type="button" className="ocf2-link" disabled={pay.state === "confirming"} onClick={backToAmount}>Change</button>
              </div>

              {pay.state === "blocked" ? (
                <div className="ocf2-panel ocf2-t-white gv-rise">
                  <p className="ocf2-p">{pay.message}</p>
                  <button type="button" className="ocf2-link" onClick={() => void openExternal(GIVE_URL)}>Give on the website</button>
                </div>
              ) : (
                <>
                  <div className="gv-rise" style={{ "--i": 1, display: "flex", flexDirection: "column", gap: 10 } as React.CSSProperties}>
                    <label>
                      <span className="ocf2-label">Email for your receipt</span>
                      <input className="ocf2-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
                    </label>
                  </div>

                  {pay.state === "loading" && <div className="ocf2-give-pay"><span className="ocf2-give-amt ocf2-skel" style={{ minHeight: 50 }} /><span className="ocf2-give-amt ocf2-skel" style={{ minHeight: 120 }} /></div>}

                  {ready && (
                    <div className="ocf2-give-pay gv-rise">
                      <div id="ck-give-ece" />
                      <div id="ck-give-pe" />
                      <div id="ck-give-addr" />
                    </div>
                  )}

                  {error && <p className="ocf2-give-err" role="alert">{error}</p>}

                  <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 56, fontSize: 16 }} disabled={pay.state === "loading" || pay.state === "confirming"} onClick={primary}>
                    {pay.state === "confirming" ? "Processing…" : pay.state === "loading" ? "One moment…" : pay.state === "idle" ? "Continue" : `Give ${usd(shownTotal)}${per}`}
                  </button>
                  <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                    <LockSimple size={13} weight="bold" aria-hidden /> Secured by Stripe · tax-deductible receipt by email
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default GivePage;
