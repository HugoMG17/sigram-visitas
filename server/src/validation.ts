import { z } from "zod";

export const tipoObraSchema = z.enum(["nueva", "reforma", "rehabilitacion", "ampliacion", "otro"]);

export const estadoObraSchema = z.enum([
  "redaccion_proyecto",
  "tramitacion_licencia",
  "en_ejecucion",
  "finalizada",
  "paralizada",
]);

export const tipoAdjuntoSchema = z.enum(["foto", "plano", "documento", "otro"]);

export const estadoPuntoSchema = z.enum(["pendiente", "solucionado"]);

const uuidSchema = z.string().uuid();

export const obraUpsertSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().min(1),
  municipio: z.string().min(1),
  provincia: z.string().min(1),
  referenciaCatastral: z.string().optional(),
  promotor: z.string().min(1),
  promotorContacto: z.string().optional(),
  tipoObra: tipoObraSchema,
  estado: estadoObraSchema,
  fechaInicio: z.string().optional(),
  fechaFinPrevista: z.string().optional(),
  numeroExpediente: z.string().optional(),
  notas: z.string().optional(),
});

export const visitaUpsertSchema = z.object({
  obraId: uuidSchema,
  fecha: z.string().min(1),
  titulo: z.string().optional(),
  notas: z.string().optional(),
  tiempoAtmosferico: z.string().optional(),
  asistentes: z.string().optional(),
  ubicacionGps: z.string().optional(),
});

export const puntoUpsertSchema = z.object({
  visitaId: uuidSchema,
  // Sin .min(1) y con .nullish() (admite tanto ausente como null): los
  // puntos creados antes de que existiera el título tienen titulo NULL en
  // la base de datos, y el cliente lo manda tal cual (null, no ausente) al
  // sincronizarlos -- rechazarlo dejaría esos puntos (y sus fotos, que no
  // suben hasta que el punto sincronice) atascados en error para siempre.
  // El formulario de creación sigue exigiendo un título no vacío en el cliente.
  titulo: z.string().nullish(),
  descripcion: z.string().optional(),
  estado: estadoPuntoSchema,
});

export const adjuntoMetaSchema = z.object({
  id: uuidSchema,
  puntoId: uuidSchema.optional(),
  tipo: tipoAdjuntoSchema,
  caption: z.string().optional(),
  orden: z.coerce.number().int().optional(),
});

// El cliente elige libremente qué fichero subir y declara su tipo MIME sin
// que el navegador lo verifique; el servidor no puede fiarse de ese dato.
// Se restringe a lo que la app realmente necesita (fotos, PDFs y documentos
// de oficina) y se excluye explícitamente cualquier cosa que un navegador
// pueda ejecutar como contenido activo si se abre directamente (SVG, HTML,
// JS...), que abriría la puerta a XSS almacenado servido desde el propio
// dominio de la app.
export const ALLOWED_ADJUNTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const idParamSchema = uuidSchema;
