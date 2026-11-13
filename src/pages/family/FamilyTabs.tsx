import { useState } from "react";
import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel } from "@ionic/react";
import { House, ListChecks, Wallet, CalendarBlank, PlayCircle, FolderSimple } from "@phosphor-icons/react";
import { FamilyDocsPage } from "./FamilyDocsPage";
import { FamilyHomePage } from "@/pages/FamilyHomePage";
import { FamilyPlanPage } from "./FamilyPlanPage";
import { FamilyBudgetPage } from "./FamilyBudgetPage";
import { FamilyLearnPage } from "./FamilyLearnPage";
import { FamilyLessonPage } from "./FamilyLessonPage";
import { FamilyMeetingsPage } from "./FamilyMeetingsPage";
import { FamilyAlertsPage } from "./FamilyAlertsPage";
import { AskHelper, AskTab } from "@/components/orchard/AskHelper";

/** The family's world: Home · Plan · Budget · Docs · Meetings · Learn, the
 *  lime "Ask" at the end of the bar (2026-11-11), and the bell → Alerts. */
export function FamilyTabs() {
  const [ask, setAsk] = useState(false);
  return (
    <>
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/fam/home" component={FamilyHomePage} />
        <Route exact path="/fam/plan" component={FamilyPlanPage} />
        <Route exact path="/fam/budget" component={FamilyBudgetPage} />
        <Route exact path="/fam/learn" component={FamilyLearnPage} />
        <Route exact path="/fam/learn/:id" component={FamilyLessonPage} />
        <Route exact path="/fam/docs" component={FamilyDocsPage} />
        <Route exact path="/fam/meetings" component={FamilyMeetingsPage} />
        <Route exact path="/fam/alerts" component={FamilyAlertsPage} />
        <Route exact path="/fam"><Redirect to="/fam/home" /></Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className="ocf2-tabbar has-ask is-seven">
        <IonTabButton tab="home" href="/fam/home"><House size={24} weight="bold" /><IonLabel>Home</IonLabel></IonTabButton>
        <IonTabButton tab="plan" href="/fam/plan"><ListChecks size={24} weight="bold" /><IonLabel>Plan</IonLabel></IonTabButton>
        <IonTabButton tab="budget" href="/fam/budget"><Wallet size={24} weight="bold" /><IonLabel>Budget</IonLabel></IonTabButton>
        <IonTabButton tab="docs" href="/fam/docs"><FolderSimple size={24} weight="bold" /><IonLabel>Docs</IonLabel></IonTabButton>
        <IonTabButton tab="meetings" href="/fam/meetings"><CalendarBlank size={24} weight="bold" /><IonLabel>Meetings</IonLabel></IonTabButton>
        <IonTabButton tab="learn" href="/fam/learn"><PlayCircle size={24} weight="bold" /><IonLabel>Learn</IonLabel></IonTabButton>
        {/* The empty slot the lime "Ask" button sits on (see AskTab). */}
        <IonTabButton tab="ask" disabled aria-hidden="true" className="ocf2-ask-slot" />
      </IonTabBar>
    </IonTabs>
    {!ask && <AskTab onOpen={() => setAsk(true)} />}
    <AskHelper door="family" open={ask} onClose={() => setAsk(false)} />
    </>
  );
}
