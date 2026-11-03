import { useEffect, useState, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CaretRight } from "@phosphor-icons/react";
import { HouseArt, GiftArt, AcademyMark, CalcArt } from "@/components/gv";
import { quoteForToday } from "@/lib/quotes";
import { SESSION_ENDED_KEY, LAST_DOOR_KEY } from "@/lib/auth";
import { GIVE_URL, CHECK_URL, CRM_HOST } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import { TopBar } from "@/components/TopBar";

/**
 * The one place to start (CK look): the top bar with the lime CK tile,
 * "Welcome.", then four doors as white cards with a pastel tile per space:
 * a family opens their page, a donor signs in to their giving, CK Academy,
 * and "Check your monthly number" opens the CRM's public /check in the
 * in-app browser. Below them the coral giving band with the white Donate
 * pill; at the foot a quiet team sign-in and the day's quote.
 * Nothing red, no badges, nothing urgent.
 */
export function StartPage() {
  const router = useIonRouter();
  const quote = quoteForToday();

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

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 10px) 20px calc(20px + env(safe-area-inset-bottom))" }}>
          <TopBar />

          <div style={{ padding: "18px 2px 0" }}>
            <h1 className="gv-rise" style={{ "--i": 0, margin: 0, fontSize: 36, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.035em", color: "var(--gv-ink)" } as React.CSSProperties}>
              Welcome<span style={{ color: "var(--gv-go)" }}>.</span>
            </h1>
            <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>One place to start. Who are you today?</p>
          </div>

          {sessionEnded && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 1, marginTop: 14 } as React.CSSProperties}>
              It has been a while, so you were signed out. Pick your door below to pick up where you left off.
            </div>
          )}

          {/* the four doors: white cards, a pastel tile per space */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            <Door i={2} tint="mint" art={<HouseArt width={46} strokeWidth={8} still />} title="I'm a CK family" sub="Open your page with the 7-letter code from your case manager." onClick={() => router.push("/start/family")} />
            <Door i={3} tint="apricot" art={<GiftArt width={40} strokeWidth={6} />} title="I'm a donor" sub="Your gifts, and what they did" onClick={() => router.push("/start/donor")} />
            <Door i={4} tint="sky" art={<AcademyMark size={24} color="var(--gv-skyInk)" />} title="CK Academy" sub="Courses on money that lasts, for couples and families." onClick={() => router.push("/start/academy")} />
            <Door i={5} tint="yellow" art={<CalcArt width={40} strokeWidth={9} />} title="Check your monthly number" sub="See what comes in, what goes out, and what CK would do next." onClick={openCheck} />
          </div>

          {/* Giving: the coral band with a white Donate pill (ink on coral) */}
          <div className="gv-rise" style={{ "--i": 6, marginTop: 12, background: "var(--gv-coral)", borderRadius: 22, padding: "14px 14px 14px 18px", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--gv-ink)" }}>Give to Collective Kindness</span>
              <span style={{ display: "block", fontSize: 12.5, marginTop: 2, color: "var(--gv-ink)" }}>Once or monthly, to every family</span>
            </span>
            <button onClick={() => void openExternal(GIVE_URL)} style={{ flex: "none", height: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#fff", color: "var(--gv-coral-ink, #9A3B22)", font: "inherit", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              Donate
            </button>
          </div>

          {/* quiet team door */}
          <div className="gv-rise" style={{ "--i": 7, display: "flex", justifyContent: "center", marginTop: 4 } as React.CSSProperties}>
            <button
              onClick={() => router.push("/start/team")}
              style={{ background: "none", border: 0, font: "inherit", fontSize: 13.5, fontWeight: 600, color: "var(--gv-mid)", padding: "12px 16px", minHeight: 44, cursor: "pointer" }}
            >
              Team sign-in
            </button>
          </div>

          <figure className="gv-rise" style={{ "--i": 8, margin: "auto 2px 0", paddingTop: 4 } as React.CSSProperties}>
            <blockquote style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "var(--gv-ink)", textWrap: "balance" } as React.CSSProperties}>&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gv-go)" }}>{quote.source}</figcaption>
          </figure>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** The monthly-number door: log the tap (no PII: event, door, a random
 *  device id), then open /check in the in-app browser. */
function openCheck() {
  try {
    let id = localStorage.getItem("ck-device-id");
    if (!id) {
      const a = new Uint8Array(12); crypto.getRandomValues(a);
      id = Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("ck-device-id", id);
    }
    const body = JSON.stringify({ event: "door_tap", door: "app", step: "start", ms: Math.round(performance.now()), device: id });
    void fetch(`${CRM_HOST}/api/public/check/event`, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body }).catch(() => {});
  } catch { /* never block the door */ }
  void openExternal(CHECK_URL);
}

/** A white card row: a 52px pastel tile with the space's drawing, title 15.5/700, 12.5 subline, chevron. */
function Door({ i, art, tint, title, sub, onClick }: { i: number; art: ReactNode; tint: "mint" | "apricot" | "sky" | "yellow"; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="gv-card gv-rise" style={{ "--i": i, display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 44, textAlign: "left", border: 0, cursor: "pointer", font: "inherit", padding: "12px 14px 12px 12px" } as React.CSSProperties}>
      <span aria-hidden style={{ width: 52, height: 52, borderRadius: 16, background: `var(--gv-${tint})`, display: "grid", placeItems: "center", flex: "none", overflow: "hidden" }}>{art}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15.5, lineHeight: 1.25, fontWeight: 700, color: "var(--gv-ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--gv-mid)", marginTop: 2, lineHeight: 1.4 }}>{sub}</span>
      </span>
      <CaretRight size={18} weight="bold" color="var(--gv-faint)" style={{ flex: "none" }} />
    </button>
  );
}
