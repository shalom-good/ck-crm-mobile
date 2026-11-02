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
    <button aria-label={count ? `${count} new alert${count === 1 ? "" : "s"}` : "Alerts"} className="gv-ib" onClick={() => router.push("/fam/alerts")} style={{ position: "relative", width: 44, height: 44, borderRadius: 14, flex: "none", ...style }}>
      <Bell size={20} weight="regular" color="var(--gv-ink)" />
      {/* A-12: a calm lime dot, never a red count. */}
      {count > 0 && (
        <span aria-hidden className="gv-pop" style={{ position: "absolute", top: 5, right: 5, width: 10, height: 10, borderRadius: "50%", background: "var(--gv-lime)", boxShadow: "0 0 0 1.5px var(--gv-go), 0 0 0 3px var(--gv-paper)" }} />
      )}
    </button>
  );
}
