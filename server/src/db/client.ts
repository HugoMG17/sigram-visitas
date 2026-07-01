import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../env.js";
import * as schema from "./schema.js";

// En local (o si no se configura Turso) se usa un fichero SQLite normal.
// En un hosting con disco efímero (ej. Render), TURSO_DATABASE_URL apunta a
// una base de datos libSQL en la nube que sí persiste entre despliegues.
export const sqlClient = env.tursoUrl
  ? createClient({ url: env.tursoUrl, authToken: env.tursoAuthToken })
  : (() => {
      fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });
      return createClient({ url: `file:${env.dbPath}` });
    })();

export const db = drizzle(sqlClient, { schema });
