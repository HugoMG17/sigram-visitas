import type { Punto } from "@sigram/shared";
import { apiClient } from "./client";

export type PuntoInput = Omit<Punto, "id" | "orden" | "createdAt" | "updatedAt" | "deletedAt"> & {
  // Solo se tiene en cuenta al actualizar un punto ya existente (para
  // reordenarlo); el servidor lo ignora al crear uno nuevo.
  orden?: number;
};

export async function fetchPuntosDeVisita(visitaId: string): Promise<Punto[]> {
  const res = await apiClient.get<Punto[]>(`/visitas/${visitaId}/puntos`);
  return res.data;
}

export async function savePunto(id: string, data: PuntoInput): Promise<Punto> {
  const res = await apiClient.put<Punto>(`/puntos/${id}`, data);
  return res.data;
}

export async function deletePunto(id: string): Promise<void> {
  await apiClient.delete(`/puntos/${id}`);
}
