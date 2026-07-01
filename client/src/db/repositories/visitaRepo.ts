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
}
