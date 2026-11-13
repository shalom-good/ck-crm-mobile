import type { CSSProperties } from "react";

/**
 * The code entry (2026-11-11, Shalom: "come up with an even slicker way to
 * do the code"). One white rail instead of separate boxes. A soft lime block
 * glides to the slot being typed, each character rises into place, and when
 * the code is long enough the whole rail turns ready (green ring). It only
 * ever shows as many slots as are needed: no empty box left hanging after
 * the last letter.
 *
 * Presentational: the real <input> sits on top of it (see .ocf2-code).
 */
export function CodeRail({ value, slots, ready }: { value: string; slots: number; ready?: boolean }) {
  const full = value.length >= slots;
  const at = Math.min(value.length, slots - 1);
  return (
    <div className={`ocf2-rail${ready ? " is-ready" : ""}${full ? " is-full" : ""}`} style={{ "--slots": slots, "--at": at } as CSSProperties} aria-hidden>
      <i className="ocf2-rail-cur" />
      {Array.from({ length: slots }, (_, i) => (
        <b key={i} className={value[i] ? "on" : i === value.length ? "now" : ""}>{value[i] || ""}</b>
      ))}
    </div>
  );
}
