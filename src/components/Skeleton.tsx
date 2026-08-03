/** Skeleton lead card. Used on cold start — never a spinner. */
export function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: "var(--ck-card)",
        border: "1px solid var(--ck-hairline)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Shimmer w={48} h={48} r={999} />
        <div style={{ flex: 1 }}>
          <Shimmer w="55%" h={14} r={6} />
          <div style={{ height: 8 }} />
          <Shimmer w="35%" h={10} r={6} />
        </div>
      </div>
      <div style={{ height: 1, backgroundColor: "var(--ck-hairline)", margin: "14px 0" }} />
      <Shimmer w="60%" h={12} r={6} />
      <div style={{ height: 10 }} />
      <Shimmer w="70%" h={12} r={6} />
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
        background:
          "linear-gradient(90deg, var(--ck-hairline) 25%, rgba(148,163,184,0.12) 50%, var(--ck-hairline) 75%)",
        backgroundSize: "200% 100%",
        animation: "ck-shimmer 1.3s ease-in-out infinite",
      }}
    />
  );
}
