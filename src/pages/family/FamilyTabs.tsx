import { Redirect, Route } from "react-router-dom";
import { IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel } from "@ionic/react";
import { House, ListChecks, Wallet, CalendarBlank, PlayCircle } from "@phosphor-icons/react";
import { FamilyHomePage } from "@/pages/FamilyHomePage";
import { FamilyPlanPage } from "./FamilyPlanPage";
import { FamilyBudgetPage } from "./FamilyBudgetPage";
import { FamilyLearnPage } from "./FamilyLearnPage";
import { FamilyLessonPage } from "./FamilyLessonPage";
import { FamilyMeetingsPage } from "./FamilyMeetingsPage";
import { FamilyAlertsPage } from "./FamilyAlertsPage";

/** The family's world: Home · Plan · Budget · Meetings · Learn, and the
 *  bell → Alerts. No raised button; the family has one job per screen. */
export function FamilyTabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/fam/home" component={FamilyHomePage} />
        <Route exact path="/fam/plan" component={FamilyPlanPage} />
        <Route exact path="/fam/budget" component={FamilyBudgetPage} />
        <Route exact path="/fam/learn" component={FamilyLearnPage} />
        <Route exact path="/fam/learn/:id" component={FamilyLessonPage} />
        <Route exact path="/fam/meetings" component={FamilyMeetingsPage} />
        <Route exact path="/fam/alerts" component={FamilyAlertsPage} />
        <Route exact path="/fam"><Redirect to="/fam/home" /></Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/fam/home"><House size={24} weight="regular" /><IonLabel>Home</IonLabel></IonTabButton>
        <IonTabButton tab="plan" href="/fam/plan"><ListChecks size={24} weight="regular" /><IonLabel>Plan</IonLabel></IonTabButton>
        <IonTabButton tab="budget" href="/fam/budget"><Wallet size={24} weight="regular" /><IonLabel>Budget</IonLabel></IonTabButton>
        <IonTabButton tab="meetings" href="/fam/meetings"><CalendarBlank size={24} weight="regular" /><IonLabel>Meetings</IonLabel></IonTabButton>
        <IonTabButton tab="learn" href="/fam/learn"><PlayCircle size={24} weight="regular" /><IonLabel>Learn</IonLabel></IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
