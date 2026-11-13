import { useEffect, useState, type ReactNode } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CaretRight, Compass, UsersThree, Wallet } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { Panel } from "@/components/orchard/family/FamKit";
import { HouseArt, GiftArt, AcademyMark } from "@/components/gv";
import { useSwipeBack } from "@/lib/swipeBack";
import { useAuth } from "@/lib/auth";
import { FAMILY_DEMO_TOKEN, resetFamilyDemo } from "@/lib/portalDemo";
import { resetKdhPlusSample } from "@/lib/kdhPlusApi";
import { KDH_DEMO_TOKEN } from "@/lib/kdhApi";
import { ACADEMY_DEMO_EMAIL, academyVerify } from "@/lib/academyApi";
import { DONOR_DEMO_EMAIL, donorVerify, saveDonor } from "@/lib/donorApi";
import { setPersona } from "@/lib/demoPersona";
import { verifyCode } from "@/lib/mobileApi";

/**
 * "All access": the owner's pass through every door of the app, on SAMPLE
 * data only. Reached by typing the reserved code CKTEAM on the family code
 * screen (never sent to the server). Each row signs in to a made-up person
 * that lives on this phone: a CK family, a Kosher Debt Help client, a
 * donor, a CK Academy couple. Sign out from any of them to come back.
 *
 * The team door (2026-11-11, "give me an all access look" on the team
 * sign-in) uses the App Review account: the server gives it a session that
 * is fenced off to made-up families and can never reach a real one.
 */
const DEMO_CODE = "072026";
const TEAM_DEMO_EMAIL = "reviewer@ckteam.app";
type DoorKey = "family" | "kdh" | "kdhplus" | "donor" | "academy" | "team";

export function AllAccessPage() {
  const swipe = useSwipeBack("/start/family");
  const router = useIonRouter();
  const qc = useQueryClient();
  const { signIn, signInFamily, signInKdh, signInAcademy } = useAuth();
  const [busy, setBusy] = useState<DoorKey | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Nothing a real session loaded may show behind a sample door.
  useEffect(() => { qc.clear(); }, [qc]);

  const open = async (k: DoorKey) => {
    if (busy) return;
    setBusy(k); setErr(null);
    try {
      qc.clear();
      if (k === "family") {
        setPersona({ family: "Ben" });
        resetFamilyDemo();
        await signInFamily(FAMILY_DEMO_TOKEN, "Ben's family");
        // The /start/all route itself redirects to the new home once signed in.
      } else if (k === "kdh" || k === "kdhplus") {
        setPersona({ kdh: "Mendy" });
        if (k === "kdhplus") resetKdhPlusSample();
        await signInKdh(KDH_DEMO_TOKEN, "Mendy");
        // Lands on homework (the route redirects); KDH Plus steps in from there.
        if (k === "kdhplus") setTimeout(() => router.push("/kdh/plus"), 900);
        // The /start/all route itself redirects to the new home once signed in.
      } else if (k === "team") {
        setPersona(null);
        const { token, user } = await verifyCode(TEAM_DEMO_EMAIL, DEMO_CODE);
        await signIn(token, user);
        // The /start/all route itself redirects to the staff home once signed in.
      } else if (k === "academy") {
        setPersona(null);
        const { token, student } = await academyVerify(ACADEMY_DEMO_EMAIL, DEMO_CODE);
        await signInAcademy(token, student);
        // The /start/all route itself redirects to the new home once signed in.
      } else {
        // The donor session is its own small store, read when the donor page opens.
        setPersona({ donor: "Boruch Leivi Bartfield" });
        saveDonor(await donorVerify(DONOR_DEMO_EMAIL, DEMO_CODE));
        setBusy(null);
        router.push("/start/donor");
      }
    } catch {
      setErr("That door did not open. Try again.");
      setBusy(null);
    }
  };

  const doors: { k: DoorKey; tone: string; art: ReactNode; title: string; sub: string }[] = [
    { k: "donor", tone: "butter", art: <GiftArt width={50} strokeWidth={4.4} />, title: "Boruch Leivi Bartfield", sub: "Donor: the impact page and giving over time." },
    { k: "family", tone: "mint", art: <HouseArt width={58} strokeWidth={6.5} still />, title: "Ben", sub: "CK family: signed plan, team and budget." },
    { k: "kdh", tone: "sky", art: <Compass size={30} weight="bold" />, title: "Mendy", sub: "Kosher Debt Help client: homework from a call." },
    { k: "kdhplus", tone: "peach", art: <Wallet size={30} weight="bold" />, title: "Mendy, KDH Plus", sub: "Budget, money test and a matched budgeter." },
    { k: "academy", tone: "lilac", art: <AcademyMark size={28} color="#2D3766" />, title: "CK Academy couple", sub: "On episode two of the course." },
    { k: "team", tone: "rose", art: <UsersThree size={30} weight="bold" />, title: "CK team", sub: "The staff side: families, chats and Ask, with made-up families." },
  ];

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/start/family" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page ocf2-page--door">
          <section className="ocf2-hero ocf2-t-mint gv-rise">
            <h1 className="ocf2-h1"><span><mark>Examples</mark></span><span className="ocf2-h1-2">Pick someone to walk through.</span></h1>
          </section>

          <div role="note" className="ocf2-note ocf2-t-butter gv-rise" style={{ "--i": 1 } as React.CSSProperties}>
            <div><b style={{ color: "inherit" }}>Sample data only.</b> The names are for the walk-through. The numbers are made up.</div>
          </div>

          <div className="ocf2-doors">
            {doors.map((d, i) => (
              <button key={d.k} type="button" className="ocf2-door gv-rise" style={{ "--i": i + 2, minHeight: 72 } as React.CSSProperties} disabled={!!busy} aria-busy={busy === d.k} onClick={() => void open(d.k)}>
                <span aria-hidden className={`ocf2-door-art ocf2-t-${d.tone}`}>{d.art}</span>
                <span className="ocf2-door-t"><b>{d.title}</b><small>{busy === d.k ? "Opening…" : d.sub}</small></span>
                <span aria-hidden className="ocf2-door-go"><CaretRight size={16} weight="bold" /></span>
              </button>
            ))}
          </div>

          {err && <div role="alert" className="ocf2-gentle">{err}</div>}

          <Panel className="gv-rise" style={{ "--i": 7 } as React.CSSProperties}>
            <p className="ocf2-p" style={{ margin: 0 }}>Sign out inside any door to come back to the start. What you tick or change stays on this phone.</p>
          </Panel>
        </div>
      </IonContent>
    </IonPage>
  );
}
