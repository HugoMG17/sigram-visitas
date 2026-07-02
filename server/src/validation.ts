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
  titulo: z.string().min(1),
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

export const idParamSchema = uuidSchema;
