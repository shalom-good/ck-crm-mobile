import { Sparkle, ArrowRight } from "@phosphor-icons/react";

interface Props {
  onOpen: () => void;
}

/**
 * The dark focal card. Near-black surface, bold white headline, a light-blue
 * pill button — the "Earn free crypto" block translated to Ask CK AI.
 */
export function AskBar({ onOpen }: Props) {
  return (
    <div
      style={{
        position: "relative", overflow: "hidden",
        backgroundColor: "var(--ck-ink)", borderRadius: 24, padding: 20,
        boxShadow: "0 12px 30px rgba(15,23,42,.18)",
      }}
    >
      {/* faint card-stack motif, like the reference */}
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: "absolute", right: -30, bottom: -40, opacity: 0.12 }} aria-hidden>
        <rect x="30" y="40" width="120" height="80" rx="14" transform="rotate(-12 90 90)" stroke="#fff" strokeWidth="2" fill="none" />
        <rect x="40" y="60" width="120" height="80" rx="14" transform="rotate(-4 90 90)" stroke="#fff" strokeWidth="2" fill="none" />
      </svg>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkle size={17} weight="fill" color="#bfe0f5" />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>CK AI</span>
      </div>

      <h3 style={{ margin: 0, fontSize: 22, lineHeight: "28px", fontWeight: 700, color: "var(--ck-ink-text)", maxWidth: 240 }}>
        Ask anything about your families
      </h3>
      <p style={{ margin: "8px 0 16px", fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 240 }}>
        Payments, notes, who needs a touch. Just ask.
      </p>

      <button
        onClick={onOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px",
          borderRadius: 999, border: "none", cursor: "pointer",
          backgroundColor: "var(--ck-ink-pill)", color: "var(--ck-ink-pill-text)",
          fontSize: 15, fontWeight: 600,
        }}
      >
        Ask CK AI <ArrowRight size={18} weight="bold" />
      </button>
    </div>
  );
}
