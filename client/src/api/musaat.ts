import type { RegistroMusaat } from "@sigram/shared";
import { apiClient } from "./client";

export type MusaatInput = Omit<RegistroMusaat, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export async function fetchMusaat(): Promise<RegistroMusaat[]> {
  const res = await apiClient.get<RegistroMusaat[]>("/musaat");
  return res.data;
}

export async function saveMusaat(id: string, data: MusaatInput): Promise<RegistroMusaat> {
  const res = await apiClient.put<RegistroMusaat>(`/musaat/${id}`, data);
  return res.data;
}

export async function deleteMusaat(id: string): Promise<void> {
  await apiClient.delete(`/musaat/${id}`);
}
