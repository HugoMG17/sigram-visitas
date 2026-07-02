import type { TipoAdjunto } from "@sigram/shared";
import { deleteAdjunto as deleteAdjuntoRemoto } from "../../api/adjuntos";
import { compressImage } from "../../utils/imageResize";
import { generateId } from "../../utils/id";
import { db, type LocalAdjunto } from "../db";

export async function listAdjuntos(visitaId: string): Promise<LocalAdjunto[]> {
  const all = await db.adjuntos.where("visitaId").equals(visitaId).toArray();
  return all.sort((a, b) => a.orden - b.orden);
}

export async function listAdjuntosDePunto(puntoId: string): Promise<LocalAdjunto[]> {
  const all = await db.adjuntos.where("puntoId").equals(puntoId).toArray();
  return all.sort((a, b) => a.orden - b.orden);
}

export async function addAdjuntoLocal(params: {
  visitaId: string;
  puntoId?: string;
  file: File;
  tipo: TipoAdjunto;
  caption?: string;
  orden: number;
}): Promise<LocalAdjunto> {
  const isImage = params.file.type.startsWith("image/");
  const blobLocal: Blob = isImage ? await compressImage(params.file) : params.file;
  const nombreArchivo = isImage
    ? params.file.name.replace(/\.[^/.]+$/, "") + ".jpg"
    : params.file.name;

  const record: LocalAdjunto = {
    id: generateId(),
    visitaId: params.visitaId,
    puntoId: params.puntoId,
    tipo: params.tipo,
    mimeType: isImage ? "image/jpeg" : params.file.type,
    nombreArchivo,
    caption: params.caption,
    orden: params.orden,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    blobLocal,
  };
  await db.adjuntos.put(record);
  return record;
}

export async function deleteAdjuntoLocal(id: string): Promise<void> {
  const existing = await db.adjuntos.get(id);
  if (!existing) return;
  if (existing.rutaServidor || existing.driveFileId) {
    // Ya estaba sincronizado: borrarlo tambien del servidor (requiere conexion).
    await deleteAdjuntoRemoto(id);
  }
  await db.adjuntos.delete(id);
}
