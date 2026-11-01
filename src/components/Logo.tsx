interface Props {
  size?: number;
}

/**
 * The Collective Kindness mark in a clean white badge (14px corners, the
 * Grove card shadow). We window onto just the flower+heart portion of the
 * full lockup PNG so the badge reads the same on any surface.
 */
export function Logo({ size = 40 }: Props) {
  // Mark occupies roughly x ∈ [2%, 21.5%] of the 3580px-wide lockup.
  const L = 0.02;
  const R = 0.215;
  const imgH = size * 0.6;
  const s = imgH / 904;
  const fullW = 3580 * s;
  const winW = (R - L) * fullW;

  return (
    <div
      style={{
        width: size, height: size, borderRadius: 14, flexShrink: 0,
        background: "var(--gv-card)",
        boxShadow: "var(--gv-shadow)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          width: winW, height: imgH,
          backgroundImage: "url(/ck-logo.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: `${fullW}px ${imgH}px`,
          backgroundPosition: `${-L * fullW}px center`,
        }}
      />
    </div>
  );
}
