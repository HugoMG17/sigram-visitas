import { sqlClient } from "./client.js";

// Bootstrap idempotente del esquema. Para una app local de un solo usuario,
// CREATE TABLE IF NOT EXISTS es suficiente; no hace falta un runner de
// migraciones versionadas mientras el esquema evolucione de forma aditiva.
export async function ensureSchema(): Promise<void> {
  await sqlClient.execute("PRAGMA foreign_keys = ON;");

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS obras (
      id TEXT PRIMARY KEY,
      owner_email TEXT,
      nombre TEXT NOT NULL,
      direccion TEXT NOT NULL,
      municipio TEXT NOT NULL,
      provincia TEXT NOT NULL,
      referencia_catastral TEXT,
      agentes TEXT,
      promotor TEXT NOT NULL,
      promotor_contacto TEXT,
      promotor_dni TEXT,
      constructor_nombre TEXT,
      constructor_dni TEXT,
      proyectista_nombre TEXT,
      proyectista_dni TEXT,
      arquitecto_nombre TEXT,
      arquitecto_dni TEXT,
      arquitecto_tecnico_nombre TEXT,
      arquitecto_tecnico_dni TEXT,
      coordinador_ss_nombre TEXT,
      coordinador_ss_dni TEXT,
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
    CREATE TABLE IF NOT EXISTS puntos (
      id TEXT PRIMARY KEY,
      visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
      titulo TEXT,
      descripcion TEXT NOT NULL,
      estado TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);
  await sqlClient.execute("CREATE INDEX IF NOT EXISTS idx_puntos_visita_id ON puntos(visita_id);");

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS adjuntos (
      id TEXT PRIMARY KEY,
      visita_id TEXT NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
      punto_id TEXT REFERENCES puntos(id) ON DELETE CASCADE,
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

  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS tokens_nativos (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      google_access_token TEXT NOT NULL,
      google_refresh_token TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );
  `);

  await migrateAdjuntosDriveColumns();
  await migrateAdjuntosPuntoColumn();
  await migratePuntosTituloColumn();
  await migrateObrasOwnerEmailColumn();
  await migrateObrasRolesColumns();
}

// Las bases de datos creadas antes de los roles de obra (constructor,
// proyectista, dirección facultativa...) no tienen estas columnas; todas
// admiten NULL, así que basta con ALTER TABLE ADD COLUMN idempotente.
async function migrateObrasRolesColumns(): Promise<void> {
  const columnasRoles = [
    "agentes",
    "promotor_dni",
    "constructor_nombre",
    "constructor_dni",
    "proyectista_nombre",
    "proyectista_dni",
    "arquitecto_nombre",
    "arquitecto_dni",
    "arquitecto_tecnico_nombre",
    "arquitecto_tecnico_dni",
    "coordinador_ss_nombre",
    "coordinador_ss_dni",
  ];
  const info = await sqlClient.execute("PRAGMA table_info(obras);");
  const existentes = new Set(info.rows.map((row) => String(row.name)));
  for (const columna of columnasRoles) {
    if (existentes.has(columna)) continue;
    await sqlClient.execute(`ALTER TABLE obras ADD COLUMN ${columna} TEXT;`);
  }
}

// Las bases de datos creadas antes del multi-usuario no tienen owner_email
// en obras; al ser una columna nueva y admitir NULL, basta con un ALTER
// TABLE ADD COLUMN idempotente (sin reconstruir la tabla).
async function migrateObrasOwnerEmailColumn(): Promise<void> {
  const info = await sqlClient.execute("PRAGMA table_info(obras);");
  const hasOwnerEmail = info.rows.some((row) => row.name === "owner_email");
  if (!hasOwnerEmail) {
    await sqlClient.execute("ALTER TABLE obras ADD COLUMN owner_email TEXT;");
  }
  // Se crea al final, tanto para bases nuevas (columna ya presente en el
  // CREATE TABLE) como para las que acaban de recibir el ALTER TABLE de arriba.
  await sqlClient.execute(
    "CREATE INDEX IF NOT EXISTS idx_obras_owner_email ON obras(owner_email);"
  );
}

// Las bases de datos creadas antes del título de punto no tienen esa
// columna; al ser nueva y admitir NULL, basta con un ALTER TABLE ADD COLUMN
// idempotente (sin reconstruir la tabla).
async function migratePuntosTituloColumn(): Promise<void> {
  const info = await sqlClient.execute("PRAGMA table_info(puntos);");
  const hasTitulo = info.rows.some((row) => row.name === "titulo");
  if (hasTitulo) return;
  await sqlClient.execute("ALTER TABLE puntos ADD COLUMN titulo TEXT;");
}

// Las bases de datos creadas antes de los "puntos" no tienen punto_id en
// adjuntos; al ser una columna nueva y admitir NULL, basta con un ALTER
// TABLE ADD COLUMN idempotente (sin reconstruir la tabla).
async function migrateAdjuntosPuntoColumn(): Promise<void> {
  const info = await sqlClient.execute("PRAGMA table_info(adjuntos);");
  const hasPuntoId = info.rows.some((row) => row.name === "punto_id");
  if (hasPuntoId) return;
  await sqlClient.execute("ALTER TABLE adjuntos ADD COLUMN punto_id TEXT REFERENCES puntos(id) ON DELETE CASCADE;");
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
