import type { PuntoInput } from "../../api/puntos";
import { generateId } from "../../utils/id";
import { db, type LocalAdjunto, type LocalPunto } from "../db";
import { getAdjuntoBlob, listAdjuntosDePunto } from "./adjuntoRepo";

export async function listPuntosDeVisita(visitaId: string): Promise<LocalPunto[]> {
  const all = await db.puntos.where("visitaId").equals(visitaId).toArray();
  return all.filter((p) => !p.deletedAt).sort((a, b) => a.orden - b.orden);
}

// Puntos pendientes de las OTRAS visitas de una obra (candidatos a importar).
async function puntosPendientesDeOtrasVisitas(
  obraId: string,
  visitaDestinoId: string
): Promise<LocalPunto[]> {
  const visitas = await db.visitas.where("obraId").equals(obraId).toArray();
  const otrasVisitas = visitas.filter((v) => !v.deletedAt && v.id !== visitaDestinoId);
  const pendientes: LocalPunto[] = [];
  for (const visita of otrasVisitas) {
    const puntos = await listPuntosDeVisita(visita.id);
    pendientes.push(...puntos.filter((p) => p.estado === "pendiente"));
  }
  return pendientes;
}

// Nº de puntos pendientes importables (para habilitar/deshabilitar el botón).
export async function contarPuntosPendientesImportables(
  obraId: string,
  visitaDestinoId: string
): Promise<number> {
  const pendientes = await puntosPendientesDeOtrasVisitas(obraId, visitaDestinoId);
  return pendientes.length;
}

// Copia (no mueve) todos los puntos pendientes de las demás visitas de la
// obra a la visita destino, con sus fotos. Cada punto/adjunto copiado es un
// registro nuevo con syncStatus "pending"; el motor de sync los sube como
// entidades independientes, así que los originales quedan intactos.
//
// Primero se descargan TODOS los blobs de fotos necesarios; si alguno falla
// (p.ej. sin conexión con fotos ya sincronizadas) se aborta sin escribir
// nada, para no dejar puntos a medias. Devuelve el nº de puntos copiados.
export async function importarPuntosPendientes(
  obraId: string,
  visitaDestinoId: string
): Promise<number> {
  const pendientes = await puntosPendientesDeOtrasVisitas(obraId, visitaDestinoId);
  if (pendientes.length === 0) return 0;

  // Fase 1: reunir bytes de todas las fotos (sin escribir nada todavía).
  const preparados: { punto: LocalPunto; adjuntos: { adjunto: LocalAdjunto; blob: Blob }[] }[] = [];
  for (const punto of pendientes) {
    const adjuntos = await listAdjuntosDePunto(punto.id);
    const conBlob = [];
    for (const adjunto of adjuntos) {
      conBlob.push({ adjunto, blob: await getAdjuntoBlob(adjunto) });
    }
    preparados.push({ punto, adjuntos: conBlob });
  }

  // Fase 2: escribir los puntos y fotos nuevos, ya con todos los bytes en mano.
  const now = new Date().toISOString();
  const existentes = await db.puntos.where("visitaId").equals(visitaDestinoId).toArray();
  let orden = existentes.length ? Math.max(...existentes.map((p) => p.orden)) + 1 : 0;

  for (const { punto, adjuntos } of preparados) {
    const nuevoPuntoId = generateId();
    const nuevoPunto: LocalPunto = {
      id: nuevoPuntoId,
      visitaId: visitaDestinoId,
      titulo: punto.titulo,
      descripcion: punto.descripcion,
      estado: "pendiente",
      orden: orden++,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "pending",
    };
    await db.puntos.put(nuevoPunto);

    for (const { adjunto, blob } of adjuntos) {
      const nuevoAdjunto: LocalAdjunto = {
        id: generateId(),
        visitaId: visitaDestinoId,
        puntoId: nuevoPuntoId,
        tipo: adjunto.tipo,
        mimeType: adjunto.mimeType,
        nombreArchivo: adjunto.nombreArchivo,
        caption: adjunto.caption,
        orden: adjunto.orden,
        createdAt: now,
        syncStatus: "pending",
        blobLocal: blob,
      };
      await db.adjuntos.put(nuevoAdjunto);
    }
  }

  return preparados.length;
}

export async function addPuntoLocal(data: PuntoInput): Promise<LocalPunto> {
  const now = new Date().toISOString();
  const siguientesOrden = await db.puntos.where("visitaId").equals(data.visitaId).toArray();
  const orden = siguientesOrden.length
    ? Math.max(...siguientesOrden.map((p) => p.orden)) + 1
    : 0;
  const record: LocalPunto = {
    id: generateId(),
    ...data,
    orden,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  };
  await db.puntos.put(record);
  return record;
}

export async function setPuntoEstadoLocal(
  id: string,
  estado: LocalPunto["estado"]
): Promise<void> {
  const existing = await db.puntos.get(id);
  if (!existing) return;
  await db.puntos.put({
    ...existing,
    estado,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
}

export async function setPuntoDescripcionLocal(id: string, descripcion: string): Promise<void> {
  const existing = await db.puntos.get(id);
  if (!existing) return;
  await db.puntos.put({
    ...existing,
    descripcion,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
}

export async function movePuntoLocal(
  visitaId: string,
  puntoId: string,
  direccion: "arriba" | "abajo"
): Promise<void> {
  const ordenados = await listPuntosDeVisita(visitaId);
  const index = ordenados.findIndex((p) => p.id === puntoId);
  if (index === -1) return;

  const destino = direccion === "arriba" ? index - 1 : index + 1;
  if (destino < 0 || destino >= ordenados.length) return;

  const actual = ordenados[index];
  const vecino = ordenados[destino];
  const now = new Date().toISOString();
  await db.puntos.put({ ...actual, orden: vecino.orden, updatedAt: now, syncStatus: "pending" });
  await db.puntos.put({ ...vecino, orden: actual.orden, updatedAt: now, syncStatus: "pending" });
}

export async function softDeletePuntoLocal(id: string): Promise<void> {
  const existing = await db.puntos.get(id);
  if (!existing) return;
  await db.puntos.put({
    ...existing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
}
