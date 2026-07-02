// Tipos de dominio compartidos entre client y server.
// Los `id` son UUID generados en el cliente (permiten upsert idempotente al sincronizar).

export type TipoObra = "nueva" | "reforma" | "rehabilitacion" | "ampliacion" | "otro";

export type EstadoObra =
  | "redaccion_proyecto"
  | "tramitacion_licencia"
  | "en_ejecucion"
  | "finalizada"
  | "paralizada";

export type TipoAdjunto = "foto" | "plano" | "documento" | "otro";

export type SyncStatus = "synced" | "pending" | "error";

export interface Obra {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  provincia: string;
  referenciaCatastral?: string;
  promotor: string;
  promotorContacto?: string;
  tipoObra: TipoObra;
  estado: EstadoObra;
  fechaInicio?: string;
  fechaFinPrevista?: string;
  numeroExpediente?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Visita {
  id: string;
  obraId: string;
  fecha: string;
  titulo?: string;
  notas?: string;
  tiempoAtmosferico?: string;
  asistentes?: string;
  ubicacionGps?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type EstadoPunto = "pendiente" | "solucionado";

export interface Punto {
  id: string;
  visitaId: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoPunto;
  orden: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Adjunto {
  id: string;
  visitaId: string;
  // Si tiene puntoId, la foto/documento pertenece a ese punto concreto de
  // la visita; si no, es un adjunto general de la visita (comportamiento
  // previo a los puntos, se mantiene para compatibilidad).
  puntoId?: string;
  tipo: TipoAdjunto;
  mimeType: string;
  nombreArchivo: string;
  caption?: string;
  orden: number;
  rutaServidor?: string;
  rutaThumbnail?: string;
  driveFileId?: string;
  driveThumbnailId?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export const ESTADO_PUNTO_LABELS: Record<EstadoPunto, string> = {
  pendiente: "Pendiente",
  solucionado: "Solucionado",
};

export const TIPO_OBRA_LABELS: Record<TipoObra, string> = {
  nueva: "Obra nueva",
  reforma: "Reforma",
  rehabilitacion: "Rehabilitación",
  ampliacion: "Ampliación",
  otro: "Otro",
};

export const ESTADO_OBRA_LABELS: Record<EstadoObra, string> = {
  redaccion_proyecto: "En redacción de proyecto",
  tramitacion_licencia: "En tramitación de licencia",
  en_ejecucion: "En ejecución",
  finalizada: "Finalizada",
  paralizada: "Paralizada",
};

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
