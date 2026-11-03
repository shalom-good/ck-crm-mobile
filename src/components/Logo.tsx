import { CkTile } from "./TopBar";

interface Props {
  size?: number;
}

/**
 * The Collective Kindness mark (CK look): the forest leaves + coral heart
 * on the lime tile, the same as the app icon and the top bar. Replaces the
 * old window onto the indigo stacked lockup PNG.
 */
export function Logo({ size = 40 }: Props) {
  return <CkTile size={size} />;
}
