import { useEffect, useState } from "react";
import { adjuntoUrl } from "../api/adjuntos";
import type { LocalAdjunto } from "../db/db";

export function useAdjuntoUrl(adjunto: LocalAdjunto, preferThumbnail = false): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!adjunto.blobLocal) {
      setBlobUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(adjunto.blobLocal);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [adjunto.blobLocal]);

  if (blobUrl) return blobUrl;
  const ruta = preferThumbnail ? (adjunto.rutaThumbnail ?? adjunto.rutaServidor) : adjunto.rutaServidor;
  return ruta ? adjuntoUrl(ruta) : undefined;
}
