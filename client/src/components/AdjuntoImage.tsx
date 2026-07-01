import { useAdjuntoUrl } from "../hooks/useAdjuntoUrl";
import type { LocalAdjunto } from "../db/db";

export function AdjuntoImage({ adjunto, alt }: { adjunto: LocalAdjunto; alt: string }) {
  const src = useAdjuntoUrl(adjunto, true);
  if (!src) return null;
  return <img src={src} alt={alt} />;
}
