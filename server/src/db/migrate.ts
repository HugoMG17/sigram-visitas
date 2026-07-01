import { fileURLToPath } from "node:url";
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
      ruta_archivo TEXT NOT NULL,
      ruta_thumbnail TEXT,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  await sqlClient.execute(
    "CREATE INDEX IF NOT EXISTS idx_adjuntos_visita_id ON adjuntos(visita_id);"
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  ensureSchema()
    .then(() => {
      console.log("Esquema listo.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
