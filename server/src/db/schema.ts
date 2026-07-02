import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const obras = sqliteTable("obras", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  municipio: text("municipio").notNull(),
  provincia: text("provincia").notNull(),
  referenciaCatastral: text("referencia_catastral"),
  promotor: text("promotor").notNull(),
  promotorContacto: text("promotor_contacto"),
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
  descripcion: text("descripcion").notNull(),
  estado: text("estado").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
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
