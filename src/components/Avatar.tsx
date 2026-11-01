import { monogram, tintFor } from "@/lib/colorHash";

interface Props {
  name: string;
  photo?: string;
  size?: number;
  /** 12px corners (families). Default is round (people). */
  square?: boolean;
}

/**
 * Avatar: with a photo, it's the photo. Without, a 2-letter monogram on a
 * Grove pastel from lib/colorHash (deterministic per name) — never grey.
 * Round for people; pass `square` for a family.
 */
export function Avatar({ name, photo, size = 48, square }: Props) {
  const radius = square ? 12 : "50%";
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  const tint = tintFor(name);
  return (
    <span
      className={`gv-av${square ? "" : " round"}`}
      aria-label={name}
      style={{ width: size, height: size, background: tint.bg, color: tint.fg, fontSize: Math.round(size * 0.36) }}
    >
      {monogram(name)}
    </span>
  );
}
