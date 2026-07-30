import type { VisitaInput } from "../../api/visitas";
import { db, type LocalVisita } from "../db";

export async function listVisitasDeObra(obraId: string): Promise<LocalVisita[]> {
  const all = await db.visitas.where("obraId").equals(obraId).toArray();
  return all.filter((v) => !v.deletedAt).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function getVisita(id: string): Promise<LocalVisita | undefined> {
  return db.visitas.get(id);
}

export async function saveVisitaLocal(id: string, data: VisitaInput): Promise<LocalVisita> {
  const now = new Date().toISOString();
  const existing = await db.visitas.get(id);
  const record: LocalVisita = {
    id,
    ...data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  };
  await db.visitas.put(record);
  return record;
}

export async function softDeleteVisitaLocal(id: string): Promise<void> {
  const existing = await db.visitas.get(id);
  if (!existing) return;
  await db.visitas.put({
    ...existing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
  // Las fotos de la visita se quitan del dispositivo: liberan espacio (llevan
  // el fichero dentro) y, sobre todo, evitan que una que aún estuviera sin
  // subir acabe subiéndose a una visita ya borrada. En el servidor las borra
  // la propia petición de borrado de la visita.
  await db.adjuntos.where("visitaId").equals(id).delete();
}
