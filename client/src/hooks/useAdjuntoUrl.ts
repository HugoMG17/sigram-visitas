import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { adjuntoUrl, adjuntoDriveUrl } from "../api/adjuntos";
import { isNative } from "../native/platform";
import type { LocalAdjunto } from "../db/db";

function remoteUrl(adjunto: LocalAdjunto, preferThumbnail: boolean): string | undefined {
  if (adjunto.driveFileId || adjunto.driveThumbnailId) {
    const variante = preferThumbnail && adjunto.driveThumbnailId ? "thumbnail" : "file";
    return adjuntoDriveUrl(adjunto.id, variante);
  }
  const ruta = preferThumbnail
    ? (adjunto.rutaThumbnail ?? adjunto.rutaServidor)
    : adjunto.rutaServidor;
  return ruta ? adjuntoUrl(ruta) : undefined;
}

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

  // Solo en el APK: un <img src> o <a href> no puede llevar la cabecera
  // Authorization, y ahí la sesión es un token Bearer (no cookie). El
  // contenido remoto se descarga vía axios (que sí la lleva) y se sirve
  // como object URL, igual que los blobs locales de arriba.
  const [remoteBlobUrl, setRemoteBlobUrl] = useState<string | undefined>();
  useEffect(() => {
    if (!isNative || adjunto.blobLocal) {
      setRemoteBlobUrl(undefined);
      return;
    }
    const url = remoteUrl(adjunto, preferThumbnail);
    if (!url) {
      setRemoteBlobUrl(undefined);
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;
    apiClient
      .get<Blob>(url, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setRemoteBlobUrl(objectUrl);
      })
      .catch(() => undefined); // sin conexión: no hay miniatura remota, sin más
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Dependencias por campo (no el objeto adjunto entero): useLiveQuery
    // entrega un objeto nuevo en cada emisión y usarlo como dependencia
    // relanzaría la descarga en bucle aunque nada hubiera cambiado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adjunto.id,
    adjunto.blobLocal,
    adjunto.driveFileId,
    adjunto.driveThumbnailId,
    adjunto.rutaServidor,
    adjunto.rutaThumbnail,
    preferThumbnail,
  ]);

  if (blobUrl) return blobUrl;
  if (isNative) return remoteBlobUrl;
  return remoteUrl(adjunto, preferThumbnail);
}
