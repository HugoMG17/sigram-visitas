import { sqlClient } from "./client.js";

// Bootstrap idempotente del esquema. Para una app local de un solo usuario,
// CREATE TABLE IF NOT EXISTS es suficiente; no hace falta un runner de
// migraciones versionadas mientras el esquema evolucione de forma aditiva.
export async function ensureSchema(): Promise<void> {
  await sqlClient.execute("PRAGMA foreign_keys = ON;");

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS obras (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT NOT NULL,
      municipio TEXT NOT NULL,
      provincia TEXT NOT NULL,
      referencia_catastral TEXT,
      promotor TEXT NOT NULL,
      promotor_contacto TEXT,
      tipo_obra TEXT NOT NULL,
      estado TEXT NOT NULL,
      fecha_inicio TEXT,
      fecha_fin_prevista TEXT,
      numero_expediente TEXT,
      notas TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS visitas (
      id TEXT PRIMARY KEY,
      obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      fecha TEXT NOT NULL,
      titulo TEXT,
      notas TEXT,
      tiempo_atmosferico TEXT,
      asistentes TEXT,
      ubicacion_gps TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);
  await sqlClient.execute("CREATE INDEX IF NOT EXISTS idx_visitas_obra_id ON visitas(obra_id);");

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS adjuntos (
      id TEXT PRIMARY KEY,
      visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      nombre_archivo TEXT NOT NULL,
      caption TEXT,
      orden INTEGER NOT NULL DEFAULT 0,
      ruta_archivo TEXT,
      ruta_thumbnail TEXT,
      drive_file_id TEXT,
      drive_thumbnail_id TEXT,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  await sqlClient.execute(
    "CREATE INDEX IF NOT EXISTS idx_adjuntos_visita_id ON adjuntos(visita_id);"
  );

  await migrateAdjuntosDriveColumns();
}

// Las bases de datos creadas antes de soportar Drive tienen ruta_archivo
// NOT NULL y les faltan las columnas drive_*. SQLite no permite quitar un
// NOT NULL con ALTER COLUMN, así que se reconstruye la tabla si hace falta.
async function migrateAdjuntosDriveColumns(): Promise<void> {
  const info = await sqlClient.execute("PRAGMA table_info(adjuntos);");
  const columns = info.rows.map((row) => String(row.name));
  const rutaArchivoCol = info.rows.find((row) => row.name === "ruta_archivo");
  const rutaArchivoIsNotNull = rutaArchivoCol ? Number(rutaArchivoCol.notnull) === 1 : false;
  const hasDriveColumns = columns.includes("drive_file_id");

  if (hasDriveColumns && !rutaArchivoIsNotNull) return;

  await sqlClient.execute(`
    CREATE TABLE adjuntos_new (
      id TEXT PRIMARY KEY,
      visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      nombre_archivo TEXT NOT NULL,
      caption TEXT,
      orden INTEGER NOT NULL DEFAULT 0,
      ruta_archivo TEXT,
      ruta_thumbnail TEXT,
      drive_file_id TEXT,
      drive_thumbnail_id TEXT,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  await sqlClient.execute(`
    INSERT INTO adjuntos_new (id, visita_id, tipo, mime_type, nombre_archivo, caption, orden, ruta_archivo, ruta_thumbnail, width, height, created_at)
    SELECT id, visita_id, tipo, mime_type, nombre_archivo, caption, orden, ruta_archivo, ruta_thumbnail, width, height, created_at FROM adjuntos;
  `);
  await sqlClient.execute("DROP TABLE adjuntos;");
  await sqlClient.execute("ALTER TABLE adjuntos_new RENAME TO adjuntos;");
  await sqlClient.execute(
    "CREATE INDEX IF NOT EXISTS idx_adjuntos_visita_id ON adjuntos(visita_id);"
  );
}
