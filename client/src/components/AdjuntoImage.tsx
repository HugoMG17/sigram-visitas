import { useAdjuntoUrl } from "../hooks/useAdjuntoUrl";
import type { LocalAdjunto } from "../db/db";

export function AdjuntoImage({
  adjunto,
  alt,
  onClick,
}: {
  adjunto: LocalAdjunto;
  alt: string;
  onClick?: () => void;
}) {
  const src = useAdjuntoUrl(adjunto, true);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      style={onClick ? { cursor: "zoom-in" } : undefined}
    />
  );
}
