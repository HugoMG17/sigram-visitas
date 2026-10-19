import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { AgenteExtra, IntervencionesMusaat, ObraAgentes } from "@sigram/shared";

export const obras = sqliteTable("obras", {
  id: text("id").primaryKey(),
  // Email de la cuenta de Google propietaria de la obra (multi-usuario).
  // Nullable porque las bases de datos previas a esta columna no la tienen
  // rellena; en modo local sin login (authEnabled=false) queda vacía.
  ownerEmail: text("owner_email"),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  municipio: text("municipio").notNull(),
  provincia: text("provincia").notNull(),
  referenciaCatastral: text("referencia_catastral"),
  // Logo de la obra como data URI; se incrusta en la cabecera del PDF.
  logo: text("logo"),
  // Roles de la obra con varias personas por rol, como JSON. Fuente de verdad
  // actual; drizzle serializa/parsea solo con mode: "json".
  agentes: text("agentes", { mode: "json" }).$type<ObraAgentes>(),
  // Roles extra de la Dirección Facultativa, con el nombre del rol escrito
  // por el usuario.
  direccionFacultativaExtra: text("direccion_facultativa_extra", { mode: "json" }).$type<AgenteExtra[]>(),
  // Campos escalares de rol PREVIOS a `agentes`, conservados por
  // compatibilidad: "promotor" guarda el nombre del promotor (columna
  // histórica reutilizada); el resto de agentes llevan nombre y DNI propios.
  promotor: text("promotor").notNull(),
  promotorContacto: text("promotor_contacto"),
  promotorDni: text("promotor_dni"),
  constructorNombre: text("constructor_nombre"),
  constructorDni: text("constructor_dni"),
  proyectistaNombre: text("proyectista_nombre"),
  proyectistaDni: text("proyectista_dni"),
  arquitectoNombre: text("arquitecto_nombre"),
  arquitectoDni: text("arquitecto_dni"),
  arquitectoTecnicoNombre: text("arquitecto_tecnico_nombre"),
  arquitectoTecnicoDni: text("arquitecto_tecnico_dni"),
  coordinadorSSNombre: text("coordinador_ss_nombre"),
  coordinadorSSDni: text("coordinador_ss_dni"),
  tipoObra: text("tipo_obra").notNull(),
  estado: text("estado").notNull(),
  fechaInicio: text("fecha_inicio"),
  fechaFinPrevista: text("fecha_fin_prevista"),
  numeroExpediente: text("numero_expediente"),
  notas: text("notas"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const visitas = sqliteTable("visitas", {
  id: text("id").primaryKey(),
  obraId: text("obra_id")
    .notNull()
    .references(() => obras.id, { onDelete: "cascade" }),
  fecha: text("fecha").notNull(),
  titulo: text("titulo"),
  notas: text("notas"),
  tiempoAtmosferico: text("tiempo_atmosferico"),
  asistentes: text("asistentes"),
  ubicacionGps: text("ubicacion_gps"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const puntos = sqliteTable("puntos", {
  id: text("id").primaryKey(),
  visitaId: text("visita_id")
    .notNull()
    .references(() => visitas.id, { onDelete: "cascade" }),
  titulo: text("titulo"),
  descripcion: text("descripcion").notNull(),
  estado: text("estado").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Agenda de personas y empresas con las que se trabaja a menudo, para no
// volver a teclear el mismo nombre y DNI en cada obra. Es la única entidad
// que NO cuelga de una obra, así que lleva su propia columna de propietario
// en vez de heredarla por las claves foráneas como visitas, puntos y
// adjuntos.
export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email"),
  nombre: text("nombre").notNull(),
  dni: text("dni"),
  // Una sociedad en vez de una persona: lo único que cambia es que el
  // documento se etiqueta CIF.
  esEmpresa: integer("es_empresa", { mode: "boolean" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Registro de lo que hay que declarar a la mutua (Musaat). Lista aparte de
// las obras a propósito: no todas las obras se declaran, y lo declarado tiene
// que quedar como se declaró. Como las personas, no cuelga de ninguna obra,
// así que lleva su propia columna de propietario.
export const musaat = sqliteTable("musaat", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email"),
  numeroExpediente: text("numero_expediente"),
  nombre: text("nombre").notNull(),
  // Hasta cinco intervenciones por obra, cada una con su fecha de envío.
  intervenciones: text("intervenciones", { mode: "json" }).$type<IntervencionesMusaat>(),
  observaciones: text("observaciones"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

// Sesiones de la app Android nativa (Capacitor). El APK no puede usar la
// cookie de sesión (el login corre en el navegador del sistema, cuyas
// cookies no llegan al WebView de la app), así que se autentica con un
// token Bearer. Se guarda el SHA-256 del token, nunca el token en claro,
// junto con los tokens de Google del usuario (necesarios para Drive).
export const tokensNativos = sqliteTable("tokens_nativos", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  googleAccessToken: text("google_access_token").notNull(),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
});

export const adjuntos = sqliteTable("adjuntos", {
  id: text("id").primaryKey(),
  visitaId: text("visita_id")
    .notNull()
    .references(() => visitas.id, { onDelete: "cascade" }),
  puntoId: text("punto_id").references(() => puntos.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  mimeType: text("mime_type").notNull(),
  nombreArchivo: text("nombre_archivo").notNull(),
  caption: text("caption"),
  orden: integer("orden").notNull().default(0),
  // Un adjunto vive en disco local (rutaServidor) O en Drive (driveFileId),
  // según si el login con Google estaba activo al subirlo.
  rutaServidor: text("ruta_archivo"),
  rutaThumbnail: text("ruta_thumbnail"),
  driveFileId: text("drive_file_id"),
  driveThumbnailId: text("drive_thumbnail_id"),
  width: integer("width"),
  height: integer("height"),
  createdAt: text("created_at").notNull(),
});
