/**
 * Deterministic tint for monogram avatars. Same name always gets the same
 * color. The approved warm-Brisk pastel pairs (matches the desktop brisk
 * profile's avatar tints): soft washed background + deep matching ink.
 */

const TINTS: { bg: string; fg: string }[] = [
  { bg: "#E6EEF6", fg: "#213A4E" }, // sky
  { bg: "#EAF3DE", fg: "#27500A" }, // sage
  { bg: "#FAEEDA", fg: "#633806" }, // cream
  { bg: "#EEEDFE", fg: "#3C3489" }, // lilac
  { bg: "#FBEAF0", fg: "#72243E" }, // rose
  { bg: "#E1F5EE", fg: "#085041" }, // mint
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
