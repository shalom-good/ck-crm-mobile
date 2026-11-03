import { TopBar } from "@/components/TopBar";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CheckCircle, SignOut, Cloud, Check } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useRole, ROLE_BY_KEY } from "@/lib/roles";
import { useAuth } from "@/lib/auth";
import { syncedAgo } from "@/lib/time";
import { Card, Eyebrow, Av, Pill, Row } from "@/components/gv";

const APP_VERSION = "0.3.0";

/**
 * Settings. The signed-in user IS the provider now; the "View as"
 * control only appears for admins (user.admin or the owner emails) and
 * re-lenses the caseload (drives ?as= on /families).
 */
export function SettingsPage() {
  const router = useIonRouter();
  const { lastSync } = useAppData();
  const { provider, providers, setProvider, me } = useRole();
  const { user, isAdmin, viewAs, signOut } = useAuth();

  const roleLine = (user?.roles ?? []).join(" · ") || ROLE_BY_KEY[provider.role]?.label || "Team member";

  const doSignOut = async () => {
    await signOut();
    router.push("/start", "root", "replace");
  };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 10px) 20px 0" }}>
          <TopBar space="Team" back="/tabs/home" />
          <h1 className="gv-h1" style={{ marginTop: 10 }}>Settings</h1>
        </div>

        <div style={{ padding: "14px 20px 120px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* who you are */}
          <Card i={0}>
            <Row>
              <Av name={me.name} size={44} round />
              <div className="t">
                <b>{me.name}</b>
                <span>{me.email}{roleLine ? ` · ${roleLine}` : ""}</span>
              </div>
              {user?.demo ? <Pill>Demo</Pill> : isAdmin ? <Pill tint="mint">Admin</Pill> : null}
            </Row>
          </Card>

          {/* View as — admins only. Re-lenses the whole app + ?as= on /families. */}
          {isAdmin && (
            <div>
              <Eyebrow style={{ marginTop: 10 }}>View as</Eyebrow>
              <Card i={1}>
                <ChoiceRow
                  name={me.name}
                  label={`Myself (${me.name})`}
                  role="Your own caseload"
                  accent="#2E5146"
                  on={!viewAs}
                  onPick={() => setProvider(null)}
                />
                {providers.map((p) => {
                  const r = ROLE_BY_KEY[p.role];
                  return (
                    <ChoiceRow
                      key={p.email}
                      name={p.name}
                      role={r.label}
                      accent={r.accent}
                      on={viewAs?.email === p.email}
                      onPick={() => setProvider(p.email)}
                    />
                  );
                })}
              </Card>
              {viewAs && (
                <p className="gv-meta" style={{ margin: "8px 2px 0", lineHeight: 1.5 }}>
                  You are viewing the app as {viewAs.name}. Chats stay yours.
                </p>
              )}
            </div>
          )}

          {/* sync state */}
          <Card i={2}>
            <Row>
              <span className="gv-tile" style={{ background: "var(--gv-mint)", color: "var(--gv-mintInk)", borderRadius: 999 }}><Cloud size={18} weight="bold" /></span>
              <div className="t"><b>Synced</b><span>{syncedAgo(lastSync)}</span></div>
              <CheckCircle size={20} weight="fill" color="var(--gv-go)" style={{ flex: "none" }} />
            </Row>
          </Card>

          {/* sign out — rose ink, the only red on the screen */}
          <Card i={3}>
            <Row onClick={() => void doSignOut()}>
              <span className="gv-tile" style={{ background: "var(--gv-rose)", color: "var(--gv-roseInk)", borderRadius: 999 }}><SignOut size={18} weight="bold" /></span>
              <div className="t"><b style={{ color: "var(--gv-roseInk)" }}>Sign out</b></div>
            </Row>
          </Card>

          <div className="gv-meta" style={{ textAlign: "center", marginTop: 8 }}>Collective Kindness · v{APP_VERSION}</div>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** One "view as" choice: round initials on a pastel, the role as a pill tinted by its accent at 14%, forest check when selected. */
function ChoiceRow({ name, label, role, accent, on, onPick }: { name: string; label?: string; role: string; accent: string; on: boolean; onPick: () => void }) {
  return (
    <Row onClick={onPick}>
      <Av name={name} size={36} round />
      <div className="t">
        <b>{label ?? name}</b>
        <span style={{ marginTop: 4 }}><Pill sm style={{ background: `${accent}24`, color: accent }}>{role}</Pill></span>
      </div>
      {on && <Check size={20} weight="bold" color="var(--gv-go)" style={{ flex: "none" }} />}
    </Row>
  );
}
