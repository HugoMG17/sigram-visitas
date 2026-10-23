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

// ZIP con todas las fotos de la visita, ordenadas en carpetas por punto.
export function fotosZipUrl(id: string): string {
  return `${apiClient.defaults.baseURL}/visitas/${id}/fotos.zip`;
}

// Con `previa` el acta se abre en el visor en vez de descargarse. Es el mismo
// documento: solo cambia una cabecera en el servidor.
export function pdfUrl(id: string, previa = false): string {
  return `${apiClient.defaults.baseURL}/visitas/${id}/pdf${previa ? "?vista=previa" : ""}`;
}
