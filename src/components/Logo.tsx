interface Props {
  size?: number;
}

/**
 * The Collective Kindness mark in a clean white badge. We window onto just the
 * flower+heart portion of the full lockup PNG (the black wordmark would vanish
 * in dark mode), so the badge reads the same in both themes.
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
        width: size, height: size, borderRadius: 13, flexShrink: 0,
        backgroundColor: "#fff",
        boxShadow: "0 1px 2px rgba(15,23,42,.08), 0 6px 16px rgba(15,23,42,.07)",
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
