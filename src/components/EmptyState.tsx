import { Plus } from "@phosphor-icons/react";

interface Props {
  /** Backwards-compatible accent + heading. */
  stageColor: string;
  message?: string;
  buttonLabel?: string;
  onAdd: () => void;
  /** Deprecated alias kept so older callers still read well. */
  stageLabel?: string;
}

/** Calm empty state. A single-color line drawing, one sentence, one button. */
export function EmptyState({ stageColor, message, buttonLabel, onAdd, stageLabel }: Props) {
  const copy = message ?? `Nothing here for ${stageLabel ?? "you"} right now.`;
  const btn = buttonLabel ?? "Add something";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 32px", gap: 20 }}>
      <LineDrawing color={stageColor} />
      <p style={{ margin: 0, fontSize: 15, color: "var(--ck-body)", maxWidth: 260 }}>{copy}</p>
      <button
        onClick={onAdd}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 999, border: "none", backgroundColor: stageColor, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
      >
        <Plus size={18} weight="bold" />
        {btn}
      </button>
    </div>
  );
}

function LineDrawing({ color }: { color: string }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect x="14" y="22" width="68" height="52" rx="12" stroke={color} strokeWidth="2" opacity="0.55" />
      <circle cx="32" cy="40" r="8" stroke={color} strokeWidth="2" opacity="0.55" />
      <line x1="48" y1="36" x2="70" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="48" y1="44" x2="62" y2="44" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="26" y1="60" x2="70" y2="60" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}
