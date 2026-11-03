import { useEffect, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
import { useSwipeBack } from "@/lib/swipeBack";
import { TopBar } from "@/components/TopBar";
import { ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import { GiftArt } from "@/components/gv";
import { GIVE_URL, DONOR_PORTAL_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import { CodeSignIn } from "@/components/CodeSignIn";
import { webHandoff } from "@/lib/identityApi";
import { loadDonorSession, saveDonorSession, clearDonorSession, type DonorSession } from "@/lib/donorSession";

/**
 * The donor door (one sign-in, 2026-11-02; B-16). ONE field for a phone or
 * an email → a 6-digit code (WhatsApp first, email second) → the donor's
 * 180-day session, renewed on use. Signed in: "See my giving" opens the
 * giving page on the web already signed in (a one-tap link), and Adopt a
 * family opens inside the app with the same session. Not signed in, Adopt
 * and a plain gift are right under the sign-in: value first, identity later.
 */
export function DonorStartPage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const [session, setSession] = useState<DonorSession | null>(null);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [step, setStep] = useState<"id" | "code">("id");

  useEffect(() => { void loadDonorSession().then((s) => { setSession(s); setReady(true); }); }, []);

  const seeGiving = async () => {
    if (!session || opening) return;
    setOpening(true);
    const url = await webHandoff("donor", "/donor", session.token);
    setOpening(false);
    void openExternal(url || DONOR_PORTAL_URL);
  };
  const first = (session?.name || "").trim().split(/\s+/)[0];

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <TopBar back="/start" space="Giving" style={{ padding: "0 20px 0 14px" }} />
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }}>
          <div className="ck-art apricot gv-rise" style={{ padding: "10px 16px 4px", marginTop: 6 }}>
            <GiftArt width={120} />
          </div>

          {ready && session && (<>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>{first ? `Welcome back, ${first}` : "Welcome back"}</h1>
            <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 8 } as React.CSSProperties}>Your gifts, the families they reached, and your receipts.</p>
            <button className="gv-btn block gv-rise" style={{ "--i": 3, marginTop: 22 } as React.CSSProperties} disabled={opening} onClick={() => void seeGiving()}>
              {opening ? "Opening…" : <>See my giving <ArrowSquareOut size={16} /></>}
            </button>
            <button className="gv-btn ghost block gv-rise" style={{ "--i": 4, marginTop: 10 } as React.CSSProperties} onClick={() => router.push("/start/adopt")}>
              Adopt a family <CaretRight size={18} />
            </button>
            <p style={{ margin: "16px 2px 0", fontSize: 14, color: "var(--gv-mid)" }}>
              <button className="gv-link" style={{ fontSize: 14 }} onClick={() => { void clearDonorSession(); setSession(null); }}>Sign out</button>
            </p>
          </>)}

          {ready && !session && (<>
            <CodeSignIn
              area="donor"
              title="See your giving"
              sub="Enter your phone number or the email you give with. We will send a 6-digit code. No password."
              onStep={setStep}
              onSignedIn={async (token, data) => {
                const s = { token, name: data?.person?.name || data?.name || null };
                await saveDonorSession(s);
                setSession(s);
              }}
            />
            {step === "id" && (<>
              <div className="gv-eyebrow gv-rise" style={{ "--i": 5, margin: "24px 2px 10px" } as React.CSSProperties}>New here?</div>
              <button className="gv-btn ghost block gv-rise" style={{ "--i": 5 } as React.CSSProperties} onClick={() => router.push("/start/adopt")}>
                Adopt a family <CaretRight size={18} />
              </button>
              <button className="gv-btn ghost block gv-rise" style={{ "--i": 6, marginTop: 10 } as React.CSSProperties} onClick={() => void openExternal(GIVE_URL)}>
                Make a gift <ArrowSquareOut size={16} />
              </button>
            </>)}
          </>)}
        </div>
      </IonContent>
    </IonPage>
  );
}
