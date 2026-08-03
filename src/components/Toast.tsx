import { CheckCircle } from "@phosphor-icons/react";
import { useUI } from "@/lib/ui";

/** Single global toast, anchored above the tab bar. */
export function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed", left: 16, right: 16, bottom: "calc(78px + env(safe-area-inset-bottom))",
        zIndex: 50, display: "flex", alignItems: "center", gap: 10,
        backgroundColor: "#0F172A", color: "#fff", borderRadius: 14, padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(15,23,42,.28)", animation: "ck-flyin 280ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <CheckCircle size={20} weight="fill" color="#34D399" />
      <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
    </div>
  );
}
