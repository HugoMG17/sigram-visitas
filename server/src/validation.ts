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

// Todos los campos opcionales usan .nullish() y no .optional(): las filas
// creadas antes de que existiera un campo lo tienen a NULL en la base de
// datos, el pull() del cliente guarda ese null en Dexie y el push lo reenvía
// tal cual -- .optional() acepta que el campo falte pero rechaza null, lo
// que dejaba esos registros atascados en "error" para siempre (ya pasó con
// puntos.titulo y con las columnas de roles de obra).
const textoOpcional = z.string().nullish();

// Roles de la obra con varias personas por rol. Cada persona lleva nombre y
// DNI opcionales; todo el objeto es .nullish() por el mismo motivo que el
// resto de campos (una obra que nunca tuvo `agentes` lo reenvía como null
// tras el pull).
//
// Se usa z.record y NO un z.object con claves fijas a propósito: uno de los
// roles se llama "constructor", y un z.object leería esa clave del prototipo
// (Object.prototype.constructor, una función) cuando falta en el body,
// haciendo fallar la validación. z.record solo mira las claves propias.
const personaSchema = z.object({ nombre: textoOpcional, dni: textoOpcional });
const agentesSchema = z.record(z.string(), personaSchema.array()).nullish();

// Ningún campo de la obra es obligatorio (petición expresa de Hugo): las
// columnas NOT NULL históricas se rellenan con "" / valores por defecto en
// la ruta antes de insertar.
export const obraUpsertSchema = z.object({
  agentes: agentesSchema,
  nombre: textoOpcional,
  direccion: textoOpcional,
  municipio: textoOpcional,
  provincia: textoOpcional,
  referenciaCatastral: textoOpcional,
  promotor: textoOpcional,
  promotorContacto: textoOpcional,
  promotorDni: textoOpcional,
  constructorNombre: textoOpcional,
  constructorDni: textoOpcional,
  proyectistaNombre: textoOpcional,
  proyectistaDni: textoOpcional,
  arquitectoNombre: textoOpcional,
  arquitectoDni: textoOpcional,
  arquitectoTecnicoNombre: textoOpcional,
  arquitectoTecnicoDni: textoOpcional,
  coordinadorSSNombre: textoOpcional,
  coordinadorSSDni: textoOpcional,
  tipoObra: tipoObraSchema.nullish(),
  estado: estadoObraSchema.nullish(),
  fechaInicio: textoOpcional,
  fechaFinPrevista: textoOpcional,
  numeroExpediente: textoOpcional,
  notas: textoOpcional,
});

export const visitaUpsertSchema = z.object({
  obraId: uuidSchema,
  fecha: z.string().min(1),
  titulo: textoOpcional,
  notas: textoOpcional,
  tiempoAtmosferico: textoOpcional,
  asistentes: textoOpcional,
  ubicacionGps: textoOpcional,
});

export const puntoUpsertSchema = z.object({
  visitaId: uuidSchema,
  // Sin .min(1) y con .nullish() (admite tanto ausente como null): los
  // puntos creados antes de que existiera el título tienen titulo NULL en
  // la base de datos, y el cliente lo manda tal cual (null, no ausente) al
  // sincronizarlos -- rechazarlo dejaría esos puntos (y sus fotos, que no
  // suben hasta que el punto sincronice) atascados en error para siempre.
  // El formulario de creación sigue exigiendo un título no vacío en el cliente.
  titulo: textoOpcional,
  descripcion: textoOpcional,
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
  caption: textoOpcional,
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
