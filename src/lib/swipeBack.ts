import { createGesture, useIonRouter } from "@ionic/react";
import { useEffect, useRef } from "react";

/**
 * Swipe from the left edge to go back. Ionic's own iOS swipe-back handles
 * pages that have router history; this covers the rest (a page opened from
 * a link, or a web build), so the gesture always works on the start flow.
 * Attach the returned ref to the IonPage.
 */
export function useSwipeBack(href = "/start") {
  const ref = useRef<HTMLElement | null>(null);
  const router = useIonRouter();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const gesture = createGesture({
      el,
      gestureName: "gv-swipe-back",
      direction: "x",
      threshold: 12,
      canStart: (d) => d.startX <= 44 && !router.canGoBack(),
      onEnd: (d) => {
        if (d.deltaX > 80 && Math.abs(d.deltaY) < 70) router.push(href, "back", "pop");
      },
    });
    gesture.enable(true);
    return () => gesture.destroy();
  }, [href, router]);
  return ref;
}
