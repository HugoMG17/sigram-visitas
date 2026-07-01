import type { Obra } from "@sigram/shared";
import { apiClient } from "./client";

export type ObraInput = Omit<Obra, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export async function fetchObras(): Promise<Obra[]> {
  const res = await apiClient.get<Obra[]>("/obras");
  return res.data;
}

export async function fetchObra(id: string): Promise<Obra> {
  const res = await apiClient.get<Obra>(`/obras/${id}`);
  return res.data;
}

export async function saveObra(id: string, data: ObraInput): Promise<Obra> {
  const res = await apiClient.put<Obra>(`/obras/${id}`, data);
  return res.data;
}

export async function deleteObra(id: string): Promise<void> {
  await apiClient.delete(`/obras/${id}`);
}
