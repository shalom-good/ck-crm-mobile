import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CheckCircle, SignOut, Cloud, Check } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useRole, ROLE_BY_KEY } from "@/lib/roles";
import { useAuth } from "@/lib/auth";
import { syncedAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";

const APP_VERSION = "0.2.0";

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
    router.push("/login", "root", "replace");
  };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}><Header title="Settings" /></div>

        <div style={{ padding: "8px 16px 130px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Row
              icon={<Avatar name={me.name} size={40} />}
              title={me.name}
              subtitle={`${me.email}${roleLine ? ` · ${roleLine}` : ""}`}
              trailing={user?.demo ? <Tag>Demo</Tag> : isAdmin ? <Tag>Admin</Tag> : undefined}
            />
          </Card>

          {/* View as — admins only. Re-lenses the whole app + ?as= on /families. */}
          {isAdmin && (
            <div>
              <Label>View as</Label>
              <Card>
                <ChoiceRow
                  first
                  name={`Myself (${me.name})`}
                  role="Your own caseload"
                  accent="var(--ck-title)"
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
                <p style={{ margin: "8px 2px 0", fontSize: 12, color: "var(--ck-body)" }}>
                  You are viewing the app as {viewAs.name}. Chats stay yours.
                </p>
              )}
            </div>
          )}

          <Card>
            <Row icon={<Cloud size={22} weight="regular" color="var(--ck-success)" />} title="Synced" subtitle={syncedAgo(lastSync)} trailing={<CheckCircle size={20} weight="fill" color="var(--ck-success)" />} />
          </Card>

          <Card>
            <button onClick={() => void doSignOut()} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 16, background: "none", border: "none", cursor: "pointer", color: "var(--ck-danger)", fontSize: 15, fontWeight: 600 }}>
              <SignOut size={22} weight="regular" /> Sign out
            </button>
          </Card>

          <div style={{ textAlign: "center", fontSize: 12, color: "var(--ck-muted)", marginTop: 8 }}>CK Team · v{APP_VERSION}</div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="shadow-card" style={{ backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, overflow: "hidden" }}>{children}</div>;
}
function Row({ icon, title, subtitle, trailing }: { icon: React.ReactNode; title: string; subtitle?: string; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: "var(--ck-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}
function ChoiceRow({ first, name, role, accent, on, onPick }: { first?: boolean; name: string; role: string; accent: string; on: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, background: "none", border: "none", borderTop: first ? "none" : "1px solid var(--ck-hairline)", cursor: "pointer", textAlign: "left" }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--ck-muted)", marginTop: 1 }}>{role}</div>
      </div>
      {on && <Check size={20} weight="bold" color="var(--ck-tint)" />}
    </button>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)", marginBottom: 8, textTransform: "uppercase" }}>{children}</div>;
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--ck-tint-soft)", color: "var(--ck-tint)" }}>{children}</span>;
}
