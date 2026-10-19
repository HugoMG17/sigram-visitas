import type { MusaatInput } from "../../api/musaat";
import { db, type LocalMusaat } from "../db";

export async function listMusaat(): Promise<LocalMusaat[]> {
  const all = await db.musaat.toArray();
  return all.filter((r) => !r.deletedAt).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function getMusaat(id: string): Promise<LocalMusaat | undefined> {
  return db.musaat.get(id);
}

export async function saveMusaatLocal(id: string, data: MusaatInput): Promise<LocalMusaat> {
  const now = new Date().toISOString();
  const existing = await db.musaat.get(id);
  const record: LocalMusaat = {
    id,
    ...data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  };
  await db.musaat.put(record);
  return record;
}

export async function softDeleteMusaatLocal(id: string): Promise<void> {
  const existing = await db.musaat.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.musaat.put({
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });
}
