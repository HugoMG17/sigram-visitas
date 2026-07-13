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

export const estadoPuntoSchema = z.enum(["sin_estado", "pendiente", "solucionado"]);

const uuidSchema = z.string().uuid();

// Ningún campo de la obra es obligatorio (petición expresa de Hugo): las
// columnas NOT NULL históricas se rellenan con "" / valores por defecto en
// la ruta antes de insertar.
export const obraUpsertSchema = z.object({
  nombre: z.string().optional(),
  direccion: z.string().optional(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  referenciaCatastral: z.string().optional(),
  promotor: z.string().optional(),
  promotorContacto: z.string().optional(),
  promotorDni: z.string().optional(),
  constructorNombre: z.string().optional(),
  constructorDni: z.string().optional(),
  proyectistaNombre: z.string().optional(),
  proyectistaDni: z.string().optional(),
  arquitectoNombre: z.string().optional(),
  arquitectoDni: z.string().optional(),
  arquitectoTecnicoNombre: z.string().optional(),
  arquitectoTecnicoDni: z.string().optional(),
  coordinadorSSNombre: z.string().optional(),
  coordinadorSSDni: z.string().optional(),
  tipoObra: tipoObraSchema.optional(),
  estado: estadoObraSchema.optional(),
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
  // Solo se tiene en cuenta al actualizar un punto ya existente (reordenar
  // con las flechas); al crear uno nuevo el servidor sigue calculando el
  // siguiente orden por su cuenta, ignorando lo que venga aquí.
  orden: z.coerce.number().int().optional(),
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
