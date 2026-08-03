/**
 * Haptics wrapper. On a device this calls Capacitor Haptics; in the browser it
 * falls back to the Vibration API so the /design route and `ionic serve` still
 * give feedback. Haptics fire on state changes only — never on navigation.
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { HAPTIC_MS } from "@/theme/tokens";

const web = !Capacitor.isNativePlatform();

export async function tapLight() {
  if (web) return navigator.vibrate?.(HAPTIC_MS);
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function tapMedium() {
  if (web) return navigator.vibrate?.(HAPTIC_MS);
  await Haptics.impact({ style: ImpactStyle.Medium });
}

/** Stage advanced, lead added — the satisfying confirmation buzz. */
export async function success() {
  if (web) return navigator.vibrate?.([HAPTIC_MS, 40, HAPTIC_MS]);
  await Haptics.notification({ type: NotificationType.Success });
}
