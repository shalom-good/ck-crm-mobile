import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, useIonRouter } from "@ionic/react";
import { ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import { GiftArt } from "@/components/gv";
import { GIVE_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";

/**
 * The donor door (Shalom 2026-11-01). Adopt a family lives right here in
 * the app (an embedded view of the CRM page, with its own donor sign-in by
 * email code or Google); a plain gift still opens the Give page in the
 * browser.
 */
export function DonorStartPage() {
  const router = useIonRouter();
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/start" text="" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }}>
          <div className="gv-rise" style={{ borderRadius: 22, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "10px 16px 4px", display: "flex", justifyContent: "center" }}>
            <GiftArt width={164} />
          </div>

          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>Carry one family through their plan</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 8 } as React.CSSProperties}>
            Choose a city, see what it takes, and adopt a family. Monthly or once. You get a short note every month on how they are doing.
          </p>

          <button className="gv-btn block gv-rise" style={{ "--i": 3, marginTop: 22 } as React.CSSProperties} onClick={() => router.push("/start/adopt")}>
            Adopt a family <CaretRight size={18} />
          </button>

          <button className="gv-btn ghost block gv-rise" style={{ "--i": 4, marginTop: 10 } as React.CSSProperties} onClick={() => void openExternal(GIVE_URL)}>
            Make a gift instead <ArrowSquareOut size={16} />
          </button>

          <p className="gv-rise" style={{ "--i": 5, margin: "14px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--gv-quiet)", textAlign: "center" } as React.CSSProperties}>
            Sign in with your email or Google to see the families you adopted. No password.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
