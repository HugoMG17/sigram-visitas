import { defineConfig } from "drizzle-kit";

// Solo se usa para "drizzle-kit studio" (inspeccionar la base de datos local
// visualmente). El esquema real se aplica vía src/db/migrate.ts (CREATE TABLE
// IF NOT EXISTS), no vía migraciones generadas por drizzle-kit.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: "file:./data/sigram.db",
  },
});
