import { useIonRouter } from "@ionic/react";
import { CaretLeft } from "@phosphor-icons/react";

/**
 * The one back button: a round white 40px button with a bold ink chevron,
 * a 44px hit area, and an accessible name. Goes back through the router
 * history when there is one, otherwise to `href` with a back transition
 * (someone who landed on the page from a link still gets home).
 */
export function BackButton({ href = "/start", label = "Back", onClick }: { href?: string; label?: string; onClick?: () => void }) {
  const router = useIonRouter();
  const go = () => {
    // A multi-step screen steps back through its own steps first.
    if (onClick) { onClick(); return; }
    if (router.canGoBack()) router.goBack();
    else router.push(href, "back", "pop");
  };
  return (
    <button type="button" aria-label={label} className="gv-back" onClick={go}>
      <CaretLeft size={20} weight="bold" aria-hidden />
    </button>
  );
}
