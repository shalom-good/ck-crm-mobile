import { CheckCircle } from "@phosphor-icons/react";
import { useUI } from "@/lib/ui";

/** Single global toast: a white card with the pop shadow, anchored above the tab bar. */
export function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", left: 16, right: 16, bottom: "calc(78px + var(--ion-safe-area-bottom, 0px))",
        zIndex: 50, display: "flex", alignItems: "center", gap: 10,
        background: "var(--gv-card)", color: "var(--gv-ink)", borderRadius: 14, padding: "12px 14px",
        boxShadow: "var(--gv-shadow-pop)", animation: "ck-flyin 280ms var(--gv-ease)",
      }}
    >
      <CheckCircle size={20} weight="fill" color="var(--gv-go)" style={{ flex: "none" }} />
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, minWidth: 0 }}>{toast}</span>
    </div>
  );
}
