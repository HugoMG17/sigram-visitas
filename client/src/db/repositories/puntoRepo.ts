import type { PuntoInput } from "../../api/puntos";
import { generateId } from "../../utils/id";
import { db, type LocalPunto } from "../db";

export async function listPuntosDeVisita(visitaId: string): Promise<LocalPunto[]> {
  const all = await db.puntos.where("visitaId").equals(visitaId).toArray();
  return all.filter((p) => !p.deletedAt).sort((a, b) => a.orden - b.orden);
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
