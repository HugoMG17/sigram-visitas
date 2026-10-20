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

// El PDF de la lista, con el filtro y la búsqueda que se estén viendo.
export function musaatPdfUrl(opciones: { estado?: string; busqueda?: string }): string {
  const params = new URLSearchParams();
  if (opciones.estado && opciones.estado !== "todas") params.set("estado", opciones.estado);
  if (opciones.busqueda?.trim()) params.set("q", opciones.busqueda.trim());
  const cola = params.toString();
  return `${apiClient.defaults.baseURL}/musaat/pdf${cola ? `?${cola}` : ""}`;
}
