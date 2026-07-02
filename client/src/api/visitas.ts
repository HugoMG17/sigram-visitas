import type { Adjunto, Obra, Punto, Visita } from "@sigram/shared";
import { apiClient } from "./client";

export type VisitaInput = Omit<Visita, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export interface VisitaDetail extends Visita {
  obra: Obra;
  adjuntos: Adjunto[];
  puntos: Punto[];
}

export async function fetchVisitasDeObra(obraId: string): Promise<Visita[]> {
  const res = await apiClient.get<Visita[]>(`/obras/${obraId}/visitas`);
  return res.data;
}

export async function fetchVisita(id: string): Promise<VisitaDetail> {
  const res = await apiClient.get<VisitaDetail>(`/visitas/${id}`);
  return res.data;
}

export async function saveVisita(id: string, data: VisitaInput): Promise<Visita> {
  const res = await apiClient.put<Visita>(`/visitas/${id}`, data);
  return res.data;
}

export async function deleteVisita(id: string): Promise<void> {
  await apiClient.delete(`/visitas/${id}`);
}

export function pdfUrl(id: string): string {
  return `${apiClient.defaults.baseURL}/visitas/${id}/pdf`;
}
