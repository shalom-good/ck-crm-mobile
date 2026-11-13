import { useEffect, useRef, useState } from "react";

/** A number that counts up to its value when it appears, and glides to a
 *  new value when the live data changes. */
export function Ticker({ to, className, prefix = "", run = 0.12 }: { to: number; className?: string; prefix?: string; run?: number }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  const first = useRef(true);
  useEffect(() => {
    const start = first.current ? Math.max(0, Math.round(to * (1 - run))) : from.current;
    first.current = false;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || start === to) { setV(to); from.current = to; return; }
    const t0 = performance.now();
    const ms = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = to; };
  }, [to, run]);
  return <b className={className}>{prefix}{v.toLocaleString("en-US")}</b>;
}
