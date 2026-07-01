import "dotenv/config";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const env = {
  port: Number(readEnv("SIGRAM_SERVER_PORT") ?? readEnv("PORT") ?? "4000"),
  dbPath: path.resolve(rootDir, readEnv("DB_PATH") ?? "./data/sigram.db"),
  uploadsDir: path.resolve(rootDir, readEnv("UPLOADS_DIR") ?? "./uploads"),
  tursoUrl: readEnv("TURSO_DATABASE_URL"),
  tursoAuthToken: readEnv("TURSO_AUTH_TOKEN"),
  rootDir,
};
