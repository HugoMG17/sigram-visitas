import type { Persona } from "@sigram/shared";
import { apiClient } from "./client";

export type PersonaInput = Omit<Persona, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export async function fetchPersonas(): Promise<Persona[]> {
  const res = await apiClient.get<Persona[]>("/personas");
  return res.data;
}

export async function savePersona(id: string, data: PersonaInput): Promise<Persona> {
  const res = await apiClient.put<Persona>(`/personas/${id}`, data);
  return res.data;
}

export async function deletePersona(id: string): Promise<void> {
  await apiClient.delete(`/personas/${id}`);
}
