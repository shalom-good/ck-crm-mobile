/**
 * Deterministic tint for monogram avatars. Same name always gets the same
 * color. The Grove pastel pairs (same six the CRM uses for care-team avatars): soft washed background + deep matching ink.
 */

const TINTS: { bg: string; fg: string }[] = [
  { bg: "#DCEBFA", fg: "#1F4E79" }, // sky
  { bg: "#DDF3E6", fg: "#1F5E3A" }, // mint
  { bg: "#FDE3C8", fg: "#8A4B10" }, // apricot
  { bg: "#E9D5F5", fg: "#5B2D7A" }, // plum
  { bg: "#FBE0E6", fg: "#9B2C4A" }, // rose
  { bg: "#F3D9F7", fg: "#6D3D7A" }, // lavender
];

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function tintFor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length];
}
