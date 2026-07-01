import type { ObraInput } from "../../api/obras";
import { db, type LocalObra } from "../db";

export async function listObras(): Promise<LocalObra[]> {
  const all = await db.obras.toArray();
  return all
    .filter((o) => !o.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getObra(id: string): Promise<LocalObra | undefined> {
  return db.obras.get(id);
}

export async function saveObraLocal(id: string, data: ObraInput): Promise<LocalObra> {
  const now = new Date().toISOString();
  const existing = await db.obras.get(id);
  const record: LocalObra = {
    id,
    ...data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
  };
  await db.obras.put(record);
  return record;
}

export async function softDeleteObraLocal(id: string): Promise<void> {
  const existing = await db.obras.get(id);
  if (!existing) return;
  await db.obras.put({
    ...existing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });
}
