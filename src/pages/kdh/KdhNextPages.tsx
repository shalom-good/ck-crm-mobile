import { Oil } from "@/components/orchard/Illos";
import { useState, type CSSProperties, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CaretRight, ChatText, Check, CreditCard, GraduationCap, House } from "@phosphor-icons/react";
import { KDH_FIT, KDH_LINKS, setKdhNext, type KdhChoice, type KdhHome } from "@/lib/kdhApi";
import { openExternal } from "@/lib/external";
import { success, tapLight } from "@/lib/haptics";
import { BackButton } from "@/components/BackButton";
import { OBtn, Panel } from "@/components/orchard/family/FamKit";
import { KDH_KEY, KdhBrand, useKdhHome } from "./kdhShared";

/**
 * ORCHARD (2026-11-10): "What would you like to do next?" for a KDH client.
 * Four ways to keep going after the call with the debt expert. Each pick
 * is saved on the CRM (POST /api/portal/kdh/next) so the expert sees it on
 * the profile and the next call starts from there.
 */
function useNext() {
  const qc = useQueryClient();
  const q = useKdhHome();
  const d = q.data;
  const first = d?.expert?.firstName || "your debt expert";
  const picked = new Set<KdhChoice>(d?.next?.picked || []);
  const links = d?.links || KDH_LINKS;
  const fit = d?.fit?.length ? d.fit : KDH_FIT;
  /** Save the pick. Never blocks the tap: a link opens either way. */
  const pick = async (choice: KdhChoice): Promise<boolean> => {
    try {
      const r = await setKdhNext(choice);
      qc.setQueryData<KdhHome>(KDH_KEY, (h) => h && ({
        ...h,
        next: { choice, at: r.at, picked: [choice, ...(h.next?.picked || []).filter((c) => c !== choice)] },
      }));
      return true;
    } catch { return false; }
  };
  return { d, first, picked, links, fit, pick, hasExpert: !!d?.expert };
}

function Shell({ back, children }: { back?: string; children: ReactNode }) {
  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="ocf2 ocf2-page okn">
          <div className="ocf2-top">{back ? <BackButton href={back} /> : <KdhBrand sub="Your next step" />}</div>
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}

export function KdhNextPage() {
  const router = useIonRouter();
  const { first, picked, links, pick, hasExpert } = useNext();
  const go = (choice: KdhChoice, url: string) => { void tapLight(); void pick(choice); void openExternal(url); };
  const rows: { k: KdhChoice; tone: string; icon: ReactNode; h: string; p: string; logo?: { src: string; alt: string }; on: () => void }[] = [
    { k: "literacy", tone: "lilac", icon: <GraduationCap size={27} weight="bold" />, h: "Work on financial literacy", p: "Eight episodes on money that lasts", logo: { src: "/logos/cka.png", alt: "CK Academy by Collective Kindness" }, on: () => go("literacy", links.academy) },
    { k: "budgeting", tone: "mint", icon: <CreditCard size={27} weight="bold" />, h: "Work on budgeting", p: "KDH Plus: your budget from your own numbers, with a budgeter matched to you", on: () => { void tapLight(); void pick("budgeting"); router.push("/kdh/plus"); } },
    { k: "therapy", tone: "peach", icon: <ChatText size={27} weight="bold" />, h: "Need someone to talk to?", p: "Therapy at lower rates through BetterYOUsa", on: () => go("therapy", links.therapy) },
    // "Really struggling and need more help?" (apply to CK) removed 2026-11-11 (Shalom: "remove this").
  ];
  return (
    <Shell>
      <div className="gv-rise okn-headrow">
        <div>
          <h1 className="ocf2-title okn-title"><span>What would you</span><span><mark className="okn-hl">like to do next?</mark></span></h1>
          <p className="ocf2-sub">Pick one. You can come back and pick another.</p>
        </div>
        <Oil name="signpost" w={96} className="oil-drop" />
      </div>
      {rows.map((r, i) => (
        <button key={r.k} type="button" className={`ocf2-panel ocf2-t-white okn-row gv-rise${picked.has(r.k) ? " is-picked" : ""}`} style={{ "--i": i + 1 } as CSSProperties} onClick={r.on}>
          <span className={`okn-ico ocf2-t-${r.tone}`} aria-hidden>{r.icon}</span>
          <span className="okn-row-body"><b>{r.h}</b><small>{r.p}</small>{r.logo ? <img className="okn-row-logo" src={r.logo.src} alt={r.logo.alt} /> : null}{picked.has(r.k) ? <em>You picked this</em> : null}</span>
          <CaretRight size={16} weight="bold" className="okn-chev" style={{ animationDelay: `${i * 0.3}s` }} />
        </button>
      ))}
      {hasExpert ? <p className="ocf2-p okn-foot">{first} sees what you pick, so your next call starts from there.</p> : null}
    </Shell>
  );
}

/** Not routed any more: /kdh/next/budget now redirects to KDH Plus
 *  (/kdh/plus, KdhPlusPage). Kept for reference. */
export function KdhBudgetPage() {
  const { first, picked, pick } = useNext();
  const [state, setState] = useState<"idle" | "busy" | "told" | "error">(picked.has("budgeting") ? "told" : "idle");
  const start = async () => {
    setState("busy");
    const ok = await pick("budgeting");
    if (ok) void success();
    setState(ok ? "told" : "error");
  };
  const told = state === "told" || picked.has("budgeting");
  return (
    <Shell back="/kdh/next">
      <Panel tone="mint" className="gv-rise">
        <h1 className="ocf2-title" style={{ fontSize: 28 }}>Build <mark className="okn-hl">your budget</mark></h1>
        <p className="ocf2-p">Three steps. The first two are yours, on your own time. The third is with {first}.</p>
      </Panel>
      {[
        ["Connect your bank", "We read your income and spending so you do not have to type it all in. Read only. We can never move money."],
        ["Fill in your budget", "Income, bills, day to day, once a year, and what you owe. About 15 minutes."],
        [`One session with ${first}`, "Go over every number together and choose your path."],
      ].map(([h, p], i) => (
        <Panel key={i} className="okn-stepcard gv-rise" style={{ "--i": i + 1 } as CSSProperties}>
          <b className="okn-num">{i + 1}</b>
          <div><h2>{h}</h2><p className="ocf2-p">{p}</p></div>
        </Panel>
      ))}
      <div className="okn-cta">
        {told ? (
          <p className="okn-told" role="status"><Check size={18} weight="bold" />We told {first}. You will hear back about getting your budget started.</p>
        ) : (
          <OBtn block disabled={state === "busy"} onClick={() => void start()}>{state === "busy" ? "Sending…" : "Start my budget"}</OBtn>
        )}
        {state === "error" ? <p className="ocf2-p okn-foot" role="alert">That did not go through. Check your connection and try again.</p> : null}
      </div>
    </Shell>
  );
}

export function KdhApplyPage() {
  const router = useIonRouter();
  const { fit, links, pick } = useNext();
  const apply = () => { void tapLight(); void pick("apply"); void openExternal(links.apply); };
  return (
    <Shell back="/kdh/next">
      <Panel tone="butter" className="gv-rise">
        <h1 className="ocf2-title" style={{ fontSize: 27 }}>More help, <mark className="okn-hl">with a whole team.</mark></h1>
        <p className="ocf2-p">Collective Kindness gives a family a full plan: a case manager, a budgeting coach and the experts you need, until you are back on steady ground.</p>
      </Panel>
      <Panel className="okn-fit gv-rise" style={{ "--i": 1 } as CSSProperties}>
        <h2>It may be a fit if</h2>
        {fit.map((f, i) => (
          <div key={i} className="okn-fitrow" style={{ "--k": i } as CSSProperties}><i aria-hidden><Check size={14} weight="bold" /></i><span>{f}</span></div>
        ))}
      </Panel>
      <p className="ocf2-p okn-foot" style={{ textAlign: "left" }}>Demand is high, so not every family gets in.</p>
      <div className="okn-cta">
        <OBtn block onClick={apply}>Apply to Collective Kindness</OBtn>
        <button type="button" className="ocf2-link okn-notnow" onClick={() => router.push("/kdh/next", "back")}>Not now</button>
      </div>
    </Shell>
  );
}
