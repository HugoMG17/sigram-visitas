import type { Adjunto, TipoAdjunto } from "@sigram/shared";
import { apiClient } from "./client";

export async function uploadAdjunto(params: {
  id: string;
  visitaId: string;
  file: Blob;
  fileName: string;
  tipo: TipoAdjunto;
  caption?: string;
  orden: number;
}): Promise<Adjunto> {
  const form = new FormData();
  form.append("id", params.id);
  form.append("tipo", params.tipo);
  form.append("orden", String(params.orden));
  if (params.caption) form.append("caption", params.caption);
  form.append("file", params.file, params.fileName);

  const res = await apiClient.post<Adjunto>(`/visitas/${params.visitaId}/adjuntos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteAdjunto(id: string): Promise<void> {
  await apiClient.delete(`/adjuntos/${id}`);
}

export function adjuntoUrl(rutaRelativa: string): string {
  const base = apiClient.defaults.baseURL?.replace(/\/api$/, "") ?? "";
  return `${base}/uploads/${rutaRelativa}`;
}

export function adjuntoDriveUrl(id: string, variante: "file" | "thumbnail"): string {
  return `${apiClient.defaults.baseURL}/adjuntos/${id}/${variante}`;
}
