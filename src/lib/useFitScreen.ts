import { useLayoutEffect, useRef } from "react";

/**
 * The fit rule: a screen that must never scroll. The element is exactly
 * the screen tall; this raises its data-fit from 0 up to `max` until the
 * content stops spilling, and re-checks whenever the screen, the fonts or
 * the content change. The stylesheet decides what each step gives up.
 */
export function useFitScreen<T extends HTMLElement>(max: number, deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const spills = () => {
      if (el.scrollHeight > el.clientHeight + 1) return true;
      const pb = parseFloat(getComputedStyle(el).paddingBottom || "0");
      // The last child that is actually shown (a step may hide the final ones).
      let last = el.lastElementChild as HTMLElement | null;
      while (last && last.offsetHeight === 0) last = last.previousElementSibling as HTMLElement | null;
      if (!last) return false;
      // Layout positions, not painted ones: the rise-in animation moves a
      // block down a few pixels while it plays, which used to read as a spill
      // and push the screen to its tightest step for good.
      if (last.offsetParent && last.offsetParent === el.offsetParent) {
        return last.offsetTop + last.offsetHeight > el.offsetTop + el.offsetHeight - pb + 1;
      }
      return last.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom - pb + 1;
    };
    const fit = () => {
      for (let lvl = 0; lvl <= max; lvl++) {
        el.dataset.fit = String(lvl);
        if (!spills()) break;
      }
    };
    const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    fit();
    const ro = new ResizeObserver(queue);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    document.fonts?.ready.then(queue).catch(() => {});
    window.addEventListener("orientationchange", queue);
    el.addEventListener("animationend", queue);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("orientationchange", queue); el.removeEventListener("animationend", queue); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
