import { useIonRouter } from "@ionic/react";
import { Bell } from "@phosphor-icons/react";
import { useFamilyAlerts } from "@/lib/familyAlerts";

/** The bell on every family screen: a count of what needs them and has not
 *  been opened yet (lib/familyAlerts keeps the seen set on the device);
 *  tap → Alerts, which marks everything seen. */
export function FamBell({ style }: { style?: React.CSSProperties }) {
  const router = useIonRouter();
  const { count } = useFamilyAlerts();
  return (
    <button aria-label={count ? `${count} new alert${count === 1 ? "" : "s"}` : "Alerts"} className="gv-ib" onClick={() => router.push("/fam/alerts")} style={{ position: "relative", width: 38, height: 38, borderRadius: 12, flex: "none", ...style }}>
      <Bell size={20} weight="regular" color="var(--gv-ink)" />
      {count > 0 && (
        <span className="tnum gv-pop" style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--gv-down)", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", boxShadow: "0 0 0 2px var(--gv-paper)" }}>{count}</span>
      )}
    </button>
  );
}
