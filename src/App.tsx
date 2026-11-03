import { lazy, Suspense, useEffect, useLayoutEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Redirect, Route, useLocation } from "react-router-dom";
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel, setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IcHome, IcFamilies, IcChats, IcBook, IcSparkle } from "@/components/ckIcons";

import { StartPage } from "@/pages/StartPage";
import { FamilyCodePage } from "@/pages/FamilyCodePage";
import { TeamLoginPage } from "@/pages/TeamLoginPage";
import { AISheet } from "@/components/AISheet";
import { Toast } from "@/components/Toast";
import { LockScreen } from "@/components/LockScreen";
import { useUI } from "@/lib/ui";
import { useAuth } from "@/lib/auth";
import { useLock, useLockGuard } from "@/lib/lock";

setupIonicReact({ mode: "ios", swipeBackEnabled: true });

/* Route-level code splitting. The doors (start, family code, team sign-in)
   ship in the start-up chunk; each world loads the first time a signed-in
   person reaches it, behind the same paper splash the session restore uses.
   Ionic's outlet only transitions once the page's IonPage registers, so a
   plain splash as the Suspense fallback is safe inside IonRouterOutlet. */
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const FamiliesPage = lazy(() => import("@/pages/FamiliesPage").then((m) => ({ default: m.FamiliesPage })));
const ChatsPage = lazy(() => import("@/pages/ChatsPage").then((m) => ({ default: m.ChatsPage })));
const JobFunnelPage = lazy(() => import("@/pages/JobFunnelPage").then((m) => ({ default: m.JobFunnelPage })));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage").then((m) => ({ default: m.ResourcesPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const FamilyDetailPage = lazy(() => import("@/pages/FamilyDetailPage").then((m) => ({ default: m.FamilyDetailPage })));
const ChatThreadPage = lazy(() => import("@/pages/ChatThreadPage").then((m) => ({ default: m.ChatThreadPage })));
const JobFunnelDetailPage = lazy(() => import("@/pages/JobFunnelDetailPage").then((m) => ({ default: m.JobFunnelDetailPage })));
const AskPage = lazy(() => import("@/pages/AskPage").then((m) => ({ default: m.AskPage })));
const DesignPage = lazy(() => import("@/pages/DesignPage").then((m) => ({ default: m.DesignPage })));
const FamilyTabs = lazy(() => import("@/pages/family/FamilyTabs").then((m) => ({ default: m.FamilyTabs })));
const DonorStartPage = lazy(() => import("@/pages/DonorStartPage").then((m) => ({ default: m.DonorStartPage })));
const AcademyStartPage = lazy(() => import("@/pages/AcademyStartPage").then((m) => ({ default: m.AcademyStartPage })));
const AdoptPage = lazy(() => import("@/pages/AdoptPage").then((m) => ({ default: m.AdoptPage })));

/** The quiet paper splash: while the session restores and while a route's
 *  chunk loads. Fills whatever positioned box it is rendered in. */
function Splash() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gv-paper)" }}>
      <span className="ck-spin" />
    </div>
  );
}

/** A lazy page behind its own Suspense boundary (one per route, so a
 *  loading chunk never unmounts the outlet or a sibling tab). */
function Lazy({ page: Page }: { page: ComponentType }) {
  return (
    <Suspense fallback={<Splash />}>
      <Page />
    </Suspense>
  );
}

function TabsShell() {
  const { openCapture, captureOpen } = useUI();
  // Ionic keeps this shell mounted (hidden) under pushed detail pages;
  // since the FAB portals to ion-app it would stay visible there — only
  // render it while a tab route is actually showing.
  const location = useLocation();
  const onTabRoute = location.pathname.startsWith("/tabs");
  return (
    <>
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home" render={() => <Lazy page={HomePage} />} />
        <Route exact path="/tabs/families" render={() => <Lazy page={FamiliesPage} />} />
        <Route exact path="/tabs/chats" render={() => <Lazy page={ChatsPage} />} />
        <Route exact path="/tabs/job-funnel" render={() => <Lazy page={JobFunnelPage} />} />
        <Route exact path="/tabs/payments" render={() => <Lazy page={PaymentsPage} />} />
        <Route exact path="/tabs/resources" render={() => <Lazy page={ResourcesPage} />} />
        <Route exact path="/tabs/settings" render={() => <Lazy page={SettingsPage} />} />
        <Route exact path="/tabs"><Redirect to="/tabs/home" /></Route>
      </IonRouterOutlet>

      {/* The floating white tab bar (CK look): 14px off the sides and the
          bottom, the active item on a lime pill. Home · Families · [Ask] ·
          Chats · Resources. Payments + Job Funnel are reached from Home. */}
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <IcHome /><IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="families" href="/tabs/families">
          <IcFamilies /><IonLabel>Families</IonLabel>
        </IonTabButton>

        {/* Empty center slot: the Ask item is portaled to ion-app on top
            of it (it opens a sheet, not a tab; see below). */}
        <IonTabButton tab="ask" disabled aria-hidden="true" />

        <IonTabButton tab="chats" href="/tabs/chats">
          <IcChats /><IonLabel>Chats</IonLabel>
        </IonTabButton>
        <IonTabButton tab="resources" href="/tabs/resources">
          <IcBook /><IonLabel>Resources</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>

    {/* "Ask" is an ordinary item in the bar's center slot (same pill,
        icon and label as the others; lime while the AI sheet is open).
        It opens a sheet, not a tab, so it is a button portaled to ion-app
        over the empty center IonTabButton. */}
    {onTabRoute && createPortal(
      <button
        aria-label="Ask CK AI"
        aria-pressed={captureOpen}
        className="ck-ask-tab"
        onClick={() => openCapture("ask")}
        style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(env(safe-area-inset-bottom) + 14px)", zIndex: 200,
          width: 64, minHeight: 64, padding: "10px 0",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer", font: "inherit",
        }}
      >
        <span style={{ width: 52, height: 30, borderRadius: 999, background: captureOpen ? "var(--gv-lime)" : "transparent", color: captureOpen ? "var(--gv-ink)" : "var(--gv-mid)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .25s" }}>
          <IcSparkle />
        </span>
        <span style={{ fontSize: 11, fontWeight: captureOpen ? 700 : 600, color: captureOpen ? "var(--gv-ink)" : "var(--gv-mid)" }}>Ask</span>
      </button>,
      document.querySelector("ion-app") ?? document.body,
    )}
    </>
  );
}

export function App() {
  const { openCapture } = useUI();
  const { status, kind } = useAuth();

  const team = status === "signedIn" && kind === "team";
  const family = status === "signedIn" && kind === "family";

  // The CK look (theme/ck-look.css) covers every screen except the client
  // portal: a signed-in family keeps the portal's own Grove values.
  useLayoutEffect(() => {
    if (family) document.documentElement.removeAttribute("data-look");
    else document.documentElement.setAttribute("data-look", "ck");
  }, [family]);

  // Face ID / passcode gate over team sessions (native only; see lib/lock).
  useLockGuard({ enabled: team, signedOut: status === "signedOut" });
  const { locked } = useLock();

  // Deep link: ckcrm://add (or #add) opens the capture sheet from anywhere.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#add") openCapture("add");
      else if (window.location.hash === "#ai") openCapture("ask");
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [openCapture]);

  // Once a teammate is in, warm the chunks behind the other tabs in idle
  // time so the first tap on each does not show the splash.
  useEffect(() => {
    if (!team) return;
    const warm = () => {
      void Promise.allSettled([
        import("@/pages/FamiliesPage"), import("@/pages/ChatsPage"), import("@/pages/ResourcesPage"), import("@/pages/FamilyDetailPage"),
      ]);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 2000);
    return () => clearTimeout(t);
  }, [team]);

  // Session restoring — a quiet paper splash, no flash of the start screen.
  if (status === "loading") {
    return (
      <IonApp>
        <Splash />
      </IonApp>
    );
  }

  // Where a signed-in person belongs; signed-out people start at /start.
  const home = team ? "/tabs/home" : family ? "/fam/home" : "/start";

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* doors */}
          <Route exact path="/start" render={() => (status === "signedIn" ? <Redirect to={home} /> : <StartPage />)} />
          <Route exact path="/start/family" render={() => (status === "signedIn" ? <Redirect to={home} /> : <FamilyCodePage />)} />
          <Route exact path="/start/team" render={() => (status === "signedIn" ? <Redirect to={home} /> : <TeamLoginPage />)} />
          <Route exact path="/start/donor" render={() => (status === "signedIn" ? <Redirect to={home} /> : <Lazy page={DonorStartPage} />)} />
          <Route exact path="/start/academy" render={() => <Lazy page={AcademyStartPage} />} />
          {/* Adopt a family: open to anyone, signed in or not (the page carries its own donor sign-in). */}
          <Route exact path="/start/adopt" render={() => <Lazy page={AdoptPage} />} />
          <Route exact path="/adopt" render={() => <Lazy page={AdoptPage} />} />
          <Route exact path="/login"><Redirect to={status === "signedIn" ? home : "/start/team"} /></Route>

          {/* family world */}
          <Route path="/fam" render={() => (family ? <Lazy page={FamilyTabs} /> : <Redirect to={home} />)} />
          <Route exact path="/home"><Redirect to={home} /></Route>

          {/* team world */}
          <Route exact path="/family/:id" render={() => (team ? <Lazy page={FamilyDetailPage} /> : <Redirect to={home} />)} />
          <Route exact path="/chat/:familyRecId" render={() => (team ? <Lazy page={ChatThreadPage} /> : <Redirect to={home} />)} />
          <Route exact path="/job-funnel/:id" render={() => (team ? <Lazy page={JobFunnelDetailPage} /> : <Redirect to={home} />)} />
          <Route exact path="/ask" render={() => (team ? <Lazy page={AskPage} /> : <Redirect to={home} />)} />
          <Route path="/tabs" render={() => (team ? <TabsShell /> : <Redirect to={home} />)} />

          <Route exact path="/design" render={() => <Lazy page={DesignPage} />} />
          <Route exact path="/"><Redirect to={home} /></Route>
        </IonRouterOutlet>
      </IonReactRouter>

      {/* App-wide overlays (team only in practice; harmless otherwise) */}
      <AISheet />
      <Toast />

      {/* The Face ID / passcode gate sits over everything, Ionic overlays included. */}
      {locked && <LockScreen />}
    </IonApp>
  );
}
