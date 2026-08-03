import { monogram, tintFor } from "@/lib/colorHash";

interface Props {
  name: string;
  photo?: string;
  size?: number;
}

/**
 * Circular avatar. With a photo, it's the photo. Without, a 2-letter monogram
 * on a warm hashed tint — never gray.
 */
export function Avatar({ name, photo, size = 48 }: Props) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  const tint = tintFor(name);
  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: tint.bg,
        color: tint.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.round(size * 0.36),
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {monogram(name)}
    </div>
  );
}
