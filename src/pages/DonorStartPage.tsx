import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { GiftArt } from "@/components/gv";
import { DONOR_PORTAL_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";

/**
 * The donor door. The donor impact portal lives in the CRM on the web
 * (DONOR_HOST/donor, sign-in by email code), so this page says so in one
 * breath and hands the person over to the system browser.
 */
export function DonorStartPage() {
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

          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>Your donor portal lives on the web for now</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 8 } as React.CSSProperties}>
            See the families your gifts reached and what changed for them. It opens in your browser.
          </p>

          <button className="gv-btn block gv-rise" style={{ "--i": 3, marginTop: 22 } as React.CSSProperties} onClick={() => void openExternal(DONOR_PORTAL_URL)}>
            Open my donor portal <ArrowSquareOut size={18} />
          </button>

          <p className="gv-rise" style={{ "--i": 4, margin: "14px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--gv-quiet)", textAlign: "center" } as React.CSSProperties}>
            Sign in with the email you gave with. We send a six-digit code.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
