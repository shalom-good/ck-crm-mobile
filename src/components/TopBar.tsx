import type { CSSProperties, ReactNode } from "react";
import mark from "@/assets/ck-mark-forest.svg";
import { BackButton } from "./BackButton";

/**
 * The CK top bar (App Store set): a 30px lime tile with the forest CK mark,
 * "Collective Kindness" 13.5/700, and on the right the space label in
 * small caps ("TEAM", "GIVING", "ACADEMY") or a control. `back` puts the
 * round back button in front of the tile.
 */
export function TopBar({ space, back, right, style }: { space?: string; back?: string; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`ck-top${back ? " has-back" : ""}`} style={style}>
      <div className="brand">
        {back && <BackButton href={back} />}
        <span className="tile" aria-hidden><img src={mark} alt="" /></span>
        <span className="name">Collective Kindness</span>
      </div>
      {right ? <div className="right">{right}{space && <span className="space">{space}</span>}</div> : space && <span className="space">{space}</span>}
    </div>
  );
}

/** Just the lime tile + mark, for places that need the mark alone. */
export function CkTile({ size = 30 }: { size?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: "var(--gv-lime)", display: "grid", placeItems: "center", flex: "none" }}>
      <img src={mark} alt="" style={{ width: Math.round(size * 0.57), height: Math.round(size * 0.63), display: "block" }} />
    </span>
  );
}
