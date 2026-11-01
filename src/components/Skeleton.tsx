/** Skeleton card in the Grove look: white gv-card, no border, shimmer on
 *  the hairline grey. Used on cold start — never a spinner. */
export function SkeletonCard() {
  return (
    <div className="gv-card" aria-hidden>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Shimmer w={42} h={42} r={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Shimmer w="55%" h={14} r={6} />
          <div style={{ height: 8 }} />
          <Shimmer w="35%" h={10} r={6} />
        </div>
        <Shimmer w={64} h={24} r={8} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
        {Array.from({ length: 5 }, (_, k) => <Shimmer key={k} w="100%" h={7} r={4} />)}
      </div>
      <div style={{ height: 12 }} />
      <Shimmer w="60%" h={12} r={6} />
    </div>
  );
}

function Shimmer({ w, h, r }: { w: number | string; h: number; r: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flex: typeof w === "number" ? "none" : 1,
        minWidth: 0,
        background: "linear-gradient(90deg, var(--gv-hair) 25%, var(--gv-inset) 50%, var(--gv-hair) 75%)",
        backgroundSize: "200% 100%",
        animation: "ck-shimmer 1.3s ease-in-out infinite",
      }}
    />
  );
}
