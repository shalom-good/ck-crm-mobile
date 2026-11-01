import { Sparkle, ArrowRight } from "@phosphor-icons/react";

interface Props {
  onOpen: () => void;
}

/**
 * The one focal card: forest surface, white headline, a lime pill button.
 * (Emitly's deep-teal primary block translated to Ask CK AI.)
 */
export function AskBar({ onOpen }: Props) {
  return (
    <div style={{ background: "var(--gv-go)", borderRadius: 20, padding: 20, boxShadow: "0 14px 32px -14px rgba(46,81,70,.6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", flex: "none" }}>
          <Sparkle size={16} weight="fill" color="var(--gv-lime)" />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.72)" }}>CK AI</span>
      </div>

      <h3 style={{ margin: 0, fontSize: 21, lineHeight: 1.2, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", maxWidth: 260 }}>
        Ask anything about your families
      </h3>
      <p style={{ margin: "6px 0 16px", fontSize: 13.5, lineHeight: 1.45, color: "rgba(255,255,255,.72)", maxWidth: 260 }}>
        Payments, notes, who needs a touch. Just ask.
      </p>

      <button
        onClick={onOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px",
          borderRadius: 999, border: 0, cursor: "pointer", font: "inherit",
          background: "var(--gv-lime)", color: "var(--gv-ink)", fontSize: 14.5, fontWeight: 800,
        }}
      >
        Ask CK AI <ArrowRight size={17} weight="bold" />
      </button>
    </div>
  );
}
